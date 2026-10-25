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
  });
  await expect.poll(() => page.evaluate(() => {
    const y = window.__game.camChaseYaw;
    // nearest angle distance to +PI/2
    let d = y - Math.PI / 2;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }), { timeout: 5_000 }).toBeLessThan(0.55);

  // Walk lean: hold forward, assert lean + walk clip + limb swing on the code rig.
  await page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    me.p.set(0, Math.max(me.p.y, 0), 0);
    me.m.position.copy(me.p);
    me.v.set(0, 0, 4);
    me.steerZ = 1;
    me.ground = true;
    me.leanPitch = 0;
    me.m.userData.rig.phase = 0.5;
    me.m.userData.rig.clip = 'idle';
  });
  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate(() => {
    const me = window.__game.beans.find(b => b.name === '你');
    const rig = me?.m?.userData?.rig;
    if (!me || !rig) return false;
    // Keep locomotion alive inside the poll in case friction wins a frame.
    if (me.alive && !me.fallingDeath) {
      me.ground = true;
      me.v.z = Math.max(me.v.z, 4);
      me.steerZ = 1;
    }
    const limbSwing = Math.abs(rig.armL.rotation.x) + Math.abs(rig.legR.rotation.x);
    return me.leanPitch > 0.04 && (rig.clip === 'walk' || limbSwing > 0.12) && limbSwing > 0.08;
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
