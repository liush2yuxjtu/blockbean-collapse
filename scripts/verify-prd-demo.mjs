#!/usr/bin/env node
// Reusable verifier for standalone PRD surface demo pages.
// Usage: node scripts/verify-prd-demo.mjs --url <demo url> --checks scripts/prd-demo-checks/<surface>.mjs --out <evidence dir>
// A checks module exports: { surface, hook?, gesture(page), items:[{id,name,run(page,ctx)->{pass,evidence}}], toggles?:[{key,label,run(page,ctx)->{pass,evidence}}] }
// Gates on every viewport: 0 console/page errors, no horizontal scroll, FPS >= --minFps, audio only after first gesture.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const url = arg('url'); const checksPath = arg('checks'); const out = arg('out', 'verify-out');
const minFps = +arg('minFps', 30);
if (!url || !checksPath) { console.error('need --url and --checks'); process.exit(2); }
const C = (await import(pathToFileURL(path.resolve(checksPath)).href)).default;
fs.mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
];
const rows = []; let allPass = true;
const rec = (vp, id, name, pass, evidence) => { rows.push({ vp, id, name, pass, evidence }); if (!pass) allPass = false; console.log(`${pass ? 'PASS' : 'FAIL'} [${vp}] ${id} ${name} — ${evidence}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=user-gesture-required'] });
for (const V of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: V.viewport, hasTouch: !!V.hasTouch, isMobile: !!V.isMobile, deviceScaleFactor: V.deviceScaleFactor || 1 });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  // record AudioContext construction/state before any gesture
  await page.addInitScript(() => {
    window.__audio = { created: 0, firstGesture: null, createdAt: [] };
    addEventListener('pointerdown', () => { window.__audio.firstGesture ??= performance.now(); }, true);
    const W = window.AudioContext || window.webkitAudioContext;
    if (W) { const P = function (...a) { window.__audio.created++; window.__audio.createdAt.push(performance.now()); return new W(...a); }; P.prototype = W.prototype; window.AudioContext = P; window.webkitAudioContext = P; }
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  if (C.hook) await page.waitForFunction(C.hook, null, { timeout: 15000 });
  await sleep(800);
  const shot = async n => { const f = path.join(out, `${V.name}-${n}.png`); await page.screenshot({ path: f }); return f; };
  const h = { V, shot, sleep, page };

  const pre = await page.evaluate(() => window.__audio.created);
  await C.gesture(page, h);
  await sleep(300);
  const au = await page.evaluate(() => ({ ...window.__audio, states: window.__juice?.state?.().ac }));
  rec(V.name, 'AUDIO', 'WebAudio only after first gesture', pre === 0 && au.created >= 1 && au.createdAt[0] >= au.firstGesture, `before=${pre} after=${au.created} state=${au.states}`);
  await shot('00-initial');

  for (const it of C.items) { let r; try { r = await it.run(page, h); } catch (e) { r = { pass: false, evidence: 'threw ' + e.message }; } rec(V.name, it.id, it.name, r.pass, r.evidence); }
  for (const t of C.toggles || []) { let r; try { r = await t.run(page, h); } catch (e) { r = { pass: false, evidence: 'threw ' + e.message }; } rec(V.name, 'T:' + t.key, t.label, r.pass, r.evidence); }

  const sc = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  rec(V.name, 'SCROLL', 'No horizontal scroll', sc.sw <= sc.cw, `scrollWidth=${sc.sw} clientWidth=${sc.cw}`);
  const fps = await page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  rec(V.name, 'FPS', `rAF FPS >= ${minFps} (3s)`, fps >= minFps, fps.toFixed(1) + ' fps (headless SwiftShader)');
  rec(V.name, 'CONSOLE', '0 console/page errors', errors.length === 0, errors.length ? errors.slice(0, 3).join(' | ') : '0 errors');
  await ctx.close();
}
await browser.close();

const md = [`# ${C.surface} demo verification`, '', `URL: ${url}`, `Date: ${new Date().toISOString()}`, `Overall: **${allPass ? 'PASS' : 'FAIL'}**`, '',
  '| Viewport | ID | Check | Result | Evidence |', '|---|---|---|---|---|',
  ...rows.map(r => `| ${r.vp} | ${r.id} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.evidence).replace(/\|/g, '/')} |`),
  '', 'Screenshots: `<viewport>-<id>.png` in this folder.'].join('\n');
fs.writeFileSync(path.join(out, 'REPORT.md'), md + '\n');
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2));
process.exit(allPass ? 0 : 1);
