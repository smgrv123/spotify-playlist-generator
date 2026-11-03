import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration.
 *
 * Mirrors the `@/*` path alias from `tsconfig.json` manually so we avoid
 * adding `vite-tsconfig-paths` just for one alias. Tests run in the default
 * Node environment — no DOM is needed for the current pure-function suites.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
