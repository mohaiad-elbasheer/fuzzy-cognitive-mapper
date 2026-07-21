import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated accessibility checks (Sprint 3 exit criterion): axe scans of
 * the main workspaces in both themes must produce no critical or serious
 * violations.
 */

const openApp = async (page: Page) => {
  await page.addInitScript(() => localStorage.setItem('fcm_walkthrough_done', '1'));
  await page.goto('/');
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15_000 });
};

const scan = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    // The React Flow canvas internals are third-party; scan our UI chrome
    .exclude('.react-flow__viewport')
    .analyze();
  return results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
};

const report = (violations: Awaited<ReturnType<typeof scan>>) =>
  violations.map(v => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} nodes: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join('; ')})`).join('\n');

test('Map workspace has no serious accessibility violations (dark)', async ({ page }) => {
  await openApp(page);
  const violations = await scan(page);
  expect(violations, report(violations)).toEqual([]);
});

test('Map workspace has no serious accessibility violations (light)', async ({ page }) => {
  await openApp(page);
  await page.getByLabel('Switch to light theme').click();
  await page.waitForTimeout(600);
  const violations = await scan(page);
  expect(violations, report(violations)).toEqual([]);
});

test('Experiments workspace has no serious accessibility violations', async ({ page }) => {
  await openApp(page);
  await page.getByTitle('Experiments').click();
  await page.waitForTimeout(1500);
  const violations = await scan(page);
  expect(violations, report(violations)).toEqual([]);
});

test('Matrix workspace has no serious accessibility violations', async ({ page }) => {
  await openApp(page);
  await page.getByTitle('Matrix').click();
  await page.waitForTimeout(1500);
  const violations = await scan(page);
  expect(violations, report(violations)).toEqual([]);
});
