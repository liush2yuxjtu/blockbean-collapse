# Implementation status

## Wave 1–2 code delivery

The current branch implements the approved Wave 1 and Wave 2 code scope in `game.js` and `index.html`:

- AABB-style foot support, walk-off drop, coyote time, and jump buffering.
- Authored outer-ring collapse order, stronger warning state, sudden-death acceleration, and collapse/push camera punch.
- Push burst particles, synthesized warning/fall/push/win/out SFX, and Chinese out feedback.
- Bot steering that avoids warning tiles and the spikebox, plus edge-directed pushes.
- Result/share screen with push score, copyable Chinese share text, replay, and `va` events.
- `THREE.InstancedMesh` for all 64 arena tiles.
- Mobile virtual stick, Jump/Push buttons, spectator cycling, and mute control.

The existing `/_vercel/insights` script, `va` event wrapper, and four GLB files remain in place.

## Validation

- `node --check game.js` passes.
- `index.html` keeps the Three.js import map and Vercel Insights script.
- A live smoke test must be run after the branch is deployed.

## Remaining PRD item

Wave 3 content remains Tripo-only. The repository keeps the existing four GLBs unchanged. New skins or map variants require a credit estimate before generation and user approval if the estimate exceeds 200 points.
