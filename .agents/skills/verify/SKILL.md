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

The command delegates to `.codex/skills/verify/scripts/verify.sh`. Keep the output with the change review.

## Checks

The verifier performs these checks in order:

1. Run `node --check` for `game.js` and every JavaScript module.
2. Run `npx terser game.js --module --compress --mangle` to prove the module parses after minification.
3. Run `git diff --check`.
4. Run `npm ci` and `npm test` for the Playwright regression.
5. If `VERIFY_URL` is set, fetch the URL and require an HTTP 2xx response.

The script installs the Playwright browser only when `VERIFY_INSTALL_BROWSER=1` is set. Use `VERIFY_INSTALL_BROWSER=1 npm run verify` on a machine that can install Chromium. Use `VERIFY_URL=https://...` to add a live smoke check.

## Review rules

- Treat a failed check as a blocker; record the command and error before changing code.
- Preserve `/_vercel/insights`, existing `va` events, and every existing GLB.
- Do not compress or re-export GLBs.
- Do not generate 3D assets or call Tripo from this skill.
- Use this skill on a branch/PR and report the results in the PR body or review note.
