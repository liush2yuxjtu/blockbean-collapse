// Juice J1–J8 checks for prd-demos/juice/index.html. Relies on window.__juice
// ({on, ev counters, I, state()}) exposed by the demo page.
const S = p => p.evaluate(() => window.__juice.state());
const EV = p => p.evaluate(() => ({ ...window.__juice.ev }));
const d = (a, b) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, (b[k] || 0) - (a[k] || 0)]).filter(([, v]) => v));
const click = (p, id) => p.click('#' + id);
const reset = async p => { await click(p, 'bReset'); await p.waitForTimeout(150); };
const canvasHash = p => p.evaluate(() => { const c = document.querySelector('canvas'); const x = document.createElement('canvas'); x.width = 64; x.height = 64; x.getContext('2d').drawImage(c, 0, 0, 64, 64); return Array.from(x.getContext('2d').getImageData(0, 0, 64, 64).data); });
const pixDiff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const fail = e => ({ pass: false, evidence: e });

async function doAction(p, act) {
  await reset(p);
  if (act === 'push') { await click(p, 'bPush'); return 120; }
  if (act === 'push2') { await click(p, 'bPush'); await p.waitForTimeout(250); await click(p, 'bPush'); return 120; }
  if (act === 'collapse') { await click(p, 'bCollapse'); return 1100; }
  if (act === 'jump') { await click(p, 'bJump'); return 900; }
  if (act === 'final') { await click(p, 'bFinal'); return 1200; }
  if (act === 'win') { await click(p, 'bWin'); return 200; }
  return 0;
}
async function measure(p, act) { await doAction(p, 'none'); const a = await EV(p); const w = await doAction(p, act); await p.waitForTimeout(w); return d(a, await EV(p)); }

const TOG = { shake: 'push', hitstop: 'collapse', particles: 'collapse', squash: 'jump', flash: 'collapse', punch: 'push', warn: 'collapse', slowmo: 'collapse', text: 'push', heart: 'final', confetti: 'win', sound: 'push' };
const togEv = { flash: 'flash' };

export default {
  surface: 'Juice J1–J8',
  hook: () => !!window.__juice,
  gesture: async (p, h) => { const b = await p.$('canvas').then(c => c.boundingBox()); if (h.V.hasTouch) await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); },
  items: [
    { id: 'J1', name: 'Push impact: FOV punch + shake + rival flash', run: async (p, h) => { await reset(p); await click(p, 'bPush'); await p.waitForTimeout(40); const s = await S(p); await h.shot('J1'); return { pass: s.fovKick > 1 && s.shake > 0.05 && s.rivalFlash > 0.3, evidence: `fovKick=${s.fovKick.toFixed(2)} shake=${s.shake.toFixed(2)} rivalFlash=${s.rivalFlash.toFixed(2)}` }; } },
    { id: 'J2', name: 'Collapse warn: edge glow pulse + crack flash + tick SFX', run: async (p, h) => { await reset(p); const a = await EV(p); const c0 = await canvasHash(p); await click(p, 'bCollapse'); await p.waitForTimeout(400); const s = await S(p); const c1 = await canvasHash(p); await h.shot('J2'); const e = d(a, await EV(p)); return { pass: s.tiles.includes('warn') && e.warn >= 1 && e.sound >= 1, evidence: `tiles warn=${s.tiles.filter(t => t == 'warn').length} ev=${JSON.stringify(e)} pixDiff=${pixDiff(c0, c1).toFixed(2)}` }; } },
    { id: 'J3', name: 'Collapse moment: fall + dust + rumble', run: async (p, h) => { await reset(p); const a = await EV(p); await click(p, 'bCollapse'); await p.waitForTimeout(900); const s = await S(p); await h.shot('J3'); const e = d(a, await EV(p)); return { pass: e.collapse >= 1 && s.tiles.some(t => t == 'fall' || t == 'gone') && e.particles >= 2 && e.sound >= 2, evidence: `ev=${JSON.stringify(e)} parts=${s.parts}` }; } },
    { id: 'J4', name: 'Out sequence: slow-mo + cam pullback + 出局了！', run: async (p, h) => { await reset(p); await click(p, 'bCollapse'); let s; for (let i = 0; i < 30; i++) { await p.waitForTimeout(50); s = await S(p); if (s.rivalOut) break; } await h.shot('J4'); return { pass: s.rivalOut && s.slowT > 0 && s.camPull > 0.3 && s.texts.includes('出局了！'), evidence: `rivalOut=${s.rivalOut} slowT=${s.slowT.toFixed(2)} camPull=${s.camPull.toFixed(2)} texts=${s.texts}` }; } },
    { id: 'J5', name: 'Jump land: squash/stretch + land dust', run: async (p, h) => { await reset(p); const a = await EV(p); await click(p, 'bJump'); await p.waitForTimeout(30); const s0 = await S(p); let mx = 0; for (let i = 0; i < 40; i++) { await p.waitForTimeout(25); const s = await S(p); mx = Math.max(mx, s.heroSq); if (mx > .1 && i > 5) { await h.shot('J5'); break; } } const e = d(a, await EV(p)); return { pass: s0.heroSq < -0.1 && mx > 0.1 && e.land >= 1 && e.particles >= 1, evidence: `stretch=${s0.heroSq.toFixed(2)} squashMax=${mx.toFixed(2)} ev=${JSON.stringify(e)}` }; } },
    { id: 'J6', name: 'Multi-push float text chain', run: async (p, h) => { await reset(p); await click(p, 'bPush'); await p.waitForTimeout(200); await click(p, 'bPush'); await p.waitForTimeout(80); const s = await S(p); await h.shot('J6'); const pe = await p.evaluate(() => getComputedStyle(document.querySelector('.ft') || document.body).pointerEvents); return { pass: s.combo >= 2 && s.texts.includes('推！') && s.texts.some(t => ['双推', '再推！'].includes(t)) && pe === 'none', evidence: `combo=${s.combo} texts=${s.texts} pointer-events=${pe}` }; } },
    { id: 'J7', name: 'Final 2x2 heartbeat: red tint + beat + edge flash', run: async (p, h) => { await reset(p); const a = await EV(p); await click(p, 'bFinal'); await p.waitForTimeout(1000); const s = await S(p); await h.shot('J7'); const e = d(a, await EV(p)); await click(p, 'bFinal'); return { pass: s.final && /255, 0, 40/.test(s.tint) && e.heart >= 2 && s.tiles.filter(t => t !== 'idle').length === 12, evidence: `tint=${s.tint} beats/1s=${e.heart} nonIdle=${s.tiles.filter(t => t !== 'idle').length}` }; } },
    { id: 'J8', name: 'Win: confetti + bean hop + sting', run: async (p, h) => { await reset(p); const a = await EV(p); await click(p, 'bWin'); await p.waitForTimeout(500); const s = await S(p); await h.shot('J8'); const e = d(a, await EV(p)); return { pass: e.confetti >= 1 && s.parts > 40 && s.texts.includes('胜利！') && e.sound >= 4, evidence: `parts=${s.parts} texts=${s.texts} ev=${JSON.stringify(e)}` }; } },
  ],
  toggles: [
    ...Object.entries(TOG).map(([k, act]) => ({ key: k, label: `toggle ${k} on → effect fires`, run: async p => {
      await reset(p); const onE = await measure(p, act);
      await p.evaluate(k => { const i = document.querySelector(`#toggles input[data-k="${k}"]`); i.click(); }, k);
      const offE = await measure(p, act); await p.evaluate(k => document.querySelector(`#toggles input[data-k="${k}"]`).click(), k);
      // measure() resets which re-enables toggles, so turn off after reset:
      return { pass: (onE[togEv[k] || k] || 0) > 0, evidence: `on=${onE[togEv[k] || k] || 0}` };
    } })),
    { key: 'each-off', label: 'each of 12 toggles off → its counter stays 0', run: async p => {
      const bad = [];
      for (const [k, act] of Object.entries(TOG)) {
        await reset(p); await p.evaluate(k => document.querySelector(`#toggles input[data-k="${k}"]`).click(), k);
        const a = await EV(p); await click(p, { push: 'bPush', collapse: 'bCollapse', jump: 'bJump', final: 'bFinal', win: 'bWin' }[act]);
        await p.waitForTimeout({ collapse: 1100, jump: 900, final: 1200 }[act] || 200);
        const e = d(a, await EV(p)); if (act === 'final') await click(p, 'bFinal');
        if (e[k]) bad.push(`${k}:${e[k]}`);
      }
      return { pass: !bad.length, evidence: bad.length ? 'still fired ' + bad.join(',') : 'all 12 silent when off' };
    } },
    { key: 'allOff', label: '全关 → no effect fires; 全开 restores', run: async p => {
      await reset(p); await click(p, 'bAllOff'); const st = await p.evaluate(() => Object.values(window.__juice.on).every(v => !v));
      const a = await EV(p); for (const b of ['bPush', 'bJump', 'bWin']) await click(p, b); await p.waitForTimeout(900);
      const e = d(a, await EV(p)); const fx = ['shake', 'flash', 'punch', 'particles', 'squash', 'text', 'confetti', 'sound', 'hitstop'].filter(k => e[k]);
      await click(p, 'bAllOn'); const st2 = await p.evaluate(() => Object.values(window.__juice.on).every(v => v));
      return { pass: st && st2 && !fx.length, evidence: `allOff=${st} fired=[${fx}] allOn=${st2}` };
    } },
    { key: 'intensity', label: '强度 0–2x scales effects', run: async p => {
      const at = async v => { await reset(p); await p.evaluate(v => { const i = document.getElementById('inten'); i.value = v; i.dispatchEvent(new Event('input')); }, v); await click(p, 'bPush'); await p.waitForTimeout(30); return p.evaluate(() => ({ ...window.__juice.state(), I: window.__juice.I, lbl: document.getElementById('iv').textContent })); };
      const z = await at(0), o = await at(1), t = await at(2);
      return { pass: z.shake === 0 && z.fovKick === 0 && t.shake > o.shake * 1.5 && t.fovKick > o.fovKick * 1.5 && t.lbl === '2.0', evidence: `shake 0x=${z.shake.toFixed(2)} 1x=${o.shake.toFixed(2)} 2x=${t.shake.toFixed(2)}; fov 0x=${z.fovKick.toFixed(1)} 1x=${o.fovKick.toFixed(1)} 2x=${t.fovKick.toFixed(1)}` };
    } },
    { key: 'reset', label: '重置 restores scene, toggles, intensity', run: async p => {
      await click(p, 'bAllOff'); await p.evaluate(() => { const i = document.getElementById('inten'); i.value = 2; i.dispatchEvent(new Event('input')); }); await click(p, 'bCollapse'); await p.waitForTimeout(1100);
      await click(p, 'bReset'); await p.waitForTimeout(100); const s = await S(p); const r = await p.evaluate(() => ({ all: Object.values(window.__juice.on).every(v => v), I: window.__juice.I }));
      return { pass: s.tiles.every(t => t === 'idle') && !s.rivalOut && r.all && r.I === 1, evidence: `tilesIdle=${s.tiles.every(t => t === 'idle')} togglesOn=${r.all} I=${r.I}` };
    } },
  ],
};
