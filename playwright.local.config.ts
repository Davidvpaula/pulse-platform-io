import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/local', timeout: 60_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:8080', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev:local', url: 'http://127.0.0.1:8080', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
