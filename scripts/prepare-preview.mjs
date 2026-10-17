#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || process.cwd());
const out = path.resolve(args.out || path.join(root, '.preview'));
const headSha = args['head-sha'];
const mergeSha = args['merge-sha'] || null;
const sourceSha = mergeSha || headSha;
if (!Number.isInteger(Number(args.pr)) || Number(args.pr) < 1) throw new Error('--pr must be a positive integer');
if (!/^[a-f0-9]{40}$/i.test(headSha || '') || !/^[a-f0-9]{40}$/i.test(sourceSha || '')) {
  throw new Error('--head-sha and optional --merge-sha must be full commit SHAs');
}
const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== sourceSha) throw new Error('--root must be checked out at merge SHA, or PR head SHA for an open PR');
const entries = ['index.html', 'game.js', 'modules', 'assets', 'concept', 'flags.json'];
if (git('status', '--porcelain', '--untracked-files=all', '--', ...entries)) {
  throw new Error('Preview runtime files must match the committed source; use a clean detached worktree');
}
if (out === root) {
  throw new Error('--out must be a separate directory');
}

await fs.mkdir(out, { recursive: true });
if ((await fs.readdir(out)).length) throw new Error('--out must be empty; use a fresh temporary directory');

for (const entry of entries) {
  await fs.cp(path.join(root, entry), path.join(out, entry), { recursive: true });
}

// Vercel injects this endpoint in production. Static Pages previews have no
// analytics backend; retain the source include and serve an explicit no-op.
await fs.mkdir(path.join(out, '_vercel/insights'), { recursive: true });
await fs.writeFile(path.join(out, '_vercel/insights/script.js'), '// Analytics disabled for static PR previews.\n');

const buildInfo = {
  schema: 1,
  project: 'blockbean-collapse',
  pr_number: numberOrNull(args.pr),
  head_sha: headSha,
  merge_sha: mergeSha,
  source_sha: sourceSha,
  base_ref: args.base || 'main',
  provider: args.provider || 'cloudflare-pages',
  deployment_id: args['deployment-id'] || null,
  generated_at: new Date().toISOString(),
};
await fs.writeFile(path.join(out, 'build-info.json'), `${JSON.stringify(buildInfo, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ out, build_info: buildInfo }, null, 2)}\n`);

function parseArgs(argv) {
  const outArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      outArgs[key] = next;
      i += 1;
    } else {
      outArgs[key] = true;
    }
  }
  return outArgs;
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}
