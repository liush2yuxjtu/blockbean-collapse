---
name: verify
description: Run the BlockBean Collapse verification workflow after code changes or before merging. Use for this repository when CI is disabled, when validating game.js and modules, when checking the Playwright regression locally, or when smoke testing a Vercel preview/production URL.
---

# BlockBean Verify

Use this skill as the repository's manual replacement for the former GitHub Actions regression workflow.

## Run

From the repository root, run:

```bash
npm run verify
```

The command delegates to `.agents/skills/verify/scripts/verify.sh`. Keep the output with the change review.

## Checks

The verifier performs these checks in order:

1. Run `node --check` for `game.js` and every JavaScript module.
2. Run `npx terser game.js --module --compress --mangle` to prove the module parses after minification.
3. Run `git diff --check`.
4. Run `npm ci` and `npm test` for the Playwright regression.
5. If `VERIFY_URL` is set, fetch the URL and require an HTTP 2xx response.
6. If `PRD_DEMOS` is set (`"url|checks.mjs|outdir;..."`), run `scripts/verify-prd-demo.mjs` per demo (see below).

This skill IS the CI (the former `.github/workflows/playwright.yml` ran `npm ci`, `npx playwright install --with-deps chromium`, `npm test`; all are steps 4 above). Merge gate: run `npm run verify` locally, it ends with `[verify] passed`, then push/merge.

Example with the Juice demo:

```bash
PRD_DEMOS="https://resume-box.tail6a877d.ts.net/tripo/blockbean-collapse/prd-demos/juice/|scripts/prd-demo-checks/juice.mjs|/tmp/juice-verify" VERIFY_INSTALL_BROWSER=1 npm run verify
```

The script installs the Playwright browser only when `VERIFY_INSTALL_BROWSER=1` is set. Use `VERIFY_INSTALL_BROWSER=1 npm run verify` on a machine that can install Chromium. Use `VERIFY_URL=https://...` to add a live smoke check.

## Review rules

- Treat a failed check as a blocker; record the command and error before changing code.
- Preserve `/_vercel/insights`, existing `va` events, and every existing GLB.
- Do not compress or re-export GLBs.
- Do not generate 3D assets or call Tripo from this skill.
- Use this skill on a branch/PR and report the results in the PR body or review note.

## Browser gotcha

The authored tile GLB is parsed after the Start gate and can still take time to hot-replace the arena mesh. If Playwright times out while waiting for `#splash` or `window.__game.state`, inspect the browser console and asset requests, then rerun with a longer local timeout before treating the app as broken. A successful live HTTP smoke proves deployment reachability but does not replace the browser interaction check.

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
