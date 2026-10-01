import { defineConfig, devices } from '@playwright/test';

// docs/tasks/T19: no webServer here — `npm run test:e2e` wraps this whole run in
// `firebase emulators:exec`, which brings up auth/firestore/hosting (serving `dist`, built with
// `vite build --mode e2e`) before this file's tests start and tears them down after.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    ...devices['iPhone 13'],
    // Only chromium is installed locally (iPhone 13's own preset defaults to webkit).
    browserName: 'chromium',
    defaultBrowserType: 'chromium',
  },
});
