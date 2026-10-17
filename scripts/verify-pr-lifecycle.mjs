#!/usr/bin/env node

import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

await main().catch((error) => finish({ surface: 'PR Lifecycle Verification', verdict: 'BLOCKED', blockers: [error.message] }, 3));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const event = await readEvent(args.event || process.env.GITHUB_EVENT_PATH);
  const pr = event.pull_request || event;
  const repository = args.repository || process.env.VERIFY_REPOSITORY || event.repository?.full_name || pr.base?.repo?.full_name || pr.head?.repo?.full_name || null;
  const number = Number(args.number || event.number || pr.number || 0);
  const state = pr.state || 'unknown';
  const merged = pr.merged === true || Boolean(pr.merged_at);
  const mergeSha = pr.merge_commit_sha || null;
  const headSha = pr.head?.sha || null;
  const baseRef = pr.base?.ref || 'main';
  const previewUrl = args['preview-url'] || process.env.PREVIEW_URL || process.env.VERIFY_URL || null;
  const previewRequired = args['require-preview'] === 'true' || args['require-preview'] === true || process.env.REQUIRE_PREVIEW === '1';

  const result = {
    surface: 'PR Lifecycle Verification',
    repository,
    pull_request: number || null,
    event_action: event.action || null,
    state,
    merged,
    head_sha: headSha,
    merge_commit_sha: mergeSha,
    base_ref: baseRef,
    preview_url: previewUrl,
    main_contains_merge: null,
    preview_reachable: null,
    verdict: 'BLOCKED',
    blockers: [],
    evidence: [],
  };

  if (!repository || !number) {
    result.blockers.push('repository and pull request number are required');
    return finish(result, 3);
  }

  if (state === 'open') {
    if (baseRef !== 'main') {
      result.blockers.push(`PR targets ${baseRef}; this surface requires main`);
      return finish(result, 3);
    }
    result.verdict = 'OPEN_PENDING';
    result.evidence.push('PR is open; merge verification is deferred until pull_request.closed');
    return finish(result, 0);
  }

  if (state === 'closed' && !merged) {
    result.verdict = 'CLOSED_UNMERGED';
    result.evidence.push('PR is closed without a merge commit');
    return finish(result, 0);
  }

  if (!merged || !mergeSha) {
    result.blockers.push('merged PR has no merge_commit_sha');
    return finish(result, 3);
  }

  if (baseRef !== 'main') {
    result.blockers.push(`PR targets ${baseRef}; this surface requires main`);
    return finish(result, 3);
  }

  result.main_contains_merge = await checkMainContainsMerge({ repository, mergeSha, baseRef, args });
  if (result.main_contains_merge === false) result.blockers.push(`main does not contain merge commit ${mergeSha}`);
  if (result.main_contains_merge === null) result.blockers.push('cannot prove merge commit ancestry; provide --main-sha, a local checkout, or GITHUB_TOKEN');

  if (previewUrl) {
    result.preview_reachable = await checkUrl(previewUrl);
    if (result.preview_reachable === false) result.blockers.push(`preview URL is not HTTP 2xx: ${previewUrl}`);
    if (result.preview_reachable === null) result.blockers.push(`preview URL could not be checked: ${previewUrl}`);
  } else if (previewRequired) {
    result.blockers.push('preview URL is required but PREVIEW_URL/--preview-url is missing');
  }

  const ancestryProven = result.main_contains_merge === true;
  const previewProven = !previewRequired || result.preview_reachable === true;
  if (ancestryProven && previewProven && result.blockers.length === 0) {
    result.verdict = 'PASS';
    result.evidence.push(`merge commit ${mergeSha} is contained by ${baseRef}`);
    if (previewUrl) result.evidence.push(`preview URL returned HTTP 2xx: ${previewUrl}`);
    return finish(result, 0);
  }
  if (result.main_contains_merge === false || result.preview_reachable === false) result.verdict = 'FAIL';
  return finish(result, 3);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

async function readEvent(file) {
  if (!file) return {};
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function checkMainContainsMerge({ repository, mergeSha, baseRef, args }) {
  if (args['main-sha']) {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', mergeSha, args['main-sha']], { stdio: 'ignore' });
      return true;
    } catch (error) {
      return error.status === 1 ? false : null;
    }
  }

  let localResult = null;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', mergeSha, baseRef], { stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) localResult = false;
    // Fall through to the GitHub compare API when a local ref is unavailable.
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return localResult;
  let response;
  try {
    response = await fetch(`https://api.github.com/repos/${repository}/compare/${mergeSha}...${encodeURIComponent(baseRef)}`, {
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'user-agent': 'blockbean-verify' },
    signal: AbortSignal.timeout(30_000),
    });
  } catch { return null; }
  if (!response.ok) return null;
  const data = await response.json();
  return (data.status === 'ahead' || data.status === 'identical') && data.behind_by === 0;
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
    return response.status >= 200 && response.status < 300;
  } catch {
    return null;
  }
}

function finish(result, code) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = code;
}
