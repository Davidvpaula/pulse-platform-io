import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/production', timeout: 30_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:8081', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 8081 --strictPort', url: 'http://127.0.0.1:8081', reuseExistingServer: false, timeout: 60_000 },
});
