/**
 * Lightweight frame/speed telemetry helpers for Vercel Web Analytics (__va).
 * Pure logic so Playwright/node can unit-test spike + rate-limit without WebGL.
 */

export const SPIKE_RAW_S = 0.05;
export const RATE_LIMIT_MS = 3000;
export const SAMPLE_INTERVAL_MS = 5000;
export const TOO_FAST_SPEED = 10;
export const TOO_FAST_HOLD_S = 0.4;
export const TOO_SLOW_SPEED = 0.5;
export const TOO_SLOW_WISH = 0.5;
export const TOO_SLOW_HOLD_S = 0.6;

/** @param {number[]} values */
export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/** @param {number[]} dts seconds */
export function sampleStats(dts) {
  if (!dts.length) return { fps: 0, avg_ms: 0, max_ms: 0, p95_ms: 0 };
  let sum = 0;
  let max = 0;
  for (const d of dts) {
    sum += d;
    if (d > max) max = d;
  }
  const avg = sum / dts.length;
  return {
    fps: Math.round(avg > 1e-6 ? 1 / avg : 0),
    avg_ms: Math.round(avg * 1000),
    max_ms: Math.round(max * 1000),
    p95_ms: Math.round(percentile(dts, 95) * 1000)
  };
}

export function createRollingWindow(size = 60) {
  /** @type {number[]} */
  const raw = [];
  /** @type {number[]} */
  const clamped = [];
  return {
    size,
    push(rawDt, clampedDt) {
      raw.push(rawDt);
      clamped.push(clampedDt);
      while (raw.length > size) raw.shift();
      while (clamped.length > size) clamped.shift();
    },
    rawDts() { return raw.slice(); },
    clampedDts() { return clamped.slice(); },
    clear() { raw.length = 0; clamped.length = 0; }
  };
}

export function createRateLimiter(limitMs = RATE_LIMIT_MS) {
  /** @type {Map<string, number>} */
  const last = new Map();
  return {
    allow(key, now = Date.now()) {
      const prev = last.get(key);
      if (prev != null && now - prev < limitMs) return false;
      last.set(key, now);
      return true;
    },
    reset() { last.clear(); }
  };
}

export function isFrameSpike(rawDt, threshold = SPIKE_RAW_S) {
  return Number.isFinite(rawDt) && rawDt > threshold;
}

/**
 * Sustained speed anomaly tracker for local hero.
 * @returns {{ kind: 'too_fast'|'too_slow', speed: number, wish: number } | null}
 */
export function createSpeedAnomalyTracker() {
  let fastHold = 0;
  let slowHold = 0;
  return {
    /** @param {{ speed: number, wish: number, grounded: boolean, dt: number }} opts */
    update({ speed, wish, grounded, dt }) {
      const d = Math.max(0, dt || 0);
      if (speed > TOO_FAST_SPEED) {
        fastHold += d;
      } else {
        fastHold = 0;
      }
      if (grounded && wish > TOO_SLOW_WISH && speed < TOO_SLOW_SPEED) {
        slowHold += d;
      } else {
        slowHold = 0;
      }
      if (fastHold > TOO_FAST_HOLD_S) {
        fastHold = 0;
        return { kind: 'too_fast', speed: Math.round(speed * 10) / 10, wish: Math.round(wish * 10) / 10 };
      }
      if (slowHold > TOO_SLOW_HOLD_S) {
        slowHold = 0;
        return { kind: 'too_slow', speed: Math.round(speed * 10) / 10, wish: Math.round(wish * 10) / 10 };
      }
      return null;
    },
    reset() { fastHold = 0; slowHold = 0; }
  };
}

/**
 * Orchestrates rolling window + rate limits + sample cadence.
 * emit(name, data) should be cheap (e.g. __va).
 */
export function createPerfTelemetry(emit, opts = {}) {
  const windowSize = opts.windowSize ?? 60;
  const rateLimitMs = opts.rateLimitMs ?? RATE_LIMIT_MS;
  const sampleIntervalMs = opts.sampleIntervalMs ?? SAMPLE_INTERVAL_MS;
  const nowFn = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  const window = createRollingWindow(windowSize);
  const limiter = createRateLimiter(rateLimitMs);
  const speedTracker = createSpeedAnomalyTracker();
  let lastSampleAt = 0;
  let discardNext = false;
  let pendingResume = null; // { hidden_ms }
  let hiddenAt = 0;

  const fire = (name, data, rateKey) => {
    if (rateKey && !limiter.allow(rateKey, nowFn())) return false;
    emit(name, data);
    return true;
  };

  return {
    noteHidden(t = nowFn()) {
      hiddenAt = t;
    },
    /** Call when document becomes visible. Returns hidden duration ms (0 if unknown). */
    noteVisible(t = nowFn()) {
      const hiddenMs = hiddenAt ? Math.round(t - hiddenAt) : 0;
      hiddenAt = 0;
      discardNext = true;
      return hiddenMs;
    },
    /** Arm perf_resume for first post-resume frame while in play/count. */
    armResume(hiddenMs) {
      if (hiddenMs > 0) pendingResume = { hidden_ms: hiddenMs };
    },
    noteUnpause() {
      discardNext = true;
    },
    shouldDiscardDelta() {
      return discardNext;
    },
    /**
     * Consume one frame. Returns { rawDt, frameDt, skipped } after clamp/discard.
     * rawDtIn is seconds from clock.getDelta().
     */
    beginFrame(rawDtIn, { state, paused, slowMo, hidden, beansAlive, heroSpeed, heroWish, heroGrounded } = {}) {
      let rawDt = Number.isFinite(rawDtIn) ? rawDtIn : 0;
      const skip = discardNext;
      if (skip) discardNext = false;
      if (pendingResume && (state === 'play' || state === 'count')) {
        fire('perf_resume', {
          hidden_ms: pendingResume.hidden_ms,
          raw_dt_ms: Math.round(rawDt * 1000)
        });
        pendingResume = null;
      } else if (pendingResume && !(state === 'play' || state === 'count')) {
        pendingResume = null;
      }

      const frameDt = skip ? 0 : Math.min(rawDt, SPIKE_RAW_S);
      window.push(rawDt, frameDt);

      if (!skip && isFrameSpike(rawDt)) {
        fire('perf_frame_spike', {
          raw_ms: Math.round(rawDt * 1000),
          clamped_ms: Math.round(frameDt * 1000),
          state: state || 'unknown',
          hidden: Boolean(hidden),
          slow_mo: Boolean(slowMo)
        }, 'perf_frame_spike');
      }

      const playing = !paused && (state === 'play' || state === 'count');
      const t = nowFn();
      if (playing) {
        if (!lastSampleAt) lastSampleAt = t;
        if (t - lastSampleAt >= sampleIntervalMs) {
          lastSampleAt = t;
          const stats = sampleStats(window.rawDts());
          fire('perf_sample', {
            fps: stats.fps,
            avg_ms: stats.avg_ms,
            max_ms: stats.max_ms,
            p95_ms: stats.p95_ms,
            state,
            beans_alive: beansAlive | 0,
            slow_mo: Boolean(slowMo)
          });
        }
      } else {
        lastSampleAt = 0;
      }

      if (!skip && state === 'play' && !paused && heroSpeed != null) {
        const anomaly = speedTracker.update({
          speed: heroSpeed,
          wish: heroWish || 0,
          grounded: Boolean(heroGrounded),
          dt: frameDt
        });
        if (anomaly) {
          fire('perf_speed_anomaly', {
            kind: anomaly.kind,
            speed: anomaly.speed,
            wish: anomaly.wish,
            state
          }, `perf_speed_anomaly:${anomaly.kind}`);
        }
      } else if (state !== 'play' || paused) {
        speedTracker.reset();
      }

      return { rawDt, frameDt, skipped: skip };
    },
    // test hooks
    _window: window,
    _limiter: limiter,
    _speedTracker: speedTracker
  };
}
