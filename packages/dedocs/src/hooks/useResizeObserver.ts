/**
 * `useResizeObserver` hook.
 *
 * Subscribes a `ResizeObserver` to the given element and invokes the
 * supplied callback whenever the element or any of its observed
 * descendants changes size. Cleans up automatically on unmount and when
 * the target element changes between renders.
 *
 * Why a hook instead of a class-based wrapper?
 *   - Lifecycle parity with React's effect model: subscribe on mount,
 *     unsubscribe on unmount.
 *   - Tests need a stable, callable surface — the hook returns nothing,
 *     the side effect is the subscription itself.
 *   - The `Pagination` plugin uses the same hook internally so a consumer
 *     who wants a non-paginated ResizeObserver (e.g. a custom status bar)
 *     can reuse it.
 *
 * Browser fallback: when `ResizeObserver` is undefined (older browsers or
 * test environments without the polyfill) the hook silently no-ops.
 */

import { useEffect, type RefObject } from 'react';

// ResizeObserverCallback is the global browser type — no alias needed.

export interface UseResizeObserverOptions {
  /**
   * Optional additional elements to observe alongside the root target.
   * Use this when you want to react to resizes of specific descendants
   * (e.g. every top-level block in the editor).
   */
  additionalTargets?: ReadonlyArray<Element | null | undefined>;
}

/**
 * Subscribe to size changes for `ref.current` and any
 * `additionalTargets`. The callback receives the same
 * `ResizeObserverEntry[]` the browser would normally deliver.
 */
export function useResizeObserver(
  ref: RefObject<Element | null>,
  callback: ResizeObserverCallback,
  options: UseResizeObserverOptions = {},
): void {
  const { additionalTargets } = options;

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const target = ref.current;
    if (!target) return undefined;

    const observer = new ResizeObserver(callback);
    observer.observe(target);

    const extras: Element[] = [];
    if (additionalTargets) {
      for (const el of additionalTargets) {
        if (el && el !== target) {
          observer.observe(el);
          extras.push(el);
        }
      }
    }

    return () => {
      observer.unobserve(target);
      for (const el of extras) {
        observer.unobserve(el);
      }
      observer.disconnect();
    };
    // We intentionally include the `additionalTargets` array reference;
    // consumers should memoise it if they want stable identity.
  }, [ref, callback, additionalTargets]);
}

export default useResizeObserver;