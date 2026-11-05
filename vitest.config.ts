import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` só existe dentro do Next (condição react-server); nos testes é um módulo vazio
      'server-only': fileURLToPath(new URL('./src/server/__tests__/serverOnlyStub.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
