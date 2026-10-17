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

echo "[verify] passed"
