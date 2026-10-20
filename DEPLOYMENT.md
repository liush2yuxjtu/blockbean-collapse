# Deployment and PR previews

Production remains on Vercel. PR previews target Cloudflare Pages Free through Direct Upload. No generated files are committed to PR branches.

## One-time setup

Create a **Direct Upload** Pages project named `blockbean-collapse`, with production branch `main`. Do not enable a paid plan. This implementation does not depend on Cloudflare Git integration or GitHub Actions.

The trusted automation runner needs persistent secret-store entries for:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_PAGES_PROJECT=blockbean-collapse
```

Scope the token to the intended account with Pages Edit permission. Never store it in the repository, PR comments, chat, or build-info. A browser login alone does not supply credentials to the runner. The runner also needs Node.js, npm, git and Playwright Chromium.

## Exact-commit preview

Run tooling from a trusted checkout. Retrieve current PR metadata from GitHub, fetch the commit, and create a clean detached source worktree at:

- open PR: `head.sha`;
- merged PR: `merge_commit_sha`, after proving it is contained in `main`.

Call the trusted script with an empty, absolute output directory and that worktree:

```bash
bash scripts/deploy-cloudflare-preview.sh \
  "$PR_NUMBER" "$PR_HEAD_SHA" "${PR_MERGE_SHA:-}" \
  "$EMPTY_OUTPUT_DIR" "$SOURCE_WORKTREE"
```

The preparer checks the actual git HEAD and rejects modified runtime files, mismatched SHAs and nonempty output directories. It copies static runtime assets and writes `build-info.json` with PR/head/merge/source identity. GLBs are copied unchanged. The source's Vercel analytics include is preserved; a no-op analytics endpoint is included only in the static preview.

Wrangler deploys on branch `pr-<number>` and writes NDJSON via `WRANGLER_OUTPUT_FILE_PATH`. The wrapper extracts the actual deployment ID, immutable URL and returned alias into `verify-out/pr-<number>/deployment.json`. Deployment IDs are learned after upload and are recorded in that evidence file, not invented in build-info.

An alias is a convenience pointer. Keep the immutable URL for every verified revision. A returned deployment URL is not proof of playability; run the browser surface against it with expected PR/head/merge SHAs.

## Webhook and acceptance

[PR_ROUTINE.md](PR_ROUTINE.md) records the configured event-driven routine, trigger filters, idempotency and PR-comment contract. No polling schedule is used.

The automation is configured, but Cloudflare account/runner authorization and a real deployment plus webhook run remain prerequisites for end-to-end acceptance. Do not mark those as complete based on configuration or an HTTP-only check.
