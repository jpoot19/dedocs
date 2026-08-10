/**
 * tsup build configuration.
 *
 * Two entries ship from this package:
 *
 *   - `@dedocs`            — the main barrel (consumer-facing API).
 *   - `@dedocs/editor/engine` — the raw extensions + utilities (library
 *                              authors who want to compose into their own
 *                              editor).
 *
 * Both are emitted as ESM (default) + CJS for compatibility with
 * different bundlers. tsup handles treeshaking and DTS generation; we
 * mark React and Tiptap as external so the consumer's bundler resolves
 * the single shared copy.
 */

import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry: @dedocs
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    target: 'es2020',
    external: ['react', 'react-dom', /^@tiptap\//],
  },
  // Subpath entry: @dedocs/editor/engine
  {
    entry: { 'editor/engine': 'src/editor/engine.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    target: 'es2020',
    external: ['react', 'react-dom', /^@tiptap\//],
  },
]);