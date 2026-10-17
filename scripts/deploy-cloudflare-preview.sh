#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_name="${CLOUDFLARE_PAGES_PROJECT:-blockbean-collapse}"
pr_number="${1:?usage: deploy-cloudflare-preview.sh PR_NUMBER HEAD_SHA [MERGE_SHA] [OUT_DIR] [SOURCE_ROOT]}"
head_sha="${2:?HEAD_SHA is required}"
merge_sha="${3:-}"
source_sha="${merge_sha:-$head_sha}"
source_root="${5:-$PWD}"
source_root="$(cd "$source_root" && pwd)"
[[ "$pr_number" =~ ^[1-9][0-9]*$ ]] || { echo 'PR number must be a positive integer' >&2; exit 1; }

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required by Wrangler}"

out_dir="${4:-$(mktemp -d -t blockbean-pr-${pr_number}.XXXXXX)}"
[[ "$out_dir" = /* ]] || { echo 'OUT_DIR must be an absolute path' >&2; exit 1; }
cd "$script_dir/.."
metadata="$(mktemp -t blockbean-deploy.XXXXXX)"
trap 'rm -f "$metadata"' EXIT
result_file="${PR_DEPLOY_RESULT:-verify-out/pr-${pr_number}/deployment.json}"

node "$script_dir/prepare-preview.mjs" \
  --root "$source_root" --out "$out_dir" --pr "$pr_number" \
  --head-sha "$head_sha" --merge-sha "$merge_sha" --provider cloudflare-pages

# Run from the trusted tooling checkout, not the PR source worktree.
WRANGLER_OUTPUT_FILE_PATH="$metadata" npx --yes wrangler@4 pages deploy "$out_dir" \
  --project-name "$project_name" --branch "pr-${pr_number}" --commit-hash "$source_sha"

node --input-type=module - "$metadata" "$result_file" "$source_sha" <<'JS'
import fs from 'node:fs/promises';
import path from 'node:path';
const [metadata, resultFile, sourceSha] = process.argv.slice(2);
const entries = (await fs.readFile(metadata, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line));
const deployment = entries.findLast(row => row.type === 'pages-deploy-detailed') || entries.findLast(row => row.type === 'pages-deploy');
if (!deployment?.url || !deployment?.deployment_id) throw new Error('Wrangler did not return deployment identity');
const url = new URL(deployment.url);
if (url.protocol !== 'https:' || !url.hostname.endsWith('.pages.dev')) throw new Error('Unexpected Pages deployment URL');
const actualCommit = deployment.deployment_trigger?.metadata?.commit_hash;
if (actualCommit && actualCommit !== sourceSha) throw new Error('Deployment commit does not match source');
const result = { ...deployment, source_sha: sourceSha, verified: false };
await fs.mkdir(path.dirname(resultFile), { recursive: true });
await fs.writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ...result, evidence_file: resultFile }, null, 2)}\n`);
JS
