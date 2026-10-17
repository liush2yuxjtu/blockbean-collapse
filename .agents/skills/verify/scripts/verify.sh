#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$repo_root"

echo "[verify] syntax"
node --check game.js
for module in modules/*.js; do
  node --check "$module"
done

echo "[verify] minifier parse"
npx terser game.js --module --compress --mangle >/dev/null

echo "[verify] whitespace"
git diff --check

if [[ "${VERIFY_INSTALL_BROWSER:-0}" == "1" ]]; then
  echo "[verify] install Chromium"
  npx playwright install chromium
fi

echo "[verify] Playwright regression"
npm ci
npm test

if [[ -n "${VERIFY_URL:-}" ]]; then
  echo "[verify] live smoke: ${VERIFY_URL}"
  curl --fail --silent --show-error --location --max-time 30 --output /dev/null --write-out "HTTP %{http_code}\n" "${VERIFY_URL}"
fi

# Standalone PRD demo pages: PRD_DEMOS="url|checks.mjs|outdir;..."
IFS=';' read -ra demos <<< "${PRD_DEMOS:-}"
for d in "${demos[@]}"; do
  [[ -z "$d" ]] && continue
  IFS='|' read -r url checks out <<< "$d"
  echo "[verify] PRD demo: ${url}"
  node scripts/verify-prd-demo.mjs --url "$url" --checks "$checks" --out "${out:-verify-out}"
done

if [[ -n "${PR_LIFECYCLE_EVENT:-}" ]]; then
  echo "[verify] PR lifecycle: ${PR_LIFECYCLE_EVENT}"
  lifecycle_args=(--event "$PR_LIFECYCLE_EVENT")
  [[ -n "${PR_PREVIEW_URL:-}" ]] && lifecycle_args+=(--preview-url "$PR_PREVIEW_URL")
  [[ "${PR_REQUIRE_PREVIEW:-0}" == "1" ]] && lifecycle_args+=(--require-preview true)
  [[ -n "${PR_REPOSITORY:-}" ]] && lifecycle_args+=(--repository "$PR_REPOSITORY")
  [[ -n "${PR_MAIN_SHA:-}" ]] && lifecycle_args+=(--main-sha "$PR_MAIN_SHA")
  node scripts/verify-pr-lifecycle.mjs "${lifecycle_args[@]}"
fi

if [[ -n "${PR_PREVIEW_URL:-}" && "${PR_PREVIEW_BROWSER:-0}" == "1" ]]; then
  echo "[verify] PR preview browser smoke: ${PR_PREVIEW_URL}"
  preview_args=(--url "$PR_PREVIEW_URL")
  [[ -n "${PR_NUMBER:-}" ]] && preview_args+=(--pr "$PR_NUMBER")
  [[ -n "${PR_HEAD_SHA:-}" ]] && preview_args+=(--head-sha "$PR_HEAD_SHA")
  [[ -n "${PR_MERGE_SHA:-}" ]] && preview_args+=(--merge-sha "$PR_MERGE_SHA")
  [[ -n "${PR_VERIFY_OUT:-}" ]] && preview_args+=(--out "$PR_VERIFY_OUT")
  node scripts/verify-pr-preview.mjs "${preview_args[@]}"
fi

echo "[verify] passed"
