export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const tileOverlapsFoot = (bean, tile, half = 0.52, tileSize = 2) =>
  Math.abs(bean.p.x - tile.x) <= tileSize / 2 + half &&
  Math.abs(bean.p.z - tile.z) <= tileSize / 2 + half;
export const collapseDelay = (index, ring = 0) =>
  0.8 + index * 0.45 + Math.random() * 0.22 + Math.max(0, ring - 2) * 0.08;

/** How far a falling tile may drop before it stops supporting the player (world units). */
export const RIDE_FALL_DROP = 0.85;
/** Coyote after walking off a solid edge. */
export const EDGE_COYOTE_S = 0.22;
/** Coyote after the supporting tile collapses underfoot. */
export const COLLAPSE_COYOTE_S = 0.42;
/** Tiny upward nudge so jump-buffer can save a collapse loss. */
export const COLLAPSE_NUDGE_VY = 2.5;

/**
 * True while a tile should still count as foot support.
 * Falling tiles remain valid until their top drops below tileTop - rideDrop,
 * so players see/feel the platform sink before losing support.
 */
export function tileProvidesWalkSupport(t, { tileTop = 0, tileH = 0.6, rideDrop = RIDE_FALL_DROP } = {}) {
  if (!t || t.st === 'gone') return false;
  if (t.st === 'ok' || t.st === 'crack') return true;
  if (t.st === 'fall') return (t.y + tileH / 2) >= tileTop - rideDrop;
  return false;
}

/** Why the player left grounded support: collapse (tile fall/gone), edge (walk-off), or air. */
export function classifySupportLoss(lastTile) {
  if (lastTile && (lastTile.st === 'fall' || lastTile.st === 'gone')) return 'collapse';
  if (lastTile && (lastTile.st === 'ok' || lastTile.st === 'crack')) return 'edge';
  return 'air';
}

/** Death telemetry fall_kind; maps countdown falls to `count`. */
export function classifyFallKind({ inCount = false, supportLossKind = 'air' } = {}) {
  if (inCount) return 'count';
  if (supportLossKind === 'collapse') return 'collapse';
  if (supportLossKind === 'edge') return 'edge';
  return 'air';
}

/**
 * Pick an ok-only revive pad near prefer; if none exist near-filter returns null,
 * fall back to farthest ok (then any ok). Never returns crack.
 */
export function pickOkRevivePad(tiles, prefer = null) {
  const oks = (tiles || []).filter(t => t && t.st === 'ok');
  if (!oks.length) return null;
  if (prefer) {
    const near = [...oks].sort((a, c) => {
      const da = Math.hypot(a.x - prefer.x, a.z - prefer.z);
      const dc = Math.hypot(c.x - prefer.x, c.z - prefer.z);
      return da - dc;
    });
    if (near[0]) return near[0];
  }
  const farthest = [...oks].sort((a, c) => {
    const da = Math.hypot(a.x - (prefer?.x ?? 0), a.z - (prefer?.z ?? 0));
    const dc = Math.hypot(c.x - (prefer?.x ?? 0), c.z - (prefer?.z ?? 0));
    return dc - da;
  });
  return farthest[0] || oks[0];
}
