export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const tileOverlapsFoot = (bean, tile, half = 0.52, tileSize = 2) =>
  Math.abs(bean.p.x - tile.x) <= tileSize / 2 + half &&
  Math.abs(bean.p.z - tile.z) <= tileSize / 2 + half;
export const collapseDelay = (index, ring = 0) =>
  0.8 + index * 0.45 + Math.random() * 0.22 + Math.max(0, ring - 2) * 0.08;
