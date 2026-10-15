import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * Configuration ESLint 9 (format « flat ») du projet WMS.
 *
 * Les règles Next.js (core-web-vitals + TypeScript) sont reprises telles
 * quelles, avec quelques ajustements propres au projet.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      'data/**',
      'next-env.d.ts',
      'scripts/generate-env.mjs',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Les journaux serveur restent utiles en exploitation ; on interdit
      // seulement les traces laissées par erreur pendant le développement.
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
