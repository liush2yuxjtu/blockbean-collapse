import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localHumanBean,
  trimRoundEvents,
  makeSnapshotEvent,
  makeTileEvent,
  makeActionEvent,
  buildReplayPackage,
  serializeReplayPackage,
  saveReplayToStorage,
  loadReplayFromStorage,
  hasReplayPackage,
  eventsDue,
  sampleGhostPose,
  replayDurationMs,
  REPLAY_LS_KEY,
  REPLAY_MAX_EVENTS,
  REPLAY_MAX_WINDOW_MS,
  REPLAY_MAX_BYTES
} from '../modules/lastReplay.js';

test('localHumanBean prefers 你 / human:1 over beans[0]', () => {
  const beans = [
    { name: 'Bot1', ai: true, human: 0 },
    { name: '你', ai: false, human: 1, p: { x: 1, z: 2 } }
  ];
  assert.equal(localHumanBean(beans).name, '你');
  assert.equal(localHumanBean([{ name: '玩家2', ai: false, human: 2 }]).name, '玩家2');
  assert.equal(localHumanBean([]), null);
});

test('trimRoundEvents caps window and count', () => {
  const now = 100000;
  const events = [];
  for (let i = 0; i < 500; i++) {
    events.push({ at: now - i * 200, type: 'snapshot', x: i, z: 0 });
  }
  const trimmed = trimRoundEvents(events, now);
  assert.ok(trimmed.length <= REPLAY_MAX_EVENTS);
  assert.ok(trimmed.every(e => now - e.at <= REPLAY_MAX_WINDOW_MS));
});

test('build + persist + load round-trip; ghost lerp; death event due', () => {
  const t0 = 1000;
  const events = [
    makeSnapshotEvent({ p: { x: 0, z: 0 }, ground: true, alive: true }, t0, 4),
    makeSnapshotEvent({ p: { x: 2, z: 0 }, ground: true, alive: true }, t0 + 500, 4),
    makeTileEvent('tile_warn', 3, { x: 1, z: 1 }, 1, t0 + 200),
    makeTileEvent('tile_fall', 3, { x: 1, z: 1 }, 1, t0 + 700),
    makeActionEvent('death', { x: 2, z: 0, fall_kind: 'collapse' }, t0 + 900)
  ];
  const pkg = buildReplayPackage({
    events,
    map: 'classic',
    mode: 'classic',
    fall_kind: 'collapse',
    survival_s: 12.3,
    at: 42
  });
  assert.equal(pkg.v, 1);
  assert.equal(pkg.fall_kind, 'collapse');
  assert.equal(pkg.events[0].t, 0);
  assert.ok(pkg.events.some(e => e.type === 'death' && e.fall_kind === 'collapse'));

  const store = new Map();
  const storage = {
    setItem(k, v) { store.set(k, v); },
    getItem(k) { return store.has(k) ? store.get(k) : null; }
  };
  const saved = saveReplayToStorage(storage, pkg);
  assert.ok(hasReplayPackage(saved));
  assert.ok(store.get(REPLAY_LS_KEY).length <= REPLAY_MAX_BYTES);
  const loaded = loadReplayFromStorage(storage);
  assert.equal(loaded.fall_kind, 'collapse');
  assert.equal(loaded.map, 'classic');

  const mid = sampleGhostPose(loaded.events, 250);
  assert.ok(mid);
  assert.ok(mid.x > 0 && mid.x < 2);

  const due = eventsDue(loaded.events, 150, 250);
  assert.ok(due.some(e => e.type === 'tile_warn'));

  const deathDue = eventsDue(loaded.events, 800, 950);
  assert.ok(deathDue.some(e => e.type === 'death'));
  assert.ok(replayDurationMs(loaded) >= 900);
});

test('serializeReplayPackage shrinks oversized event lists', () => {
  const events = [];
  for (let i = 0; i < 800; i++) {
    events.push({
      at: i * 50,
      type: 'snapshot',
      x: Math.sin(i) * 5,
      z: Math.cos(i) * 5,
      grounded: i % 2,
      alive: 3,
      pad: 'x'.repeat(40)
    });
  }
  const pkg = buildReplayPackage({ events, map: 'pit', mode: 'classic', fall_kind: 'edge', survival_s: 20 });
  const json = serializeReplayPackage(pkg);
  assert.ok(json.length <= REPLAY_MAX_BYTES);
  const parsed = JSON.parse(json);
  assert.ok(parsed.events.length < events.length);
  assert.ok(parsed.events.length >= 12);
});
