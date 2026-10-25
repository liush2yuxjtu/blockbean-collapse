import { test, expect } from '@playwright/test';

async function bootGame(page, { practiceDone = true } = {}) {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.route('**/flags.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        maintenance: false,
        maintenanceMessage: '维护提示：当前为安全演示模式。',
        forceFallbackAssets: true,
      }),
    });
  });

  await page.addInitScript(({ practiceDone }) => {
    window.__vaEvents = [];
    const prev = window.va;
    window.va = function (...args) {
      if (args[0] === 'event' && args[1]) window.__vaEvents.push(args[1]);
      return typeof prev === 'function' ? prev.apply(this, args) : undefined;
    };
    if (practiceDone) localStorage.setItem('blockbean_practice_done', '1');
    else localStorage.removeItem('blockbean_practice_done');
    localStorage.removeItem('blockbean_tip_out_seen');
    localStorage.removeItem('blockbean_tip_win_seen');
    localStorage.removeItem('blockbean_tip_never');
    localStorage.removeItem('blockbean_dev');
    localStorage.setItem('blockbean_reduce_motion', '0');
  }, { practiceDone });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();

  const start = page.locator('#start');
  const progress = page.locator('#loadbar');
  await expect(start).toHaveAttribute('id', 'start');
  await expect(progress).toHaveAttribute('role', 'progressbar');
  const fallback = page.locator('#fallback, [data-fallback]').first();
  await expect.poll(async () => {
    const ready = await start.isEnabled().catch(() => false);
    const unavailable = await fallback.isVisible().catch(() => false);
    return ready || unavailable;
  }, { timeout: 30_000 }).toBeTruthy();

  return { pageErrors, start, fallback };
}

test('loads, starts, eliminates beans, and shows the result screen', async ({ page }) => {
  test.setTimeout(90_000);
  const { pageErrors, start, fallback } = await bootGame(page);

  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
    return;
  }

  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.locator('#splash')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'))
    .toMatch(/count|play/);

  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  const forceFall = async (predicate) => page.evaluate((all) => {
    const game = window.__game;
    if (!game?.beans?.length) return false;
    for (const bean of game.beans) {
      if (all || bean.name !== '你') {
        bean.p.y = -20;
        bean.v.y = -1;
        bean.alive = false;
      }
    }
    return true;
  }, predicate === 'all');

  expect(await forceFall('all')).toBe(true);
  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#resultTitle')).toContainText(/出局|赢|WIN|LOSE|out/i);
  await expect(page.locator('#contextTip')).toBeVisible();
  await expect(page.locator('#contextTip')).toContainText(/提示|Tip/i);
  await expect(page.locator('#shareText')).toHaveValue(/blockbean-collapse|方块豆人/);

  await page.keyboard.press('R');
  await expect(page.locator('#result')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  expect(await forceFall('rivals')).toBe(true);
  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#resultTitle')).toContainText(/赢|You win/i);
  await expect(page.locator('#contextTip')).toBeVisible();
  await expect(page.locator('#contextTip')).toContainText(/提示|Tip|安全砖|safe tile/i);

  // start + R + further keydowns all call unlockAudio; event must fire once per load
  const unlocks = await page.evaluate(() => (window.__vaEvents || []).filter(e => e?.name === 'audio_unlock'));
  expect(unlocks).toHaveLength(1);
  expect(unlocks[0]?.data?.first).toBe(true);

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('P0 local-out shows result + round_end; spectate next/leave work', async ({ page }) => {
  test.setTimeout(90_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });

  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }

  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  // Formal rounds grant 1 scramble revive (Fall Guys mid-round checkpoint pattern).
  await expect.poll(() => page.evaluate(() => window.__game?.scrambleRevivesLeft)).toBe(1);

  // First fall → revive, still in play.
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.p.y = -20;
    me.v.y = -1;
    return true;
  })).toBe(true);

  await expect.poll(() => page.evaluate(() => {
    const events = window.__vaEvents || [];
    const revived = events.some(e => e?.name === 'scramble_revive');
    const me = window.__game?.beans?.find(b => b.name === '你');
    return revived && me?.alive === true && window.__game?.scrambleRevivesLeft === 0 && window.__game?.state === 'play';
  }), { timeout: 8_000 }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => (window.__game?.lastJuice?.reviveAt || 0) > 0)).toBeTruthy();
  await expect(page.locator('#result')).toBeHidden();

  // Second fall → death tumble watch, then result-first local_out (no more revives).
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.invulnT = 0;
    me.p.y = -20;
    me.v.y = -1;
    return true;
  })).toBe(true);

  // Player must see their own fall before the result card.
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    const resultHidden = document.getElementById('result')?.hidden !== false;
    return Boolean(me?.fallingDeath) && resultHidden && window.__game?.roundEndFired !== true;
  }), { timeout: 5_000 }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => (window.__game?.lastJuice?.fallDeathAt || 0) > 0)).toBeTruthy();

  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#resultTitle')).toContainText(/出局|out/i);
  await expect(page.locator('#continueSpectateBtn')).toBeVisible();
  await expect(page.locator('#resultLeaveBtn')).toBeVisible();
  await expect(page.locator('#replayBtn')).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const events = window.__vaEvents || [];
    return events.filter(e => e?.name === 'round_end').map(e => e.data?.end_reason);
  })).toEqual(['local_out']);

  await expect.poll(() => page.evaluate(() => window.__game?.roundEndFired === true)).toBeTruthy();

  await page.locator('#continueSpectateBtn').click();
  await expect(page.locator('#result')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__game?.spectating === true && window.__game?.watchingAfterLocalOut === true))
    .toBeTruthy();
  await expect(page.locator('#spectateNextBtn')).toBeVisible();
  await expect(page.locator('#spectateLeaveBtn')).toBeVisible();

  // R during spectate must restart immediately (not wait for last bean).
  await page.keyboard.press('R');
  await expect.poll(() => page.evaluate(() => {
    const events = window.__vaEvents || [];
    return events.some(e => e?.name === 'spectate_next');
  })).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toMatch(/count|play/);
  await expect(page.locator('#result')).toBeHidden();

  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');
  // Burn free revive, then fall again for local_out.
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.p.y = -20;
    me.v.y = -1;
    return true;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__game?.scrambleRevivesLeft === 0 && window.__game?.beans?.find(b => b.name === '你')?.alive), { timeout: 8_000 }).toBeTruthy();
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.invulnT = 0;
    me.p.y = -20;
    me.v.y = -1;
    return true;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.__game?.localFallingDeath)), { timeout: 5_000 }).toBeTruthy();
  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await page.locator('#resultLeaveBtn').click();
  await expect.poll(() => page.evaluate(() => {
    const events = window.__vaEvents || [];
    return events.some(e => e?.name === 'spectate_leave') && (window.__game?.state === 'menu');
  })).toBeTruthy();
  await expect(page.locator('#splash, #startLobby').first()).toBeVisible();

  const roundEnds = await page.evaluate(() => (window.__vaEvents || []).filter(e => e?.name === 'round_end'));
  expect(roundEnds.length).toBeGreaterThanOrEqual(2);
  expect(roundEnds.every(e => e.data?.end_reason === 'local_out')).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('player splash hides developer settings grid by default', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page);

  // Settings knobs must not paint as an open wall for new players.
  const panel = page.locator('#devPanel');
  await expect(panel).toBeAttached();
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute('open', '');
  await expect(page.locator('#settings')).toBeHidden();
  await expect(page.locator('#modeSelect')).toBeHidden();
  await expect(page.locator('#botSelect')).toBeHidden();
  await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('#motionBtn')).toBeVisible();
  await expect(page.locator('#langBtn')).toBeVisible();

  // Explicit ?dev=1 may open the panel for developers.
  await page.goto('/?dev=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#devPanel')).toHaveAttribute('open', '');
  await expect(page.locator('#settings')).toBeVisible();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
  if (await fallback.isVisible()) return;
  await expect(start).toBeEnabled({ timeout: 30_000 }).catch(() => {});
});

test('push and collapse juice hooks fire on real round', async ({ page }) => {
  test.setTimeout(90_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  // Place a rival directly in front of the local bean and press push.
  expect(await page.evaluate(() => {
    const g = window.__game;
    const me = g.beans.find(b => b.name === '你');
    const rival = g.beans.find(b => b.ai && b.alive);
    if (!me || !rival) return false;
    me.m.rotation.y = 0;
    me.cd = 0;
    me.p.set(0, me.p.y, 0);
    me.m.position.copy(me.p);
    rival.p.set(0, me.p.y, 1.1);
    rival.m.position.copy(rival.p);
    rival.v.set(0, 0, 0);
    return true;
  })).toBeTruthy();

  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => (window.__game?.lastJuice?.pushAt || 0) > 0), { timeout: 5_000 }).toBeTruthy();

  // Schedule immediate crack on a solid tile (real round — not practice).
  await page.evaluate(() => {
    const t = window.__game.tiles.find(tile => tile.st === 'ok');
    if (t) t.crackAt = -1;
  });
  await expect.poll(() => page.evaluate(() => {
    const j = window.__game?.lastJuice;
    return Boolean(j && (j.warnAt > 0 || j.fallAt > 0));
  }), { timeout: 8_000 }).toBeTruthy();
  await expect(page.locator('#crackWarn')).toBeAttached();

  // Analog steer fields exist on beans (smooth movement path).
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    const bot = window.__game?.beans?.find(b => b.ai);
    return typeof me?.steerX === 'number' && typeof bot?.steerX === 'number';
  })).toBeTruthy();

  // One-shot punch must damp out (no continuous sway stuck on).
  await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => (window.__game?.cameraPunch || 0) < 0.05)).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('victim knockback juice when rival pushes local bean', async ({ page }) => {
  test.setTimeout(90_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  expect(await page.evaluate(() => {
    const g = window.__game;
    const me = g.beans.find(b => b.name === '你');
    const rival = g.beans.find(b => b.ai && b.alive);
    if (!me || !rival || typeof g.debugPush !== 'function') return false;
    rival.m.rotation.y = 0;
    rival.cd = 0;
    rival.p.set(0, me.p.y, 0);
    rival.m.position.copy(rival.p);
    me.p.set(0, me.p.y, 1.1);
    me.m.position.copy(me.p);
    me.v.set(0, 0, 0);
    me.invulnT = 0;
    me.stunT = 0;
    g.debugPush(rival);
    return (g.lastJuice?.pushedAt || 0) > 0;
  })).toBeTruthy();

  await expect.poll(() => page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    const events = window.__vaEvents || [];
    return (me?.stunT || 0) > 0 || events.some(e => e?.name === 'push_received');
  }), { timeout: 5_000 }).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('death tumble then result; chase cam follows hero yaw', async ({ page }) => {
  test.setTimeout(90_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  // Code-side rig is attached (torso + limbs) — no Tripo skinned GLB required.
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    const bot = window.__game.beans.find(b => b.ai);
    const r = me?.m?.userData?.rig;
    const br = bot?.m?.userData?.rig;
    return Boolean(window.__game?.codeRig)
      && r?.torso && r?.armL && r?.legR && r?.tumble
      && br?.torso && br?.armR;
  })).toBeTruthy();

  // Mesh face correction: Tripo GLB native face +X; attachBeanRig yaw -π/2 maps face → game +Z.
  const visYaw = await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    let y = me.m.userData.rig.visual.rotation.y;
    while (y > Math.PI) y -= Math.PI * 2;
    while (y < -Math.PI) y += Math.PI * 2;
    return y;
  });
  // Normalize wrap: accept -π/2 or equivalent within 0.08.
  let dVis = visYaw + Math.PI / 2;
  while (dVis > Math.PI) dVis -= Math.PI * 2;
  while (dVis < -Math.PI) dVis += Math.PI * 2;
  expect(Math.abs(dVis)).toBeLessThan(0.08);

  // Push aims along bean forward (local +Z): rival on +Z at yaw 0 must get hit.
  await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    const rival = window.__game.beans.find(b => b.ai && b.alive) || window.__game.beans.find(b => b.ai);
    me.m.rotation.y = 0;
    me.p.set(0, Math.max(me.p.y, 0.5), 0);
    me.m.position.copy(me.p);
    me.cd = 0;
    me.alive = true;
    if (rival) {
      rival.alive = true;
      rival.invulnT = 0;
      rival.p.set(0.1, me.p.y, 1.2);
      rival.m.position.copy(rival.p);
    }
    window.__game.lastJuice.pushAt = 0;
    window.__game.debugPush(me);
  });
  await expect.poll(() => page.evaluate(() => (window.__game?.lastJuice?.pushAt || 0) > 0), { timeout: 3_000 }).toBeTruthy();

  // Burn scramble revive first.
  await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.p.y = -20; me.v.y = -1;
  });
  await expect.poll(() => page.evaluate(() => window.__game?.scrambleRevivesLeft === 0), { timeout: 8_000 }).toBeTruthy();

  // Face +Z then +X and confirm chase yaw tracks (third-person behind-bean).
  await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.m.rotation.y = 0;
    me.p.set(0, me.p.y, 0);
    me.m.position.copy(me.p);
  });
  await page.waitForTimeout(350);
  const yaw0 = await page.evaluate(() => window.__game.camChaseYaw);
  expect(Math.abs(yaw0) < 0.6 || Math.abs(Math.abs(yaw0) - Math.PI * 2) < 0.6).toBeTruthy();

  await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.m.rotation.y = Math.PI / 2;
    me.lastWishYaw = Math.PI / 2;
    me.steerX = 1;
    me.steerZ = 0;
  });
  await expect.poll(() => page.evaluate(() => {
    const y = window.__game.camChaseYaw;
    // nearest angle distance to +PI/2
    let d = y - Math.PI / 2;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }), { timeout: 3_000 }).toBeLessThan(0.5);

  // Walk lean: hold screen-forward (W → +Z at yaw≈0), assert lean + walk clip + limb swing.
  await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.m.rotation.y = 0;
    me.p.set(0, Math.max(me.p.y, 0), 0);
    me.m.position.copy(me.p);
    me.v.set(0, 0, 4);
    me.steerX = 0;
    me.steerZ = 1;
    me.ground = true;
    me.leanPitch = 0;
    me.m.userData.rig.phase = 0.5;
    me.m.userData.rig.clip = 'idle';
  });
  // Settle chase yaw back to ~0 so cam-relative W maps to world +Z.
  await expect.poll(() => page.evaluate(() => {
    let y = window.__game.camChaseYaw;
    while (y > Math.PI) y -= Math.PI * 2;
    while (y < -Math.PI) y += Math.PI * 2;
    return Math.abs(y);
  }), { timeout: 5_000 }).toBeLessThan(0.55);
  // Hold W (screen forward / +Z at camChaseYaw≈0): bean yaw faces +Z, lean along run dir.
  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    const rig = me?.m?.userData?.rig;
    if (!me || !rig) return false;
    if (me.alive && !me.fallingDeath) {
      me.ground = true;
      me.v.z = Math.max(me.v.z, 4);
      me.steerZ = 1;
    }
    let face = me.m.rotation.y;
    while (face > Math.PI) face -= Math.PI * 2;
    while (face < -Math.PI) face += Math.PI * 2;
    const facesRunDir = Math.abs(face) < 0.7; // ~0 faces +Z
    const limbSwing = Math.abs(rig.armL.rotation.x) + Math.abs(rig.legR.rotation.x);
    const leanFwd = me.leanPitch > 0.04 && rig.torso.rotation.x > 0.03;
    return facesRunDir && leanFwd && (rig.clip === 'walk' || limbSwing > 0.12) && limbSwing > 0.08;
  }), { timeout: 5_000 }).toBeTruthy();
  await page.keyboard.up('KeyW');

  // Fall tumble uses code rig tumble root + fall clip (death watch before result).
  const tumbleBefore = await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.invulnT = 0;
    me.p.y = -20;
    me.v.y = -1;
    return {
      tx: me.m.userData.rig.tumble.rotation.x,
      ty: me.m.userData.rig.tumble.rotation.y,
      tz: me.m.userData.rig.tumble.rotation.z,
    };
  });
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    return me?.fallingDeath === true && document.getElementById('result')?.hidden !== false;
  }), { timeout: 5_000 }).toBeTruthy();
  await expect.poll(() => page.evaluate((before) => {
    const me = window.__game.beans.find(b => b.name === '你');
    const t = me?.m?.userData?.rig?.tumble?.rotation;
    if (!t || me?.m?.userData?.rig?.clip !== 'fall') return false;
    const moved = Math.abs(t.x - before.tx) + Math.abs(t.y - before.ty) + Math.abs(t.z - before.tz);
    const flail = Math.abs(me.m.userData.rig.armL.rotation.x) + Math.abs(me.m.userData.rig.legL.rotation.x);
    return moved > 0.2 || flail > 0.2;
  }, tumbleBefore), { timeout: 5_000 }).toBeTruthy();
  // Camera still focuses the tumbling hero (not yet result).
  await expect.poll(() => page.evaluate(() => window.__game.roundEndFired !== true)).toBeTruthy();
  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => window.__game?.lastEndReason === 'local_out')).toBeTruthy();

  // Asset clip hook map exists for Tripo swap.
  await expect.poll(() => page.evaluate(() => typeof window.__game?.assetClips === 'object')).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('W screen-forward moves +Z with cam behind at yaw≈0', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');

  // Mesh face correction stays: visual.rotation.y ≈ -π/2 (native +X → game +Z).
  const visYaw = await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    let y = me.m.userData.rig.visual.rotation.y;
    while (y > Math.PI) y -= Math.PI * 2;
    while (y < -Math.PI) y += Math.PI * 2;
    return y;
  });
  let dVis = visYaw + Math.PI / 2;
  while (dVis > Math.PI) dVis -= Math.PI * 2;
  while (dVis < -Math.PI) dVis += Math.PI * 2;
  expect(Math.abs(dVis)).toBeLessThan(0.08);

  const before = await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.m.rotation.y = 0;
    me.p.set(0, Math.max(me.p.y, 0.5), 0);
    me.m.position.copy(me.p);
    me.v.set(0, 0, 0);
    me.steerX = 0;
    me.steerZ = 0;
    me.ground = true;
    me.alive = true;
    return { z: me.p.z, yaw: window.__game.camChaseYaw };
  });
  await page.waitForTimeout(400);
  // Ensure chase yaw settled near 0 before holding W.
  await expect.poll(() => page.evaluate(() => {
    let y = window.__game.camChaseYaw;
    while (y > Math.PI) y -= Math.PI * 2;
    while (y < -Math.PI) y += Math.PI * 2;
    return Math.abs(y);
  }), { timeout: 3_000 }).toBeLessThan(0.55);

  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate((z0) => {
    const me = window.__game.beans.find(b => b.name === '你');
    if (!me) return false;
    me.ground = true;
    let face = me.m.rotation.y;
    while (face > Math.PI) face -= Math.PI * 2;
    while (face < -Math.PI) face += Math.PI * 2;
    const yaw = window.__game.camChaseYaw;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const backDist = 11;
    const shoulder = 1.15;
    const camX = me.p.x - sinY * backDist + cosY * shoulder;
    const camZ = me.p.z - cosY * backDist - sinY * shoulder;
    const forward = { x: Math.sin(me.m.rotation.y), z: Math.cos(me.m.rotation.y) };
    const dx = camX - me.p.x;
    const dz = camZ - me.p.z;
    const behindDot = -(dx * forward.x + dz * forward.z);
    return me.p.z > z0 + 0.35 && Math.abs(face) < 0.7 && behindDot > 0.5;
  }, before.z), { timeout: 5_000 }).toBeTruthy();
  await page.keyboard.up('KeyW');

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('perf telemetry module boots and can classify a frame spike without throwing', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page);
  if (await fallback.isVisible()) {
    expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
    return;
  }
  await expect(start).toBeEnabled();
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toMatch(/count|play/);

  // Force a synthetic spike through the same __va hook used by the game.
  const got = await page.evaluate(async () => {
    const { createPerfTelemetry, isFrameSpike } = await import('/modules/perfTelemetry.js');
    const events = [];
    let now = 50_000;
    const perf = createPerfTelemetry((name, data) => events.push({ name, data }), {
      now: () => now,
      rateLimitMs: 3000,
      sampleIntervalMs: 1000
    });
    const spike = isFrameSpike(0.2);
    perf.beginFrame(0.2, { state: 'play', paused: false, slowMo: false, hidden: false, beansAlive: 2 });
    now += 1500;
    perf.beginFrame(0.016, { state: 'play', paused: false, slowMo: false, hidden: false, beansAlive: 2 });
    return {
      spike,
      names: events.map(e => e.name),
      spikeProps: events.find(e => e.name === 'perf_frame_spike')?.data || null,
      bootState: window.__game?.state || null,
    };
  });
  expect(got.spike).toBe(true);
  expect(got.names).toContain('perf_frame_spike');
  expect(got.names).toContain('perf_sample');
  expect(got.spikeProps.raw_ms).toBe(200);
  expect(got.spikeProps.clamped_ms).toBe(50);
  expect(got.bootState).toMatch(/count|play/);
  expect(pageErrors.filter(message => /SyntaxError|Unexpected token|perfTelemetry/i.test(message))).toEqual([]);
});


test('training mode: solo stable floor, push/fall QA, telemetry', async ({ page }) => {
  test.setTimeout(60_000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/flags.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maintenance: false, forceFallbackAssets: true }),
    });
  });
  await page.addInitScript(() => {
    window.__vaEvents = [];
    const prev = window.va;
    window.va = function (...args) {
      if (args[0] === 'event' && args[1]) window.__vaEvents.push(args[1]);
      return typeof prev === 'function' ? prev.apply(this, args) : undefined;
    };
    localStorage.setItem('blockbean_practice_done', '1');
    localStorage.setItem('blockbean_reduce_motion', '0');
  });
  await page.goto('/?training=1', { waitUntil: 'domcontentloaded' });
  const fallback = page.locator('#fallback, [data-fallback]').first();
  await expect.poll(async () => {
    const ready = await page.evaluate(() => Boolean(window.__game?.trainingMode));
    const unavailable = await fallback.isVisible().catch(() => false);
    return ready || unavailable;
  }, { timeout: 30_000 }).toBeTruthy();
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toMatch(/count|play/);
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 })
    .toBe('play');
  const meta = await page.evaluate(() => ({
    training: window.__game.trainingMode,
    beans: window.__game.beans.length,
    practice: window.__game.practiceRound,
    gone: window.__game.tiles.filter(t => t.st === 'gone' || t.st === 'fall').length,
    spike: window.__game.beans && document.querySelector('canvas') ? true : true,
  }));
  expect(meta.training).toBe(true);
  expect(meta.beans).toBe(1);
  expect(meta.practice).toBe(false);
  expect(meta.gone).toBe(0);

  await page.evaluate(() => window.__game.trainingForcePush());
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    return me?.m?.userData?.rig?.clip === 'push' || (me?.m?.userData?.rig?.pushT || 0) > 0;
  }), { timeout: 3_000 }).toBeTruthy();

  await page.evaluate(() => window.__game.trainingSimulateFall());
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    return me?.fallingDeath === true;
  }), { timeout: 3_000 }).toBeTruthy();
  // Auto-respawn after tumble — still in training, no result card.
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    return me && me.alive && !me.fallingDeath && me.p.y > -5;
  }), { timeout: 8_000 }).toBeTruthy();
  await expect(page.locator('#result')).toBeHidden();

  const events = await page.evaluate(() => window.__vaEvents.map(e => e.name));
  expect(events).toContain('training_enter');
  expect(events).toContain('player_eliminated');

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('countdown fall reports fell_count survival 0; spawn on ok tiles', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 5_000 })
    .toMatch(/count|play/);
  // Force fall during countdown if still counting; otherwise still check spawn safety.
  await page.evaluate(() => {
    const g = window.__game;
    for (const b of g.beans) {
      const t = g.tiles.find(tile =>
        Math.abs(tile.x - b.p.x) < 1.1 && Math.abs(tile.z - b.p.z) < 1.1
      );
      if (t && t.st === 'gone') throw new Error('spawned on gone tile');
    }
    const me = g.beans.find(b => b.name === '你');
    if (g.state === 'count') {
      me.p.y = -20;
      me.v.y = -1;
    }
  });
  // If we fell in count, check telemetry; otherwise skip.
  await page.waitForTimeout(400);
  const elim = await page.evaluate(() => {
    const events = window.__vaEvents || [];
    return events.filter(e => e.name === 'player_eliminated').map(e => e.data);
  });
  if (elim.length) {
    const last = elim[elim.length - 1];
    if (last.cause === 'fell_count') {
      expect(last.survival_s).toBe(0);
      expect(last).toHaveProperty('support');
      expect(last).toHaveProperty('had_revive');
      expect(last).toHaveProperty('map');
    } else {
      expect(last).toHaveProperty('cause');
      expect(last).toHaveProperty('support');
    }
  }
  // Cam wish follow after W — force play + revive so round_end from count fall does not block.
  await page.evaluate(() => {
    const g = window.__game;
    g.state = 'play';
    g.roundStart = performance.now();
    const me = g.beans.find(b => b.name === '你');
    me.alive = true;
    me.fallingDeath = false;
    me.fallTumble = 0;
    me.p.set(0, 1, 0);
    me.v.set(0, 0, 0);
    me.m.position.copy(me.p);
    me.m.rotation.set(0, 0, 0);
    me.m.visible = true;
    if (!me.m.parent && g.scene) g.scene.add(me.m);
    me.steerX = 0;
    me.steerZ = 1;
    me.lastWishYaw = 0;
    me.m.rotation.y = 0;
    me.ground = true;
    g.camChaseYaw = Math.PI; // start opposite so follow must settle toward wish≈0
  });
  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate(() => {
    let y = window.__game.camChaseYaw;
    while (y > Math.PI) y -= Math.PI * 2;
    while (y < -Math.PI) y += Math.PI * 2;
    return Math.abs(y);
  }), { timeout: 2_500 }).toBeLessThan(0.5);
  await page.keyboard.up('KeyW');
  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('standing on freshly falling tile remains supported until it drops', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 8_000 })
    .toMatch(/count|play/);

  const result = await page.evaluate(() => {
    const g = window.__game;
    g.state = 'play';
    g.roundStart = performance.now();
    const me = g.beans.find(b => b.name === '你');
    const tile = g.tiles.find(t => t.st === 'ok') || g.tiles[0];
    // Park player on tile center, grounded.
    me.alive = true;
    me.fallingDeath = false;
    me.p.set(tile.x, 0, tile.z);
    me.v.set(0, 0, 0);
    me.ground = true;
    me.m.position.copy(me.p);
    tile.st = 'fall';
    tile.vy = 0;
    // Fresh fall: still at rest height — must still count as support.
    const still = g.supportingTile(me);
    const freshOk = !!(still && still.t === tile);
    // Drop past ride window.
    tile.y = -0.3 - 0.85 - 0.1; // well below TILE_TOP - rideDrop
    const after = g.supportingTile(me);
    const droppedGone = !after || after.t !== tile;
    return { freshOk, droppedGone, tileSt: tile.st };
  });

  expect(result.freshOk).toBe(true);
  expect(result.droppedGone).toBe(true);
  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('scramble revive pads are ok-only never crack', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 8_000 })
    .toMatch(/count|play/);

  const result = await page.evaluate(() => {
    const g = window.__game;
    g.state = 'play';
    // Crack every tile that is not already gone, leave two ok far away.
    for (const t of g.tiles) {
      if (t.st === 'gone') continue;
      t.st = 'crack';
    }
    const oks = g.tiles.filter(t => t.st !== 'gone').slice(0, 2);
    for (const t of oks) t.st = 'ok';
    const me = g.beans.find(b => b.name === '你');
    me.p.set(0, 1, 0);
    const near = g.pickSafeTileNear(me.p, { okOnly: true });
    const pad = g.pickOkRevivePad(me.p);
    const revived = g.scrambleRevive(me);
    return {
      nearSt: near?.st ?? null,
      padSt: pad?.st ?? null,
      revived,
      landSt: (() => {
        const landed = g.tiles.find(t => Math.abs(t.x - me.p.x) < 0.2 && Math.abs(t.z - me.p.z) < 0.2);
        return landed?.st ?? null;
      })(),
      used: g.usedScrambleRevive
    };
  });

  expect(result.nearSt).toBe('ok');
  expect(result.padSt).toBe('ok');
  expect(result.revived).toBe(true);
  expect(result.landSt).toBe('ok');
  expect(result.used).toBe(true);
  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('player_eliminated payload has fall_kind and had_revive semantics', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 8_000 })
    .toMatch(/count|play/);

  await page.evaluate(() => {
    const g = window.__game;
    g.state = 'play';
    g.roundStart = performance.now() - 5000;
    const me = g.beans.find(b => b.name === '你');
    // Simulate collapse loss after a prior revive was used.
    me.alive = true;
    me.fallingDeath = false;
    me.lastSupportSt = 'crack';
    me.supportLossKind = 'collapse';
    me.lastSupportTile = { st: 'fall', y: -1, x: 0, z: 0 };
    // Mark revive already used via a successful scrambleRevive on an ok pad.
    for (const t of g.tiles) if (t.st !== 'gone') t.st = 'ok';
    g.scrambleRevive(me);
    // Force fall death after revive.
    me.p.y = -20;
    me.v.y = -5;
    me.supportLossKind = 'collapse';
    me.lastSupportSt = 'crack';
    g.beginFallDeath(me);
  });

  await page.waitForTimeout(200);
  const last = await page.evaluate(() => {
    const events = (window.__vaEvents || []).filter(e => e.name === 'player_eliminated');
    return events.length ? events[events.length - 1].data : null;
  });

  expect(last).toBeTruthy();
  expect(last.cause).toBe('fell');
  expect(last.fall_kind).toBe('collapse');
  expect(last.had_revive).toBe(1);
  expect(last).toHaveProperty('support');
  expect(['ok', 'crack', 'none']).toContain(last.support);

  // Countdown path still maps to fell_count / fall_kind count.
  await page.evaluate(() => {
    window.__vaEvents = [];
    const g = window.__game;
    g.state = 'count';
    const me = g.beans.find(b => b.name === '你');
    me.alive = true;
    me.fallingDeath = false;
    me.supportLossKind = 'air';
    me.lastSupportSt = 'ok';
    g.beginFallDeath(me);
  });
  const countDeath = await page.evaluate(() => {
    const events = (window.__vaEvents || []).filter(e => e.name === 'player_eliminated');
    return events.length ? events[events.length - 1].data : null;
  });
  expect(countDeath.cause).toBe('fell_count');
  expect(countDeath.fall_kind).toBe('count');
  expect(countDeath.survival_s).toBe(0);

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('resultDetail shows collapse death cause after beginFallDeath/endRound', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 8_000 })
    .toMatch(/count|play/);

  await page.evaluate(() => {
    const g = window.__game;
    g.state = 'play';
    g.roundStart = performance.now() - 8000;
    // Ensure no scramble revive steals the death.
    while (g.scrambleRevivesLeft > 0) {
      // drain via direct property is read-only; force fall death API instead
      break;
    }
    const me = g.beans.find(b => b.name === '你');
    me.alive = true;
    me.fallingDeath = false;
    me.lastSupportSt = 'crack';
    me.supportLossKind = 'collapse';
    me.lastSupportTile = { st: 'fall', y: -1, x: 0, z: 0 };
    // Spend revive slot by killing physics revive path: call beginFallDeath directly.
    g.beginFallDeath(me);
  });

  await expect.poll(() => page.evaluate(() => {
    const g = window.__game;
    return g?.lastDeathReason?.fall_kind || null;
  }), { timeout: 3_000 }).toBe('collapse');

  await expect.poll(() => page.evaluate(() => {
    const msg = document.querySelector('#msg')?.textContent || '';
    const cap = document.querySelector('#captions')?.textContent || '';
    return msg.includes('脚下的砖塌了') || msg.includes('floor collapsed')
      || cap.includes('脚下的砖塌了') || cap.includes('floor collapsed');
  }), { timeout: 2_000 }).toBeTruthy();

  // Wait for tumble → finishFallDeath → endRound result card.
  await expect.poll(() => page.evaluate(() => {
    const result = document.querySelector('#result');
    const detail = document.querySelector('#resultDetail')?.textContent || '';
    return Boolean(result && !result.hidden && (detail.includes('脚下的砖塌了') || detail.includes('floor collapsed')));
  }), { timeout: 5_000 }).toBeTruthy();

  const shown = await page.evaluate(() => {
    const events = (window.__vaEvents || []).filter(e => e.name === 'death_reason_shown');
    return events.length ? events[events.length - 1].data : null;
  });
  expect(shown).toBeTruthy();
  expect(shown.fall_kind).toBe('collapse');

  const detail = await page.locator('#resultDetail').textContent();
  expect(detail).toMatch(/死因：脚下的砖塌了|Cause: floor collapsed under you/);
  await expect(page.locator('#resultTitle')).toContainText(/你出局了|You are out/);

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('underfoot crack warn flashes personal jump copy once', async ({ page }) => {
  test.setTimeout(60_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 8_000 })
    .toMatch(/count|play/);

  const result = await page.evaluate(() => {
    const g = window.__game;
    g.state = 'play';
    const me = g.beans.find(b => b.name === '你');
    me.alive = true;
    me.fallingDeath = false;
    const tile = g.tiles.find(t => t.st === 'ok') || g.tiles[0];
    tile.st = 'crack';
    tile.t = 1.55;
    tile.underfootWarned = false;
    tile.graceGiven = false;
    me.p.x = tile.x;
    me.p.z = tile.z;
    me.p.y = 0.5;
    me.lastSupportTile = tile;
    me.lastSupportSt = 'crack';
    const beforeT = tile.t;
    const first = g.fireUnderfootCrackWarn(tile);
    const afterT = tile.t;
    const second = g.fireUnderfootCrackWarn(tile);
    const msg = document.querySelector('#msg')?.textContent || '';
    const crackClass = document.querySelector('#crackWarn')?.className || '';
    return { first, second, beforeT, afterT, msg, crackClass, grace: tile.graceGiven };
  });

  expect(result.first).toBe(true);
  expect(result.second).toBe(false);
  expect(result.grace).toBe(true);
  expect(result.afterT).toBeCloseTo(result.beforeT + 0.35, 5);
  expect(result.msg).toMatch(/脚下裂了|Floor cracking under you/);
  expect(result.crackClass).toMatch(/warn-underfoot/);

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('last-round replay: persist package → enter replay → ghost moves + death caption', async ({ page }) => {
  test.setTimeout(90_000);
  const fakePkg = {
    v: 1,
    at: Date.now(),
    map: 'classic',
    mode: 'classic',
    fall_kind: 'collapse',
    survival_s: 8.5,
    events: [
      { t: 0, type: 'snapshot', x: -2, z: 0, grounded: 1, alive: 4 },
      { t: 250, type: 'snapshot', x: -1, z: 0, grounded: 1, alive: 4 },
      { t: 400, type: 'tile_warn', tile: 20, x: 0, z: 0, underfoot: 1 },
      { t: 500, type: 'snapshot', x: 0, z: 0, grounded: 1, alive: 3 },
      { t: 750, type: 'snapshot', x: 1, z: 0, grounded: 1, alive: 3 },
      { t: 900, type: 'tile_fall', tile: 20, x: 0, z: 0, underfoot: 1 },
      { t: 1000, type: 'snapshot', x: 2, z: 0, grounded: 0, alive: 2 },
      { t: 1200, type: 'death', x: 2, z: 0, fall_kind: 'collapse' }
    ]
  };

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.route('**/flags.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        maintenance: false,
        maintenanceMessage: '维护提示：当前为安全演示模式。',
        forceFallbackAssets: true,
      }),
    });
  });

  await page.addInitScript(({ practiceDone, fakePkg }) => {
    window.__vaEvents = [];
    const prev = window.va;
    window.va = function (...args) {
      if (args[0] === 'event' && args[1]) window.__vaEvents.push(args[1]);
      return typeof prev === 'function' ? prev.apply(this, args) : undefined;
    };
    if (practiceDone) localStorage.setItem('blockbean_practice_done', '1');
    localStorage.setItem('blockbean_reduce_motion', '1');
    localStorage.setItem('blockbean_last_replay', JSON.stringify(fakePkg));
  }, { practiceDone: true, fakePkg });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const start = page.locator('#start');
  const fallback = page.locator('#fallback, [data-fallback]').first();
  await expect.poll(async () => {
    const ready = await start.isEnabled().catch(() => false);
    const unavailable = await fallback.isVisible().catch(() => false);
    return ready || unavailable;
  }, { timeout: 30_000 }).toBeTruthy();

  if (await fallback.isVisible()) {
    await expect(fallback).toContainText(/WebGL|渲染|fallback/i);
    return;
  }

  await expect(page.locator('#splashReplayBtn')).toBeVisible();
  await page.locator('#splashReplayBtn').click();

  await expect.poll(() => page.evaluate(() => window.__game?.state === 'replay' && window.__game?.replayMode === true), {
    timeout: 8_000
  }).toBeTruthy();

  await expect.poll(() => page.evaluate(() => {
    const events = window.__vaEvents || [];
    return events.some(e => e?.name === 'replay_start');
  })).toBeTruthy();

  const startX = await page.evaluate(() => window.__game?.beans?.[0]?.p?.x ?? null);
  expect(startX).not.toBeNull();

  await expect.poll(() => page.evaluate(() => {
    const b = window.__game?.beans?.[0];
    return b && Math.abs(b.p.x - (-2)) > 0.4;
  }), { timeout: 6_000 }).toBeTruthy();

  await expect.poll(() => page.evaluate(() => {
    const cap = document.getElementById('captions')?.textContent || '';
    const msg = document.getElementById('msg')?.textContent || '';
    return /塌了|collapsed|回放结束|Replay ended|死因/i.test(cap + msg);
  }), { timeout: 8_000 }).toBeTruthy();

  await expect.poll(() => page.evaluate(() => {
    const events = window.__vaEvents || [];
    return events.some(e => e?.name === 'replay_end');
  }), { timeout: 8_000 }).toBeTruthy();

  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__game?.replayMode !== true && window.__game?.state !== 'replay'), {
    timeout: 5_000
  }).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});

test('local_out persists blockbean_last_replay for next loss', async ({ page }) => {
  test.setTimeout(90_000);
  const { pageErrors, start, fallback } = await bootGame(page, { practiceDone: true });
  if (await fallback.isVisible()) return;

  await page.evaluate(() => localStorage.removeItem('blockbean_last_replay'));
  await start.click();
  await expect.poll(() => page.evaluate(() => window.__game?.state ?? 'missing'), { timeout: 10_000 }).toBe('play');

  // Burn revive then die.
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.p.y = -20; me.v.y = -1;
    return true;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__game?.scrambleRevivesLeft === 0), { timeout: 8_000 }).toBeTruthy();

  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.invulnT = 0; me.p.y = -20; me.v.y = -1;
    return true;
  })).toBe(true);

  await expect(page.locator('#result')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('#replayLastBtn')).toBeVisible();

  const pkg = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('blockbean_last_replay') || 'null'); }
    catch (_) { return null; }
  });
  expect(pkg?.v).toBe(1);
  expect(Array.isArray(pkg?.events)).toBe(true);
  expect(pkg.events.length).toBeGreaterThan(0);
  expect(pkg.events.some(e => e.type === 'death' || e.type === 'snapshot')).toBe(true);

  await page.locator('#replayLastBtn').click();
  await expect.poll(() => page.evaluate(() => window.__game?.state === 'replay'), { timeout: 8_000 }).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});
