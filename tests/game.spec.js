import { test, expect } from '@playwright/test';

test('loads, starts, eliminates beans, and shows the result screen', async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // Skip multi-MB GLB parse on the main thread so the regression stays about
  // game flow (start → eliminate → result), not asset decode time.
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

  await page.addInitScript(() => {
    localStorage.setItem('blockbean_practice_done', '1');
    localStorage.removeItem('blockbean_tip_out_seen');
    localStorage.removeItem('blockbean_tip_win_seen');
    localStorage.removeItem('blockbean_tip_never');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();

  const start = page.locator('#start');
  const progress = page.locator('#loadbar');
  await expect(start).toHaveAttribute('id', 'start');
  await expect(progress).toHaveAttribute('role', 'progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', /^\d+$/);
  const fallback = page.locator('#fallback, [data-fallback]').first();
  await expect.poll(async () => {
    const ready = await start.isEnabled().catch(() => false);
    const unavailable = await fallback.isVisible().catch(() => false);
    return ready || unavailable;
  }, { timeout: 30_000 }).toBeTruthy();

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

  // Prefer play so physics/endRound run on the normal path; wall-clock countdown
  // makes this bound even when a frame is delayed.
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
  // Observable tip content is the product surface; localStorage is an implementation detail.
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
