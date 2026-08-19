/**
 * Paper size dimension constants and helpers.
 *
 * Dimensions are stored in millimeters (mm) because CSS supports mm natively
 * via `var()` and `@page size`. Margins elsewhere in the codebase are stored
 * in centimeters (cm) to match common authoring conventions and the
 * `PageSetupOptions` contract.
 */

import {
  DEFAULT_BAND_HEIGHT_CM,
  DEFAULT_BAND_HEIGHT_FRACTION,
  MAX_BAND_HEIGHT_FRACTION,
  type PageSetupOptions,
} from '../types';

export type PaperSize = 'A4' | 'Letter' | 'Legal' | 'A5';

export type Orientation = 'portrait' | 'landscape';

export interface PaperDimensions {
  /** Width in millimeters. */
  readonly width: number;
  /** Height in millimeters. */
  readonly height: number;
}

/**
 * Canonical paper dimensions in millimeters (portrait orientation).
 *
 * Source references:
 * - A4:     ISO 216 — 210 x 297 mm
 * - Letter: ANSI A   — 8.5 x 11 in  (215.9 x 279.4 mm)
 * - Legal:  ANSI A   — 8.5 x 14 in  (215.9 x 355.6 mm)
 * - A5:     ISO 216 — 148 x 210 mm
 */
export const PAPER_SIZES: Readonly<Record<PaperSize, PaperDimensions>> =
  Object.freeze({
    A4: Object.freeze({ width: 210, height: 297 }),
    Letter: Object.freeze({ width: 215.9, height: 279.4 }),
    Legal: Object.freeze({ width: 215.9, height: 355.6 }),
    A5: Object.freeze({ width: 148, height: 210 }),
  });

export const MM_PER_CM = 10;

export function cmToMm(valueInCm: number): number {
  return valueInCm * MM_PER_CM;
}

export function mmToCm(valueInMm: number): number {
  return valueInMm / MM_PER_CM;
}

/**
 * Resolve the effective page dimensions for a given paper size and
 * orientation. Landscape swaps width and height.
 */
export function getPaperDimensions(
  paperSize: PaperSize,
  orientation: Orientation,
): PaperDimensions {
  const base = PAPER_SIZES[paperSize];
  if (orientation === 'portrait') {
    return base;
  }
  return { width: base.height, height: base.width };
}

/**
 * Effective page height in millimeters for a given `PageSetupOptions`.
 * Used by band-height helpers to translate page-relative defaults into
 * absolute cm values.
 */
export function pageHeightMm(opts: PageSetupOptions): number {
  return getPaperDimensions(opts.paperSize, opts.orientation).height;
}

/**
 * Default band height in cm, computed as
 * `(pageHeightMm * DEFAULT_BAND_HEIGHT_FRACTION) / MM_PER_CM`.
 *
 * For A4 portrait (297mm) this yields ~5.94cm. Page-relative so the
 * default scales correctly across A4 / Letter / Legal / A5.
 */
export function getDefaultBandHeightCm(pageHeightMm: number): number {
  return (pageHeightMm * DEFAULT_BAND_HEIGHT_FRACTION) / MM_PER_CM;
}

/**
 * Maximum band height in cm for a given page height in millimeters.
 * Each band is independently clamped to `pageHeightMm * MAX_BAND_HEIGHT_FRACTION`.
 * With both bands at their maximum the body area is still guaranteed
 * positive (≥ `pageHeightMm / 3`).
 */
export function getMaxBandHeightCm(pageHeightMm: number): number {
  return (pageHeightMm * MAX_BAND_HEIGHT_FRACTION) / MM_PER_CM;
}

/**
 * Convenience overload: derive the default band height from a paper size
 * and orientation directly, without needing a `PageSetupOptions` object.
 * Returns `DEFAULT_BAND_HEIGHT_CM` when the page height cannot be
 * resolved (defensive fallback for callers without a setup context).
 */
export function getDefaultBandHeightCmFor(
  paperSize: PaperSize,
  orientation: Orientation,
): number {
  const dims = getPaperDimensions(paperSize, orientation);
  return getDefaultBandHeightCm(dims.height);
}

/**
 * Convenience overload: derive the maximum band height from a paper size
 * and orientation directly.
 */
export function getMaxBandHeightCmFor(
  paperSize: PaperSize,
  orientation: Orientation,
): number {
  const dims = getPaperDimensions(paperSize, orientation);
  return getMaxBandHeightCm(dims.height);
}

/**
 * Default page setup values matching the spec baseline:
 * A4 portrait with 2.54 cm (1 inch) margins on every side.
 */
export const DEFAULT_PAPER_SIZE: PaperSize = 'A4';
export const DEFAULT_ORIENTATION: Orientation = 'portrait';
