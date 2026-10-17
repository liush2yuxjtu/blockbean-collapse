---
name: verify
description: Local CI for blockbean-collapse. Run before every push and merge — regression tests plus standalone PRD demo page verification (viewport matrix, per-ID triggers, toggles, audio, console/scroll/FPS gates, REPORT.md evidence).
---

# Verify (this IS the CI)

The repo has **no GitHub Actions** anymore (`.github/workflows/playwright.yml` was removed). This skill replaces it.
**Merge gate:** run the full verify locally → it must print `VERIFY PASS` (exit 0) → then push / merge. Never merge on a red or skipped run.

## One command

```bash
npm run verify            # = bash scripts/verify.sh
# with PRD demo pages:
PRD_DEMOS="https://…/prd-demos/juice/|scripts/prd-demo-checks/juice.mjs|/tmp/juice-verify" npm run verify
```

## Steps (ported 1:1 from the deleted `playwright.yml`)

| # | Former CI step | Local command |
|---|---|---|
| 1 | actions/setup-node (Node 20) | use Node ≥ 20 (`node -v`) |
| 2 | Install dependencies | `npm ci` |
| 3 | Install Chromium | `npx playwright install chromium` (`--with-deps` on a fresh Linux box) |
| 4 | Run Playwright regression | `CI=1 npm test` (CI=1 keeps forbidOnly, 2 retries, 1 worker, fresh `python3 -m http.server 4173`) |
| 5 | *(new)* PRD demo pages | `node scripts/verify-prd-demo.mjs --url … --checks … --out …` |

The old workflow ran on every push and on PRs to `main`; run `npm run verify` at the same moments.

## Standalone PRD demo page verification

Reusable procedure for any surface demo page (Juice J1–J8 is the worked example). Script: `scripts/verify-prd-demo.mjs`; per-surface checks: `scripts/prd-demo-checks/<surface>.mjs`.

1. **Instrument the page.** Expose a debug object (Juice: `window.__juice = { on, ev, I, state() }`), where `ev` counts each effect *only when it actually fires* and `state()` returns live values (shake, fovKick, slowT, combo, tint, float texts, tile states, AudioContext state). Prefer state/counters/DOM text/canvas pixel diff over eyeballing screenshots.
2. **Viewport matrix** (built in): phone 390×844 with touch + isMobile, desktop 1280×800. Headless Chromium with SwiftShader GL.
3. **Per-ID trigger checks.** One item per PRD ID: reset → trigger via the page's control → assert the PRD-defined components (e.g. J1 = fovKick>1 ∧ shake>0 ∧ rival flash) → screenshot `<viewport>-<ID>.png`.
4. **Toggle checks.** For each toggle: ON → its counter increments; OFF (others on) → its counter stays 0. Plus 全关 (nothing fires) / 全开 (all restored), intensity slider 0×/1×/2× scales magnitudes (0 → zero), 重置 restores scene + toggles + intensity.
5. **Audio after gesture.** An init script wraps `AudioContext`; assert 0 contexts before the first pointerdown and ≥1 (`running`) after.
6. **Gates.** 0 console errors / page errors; `scrollWidth <= clientWidth` (no horizontal scroll); rAF FPS over 3 s ≥ 30 (`--minFps`).
7. **Evidence.** `--out` folder gets screenshots, `results.json`, and `REPORT.md`:
   `| Viewport | ID | Check | Result | Evidence |` with overall PASS/FAIL. Script exits non-zero on any FAIL.
8. Fix bugs in the demo, re-run until all PASS.

### Checks module shape

```js
export default {
  surface: 'Juice J1–J8',
  hook: () => !!window.__juice,            // wait until instrumented
  gesture: async (page, h) => {},          // first user tap (unlocks audio)
  items:   [{ id: 'J1', name, run: async (page, h) => ({ pass, evidence }) }],
  toggles: [{ key, label, run: async (page, h) => ({ pass, evidence }) }],
};
```
`h` gives `{ V (viewport), shot(name), sleep(ms), page }`. Copy `juice.mjs` as a template for a new surface.
