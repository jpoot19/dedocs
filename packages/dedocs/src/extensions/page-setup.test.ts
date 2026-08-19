/**
 * Unit tests for `extensions/page-setup.ts`.
 *
 * Covers:
 *   - `mergePageSetup` falling back to defaults for any omitted field.
 *   - `resolvePageSetupCssVars` emitting the canonical variable names with
 *     mm/cm values, including band heights.
 *   - `applyPageSetupCssVars` writing to a real DOM element.
 *   - `clampBandHeight` / `validateBandHeight` enforcing the
 *     page-relative maximum.
 *   - `validateBandOptions` aggregating per-band errors.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SETUP,
  PAGE_SETUP_CSS_VARS,
  type PageSetupOptions,
} from '../types';
import {
  applyPageSetupCssVars,
  clampBandHeight,
  maxBandHeightCmFor,
  mergePageSetup,
  resolvePageSetupCssVars,
  validateBandHeight,
  validateBandOptions,
} from '../extensions/page-setup';

describe('extensions/page-setup', () => {
  describe('mergePageSetup', () => {
    it('returns a full DEFAULT_PAGE_SETUP copy when called with undefined', () => {
      const merged = mergePageSetup(undefined);
      expect(merged).toEqual(DEFAULT_PAGE_SETUP);
      // Must be a fresh copy so consumer mutation cannot leak into defaults.
      expect(merged).not.toBe(DEFAULT_PAGE_SETUP);
      expect(merged.margins).not.toBe(DEFAULT_PAGE_SETUP.margins);
    });

    it('preserves supplied paperSize and falls back the rest', () => {
      const merged = mergePageSetup({ paperSize: 'Letter' });
      expect(merged.paperSize).toBe('Letter');
      expect(merged.orientation).toBe(DEFAULT_PAGE_SETUP.orientation);
      expect(merged.margins).toEqual(DEFAULT_PAGE_SETUP.margins);
    });

    it('partially overrides margins while filling missing fields from defaults', () => {
      const merged = mergePageSetup({
        margins: { top: 3, right: 2, bottom: 2, left: 2 },
      });
      expect(merged.margins.top).toBe(3);
      expect(merged.margins.right).toBe(2);
      expect(merged.margins.bottom).toBe(2);
      expect(merged.margins.left).toBe(2);
    });

    it('does not mutate the input object', () => {
      const input = { paperSize: 'A5' as const, orientation: 'landscape' as const };
      mergePageSetup(input);
      expect(input).toEqual({ paperSize: 'A5', orientation: 'landscape' });
    });

    it('computes default band heights from the resolved page height', () => {
      // A4 portrait → pageHeight 297mm → 297/5/10 = 5.94cm
      const a4Portrait = mergePageSetup(undefined);
      expect(a4Portrait.headerHeight).toBeCloseTo(5.94, 5);
      expect(a4Portrait.footerHeight).toBeCloseTo(5.94, 5);

      // Legal portrait → pageHeight 355.6mm → 355.6/5/10 = 7.112cm
      const legal = mergePageSetup({ paperSize: 'Legal' });
      expect(legal.headerHeight).toBeCloseTo(7.112, 5);
      expect(legal.footerHeight).toBeCloseTo(7.112, 5);
    });

    it('keeps explicit band heights supplied by the consumer', () => {
      const merged = mergePageSetup({ headerHeight: 2, footerHeight: 1.5 });
      expect(merged.headerHeight).toBe(2);
      expect(merged.footerHeight).toBe(1.5);
    });
  });

  describe('resolvePageSetupCssVars', () => {
    it('emits all eight canonical CSS variables for A4 portrait', () => {
      const vars = resolvePageSetupCssVars(DEFAULT_PAGE_SETUP);
      expect(vars[PAGE_SETUP_CSS_VARS.width]).toBe('210mm');
      expect(vars[PAGE_SETUP_CSS_VARS.height]).toBe('297mm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginTop]).toBe('2.54cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginRight]).toBe('2.54cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginBottom]).toBe('2.54cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginLeft]).toBe('2.54cm');
      // Band heights derive from DEFAULT_PAGE_SETUP (5.94cm each).
      expect(vars[PAGE_SETUP_CSS_VARS.headerHeight]).toBe('5.94cm');
      expect(vars[PAGE_SETUP_CSS_VARS.footerHeight]).toBe('5.94cm');
    });

    it('swaps width and height for landscape Letter', () => {
      const vars = resolvePageSetupCssVars({
        paperSize: 'Letter',
        orientation: 'landscape',
        margins: { top: 2, right: 2, bottom: 2, left: 2 },
        headerHeight: 5.94,
        footerHeight: 5.94,
      });
      expect(vars[PAGE_SETUP_CSS_VARS.width]).toBe('279.4mm');
      expect(vars[PAGE_SETUP_CSS_VARS.height]).toBe('215.9mm');
    });

    it('reflects custom margin values verbatim', () => {
      const vars = resolvePageSetupCssVars({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 3, right: 2.5, bottom: 2, left: 2.5 },
        headerHeight: 5.94,
        footerHeight: 5.94,
      });
      expect(vars[PAGE_SETUP_CSS_VARS.marginTop]).toBe('3cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginRight]).toBe('2.5cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginBottom]).toBe('2cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginLeft]).toBe('2.5cm');
    });

    it('emits explicit band heights verbatim', () => {
      const vars = resolvePageSetupCssVars({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
        headerHeight: 2,
        footerHeight: 1.5,
      });
      expect(vars[PAGE_SETUP_CSS_VARS.headerHeight]).toBe('2cm');
      expect(vars[PAGE_SETUP_CSS_VARS.footerHeight]).toBe('1.5cm');
    });
  });

  describe('applyPageSetupCssVars', () => {
    it('writes the resolved CSS variables onto a DOM element', () => {
      const el = document.createElement('div');
      applyPageSetupCssVars(el, {
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 1, right: 1, bottom: 1, left: 1 },
        headerHeight: 5.94,
        footerHeight: 5.94,
      });
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.width)).toBe('210mm');
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.height)).toBe('297mm');
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.marginTop)).toBe('1cm');
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.headerHeight)).toBe('5.94cm');
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.footerHeight)).toBe('5.94cm');
    });

    it('is a no-op when called with a null element', () => {
      expect(() => applyPageSetupCssVars(null, DEFAULT_PAGE_SETUP)).not.toThrow();
    });
  });

  describe('maxBandHeightCmFor', () => {
    it('returns pageHeight/30 (pageHeight mm / 3 / MM_PER_CM)', () => {
      expect(maxBandHeightCmFor(297)).toBeCloseTo(9.9, 5); // A4 portrait
      expect(maxBandHeightCmFor(355.6)).toBeCloseTo(11.85333, 3); // Legal portrait
    });

    it('returns 0 for non-positive page heights', () => {
      expect(maxBandHeightCmFor(0)).toBe(0);
      expect(maxBandHeightCmFor(-1)).toBe(0);
      expect(maxBandHeightCmFor(Number.NaN)).toBe(0);
    });
  });

  describe('clampBandHeight', () => {
    it('passes through values below the per-band maximum', () => {
      // A4 portrait, pageHeight 297mm → max 9.9cm
      expect(clampBandHeight(5, 297)).toBe(5);
      expect(clampBandHeight(9.9, 297)).toBe(9.9);
    });

    it('clamps values above the per-band maximum', () => {
      expect(clampBandHeight(12, 297)).toBe(9.9); // A4 portrait
      expect(clampBandHeight(20, 210)).toBe(7); // A5 portrait (210mm)
    });

    it('clamps negative values to zero', () => {
      expect(clampBandHeight(-1, 297)).toBe(0);
      expect(clampBandHeight(-0.001, 297)).toBe(0);
    });

    it('clamps non-finite values to zero', () => {
      expect(clampBandHeight(Number.NaN, 297)).toBe(0);
      expect(clampBandHeight(Number.POSITIVE_INFINITY, 297)).toBe(0);
    });

    it('returns 0 when pageHeight is non-positive', () => {
      expect(clampBandHeight(5, 0)).toBe(0);
      expect(clampBandHeight(5, -1)).toBe(0);
    });
  });

  describe('validateBandHeight', () => {
    it('returns the value unchanged when within bounds', () => {
      const result = validateBandHeight(2, 297, 'header');
      expect(result.value).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('clamps and reports an error when exceeding the per-band max', () => {
      const result = validateBandHeight(12, 297, 'header');
      expect(result.value).toBe(9.9);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/header band height 12cm/);
      expect(result.errors[0]).toMatch(/9\.9cm/);
    });

    it('clamps to zero and reports an error for negative values', () => {
      const result = validateBandHeight(-1, 297, 'footer');
      expect(result.value).toBe(0);
      expect(result.errors[0]).toMatch(/footer band height cannot be negative/);
    });

    it('reports a finite-number error for NaN / Infinity', () => {
      const result = validateBandHeight(Number.NaN, 297, 'header');
      expect(result.value).toBe(0);
      expect(result.errors[0]).toMatch(/finite number/);
    });

    it('prefixes error messages with the band label', () => {
      const header = validateBandHeight(120, 297, 'header');
      const footer = validateBandHeight(120, 297, 'footer');
      expect(header.errors[0]).toMatch(/^header /);
      expect(footer.errors[0]).toMatch(/^footer /);
    });
  });

  describe('validateBandOptions', () => {
    it('returns an empty array when both bands are within their per-band max', () => {
      const opts: PageSetupOptions = {
        ...DEFAULT_PAGE_SETUP,
        headerHeight: 2,
        footerHeight: 1.5,
      };
      expect(validateBandOptions(opts)).toEqual([]);
    });

    it('aggregates header and footer errors independently', () => {
      const opts: PageSetupOptions = {
        ...DEFAULT_PAGE_SETUP,
        headerHeight: 2,
        // 12cm footer on A4 → max 9.9cm → clamped + error
        footerHeight: 12,
      };
      const errors = validateBandOptions(opts);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/footer/);
    });

    it('reports two errors when both bands exceed their per-band max', () => {
      const opts: PageSetupOptions = {
        ...DEFAULT_PAGE_SETUP,
        headerHeight: 20,
        footerHeight: 20,
      };
      const errors = validateBandOptions(opts);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatch(/header/);
      expect(errors[1]).toMatch(/footer/);
    });

    it('does not cross-validate between header and footer', () => {
      // Both bands at exactly the per-band maximum is still valid
      // by construction (worst case body area = pageHeight / 3).
      const maxCm = 297 / 3 / 10; // 9.9cm
      const opts: PageSetupOptions = {
        ...DEFAULT_PAGE_SETUP,
        headerHeight: maxCm,
        footerHeight: maxCm,
      };
      expect(validateBandOptions(opts)).toEqual([]);
    });
  });
});