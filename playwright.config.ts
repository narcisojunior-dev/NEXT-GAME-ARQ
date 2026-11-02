import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  // WebGL roda por software (SwiftShader): a Vitrine 3D após a bancada 3D chegava a 31s com teto de 30s
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
        },
      },
    },
  ],
  webServer: {
    // `npm run dev` sobe na 3000: sem a porta explícita o Playwright esperava a 3001 até o timeout
    command: `npm run dev -- -p ${new URL(baseURL).port || '3001'}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});

