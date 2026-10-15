import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup/unit.ts'],
    globalSetup: './tests/setup/global.ts',
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: false },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**'],
      reporter: ['text', 'html'],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
