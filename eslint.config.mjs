import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

// ESLint com as regras do Next.js (inclui react-hooks) e do TypeScript (#33)
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'graphify-out/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts', '.agents/**', '.claude/**', 'assets-src/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Código novo sem `any` (diretriz do projeto); o legado é tratado aos poucos
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Testes E2E acessam a store exposta em window
    files: ['e2e/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];

export default config;
