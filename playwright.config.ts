import { defineConfig } from '@playwright/test';

/**
 * End-to-end smoke tests for the five essential user journeys.
 *
 * Locally you can point at a pre-installed Chromium with
 *   PW_EXECUTABLE_PATH=/path/to/chromium npm run test:e2e
 * In CI the browser is installed via `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1600, height: 1000 },
    launchOptions: process.env.PW_EXECUTABLE_PATH
      ? { executablePath: process.env.PW_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
