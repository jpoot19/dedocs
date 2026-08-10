/**
 * Vitest configuration for `@dedocs`.
 *
 * - `happy-dom` provides the DOM (lighter than jsdom; fires most layout
 *   primitives including `MutationObserver`).
 * - `resize-observer-polyfill` is loaded as a global so the `Pagination`
 *   plugin can construct `new ResizeObserver(...)` in unit tests.
 * - `globals: true` lets specs use `describe` / `it` / `expect` without
 *   imports.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/extensions/vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    css: false,
  },
});