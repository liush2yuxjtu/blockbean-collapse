/** Last-round local replay: record, persist, and timeline helpers (no network). */

export const REPLAY_LS_KEY = 'blockbean_last_replay';
export const REPLAY_MAX_EVENTS = 400;
export const REPLAY_MAX_WINDOW_MS = 45000;
export const REPLAY_MAX_BYTES = 100000;
export const SNAPSHOT_INTERVAL_MS = 250; // ~4 Hz

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Prefer local P1 human bean — do not assume beans[0]. */
export function localHumanBean(beans) {
  if (!Array.isArray(beans) || !beans.length) return null;
  return beans.find(b => !b.ai && (b.name === '你' || b.human === 1))
    || beans.find(b => !b.ai)
    || null;
}

export function trimRoundEvents(events, now, {
  maxEvents = REPLAY_MAX_EVENTS,
  maxWindowMs = REPLAY_MAX_WINDOW_MS
} = {}) {
  if (!Array.isArray(events)) return [];
  let out = events.filter(e => e && typeof e.at === 'number' && now - e.at <= maxWindowMs);
  if (out.length > maxEvents) out = out.slice(-maxEvents);
  return out;
}

export function makeSnapshotEvent(me, now, aliveCount) {
  return {
    at: now,
    type: 'snapshot',
    x: round2(me?.p?.x ?? 0),
    z: round2(me?.p?.z ?? 0),
    grounded: me?.ground ? 1 : 0,
    alive: typeof aliveCount === 'number' ? aliveCount : (me?.alive ? 1 : 0)
  };
}

export function makeTileEvent(type, tileIndex, tile, underfoot, at) {
  return {
    at: at ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    type,
    tile: tileIndex,
    x: round2(tile?.x ?? 0),
    z: round2(tile?.z ?? 0),
    underfoot: underfoot ? 1 : 0
  };
}

export function makeActionEvent(type, fields, at) {
  const out = {
    at: at ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    type,
    x: round2(fields?.x ?? 0),
    z: round2(fields?.z ?? 0)
  };
  if (fields?.fall_kind) out.fall_kind = fields.fall_kind;
  if (fields?.by != null) out.by = fields.by;
  if (fields?.target != null) out.target = fields.target;
  return out;
}

/** Absolute-time events → package with relative `t` ms from first event. */
export function buildReplayPackage({
  events,
  map,
  mode,
  fall_kind = null,
  survival_s = 0,
  at = Date.now()
} = {}) {
  const list = Array.isArray(events) ? events.filter(Boolean) : [];
  const t0 = list.length ? list[0].at : 0;
  const normalized = list.map(e => {
    const { at: abs, ...rest } = e;
    return { t: Math.max(0, Math.round((abs ?? t0) - t0)), ...rest };
  });
  return {
    v: 1,
    at,
    map: map || 'classic',
    mode: mode || 'classic',
    fall_kind: fall_kind || null,
    survival_s: Math.round((Number(survival_s) || 0) * 10) / 10,
    events: normalized
  };
}

export function serializeReplayPackage(pkg) {
  if (!pkg || !Array.isArray(pkg.events)) return '{}';
  const clone = { ...pkg, events: pkg.events.slice() };
  let json = JSON.stringify(clone);
  while (json.length > REPLAY_MAX_BYTES && clone.events.length > 12) {
    const drop = Math.max(1, Math.floor(clone.events.length * 0.12));
    clone.events = clone.events.slice(drop);
    json = JSON.stringify(clone);
  }
  return json;
}

export function saveReplayToStorage(storage, pkg) {
  if (!storage || !pkg) return null;
  try {
    const json = serializeReplayPackage(pkg);
    storage.setItem(REPLAY_LS_KEY, json);
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

export function loadReplayFromStorage(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(REPLAY_LS_KEY);
    if (!raw) return null;
    const pkg = JSON.parse(raw);
    if (!pkg || pkg.v !== 1 || !Array.isArray(pkg.events) || !pkg.events.length) return null;
    return pkg;
  } catch (_) {
    return null;
  }
}

export function hasReplayPackage(pkg) {
  return Boolean(pkg && pkg.v === 1 && Array.isArray(pkg.events) && pkg.events.length);
}

/** Events with t in (fromT, toT]. */
export function eventsDue(events, fromT, toT) {
  if (!Array.isArray(events)) return [];
  return events.filter(e => typeof e.t === 'number' && e.t > fromT && e.t <= toT);
}

/**
 * Lerp ghost pose from snapshot samples at timeline time tMs.
 * Returns { x, z, grounded } or null.
 */
export function sampleGhostPose(events, tMs) {
  if (!Array.isArray(events) || !events.length) return null;
  const snaps = events.filter(e => e.type === 'snapshot');
  if (!snaps.length) return null;
  if (tMs <= snaps[0].t) {
    return { x: snaps[0].x, z: snaps[0].z, grounded: Boolean(snaps[0].grounded) };
  }
  const last = snaps[snaps.length - 1];
  if (tMs >= last.t) {
    return { x: last.x, z: last.z, grounded: Boolean(last.grounded) };
  }
  let i = 0;
  while (i + 1 < snaps.length && snaps[i + 1].t < tMs) i += 1;
  const a = snaps[i];
  const b = snaps[i + 1] || a;
  const span = Math.max(1e-3, b.t - a.t);
  const u = Math.min(1, Math.max(0, (tMs - a.t) / span));
  return {
    x: a.x + (b.x - a.x) * u,
    z: a.z + (b.z - a.z) * u,
    grounded: u < 0.5 ? Boolean(a.grounded) : Boolean(b.grounded)
  };
}

export function replayDurationMs(pkg) {
  if (!hasReplayPackage(pkg)) return 0;
  let max = 0;
  for (const e of pkg.events) {
    if (typeof e.t === 'number' && e.t > max) max = e.t;
  }
  return max;
}
