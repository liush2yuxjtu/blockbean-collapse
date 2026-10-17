# Contributing to BlockBean Collapse

Thanks for helping improve BlockBean Collapse. Keep changes small enough to review and preserve the fast, mobile friendly game loop.

## Development

1. Create a topic branch from `main`.
2. Run a local static server, for example `python3 -m http.server 4173`.
3. Open `http://127.0.0.1:4173` in a current Chromium based browser.
4. Run `npm run verify` (see [skills/verify/SKILL.md](skills/verify/SKILL.md)) before every push and merge — it is the CI.

The game is a static browser app. Keep the existing Three.js import map, `/assets` layout, Vercel Insights `va` events, and touch controls working. GLB files are large and are loaded from the asset directories; use the box fallback while developing when an asset is unavailable.

## Pull requests

Describe the player facing behavior, the acceptance item it completes, and how you tested it. Include a short screen recording or screenshots for visual changes when practical. There is no hosted CI: pull requests merge only after `npm run verify` passes locally (`VERIFY PASS`). Do not commit secrets, account identifiers, or private player data.

## Analytics and privacy

Analytics events should contain aggregate game state only. Do not add names, email addresses, device identifiers, or other personally identifying data. Preserve the existing `window.va` integration and keep event payloads bounded.

## Assets and licensing

Only add assets that you have permission to redistribute. Keep new files in the matching `assets/<name>/` directory and document their source in the pull request. Do not replace the bundled GLB files with compressed variants without a measured loading and rendering check.
