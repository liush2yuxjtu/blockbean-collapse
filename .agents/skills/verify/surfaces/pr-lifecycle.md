# PR Lifecycle / PR Preview surface

Verify the GitHub lifecycle and an independently playable, exact-commit preview for each pull request. Use fresh GitHub PR metadata, not just an old webhook payload.

## Required evidence

Record repository, PR number, event action/key, head SHA, merge SHA, source SHA, base ref, merged_at, main ancestry, actual deployment ID, immutable URL, branch alias, browser result, console/page errors, screenshots, verified_at and verdict. Keep the evidence in one marker-tagged PR comment per PR (see `PR_ROUTINE.md`). Retain prior revision deployment links in that record.

- Overall `PASS`: PR merged into main, immutable deployment identity matches PR/head/merge/source, HTTP 2xx, Start enabled, game reaches count/play, zero browser errors.
- `OPEN_PENDING`: PR still open. Preview can separately pass, but merge success cannot be claimed.
- `CLOSED_UNMERGED`: closed without merging. Record it separately from a code failure.
- `FAIL`: an executed check produced the wrong result.
- `BLOCKED`: required identity, API, deployment or browser evidence is unavailable.

`verify:pr` and `verify:preview` report **individual surface** results. Neither alone proves overall acceptance.

## Commands

From the trusted tooling checkout, check ancestry using a file containing fresh PR API data or a pull_request event:

```bash
node scripts/verify-pr-lifecycle.mjs \
  --event "$GITHUB_EVENT_PATH" \
  --main-sha "$CURRENT_MAIN_SHA" \
  --preview-url "$PREVIEW_URL" --require-preview true
```

`--main-sha` must be the freshly fetched main commit, with git history available. The API fallback requires `GITHUB_TOKEN` and uses compare `merge_sha...main` with status ahead/identical and behind_by=0. The surface requires the PR target to be main.

Prepare/deploy using a separate clean worktree at the exact head or merge SHA:

```bash
bash scripts/deploy-cloudflare-preview.sh \
  "$PR_NUMBER" "$PR_HEAD_SHA" "${PR_MERGE_SHA:-}" \
  "$EMPTY_OUTPUT_DIR" "$SOURCE_WORKTREE"
```

Use the immutable URL returned in deployment.json for browser validation:

```bash
node scripts/verify-pr-preview.mjs \
  --url "$PREVIEW_URL" --pr "$PR_NUMBER" \
  --head-sha "$PR_HEAD_SHA" --merge-sha "${PR_MERGE_SHA:-}" \
  --out "verify-out/pr-${PR_NUMBER}"
```

For `npm run verify`, enable these surfaces with `PR_LIFECYCLE_EVENT`, `PR_REQUIRE_PREVIEW=1`, `PR_PREVIEW_URL`, `PR_PREVIEW_BROWSER=1`, `PR_NUMBER`, `PR_HEAD_SHA`, and optional `PR_MERGE_SHA`, `PR_MAIN_SHA`, `PR_REPOSITORY`, `PR_VERIFY_OUT`.

Generated output stays outside the PR branch. Read `DEPLOYMENT.md` for Cloudflare Free setup and the persistent runner credential requirement. Missing Cloudflare authorization or browser execution is BLOCKED, not PASS.
