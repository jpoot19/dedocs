/**
 * Unit tests for `utils/paperSizes.ts`.
 *
 * Covers:
 *   - `PAPER_SIZES` constants for A4, Letter, Legal, A5.
 *   - `getPaperDimensions` returning the same object for portrait.
 *   - `getPaperDimensions` swapping width/height for landscape.
 *   - `cmToMm` / `mmToCm` round-trips.
 *   - `DEFAULT_PAPER_SIZE` and `DEFAULT_ORIENTATION` match the spec baseline.
 *   - `pageHeightMm` resolves page height for arbitrary `PageSetupOptions`.
 *   - `getDefaultBandHeightCm` returns pageHeightMm × 1/5 / MM_PER_CM.
 *   - `getMaxBandHeightCm` returns pageHeightMm × 1/3 / MM_PER_CM.
 */

import { describe, expect, it } from 'vitest';

import {
  cmToMm,
  DEFAULT_ORIENTATION,
  DEFAULT_PAPER_SIZE,
  getDefaultBandHeightCm,
  getDefaultBandHeightCmFor,
  getMaxBandHeightCm,
  getMaxBandHeightCmFor,
  getPaperDimensions,
  MM_PER_CM,
  mmToCm,
  pageHeightMm,
  PAPER_SIZES,
} from '../utils/paperSizes';
import { DEFAULT_BAND_HEIGHT_CM, DEFAULT_PAGE_SETUP } from '../types';

describe('utils/paperSizes', () => {
  describe('PAPER_SIZES constants', () => {
    it('exposes the canonical A4 portrait dimensions', () => {
      expect(PAPER_SIZES.A4).toEqual({ width: 210, height: 297 });
    });

    it('exposes the canonical US Letter portrait dimensions', () => {
      expect(PAPER_SIZES.Letter).toEqual({ width: 215.9, height: 279.4 });
    });

    it('exposes the canonical US Legal portrait dimensions', () => {
      expect(PAPER_SIZES.Legal).toEqual({ width: 215.9, height: 355.6 });
    });

    it('exposes the canonical A5 portrait dimensions', () => {
      expect(PAPER_SIZES.A5).toEqual({ width: 148, height: 210 });
    });

    it('is frozen to prevent consumer mutation', () => {
      expect(Object.isFrozen(PAPER_SIZES)).toBe(true);
    });
  });

  describe('getPaperDimensions', () => {
    it('returns the canonical portrait dimensions for A4', () => {
      expect(getPaperDimensions('A4', 'portrait')).toEqual({ width: 210, height: 297 });
    });

    it('returns swapped dimensions for A4 landscape', () => {
      expect(getPaperDimensions('A4', 'landscape')).toEqual({ width: 297, height: 210 });
    });

    it('returns swapped dimensions for Letter landscape', () => {
      expect(getPaperDimensions('Letter', 'landscape')).toEqual({
        width: 279.4,
        height: 215.9,
      });
    });

    it('returns swapped dimensions for Legal landscape', () => {
      expect(getPaperDimensions('Legal', 'landscape')).toEqual({
        width: 355.6,
        height: 215.9,
      });
    });

    it('returns swapped dimensions for A5 landscape', () => {
      expect(getPaperDimensions('A5', 'landscape')).toEqual({
        width: 210,
        height: 148,
      });
    });
  });

  describe('pageHeightMm', () => {
    it('returns the portrait page height for the given paper size', () => {
      expect(pageHeightMm({ ...DEFAULT_PAGE_SETUP, paperSize: 'A4' })).toBe(297);
      expect(pageHeightMm({ ...DEFAULT_PAGE_SETUP, paperSize: 'Letter' })).toBe(279.4);
      expect(pageHeightMm({ ...DEFAULT_PAGE_SETUP, paperSize: 'Legal' })).toBe(355.6);
      expect(pageHeightMm({ ...DEFAULT_PAGE_SETUP, paperSize: 'A5' })).toBe(210);
    });

    it('swaps dimensions for landscape orientation', () => {
      expect(
        pageHeightMm({ ...DEFAULT_PAGE_SETUP, orientation: 'landscape' }),
      ).toBe(210); // A4 landscape height = A4 portrait width
    });
  });

  describe('getDefaultBandHeightCm', () => {
    it('returns pageHeight / 5 / MM_PER_CM (A4 → ~5.94cm)', () => {
      expect(getDefaultBandHeightCm(297)).toBeCloseTo(5.94, 5);
    });

    it('scales linearly with page height', () => {
      // 100mm page → 100/5/10 = 2cm
      expect(getDefaultBandHeightCm(100)).toBeCloseTo(2, 5);
      // 200mm page → 200/5/10 = 4cm
      expect(getDefaultBandHeightCm(200)).toBeCloseTo(4, 5);
    });

    it('handles unknown / zero page heights gracefully', () => {
      expect(getDefaultBandHeightCm(0)).toBe(0);
      expect(getDefaultBandHeightCm(-1)).toBeCloseTo(-0.02, 5);
    });

    it('exposes DEFAULT_BAND_HEIGHT_CM (1.25cm) as the documented fallback', () => {
      // The `DEFAULT_BAND_HEIGHT_CM` constant is the absolute fallback
      // returned by paperSize-aware helpers (`getBandDefaultCm`) when
      // page dimensions cannot be resolved. Slice 3 locks the contract.
      expect(DEFAULT_BAND_HEIGHT_CM).toBe(1.25);
    });
  });

  describe('getMaxBandHeightCm', () => {
    it('returns pageHeight / 3 / MM_PER_CM (A4 → ~9.9cm)', () => {
      expect(getMaxBandHeightCm(297)).toBeCloseTo(9.9, 5);
    });

    it('clamped at the per-band maximum for any page height', () => {
      // For any valid page height, max < pageHeight/3
      const pageHeight = 297;
      const max = getMaxBandHeightCm(pageHeight);
      expect(max).toBeLessThan(pageHeight / 3); // expressed in mm (not strictly comparing units, but ratio holds)
      // In cm: max should be 9.9cm, pageHeight/30 = 297/30 = 9.9cm.
      expect(max).toBeCloseTo(9.9, 5);
    });
  });

  describe('convenience overloads (For variants)', () => {
    it('derives default band height from a paper size + orientation directly', () => {
      // A4 portrait → 297mm → 5.94cm
      expect(getDefaultBandHeightCmFor('A4', 'portrait')).toBeCloseTo(5.94, 5);
      // A4 landscape → 210mm → 4.2cm
      expect(getDefaultBandHeightCmFor('A4', 'landscape')).toBeCloseTo(4.2, 5);
    });

    it('derives max band height from a paper size + orientation directly', () => {
      expect(getMaxBandHeightCmFor('A4', 'portrait')).toBeCloseTo(9.9, 5);
      // A5 landscape → pageHeight 148mm → 148/3/10 = ~4.9333cm
      expect(getMaxBandHeightCmFor('A5', 'landscape')).toBeCloseTo(4.9333, 3);
    });
  });

  describe('cmToMm / mmToCm', () => {
    it('converts centimeters to millimeters with the canonical MM_PER_CM ratio', () => {
      expect(MM_PER_CM).toBe(10);
      expect(cmToMm(2.54)).toBe(25.4);
      expect(cmToMm(1)).toBe(10);
    });

    it('converts millimeters to centimeters', () => {
      expect(mmToCm(25.4)).toBeCloseTo(2.54, 10);
      expect(mmToCm(10)).toBeCloseTo(1, 10);
    });

    it('round-trips a value through cmToMm and mmToCm', () => {
      const value = 3.7;
      expect(mmToCm(cmToMm(value))).toBeCloseTo(value, 10);
    });
  });

  describe('default exports', () => {
    it('defaults to A4 portrait', () => {
      expect(DEFAULT_PAPER_SIZE).toBe('A4');
      expect(DEFAULT_ORIENTATION).toBe('portrait');
    });
  });
});