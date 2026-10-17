#!/usr/bin/env bash
# Local CI: the single gate before every push/merge. See skills/verify/SKILL.md.
# Env: PRD_DEMOS="url|checks.mjs|outdir;..." to also verify standalone PRD demo pages.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== [1/4] npm ci";                 npm ci
echo "== [2/4] playwright chromium";    npx playwright install chromium   # add --with-deps on a fresh Linux box
echo "== [3/4] npm test (Playwright regression, CI mode)"; CI=1 npm test
echo "== [4/4] PRD demo pages"
IFS=';' read -ra DEMOS <<< "${PRD_DEMOS:-}"
for d in "${DEMOS[@]}"; do
  [ -z "$d" ] && continue
  IFS='|' read -r url checks out <<< "$d"
  node scripts/verify-prd-demo.mjs --url "$url" --checks "$checks" --out "${out:-verify-out}"
done
echo "VERIFY PASS"
