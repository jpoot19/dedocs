# ResizeObserver Testing Notes

The `Pagination` extension depends on the browser `ResizeObserver` API to
trigger recomputation when top-level blocks change size. Both `happy-dom`
and `jsdom` ship a stub `ResizeObserver` that does NOT fire callbacks, so
unit tests need to either:

1. **Polyfill via `resize-observer-polyfill`** (recommended for happy-dom).
2. **Mock `ResizeObserver` manually** via `vi.mock` (recommended for fully
   deterministic behaviour, e.g. asserting exact `requestAnimationFrame`
   call counts).

## Dependency

`packages/dedocs/package.json` (created in Phase 7 — Toolchain) MUST
declare:

```jsonc
{
  "devDependencies": {
    "resize-observer-polyfill": "^1.5.1"
  }
}
```

Vitest config (also Phase 7) loads the polyfill in `setupFiles`:

```ts
// packages/dedocs/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

```ts
// packages/dedocs/vitest.setup.ts
import ResizeObserverPolyfill from 'resize-observer-polyfill';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}
```

## Deterministic Mock Pattern

When a test needs to drive the observer manually (e.g. simulate a block
growing past the page boundary), replace `ResizeObserver` with a tiny
stub that records calls and exposes a `trigger()` helper:

```ts
// test-utils/mockResizeObserver.ts
import { vi } from 'vitest';

export function installMockResizeObserver() {
  const callbacks: Array<() => void> = [];

  const Mock = class {
    constructor(cb: ResizeObserverCallback) {
      callbacks.push(() => cb([], this));
    }
    observe() {}
    unobserve() {}
    disconnect() {
      callbacks.length = 0;
    }
  };

  vi.stubGlobal('ResizeObserver', Mock);

  return {
    /** Fire every registered callback. */
    trigger: () => callbacks.forEach((cb) => cb()),
    /** Total registered callbacks — useful for asserting observer wiring. */
    count: () => callbacks.length,
    restore: () => vi.unstubAllGlobals(),
  };
}
```

Sample usage inside a Vitest spec:

```ts
import { installMockResizeObserver } from './test-utils/mockResizeObserver';
import { renderPaginatedEditor } from './test-utils/renderPaginatedEditor';

it('emits a break when the document exceeds one page', async () => {
  const ro = installMockResizeObserver();

  const { view, pluginKey } = renderPaginatedEditor({
    content: '<p>'.repeat(50) + '</p>',
    pageSetup: { paperSize: 'A4' },
  });

  ro.trigger();           // Force pagination recomputation.
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  const state = pluginKey.getState(view.state);
  expect(state?.breaks.length ?? 0).toBeGreaterThan(0);

  ro.restore();
});
```

## rAF / MutationObserver Notes

`requestAnimationFrame` in Vitest defaults to a polyfill that runs the
callback synchronously on the next tick. If a test asserts exact rAF
scheduling, stub it:

```ts
import { vi } from 'vitest';

const rafCallbacks: FrameRequestCallback[] = [];

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});

vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
  rafCallbacks[handle - 1] = undefined as unknown as FrameRequestCallback;
});

export function flushRaf() {
  const pending = rafCallbacks.splice(0);
  pending.forEach((cb) => cb(performance.now()));
}
```

`MutationObserver` IS available in happy-dom, so the
`childList: true` branch of `Pagination` works in tests without
mocking.
