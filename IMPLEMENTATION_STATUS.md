# Implementation status

This branch completes the code-ownable PRD backlog across Wave 1–2, Spread A/B/C/F/G, Engineering T1–T8, Juice J1–J8, Micro M1–M8, and the locked product surfaces O5/O6, R2/R3/R4/R6, S1/S3–S6, B1–B6, A2–A6, D2/D4/D6, P1–P6, U1–U4/U6, N1/N2/N4/N5, C1–C5, and K1–K5.

## Delivered

- 64 arena tiles use InstancedMesh; edge AABB support, coyote time, jump buffering, collapse pacing, sudden death, spectator mode, mobile controls, and synthesized SFX.
- Three-second opening hook is skippable and emits va hook events.
- Default rounds run for 30 seconds with denser outer-ring collapses.
- Result screen uses rotating CN roast copy, a one-tap clipboard action, URL, local best streak, and best push score.
- Local two-player split controls: P1 WASD/Space/E/F and P2 arrows/Numpad1/Numpad0.
- Game code imports modules/arena.js, modules/beans.js, modules/input.js, and modules/ui.js.
- Playwright regression test and GitHub Actions workflow cover load, start, forced fall, result, and readable WebGL fallback.
- Runtime fallback catches WebGL construction failure and GLB load errors; box substitutes keep the scene playable when assets are missing.
- Critical hero/spikebox assets preload; the authored tile GLB loads alongside them without blocking Start and then drives the 64-instance arena mesh, while rival remains lazy. Existing GLBs are unchanged.
- O2 safe first round: the first local round hides the hazard, disables Bot push pressure, and defers tile collapse; completion persists and the next round uses the real rules.
- O3 loading gate: Start remains disabled until critical assets settle, while the loading bar exposes percentage and progressbar semantics for assistive technologies.
- O4 contextual tips: the first formal out and first formal win each show a localized tip once, persisted with separate localStorage keys; practice completion does not consume either tip.
- Esc pause, reduce-motion toggle, CN/EN HUD/result toggle, and persisted mute/reduce-motion/language preferences.
- Push FOV punch/shake/flash, warning pulse/tick, collapse dust/rumble, out slow-motion/pullback, landing squash/dust, combo float text, final heartbeat tint, and win confetti/hop.
- O5/O6: result tips can be skipped or permanently suppressed; a non-blocking ghost demo appears after five seconds of title idle.
- Retention: persisted current/best streak, play count, return-after-two-days copy, personal best board, and yesterday/today comparison.
- Social clip: canvas share-card PNG export, editable watermark handle, last-ten-second local event buffer, hook overlay, and defeat/win/clutch share variants.
- Balance: central `BALANCE` block with push, pace, AI, bot-count, and round-length controls exposed in the title panel.
- Accessibility: color-safe theme palette, live SFX captions, remappable P1 push key, large/high-contrast HUD preset, and hold-to-confirm quit.
- Modes/maps: No-push, Hazard rain, Ghost trail; Classic/Center pit/Ring map pool with random default; Grass/Ice/Night neon themes.
- Audio: layered synthesized SFX, intensity-ducked BGM bed, persisted volume/mute, win/out stings, and readable captions.
- Cosmetics: starter skin plus local three-win Mint unlock and title preview; no ads or IAP in v1.
- Spectator: survivor cycling, next-collapse HUD cue, soft follow/free-look toggle, caption strip, and confirmed return to lobby.
- Ops: version banner, remote `flags.json` with local fallback, soft maintenance banner, error beacon with troubleshooting link, and asset kill-switch box fallback.

## Validation

- node --check game.js
- npx terser game.js --module --compress --mangle
- npm ci
- npm test is wired for CI; local browser execution is environment-limited when Chromium/WebGL is unavailable.
- No GLB compression or re-export was performed.
- O2 validation: `node --check game.js`.
- O3 validation: Playwright asserts the disabled Start gate and progressbar attributes; CI browser coverage remains required.
- O4 validation: Playwright forces a formal out and asserts the localized tip plus persisted out-tip key.
- New surface validation: `node --check` for all JS modules, `git diff --check`, and minifier parse (`npx terser game.js --module --compress --mangle`). Playwright browser execution is blocked in this environment because the Chromium download endpoint returns a truncated archive; CI remains configured to run the full browser regression.
