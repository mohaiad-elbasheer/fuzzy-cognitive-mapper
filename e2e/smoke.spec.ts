import { test, expect, Page } from '@playwright/test';

/**
 * Five essential user journeys (Sprint 1 exit criterion):
 * 1. Create and save a project
 * 2. Add and connect concepts
 * 3. Run and reset a simulation
 * 4. Import and export JSON/CSV
 * 5. Reload and restore a project
 */

const openApp = async (page: Page) => {
  await page.goto('/');
  // The sample map renders three concepts once the app is ready
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15_000 });
};

test('create and save a project', async ({ page }) => {
  await openApp(page);

  // File → New Project empties the canvas
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  // Rename via the inline editor in the header
  await page.getByTitle('Click to rename project').click();
  const nameInput = page.locator('header input[type="text"], header input:not([type])').first();
  await nameInput.fill('E2E Created Project');
  await nameInput.press('Enter');
  await expect(page.getByText('E2E Created Project')).toBeVisible();

  // Explicit save lands in the saved state (accessible name includes the shortcut)
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('button', { name: /^Save Ctrl\+S$/ }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
});

test('add and connect concepts', async ({ page }) => {
  await openApp(page);

  const nodesBefore = await page.locator('.react-flow__node').count();
  const edgesBefore = await page.locator('.react-flow__edge').count();

  // Add two concepts from the floating action bar
  await page.getByRole('button', { name: 'Add Concept' }).click();
  await page.getByRole('button', { name: 'Add Concept' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 2);

  // Connect them through the sidebar's connection flow
  const linkButtons = page.locator('aside, div').getByRole('button').filter({ has: page.locator('svg.lucide-link') });
  await linkButtons.last().click();
  const targetSelect = page.locator('select').filter({ hasText: 'Select Target...' }).first();
  await targetSelect.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(edgesBefore + 1);
});

test('run and reset a simulation', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: /Run Engine/i }).click();
  await expect(page.getByText(/Converged|Limit Cycle|Max Iterations Reached/)).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText('Awaiting Data')).toBeVisible();
});

test('import and export JSON/CSV', async ({ page }) => {
  await openApp(page);

  // Export the project as JSON via the File menu
  await page.getByRole('button', { name: /^File/ }).click();
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export as JSON...' }).click();
  expect((await jsonDownload).suggestedFilename()).toMatch(/\.fcm\.json$/);

  // Export the adjacency matrix as CSV from the Matrix tab
  await page.getByTitle('Matrix').click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);

  // Import a small matrix and confirm it replaces the model
  const csv = ',Alpha,Beta\nAlpha,0,0.7\nBeta,-0.2,0\n';
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({ name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText('Alpha').first()).toBeVisible();
  await expect(page.getByText(/Imported 2 concepts/)).toBeVisible();
});

test('reload and restore a project', async ({ page }) => {
  await openApp(page);

  // Make the project uniquely identifiable and modify the graph
  const uniqueName = `Persistence Check ${Date.now()}`;
  await page.getByTitle('Click to rename project').click();
  const nameInput = page.locator('header input[type="text"], header input:not([type])').first();
  await nameInput.fill(uniqueName);
  await nameInput.press('Enter');

  const nodesBefore = await page.locator('.react-flow__node').count();
  await page.getByRole('button', { name: 'Add Concept' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);

  // Wait for auto-save (5s debounce) to flush before reloading
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);
});
