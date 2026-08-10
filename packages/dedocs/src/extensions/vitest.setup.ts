/**
 * Vitest setup file for dedocs.
 *
 * Phase 7 (Toolchain) wires this into `vitest.config.ts` via
 * `setupFiles: ['./vitest.setup.ts']`. It exists today so the testing
 * notes documented in `RESIZE_OBSERVER_TESTING.md` are mirrored as a
 * ready-to-copy template.
 *
 * This file MUST NOT throw if `resize-observer-polyfill` is not yet
 * installed (e.g. during incremental PR development before Phase 7
 * wires the dependency). The conditional install keeps local
 * `pnpm test` runs working even before the dep is added.
 */

import ResizeObserverPolyfill from 'resize-observer-polyfill';

interface ResizeObserverPolyfillModule {
  default?: typeof ResizeObserverPolyfill;
}

async function loadPolyfill(): Promise<typeof ResizeObserverPolyfill | null> {
  try {
    // Optional import: package may not be installed yet on early PRs.
    const mod =
      await import(/* @vite-ignore */ 'resize-observer-polyfill' as string);
    return (mod as ResizeObserverPolyfillModule).default ?? null;
  } catch {
    return null;
  }
}

export async function setup() {
  if (typeof globalThis.ResizeObserver !== 'undefined') return;

  const Polyfill = await loadPolyfill();
  if (Polyfill) {
    globalThis.ResizeObserver = Polyfill as unknown as typeof ResizeObserver;
  }
}

// Auto-execute when imported as a setupFile. Vitest awaits the
// returned promise.
await setup();
