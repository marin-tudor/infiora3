import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:4002/privacy',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: 'C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main'
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:4000/login',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: 'C:/Users/Tudor/infiora/infiora-admin-main/infiora-admin-main'
    }
  ],
  projects: [
    {
      name: 'guest-chromium',
      testMatch: /guest-public\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4002'
      }
    },
    {
      name: 'admin-chromium',
      testMatch: /admin-auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4000'
      }
    }
  ]
})
