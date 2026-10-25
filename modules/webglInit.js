/**
 * Resilient THREE.WebGLRenderer creation: try several option profiles before fallback UI.
 * Pure helpers are unit-testable without a real GPU.
 */

/** Ordered profiles — first success wins. */
export const WEBGL_PROFILES = [
  { id: 'hi', opts: { antialias: true, powerPreference: 'high-performance' } },
  { id: 'default', opts: { antialias: true, powerPreference: 'default' } },
  { id: 'noaa', opts: { antialias: false, powerPreference: 'default' } },
  { id: 'bare', opts: { antialias: false } }
];

/**
 * Probe whether the document can get a WebGL / WebGL2 context.
 * Uses separate canvases so one getContext does not poison the other.
 * @param {{ createElement?: Function }} [doc]
 * @returns {{ webgl2: boolean, webgl: boolean }}
 */
export function probeWebGLContexts(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc?.createElement) return { webgl2: false, webgl: false };
  let webgl2 = false;
  let webgl = false;
  try {
    const c2 = doc.createElement('canvas');
    webgl2 = Boolean(c2.getContext?.('webgl2'));
  } catch (_) { /* ignore */ }
  try {
    const c1 = doc.createElement('canvas');
    webgl = Boolean(c1.getContext?.('webgl') || c1.getContext?.('experimental-webgl'));
  } catch (_) { /* ignore */ }
  return { webgl2, webgl };
}

/**
 * Compact reason for runtime_fallback analytics (Chinese UI stays separate).
 * @param {unknown} err
 * @param {{ webgl2?: boolean, webgl?: boolean }} probe
 * @param {number} [maxLen]
 */
export function formatRuntimeFallbackReason(err, probe = {}, maxLen = 120) {
  const errMsg = String(err?.message || err || 'unknown').replace(/\s+/g, ' ').trim();
  const base = `webgl2=${probe.webgl2 ? 1 : 0},webgl=${probe.webgl ? 1 : 0},err=${errMsg}`;
  return base.slice(0, maxLen);
}

/**
 * Try WEBGL_PROFILES in order against a Renderer constructor (e.g. THREE.WebGLRenderer).
 * @param {new (opts?: object) => unknown} Renderer
 * @param {(name: string, data?: object) => void} [emit] analytics hook (__va)
 * @returns {{ renderer: unknown|null, profile: string|null, error: unknown|null }}
 */
export function createWebGLRendererWithFallback(Renderer, emit = () => {}) {
  let lastErr = null;
  for (const profile of WEBGL_PROFILES) {
    try {
      const renderer = new Renderer(profile.opts);
      try { emit('webgl_profile', { profile: profile.id }); } catch (_) { /* ignore */ }
      return { renderer, profile: profile.id, error: null };
    } catch (err) {
      lastErr = err;
    }
  }
  return { renderer: null, profile: null, error: lastErr };
}
