/**
 * PageSetup extension.
 *
 * Emits CSS custom properties (`--page-width`, `--page-height`,
 * `--page-margin-*`) on the editor container based on the configured
 * `PageSetupOptions`. The CSS variables are the contract between the
 * engine and the page-frame stylesheet (`styles/page.css`) — the same
 * variables also drive `@page` size/margin at print time.
 *
 * See `types.ts` for the option contract and `PAGE_SETUP_CSS_VARS` for
 * the shared variable-name registry.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/page-setup/spec.md
 */

import { Extension } from '@tiptap/core';

import {
  DEFAULT_PAGE_SETUP,
  PAGE_SETUP_CSS_VARS,
  type PageSetupOptions,
} from '../types';
import { getPaperDimensions } from '../utils/paperSizes';

export interface PageSetupStorage {
  /** Currently applied page setup. Updated by `setPageSetup`. */
  current: PageSetupOptions;
}

/**
 * Pure helper: turn a `PageSetupOptions` value into a CSS-variable name/value
 * map. Kept outside the Extension so it is unit-testable without a Tiptap
 * editor instance.
 */
export function resolvePageSetupCssVars(options: PageSetupOptions): Record<
  string,
  string
> {
  const dims = getPaperDimensions(options.paperSize, options.orientation);
  return {
    [PAGE_SETUP_CSS_VARS.width]: `${dims.width}mm`,
    [PAGE_SETUP_CSS_VARS.height]: `${dims.height}mm`,
    [PAGE_SETUP_CSS_VARS.marginTop]: `${options.margins.top}cm`,
    [PAGE_SETUP_CSS_VARS.marginRight]: `${options.margins.right}cm`,
    [PAGE_SETUP_CSS_VARS.marginBottom]: `${options.margins.bottom}cm`,
    [PAGE_SETUP_CSS_VARS.marginLeft]: `${options.margins.left}cm`,
  };
}

/**
 * Merge a partial `PageSetupOptions` (e.g. from `createDedocsEditor({ pageSetup })`)
 * with the default. Top-level keys fall back independently; nested `margins`
 * merge with the default margins object.
 */
export function mergePageSetup(
  partial: Partial<PageSetupOptions> | undefined,
): PageSetupOptions {
  if (!partial) {
    return { ...DEFAULT_PAGE_SETUP, margins: { ...DEFAULT_PAGE_SETUP.margins } };
  }
  return {
    paperSize: partial.paperSize ?? DEFAULT_PAGE_SETUP.paperSize,
    orientation: partial.orientation ?? DEFAULT_PAGE_SETUP.orientation,
    margins: {
      top: partial.margins?.top ?? DEFAULT_PAGE_SETUP.margins.top,
      right: partial.margins?.right ?? DEFAULT_PAGE_SETUP.margins.right,
      bottom: partial.margins?.bottom ?? DEFAULT_PAGE_SETUP.margins.bottom,
      left: partial.margins?.left ?? DEFAULT_PAGE_SETUP.margins.left,
    },
  };
}

/**
 * Internal helper: write the resolved CSS variable map onto an element.
 * Re-used by `onCreate`, `setPageSetup`, and any imperative caller that
 * needs to re-apply vars (e.g. after mount in tests).
 */
export function applyPageSetupCssVars(
  el: HTMLElement | null | undefined,
  options: PageSetupOptions,
): void {
  if (!el) return;
  const vars = resolvePageSetupCssVars(options);
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageSetup: {
      /**
       * Replace the current page setup and re-emit CSS variables on the
       * editor container.
       */
      setPageSetup: (options: Partial<PageSetupOptions>) => ReturnType;
    };
  }
}

/**
 * Tiptap extension that publishes `PageSetupOptions` as CSS variables on
 * the editor DOM container. Read by the page-frame stylesheet; no React
 * state involved.
 *
 * Reading the current setup is done via `editor.storage.pageSetup.current`
 * (storage access is the canonical Tiptap pattern). The command surface
 * only carries the writer (`setPageSetup`).
 */
export const PageSetup = Extension.create<{
  pageSetup?: Partial<PageSetupOptions>;
}>({
  name: 'pageSetup',

  addOptions() {
    return {
      pageSetup: undefined,
    };
  },

  addStorage(): PageSetupStorage {
    const initial = mergePageSetup(this.options.pageSetup);
    return {
      current: initial,
    };
  },

  onCreate() {
    applyPageSetupCssVars(this.editor.view.dom as HTMLElement, this.storage.current);
  },

  addCommands() {
    return {
      setPageSetup:
        (options: Partial<PageSetupOptions>) =>
        ({ editor, tr }) => {
          const merged = mergePageSetup(options);
          (this.storage as PageSetupStorage).current = merged;
          applyPageSetupCssVars(
            editor.view.dom as HTMLElement,
            this.storage.current,
          );
          // Tag the transaction so listeners (Pagination plugin, React
          // subscribers) re-derive their state from the new CSS vars.
          tr.setMeta('dedocsPageSetupChanged', true);
          return true;
        },
    };
  },
});

export default PageSetup;

// Re-export the canonical types/helpers so consumers of this module have a
// single import surface for everything page-setup-related.
export { DEFAULT_PAGE_SETUP, PAGE_SETUP_CSS_VARS } from '../types';
export type { PageSetupOptions, PageMargins } from '../types';
export { getPaperDimensions } from '../utils/paperSizes';
export type { Orientation, PaperSize } from '../utils/paperSizes';
