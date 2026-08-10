/**
 * Playwright configuration for dedocs e2e tests.
 *
 * The e2e suite targets a real Chromium browser against the Vite-based
 * playground (`playground/`). Keeping the e2e tests in `packages/dedocs`
 * means the playground dev-server dependency stays explicit and we can
 * parameterise the base URL via env vars when running in CI.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 10_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYGROUND_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYGROUND_URL
    ? undefined
    : {
        command: 'pnpm --filter playground dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});