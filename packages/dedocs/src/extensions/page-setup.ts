/**
 * PageSetup extension.
 *
 * Emits CSS custom properties (`--page-width`, `--page-height`,
 * `--page-margin-*`, `--header-height`, `--footer-height`) on the
 * editor container based on the configured `PageSetupOptions`. The
 * CSS variables are the contract between the engine and the
 * page-frame stylesheet (`styles/page.css`) — the same variables also
 * drive `@page` size/margin at print time.
 *
 * Per-band height enforcement:
 *   - `clampBandHeight(value, pageHeightMm)` — clamp to `pageHeight / 3`
 *     without throwing.
 *   - `validateBandHeight(value, pageHeightMm, label)` — return the
 *     (possibly clamped) value and any error messages.
 *
 * The validation results are stored in `PageSetupStorage.errors` and
 * emitted via `console.warn` so consumers can surface banding
 * regressions without parsing console output.
 *
 * See `types.ts` for the option contract and `PAGE_SETUP_CSS_VARS` for
 * the shared variable-name registry.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/page-setup/spec.md
 * Spec: openspec/changes/header-footer/specs/page-setup/spec.md
 */

import { Extension } from '@tiptap/core';

import {
  DEFAULT_PAGE_SETUP,
  PAGE_SETUP_CSS_VARS,
  type BandValidationResult,
  type PageSetupOptions,
} from '../types';
import {
  getDefaultBandHeightCm,
  getPaperDimensions,
  MM_PER_CM,
  pageHeightMm,
} from '../utils/paperSizes';

export interface PageSetupStorage {
  /** Currently applied page setup. Updated by `setPageSetup`. */
  current: PageSetupOptions;
  /**
   * Human-readable validation messages emitted by `validateBandHeight`.
   * Empty when every band height in `current` is within its
   * page-relative maximum. Surfaces via `editor.storage.pageSetup.errors`.
   */
  errors: string[];
}

/**
 * Maximum band height in centimetres for a page of a given height
 * (mm). Per-band cap is `pageHeightMm / 3 / MM_PER_CM` (i.e. one
 * third of the page, converted from mm to cm).
 */
export function maxBandHeightCmFor(pageHeightMm: number): number {
  if (!Number.isFinite(pageHeightMm) || pageHeightMm <= 0) return 0;
  return pageHeightMm / 3 / MM_PER_CM;
}

/**
 * Clamp a band height (cm) so it never exceeds the per-band maximum
 * for the given page height (mm). Negative or non-finite values are
 * clamped to `0`. Never throws.
 */
export function clampBandHeight(
  value: number,
  pageHeightMm: number,
): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (!Number.isFinite(pageHeightMm) || pageHeightMm <= 0) return 0;
  return Math.min(value, maxBandHeightCmFor(pageHeightMm));
}

/**
 * Validate a band height (cm) against the per-band maximum for the
 * given page height (mm). The `label` lets the returned error
 * messages identify which band violated the constraint.
 *
 * Returns the (possibly clamped) height plus an array of error
 * messages. An empty `errors` array means the input was valid.
 */
export function validateBandHeight(
  value: number,
  pageHeightMm: number,
  label: 'header' | 'footer',
): BandValidationResult {
  const maxCm = maxBandHeightCmFor(pageHeightMm);
  const errors: string[] = [];

  if (!Number.isFinite(value)) {
    errors.push(
      `${label} band height must be a finite number, received ${String(value)}.`,
    );
    return { value: 0, errors };
  }

  if (value < 0) {
    errors.push(
      `${label} band height cannot be negative; received ${value}cm. Clamped to 0cm.`,
    );
    return { value: 0, errors };
  }

  if (value > maxCm) {
    errors.push(
      `${label} band height ${value}cm exceeds the per-band maximum of ${maxCm}cm ` +
        `for pageHeight=${pageHeightMm}mm (pageHeight / 3). Clamped to ${maxCm}cm.`,
    );
    return { value: maxCm, errors };
  }

  return { value, errors };
}

/**
 * Validate every band height in a `PageSetupOptions` and concatenate
 * the per-band error messages. The combined (header + footer) errors
 * array — empty when every band is within its page-relative maximum.
 */
export function validateBandOptions(
  options: PageSetupOptions,
): string[] {
  const ph = pageHeightMm(options);
  const header = validateBandHeight(
    options.headerHeight,
    ph,
    'header',
  );
  const footer = validateBandHeight(
    options.footerHeight,
    ph,
    'footer',
  );
  return [...header.errors, ...footer.errors];
}

/**
 * Pure helper: turn a `PageSetupOptions` value into a CSS-variable name/value
 * map. Kept outside the Extension so it is unit-testable without a Tiptap
 * editor instance.
 *
 * Emits all eight canonical variables — including `--header-height` and
 * `--footer-height` — so the page stylesheet and React Canvas can read
 * the full band geometry from CSS alone.
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
    [PAGE_SETUP_CSS_VARS.headerHeight]: `${options.headerHeight}cm`,
    [PAGE_SETUP_CSS_VARS.footerHeight]: `${options.footerHeight}cm`,
  };
}

/**
 * Merge a partial `PageSetupOptions` (e.g. from `createDedocsEditor({ pageSetup })`)
 * with the default. Top-level keys fall back independently; nested `margins`
 * merge with the default margins object. Band heights default to
 * `pageHeight / 5` (computed from the resolved paper size + orientation)
 * when the consumer does not provide explicit values — `DEFAULT_BAND_HEIGHT_FRACTION`
 * applied to the effective page height.
 */
export function mergePageSetup(
  partial: Partial<PageSetupOptions> | undefined,
): PageSetupOptions {
  const base: PageSetupOptions = partial
    ? {
        paperSize: partial.paperSize ?? DEFAULT_PAGE_SETUP.paperSize,
        orientation: partial.orientation ?? DEFAULT_PAGE_SETUP.orientation,
        margins: {
          top: partial.margins?.top ?? DEFAULT_PAGE_SETUP.margins.top,
          right: partial.margins?.right ?? DEFAULT_PAGE_SETUP.margins.right,
          bottom: partial.margins?.bottom ?? DEFAULT_PAGE_SETUP.margins.bottom,
          left: partial.margins?.left ?? DEFAULT_PAGE_SETUP.margins.left,
        },
        headerHeight:
          partial.headerHeight ?? DEFAULT_PAGE_SETUP.headerHeight,
        footerHeight:
          partial.footerHeight ?? DEFAULT_PAGE_SETUP.footerHeight,
      }
    : {
        ...DEFAULT_PAGE_SETUP,
        margins: { ...DEFAULT_PAGE_SETUP.margins },
      };

  // If the consumer did not supply explicit band heights, recompute the
  // defaults from the effective page height so A4, Letter, Legal, and A5
  // each get a page-relative 1/5 default rather than the A4 baseline.
  const computedDefaultCm = getDefaultBandHeightCm(pageHeightMm(base));

  return {
    ...base,
    headerHeight:
      partial?.headerHeight !== undefined
        ? base.headerHeight
        : computedDefaultCm,
    footerHeight:
      partial?.footerHeight !== undefined
        ? base.footerHeight
        : computedDefaultCm,
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
       * editor container. Per-band validation runs during the command;
       * any errors are stored on `editor.storage.pageSetup.errors` and
       * emitted via `console.warn` so consumer tooling can surface the
       * banding regression.
       */
      setPageSetup: (options: Partial<PageSetupOptions>) => ReturnType;
    };
  }
}

/**
 * Emit a single `console.warn` summarising band-validation issues for a
 * `PageSetupOptions`. Centralised so `onCreate` and `setPageSetup`
 * produce the same warning shape.
 */
function warnForBandErrors(options: PageSetupOptions, errors: string[]): void {
  if (errors.length === 0) return;
  const summary = errors.join('\n  • ');
  // eslint-disable-next-line no-console
  console.warn(
    `[dedocs PageSetup] ${errors.length} band validation issue(s) ` +
      `for ${options.paperSize} ${options.orientation}:\n  • ${summary}`,
  );
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
    const errors = validateBandOptions(initial);
    if (errors.length > 0) warnForBandErrors(initial, errors);
    return {
      current: initial,
      errors,
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
          const errors = validateBandOptions(merged);
          (this.storage as PageSetupStorage).current = merged;
          (this.storage as PageSetupStorage).errors = errors;
          if (errors.length > 0) warnForBandErrors(merged, errors);
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
export type { PageSetupOptions, PageMargins, BandValidationResult } from '../types';
export { getPaperDimensions, MM_PER_CM } from '../utils/paperSizes';
export type { Orientation, PaperSize } from '../utils/paperSizes';
