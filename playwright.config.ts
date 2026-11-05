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
  // WebGL por software no runner de 2 núcleos: uma nova tentativa no CI, com trace gravado nela
  retries: process.env.CI ? 1 : 0,
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
      // Resolução escolar padrão (o preset "Desktop Chrome" trocaria para 1280x720)
      grepInvert: /@375/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
        launchOptions: {
          args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
        },
      },
    },
    {
      // Celular: só os testes marcados com @375 (#33)
      name: 'mobile-375',
      grep: /@375/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        hasTouch: true,
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
    // Modo Professor nos testes: repositório em memória, nunca o banco de produção (#80)
    env: { CLASSROOM_REPO: 'memory' },
    timeout: 120 * 1000,
  },
});

