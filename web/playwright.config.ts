import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  // Local-only smoke: requires the backend built (dist/server.js) and web dev server.
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node ../backend/dist/server.js',
      port: 5001,
      reuseExistingServer: !process.env.CI,
    },
  ],
});