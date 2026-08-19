/**
 * Band height validation helpers.
 *
 * Pure functions consumed by the `PageSetup` extension, tests, and any
 * React component that needs to reason about band-height constraints.
 *
 * Two rules:
 *   1. Each band height is clamped to `pageHeight / 3` via
 *      `clampBandHeightToMax` — silently, no exception.
 *   2. `validateBandHeightForPaper` collects human-readable error
 *      messages for any constraint violation and returns the
 *      (possibly clamped) value alongside them.
 *
 * No cross-band validation: each band is reasoned about in isolation.
 * Since each band is capped at `pageHeight / 3`, the worst case for the
 * combined bands (`header + footer`) is `2 * pageHeight / 3`, leaving a
 * body area ≥ `pageHeight / 3` — safe by construction.
 *
 * Note: this module exposes paper-size-aware variants. The
 * `extensions/page-setup.ts` module owns the simpler pageHeightMm-based
 * `clampBandHeight(value, pageHeightMm)` / `validateBandHeight(value,
 * pageHeightMm, label)` helpers that match the design.md contract.
 */

import {
  DEFAULT_BAND_HEIGHT_CM,
  type BandValidationResult,
} from '../types';
import {
  getPaperDimensions,
  type Orientation,
  type PaperSize,
} from './paperSizes';

/**
 * Resolve the maximum band height in cm for a given paper size and
 * orientation. Centralises the orientation-aware clamp so callers don't
 * have to re-derive `pageHeight * 1/3` themselves.
 */
export function getBandMaxCm(
  paperSize: PaperSize,
  orientation: Orientation,
): number {
  const { height } = getPaperDimensions(paperSize, orientation);
  return height / 3 / 10;
}

/**
 * Resolve the default band height in cm for a given paper size and
 * orientation. When the page height cannot be derived (defensive — the
 * paper size / orientation must both be valid for this to fail),
 * returns `DEFAULT_BAND_HEIGHT_CM` as the absolute fallback.
 */
export function getBandDefaultCm(
  paperSize: PaperSize,
  orientation: Orientation,
): number {
  const { height } = getPaperDimensions(paperSize, orientation);
  if (!Number.isFinite(height) || height <= 0) {
    return DEFAULT_BAND_HEIGHT_CM;
  }
  return height / 5 / 10;
}

/**
 * Clamp a band height to the maximum allowed by the page size and
 * orientation. Negative values are clamped to `0` (no negative band
 * heights are ever meaningful). Values at or below the maximum pass
 * through unchanged.
 *
 * Never throws.
 *
 * Named `clampBandHeightToMax` to make room for `extensions/page-setup.ts`'s
 * `clampBandHeight(value, pageHeightMm)` which matches the design.md
 * signature (operates directly on the page height in mm).
 */
export function clampBandHeightToMax(
  value: number,
  maxCm: number,
): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (!Number.isFinite(maxCm) || maxCm <= 0) return 0;
  return Math.min(value, maxCm);
}

/**
 * Validate a single band's height against the page-relative maximum.
 *
 * Returns the (possibly clamped) height plus an array of error
 * messages. An empty `errors` array means the input was valid; the
 * value is returned unchanged.
 *
 * Rules:
 *   - Non-finite / negative input → clamped to `0`, error reported.
 *   - Value above the per-band maximum → clamped to `maxCm`, error
 *     reported describing the violation.
 *   - Value within range → passes through, no errors.
 *
 * Named `validateBandHeightForPaper` to disambiguate from
 * `extensions/page-setup.ts`'s `validateBandHeight(value, pageHeightMm,
 * label)` which matches the design.md contract.
 */
export function validateBandHeightForPaper(
  heightCm: number,
  paperSize: PaperSize,
  orientation: Orientation,
): BandValidationResult {
  const maxCm = getBandMaxCm(paperSize, orientation);
  const errors: string[] = [];

  if (!Number.isFinite(heightCm)) {
    errors.push(
      `Band height must be a finite number, received ${String(heightCm)}.`,
    );
    return { value: 0, errors };
  }

  if (heightCm < 0) {
    errors.push(
      `Band height cannot be negative; received ${heightCm}cm. Clamped to 0cm.`,
    );
    return { value: 0, errors };
  }

  if (heightCm > maxCm) {
    errors.push(
      `Band height ${heightCm}cm exceeds the per-band maximum of ${maxCm}cm ` +
        `for ${paperSize} ${orientation} (pageHeight / 3). Clamped to ${maxCm}cm.`,
    );
    return { value: maxCm, errors };
  }

  return { value: heightCm, errors };
}