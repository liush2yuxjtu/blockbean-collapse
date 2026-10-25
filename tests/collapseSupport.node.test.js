import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tileProvidesWalkSupport,
  classifySupportLoss,
  classifyFallKind,
  pickOkRevivePad,
  RIDE_FALL_DROP,
  COLLAPSE_COYOTE_S,
  EDGE_COYOTE_S
} from '../modules/arena.js';

const TILE_TOP = 0;
const TILE_H = 0.6;

test('ok and crack tiles always support', () => {
  assert.equal(tileProvidesWalkSupport({ st: 'ok', y: TILE_TOP - TILE_H / 2 }, { tileTop: TILE_TOP, tileH: TILE_H }), true);
  assert.equal(tileProvidesWalkSupport({ st: 'crack', y: TILE_TOP - TILE_H / 2 }, { tileTop: TILE_TOP, tileH: TILE_H }), true);
});

test('fall tile still supports while top near walk surface', () => {
  // Fresh fall: center still at rest height → top == TILE_TOP
  const fresh = { st: 'fall', y: TILE_TOP - TILE_H / 2 };
  assert.equal(tileProvidesWalkSupport(fresh, { tileTop: TILE_TOP, tileH: TILE_H }), true);

  // Dropped a little but still within ride window
  const riding = { st: 'fall', y: TILE_TOP - TILE_H / 2 - (RIDE_FALL_DROP - 0.05) };
  assert.equal(tileProvidesWalkSupport(riding, { tileTop: TILE_TOP, tileH: TILE_H }), true);
});

test('fall tile loses support after dropping past ride threshold', () => {
  const dropped = { st: 'fall', y: TILE_TOP - TILE_H / 2 - (RIDE_FALL_DROP + 0.05) };
  assert.equal(tileProvidesWalkSupport(dropped, { tileTop: TILE_TOP, tileH: TILE_H }), false);
  assert.equal(tileProvidesWalkSupport({ st: 'gone', y: -40 }, { tileTop: TILE_TOP, tileH: TILE_H }), false);
});

test('classifySupportLoss distinguishes collapse vs edge', () => {
  assert.equal(classifySupportLoss({ st: 'fall' }), 'collapse');
  assert.equal(classifySupportLoss({ st: 'gone' }), 'collapse');
  assert.equal(classifySupportLoss({ st: 'ok' }), 'edge');
  assert.equal(classifySupportLoss({ st: 'crack' }), 'edge');
  assert.equal(classifySupportLoss(null), 'air');
});

test('classifyFallKind maps countdown to count', () => {
  assert.equal(classifyFallKind({ inCount: true, supportLossKind: 'collapse' }), 'count');
  assert.equal(classifyFallKind({ inCount: false, supportLossKind: 'collapse' }), 'collapse');
  assert.equal(classifyFallKind({ inCount: false, supportLossKind: 'edge' }), 'edge');
  assert.equal(classifyFallKind({ inCount: false, supportLossKind: 'air' }), 'air');
});

test('pickOkRevivePad never returns crack and prefers nearest ok', () => {
  const tiles = [
    { st: 'crack', x: 0, z: 0 },
    { st: 'ok', x: 4, z: 0 },
    { st: 'ok', x: 2, z: 0 },
    { st: 'fall', x: 1, z: 0 },
    { st: 'gone', x: 0.5, z: 0 }
  ];
  const pad = pickOkRevivePad(tiles, { x: 0, z: 0 });
  assert.ok(pad);
  assert.equal(pad.st, 'ok');
  assert.equal(pad.x, 2);
});

test('pickOkRevivePad returns null when no ok tiles', () => {
  assert.equal(pickOkRevivePad([{ st: 'crack', x: 0, z: 0 }, { st: 'fall', x: 1, z: 0 }]), null);
});

test('collapse coyote is longer than edge coyote', () => {
  assert.ok(COLLAPSE_COYOTE_S > EDGE_COYOTE_S);
  assert.ok(COLLAPSE_COYOTE_S >= 0.38 && COLLAPSE_COYOTE_S <= 0.45);
});
