import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  // Workspace alias: `@dedocs` resolves to the in-tree package so the
  // playground always exercises the latest source rather than a stale
  // dist build.
  resolve: {
    alias: {
      '@dedocs': new URL('../packages/dedocs/src/index.ts', import.meta.url).pathname,
    },
  },
});