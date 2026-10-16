import { test, expect } from '@playwright/test';

test('loads, starts, eliminates beans, and shows the result screen', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('blockbean_practice_done', '1');
    localStorage.removeItem('blockbean_tip_out_seen');
    localStorage.removeItem('blockbean_tip_win_seen');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();

  const start = page.locator('#start');
  const progress = page.locator('#loadbar');
  // Assets may finish before this assertion in a fast runner; the progressbar
  // semantics below still verify the loading gate surface.
  await expect(progress).toHaveAttribute('role', 'progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', /^\d+$/);
  const fallback = page.locator('#fallback, [data-fallback]').first();
  await expect.poll(async () => {
    const ready = await start.isEnabled().catch(() => false);
    const unavailable = await fallback.isVisible().catch(() => false);
    return ready || unavailable;
  }, { timeout: 30_000 }).toBeTruthy();

  // Headless runners without a WebGL context should still get a readable,
  // actionable fallback instead of an uncaught renderer exception.
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

  // __game exposes the current beans for spectator/debug tooling. Moving every
  // bean below the arena makes the regression deterministic and fast while
  // exercising the same physics, out, and result code as a real fall.
  const forcedFall = await page.evaluate(() => {
    const game = window.__game;
    if (!game?.beans?.length) return false;
    for (const bean of game.beans) {
      bean.p.y = -20;
      bean.v.y = -1;
    }
    return true;
  });
  expect(forcedFall).toBe(true);

  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#resultTitle')).toContainText(/出局|赢|WIN|LOSE/i);
  await expect(page.locator('#contextTip')).toBeVisible();
  await expect(page.locator('#contextTip')).toContainText(/提示|Tip/i);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('blockbean_tip_out_seen'))).toBe('1');
  await expect(page.locator('#shareText')).toHaveValue(/blockbean-collapse|方块豆人/);

  const winPage = await page.context().newPage();
  await winPage.addInitScript(() => {
    localStorage.setItem('blockbean_practice_done', '1');
    localStorage.removeItem('blockbean_tip_win_seen');
  });
  await winPage.goto('/', { waitUntil: 'domcontentloaded' });
  const winStart = winPage.locator('#start');
  const winFallback = winPage.locator('#fallback, [data-fallback]').first();
  await expect.poll(async () => {
    const ready = await winStart.isEnabled().catch(() => false);
    const unavailable = await winFallback.isVisible().catch(() => false);
    return ready || unavailable;
  }, { timeout: 30_000 }).toBeTruthy();
  if (await winFallback.isVisible()) {
    await winPage.close();
    return;
  }
  await winStart.click();
  await expect(winPage.locator('#splash')).toBeHidden();
  await expect.poll(() => winPage.evaluate(() => window.__game?.state ?? 'missing'))
    .toMatch(/count|play/);
  const forcedWin = await winPage.evaluate(() => {
    const game = window.__game;
    if (!game?.beans?.length) return false;
    for (const bean of game.beans) {
      const isPlayer = bean.name === '你';
      bean.alive = isPlayer;
      if (!isPlayer) {
        bean.p.y = -20;
        bean.v.y = -1;
      }
    }
    return true;
  });
  expect(forcedWin).toBe(true);
  await expect(winPage.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect(winPage.locator('#resultTitle')).toContainText(/赢|You win/i);
  await expect(winPage.locator('#contextTip')).toBeVisible();
  await expect.poll(() => winPage.evaluate(() => localStorage.getItem('blockbean_tip_win_seen'))).toBe('1');
  await winPage.close();
  expect(pageErrors.filter(message => /SyntaxError|Unexpected token/i.test(message))).toEqual([]);
});
