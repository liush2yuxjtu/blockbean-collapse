import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFrameSpike,
  sampleStats,
  createRateLimiter,
  createSpeedAnomalyTracker,
  createPerfTelemetry,
  SPIKE_RAW_S,
  TOO_FAST_HOLD_S,
  TOO_SLOW_HOLD_S
} from '../modules/perfTelemetry.js';

test('isFrameSpike classifies raw dt above clamp threshold', () => {
  assert.equal(isFrameSpike(0.016), false);
  assert.equal(isFrameSpike(SPIKE_RAW_S), false);
  assert.equal(isFrameSpike(SPIKE_RAW_S + 0.001), true);
  assert.equal(isFrameSpike(1.2), true);
});

test('sampleStats reports fps avg max p95', () => {
  const stats = sampleStats([0.016, 0.016, 0.02, 0.05, 0.016]);
  assert.equal(stats.fps > 0, true);
  assert.equal(stats.max_ms, 50);
  assert.equal(Number.isInteger(stats.avg_ms), true);
  assert.equal(Number.isInteger(stats.p95_ms), true);
});

test('rate limiter blocks same key within window', () => {
  const lim = createRateLimiter(3000);
  assert.equal(lim.allow('perf_frame_spike', 1000), true);
  assert.equal(lim.allow('perf_frame_spike', 2000), false);
  assert.equal(lim.allow('perf_frame_spike', 4001), true);
  assert.equal(lim.allow('perf_speed_anomaly:too_fast', 4001), true);
});

test('speed anomaly too_fast after sustained hold', () => {
  const t = createSpeedAnomalyTracker();
  assert.equal(t.update({ speed: 11, wish: 1, grounded: true, dt: 0.2 }), null);
  assert.equal(t.update({ speed: 11, wish: 1, grounded: true, dt: 0.2 }), null);
  const hit = t.update({ speed: 12, wish: 1, grounded: true, dt: 0.05 });
  assert.ok(hit);
  assert.equal(hit.kind, 'too_fast');
  assert.equal(hit.speed >= 10, true);
});

test('speed anomaly too_slow when grounded with wish but stuck', () => {
  const t = createSpeedAnomalyTracker();
  let hit = null;
  for (let i = 0; i < 20; i++) {
    hit = t.update({ speed: 0.2, wish: 0.8, grounded: true, dt: 0.05 }) || hit;
  }
  assert.ok(hit);
  assert.equal(hit.kind, 'too_slow');
});

test('createPerfTelemetry fires spike once per rate window and samples', () => {
  const events = [];
  let now = 10_000;
  const perf = createPerfTelemetry((name, data) => events.push({ name, data }), {
    now: () => now,
    rateLimitMs: 3000,
    sampleIntervalMs: 5000,
    windowSize: 8
  });

  perf.beginFrame(0.2, { state: 'play', paused: false, slowMo: false, hidden: false, beansAlive: 4 });
  assert.equal(events.filter(e => e.name === 'perf_frame_spike').length, 1);
  assert.equal(events[0].data.raw_ms, 200);
  assert.equal(events[0].data.clamped_ms, 50);

  now += 500;
  perf.beginFrame(0.3, { state: 'play', paused: false, slowMo: false, hidden: false, beansAlive: 4 });
  assert.equal(events.filter(e => e.name === 'perf_frame_spike').length, 1, 'rate-limited');

  now += 5000;
  perf.beginFrame(0.016, { state: 'play', paused: false, slowMo: false, hidden: false, beansAlive: 3 });
  assert.ok(events.some(e => e.name === 'perf_sample'));
  const sample = events.find(e => e.name === 'perf_sample');
  assert.equal(sample.data.state, 'play');
  assert.equal(sample.data.beans_alive, 3);
});

test('resume discards fat step and fires perf_resume with small raw_dt', () => {
  const events = [];
  let now = 1_000;
  const perf = createPerfTelemetry((name, data) => events.push({ name, data }), { now: () => now });
  perf.noteHidden(now);
  now += 2500;
  const hiddenMs = perf.noteVisible(now);
  assert.equal(hiddenMs, 2500);
  perf.armResume(hiddenMs);
  const frame = perf.beginFrame(0.01, { state: 'play', paused: false, beansAlive: 2 });
  assert.equal(frame.skipped, true);
  assert.equal(frame.frameDt, 0);
  const resume = events.find(e => e.name === 'perf_resume');
  assert.ok(resume);
  assert.equal(resume.data.hidden_ms, 2500);
  assert.equal(resume.data.raw_dt_ms, 10);
  assert.equal(events.some(e => e.name === 'perf_frame_spike'), false);
});

// Hold constants referenced so refactors keep thresholds intentional.
assert.ok(TOO_FAST_HOLD_S > 0 && TOO_SLOW_HOLD_S > 0);
