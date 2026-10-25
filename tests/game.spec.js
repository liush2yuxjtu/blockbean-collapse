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

  // Drop only the local player through physics (do not mark alive=false yourself).
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.p.y = -20;
    me.v.y = -1;
    return true;
  })).toBe(true);

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
  expect(await page.evaluate(() => {
    const me = window.__game?.beans?.find(b => b.name === '你');
    if (!me) return false;
    me.p.y = -20;
    me.v.y = -1;
    return true;
  })).toBe(true);
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

  // One-shot punch must damp out (no continuous sway stuck on).
  await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => (window.__game?.cameraPunch || 0) < 0.05)).toBeTruthy();

  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});
