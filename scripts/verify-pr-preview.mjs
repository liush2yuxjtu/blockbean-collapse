#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = parseArgs(process.argv.slice(2));
const url = args.url || process.env.PREVIEW_URL || process.env.VERIFY_URL;
const expectedHeadSha = args['head-sha'] || process.env.PREVIEW_HEAD_SHA || null;
const expectedMergeSha = args['merge-sha'] || process.env.PREVIEW_MERGE_SHA || null;
const expectedSourceSha = expectedMergeSha || expectedHeadSha;
const prValue = args.pr || process.env.PREVIEW_PR_NUMBER || null;
const expectedPrNumber = prValue === null ? null : Number(prValue);
const out = path.resolve(args.out || 'verify-out/pr-preview');
await fs.mkdir(out, { recursive: true });

const result = {
  surface: 'PR Preview Playable Smoke',
  verified_at: new Date().toISOString(),
  url,
  expected_head_sha: expectedHeadSha,
  expected_merge_sha: expectedMergeSha,
  expected_source_sha: expectedSourceSha,
  expected_pr_number: expectedPrNumber,
  http_2xx: false,
  build_info: null,
  build_identity_match: null,
  build_merge_identity_match: null,
  build_source_identity_match: null,
  build_pr_identity_match: null,
  start_enabled: false,
  game_started: false,
  console_errors: [],
  page_errors: [],
  screenshot: null,
  verdict: 'FAIL',
  blockers: [],
};
if (!url) result.blockers.push('Provide --url or PREVIEW_URL');
if (!expectedHeadSha || typeof expectedHeadSha !== 'string') {
  result.blockers.push('Provide --head-sha or PREVIEW_HEAD_SHA; an expected PR identity is required');
}
if (prValue !== null && (!Number.isInteger(expectedPrNumber) || expectedPrNumber <= 0)) {
  result.blockers.push('--pr or PREVIEW_PR_NUMBER must be a positive integer');
}

try {
  const infoResponse = await fetch(new URL('/build-info.json', url), { signal: AbortSignal.timeout(30_000) });
  if (!infoResponse.ok) {
    result.blockers.push(`build-info.json returned HTTP ${infoResponse.status}`);
  } else {
    result.build_info = await infoResponse.json();
    result.build_identity_match = Boolean(expectedHeadSha) && result.build_info.head_sha === expectedHeadSha;
    result.build_merge_identity_match = !expectedMergeSha || result.build_info.merge_sha === expectedMergeSha;
    result.build_source_identity_match = Boolean(expectedSourceSha) && result.build_info.source_sha === expectedSourceSha;
    result.build_pr_identity_match = expectedPrNumber === null || result.build_info.pr_number === expectedPrNumber;
    if (!result.build_identity_match) result.blockers.push('preview build head_sha does not match expected PR head SHA');
    if (!result.build_merge_identity_match) result.blockers.push('preview build merge_sha does not match expected merge SHA');
    if (!result.build_source_identity_match) result.blockers.push('preview build source_sha does not match expected deployed commit SHA');
    if (!result.build_pr_identity_match) result.blockers.push('preview build pr_number does not match expected PR number');
  }
} catch (error) {
  result.blockers.push(`build-info.json request failed: ${error.message}`);
}

let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (message) => {
    if (message.type() === 'error') result.console_errors.push(message.text());
  });
  page.on('pageerror', (error) => result.page_errors.push(String(error)));

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  result.http_2xx = Boolean(response && response.status() >= 200 && response.status() < 300);
  if (!result.http_2xx) result.blockers.push(`preview page returned HTTP ${response?.status() ?? 'no response'}`);

  await page.waitForFunction(() => {
    const start = document.querySelector('#start');
    return start && !start.disabled;
  }, undefined, { timeout: 60_000 });
  result.start_enabled = true;
  if (await page.locator('#hookSkip').isVisible().catch(() => false)) await page.locator('#hookSkip').click();
  await page.locator('#start').click();
  await page.waitForFunction(() => ['count', 'play'].includes(window.__game?.state), undefined, { timeout: 20_000 });
  result.game_started = true;
  await page.screenshot({ path: path.join(out, 'desktop-start.png'), fullPage: true });
  result.screenshot = path.join(out, 'desktop-start.png');
} catch (error) {
  result.blockers.push(`browser smoke failed: ${error.message}`);
} finally {
  await browser?.close().catch(() => {});
}
result.verdict = result.http_2xx && result.start_enabled && result.game_started && result.console_errors.length === 0 && result.page_errors.length === 0 && result.blockers.length === 0 ? 'PASS' : 'FAIL';
if (!browser && result.verdict !== 'PASS') result.verdict = 'BLOCKED';
await fs.writeFile(path.join(out, 'results.json'), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.verdict === 'PASS' ? 0 : 1;

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
