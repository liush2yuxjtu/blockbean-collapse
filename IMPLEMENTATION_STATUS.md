# Implementation status

This branch completes the currently code-ownable PRD work across Wave 1–2, Spread A/B/C/F/G, Engineering T1–T8, Juice J1–J8, and Micro tweaks M1–M8.

## Delivered

- 64 arena tiles use InstancedMesh; edge AABB support, coyote time, jump buffering, collapse pacing, sudden death, spectator mode, mobile controls, and synthesized SFX.
- Three-second opening hook is skippable and emits va hook events.
- Default rounds run for 30 seconds with denser outer-ring collapses.
- Result screen uses rotating CN roast copy, a one-tap clipboard action, URL, local best streak, and best push score.
- Local two-player split controls: P1 WASD/Space/E/F and P2 arrows/Numpad1/Numpad0.
- Game code imports modules/arena.js, modules/beans.js, modules/input.js, and modules/ui.js.
- Playwright regression test and GitHub Actions workflow cover load, start, forced fall, result, and readable WebGL fallback.
- Runtime fallback catches WebGL construction failure and GLB load errors; box substitutes keep the scene playable when assets are missing.
- Critical hero/spikebox assets preload; rival loads lazily when Start is pressed. Existing GLBs are unchanged.
- O2 safe first round: the first local round hides the hazard, disables Bot push pressure, and defers tile collapse; completion persists and the next round uses the real rules.
- Esc pause, reduce-motion toggle, CN/EN HUD/result toggle, and persisted mute/reduce-motion/language preferences.
- Push FOV punch/shake/flash, warning pulse/tick, collapse dust/rumble, out slow-motion/pullback, landing squash/dust, combo float text, final heartbeat tint, and win confetti/hop.

## Validation

- node --check game.js
- npx terser game.js --module --compress --mangle
- npm ci
- npm test is wired for CI; local browser execution is environment-limited when Chromium/WebGL is unavailable.
- No GLB compression or re-export was performed.
- O2 validation: `node --check game.js`.
