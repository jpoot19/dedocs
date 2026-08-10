/**
 * Unit tests for `utils/paperSizes.ts`.
 *
 * Covers:
 *   - `PAPER_SIZES` constants for A4, Letter, Legal, A5.
 *   - `getPaperDimensions` returning the same object for portrait.
 *   - `getPaperDimensions` swapping width/height for landscape.
 *   - `cmToMm` / `mmToCm` round-trips.
 *   - `DEFAULT_PAPER_SIZE` and `DEFAULT_ORIENTATION` match the spec baseline.
 */

import { describe, expect, it } from 'vitest';

import {
  cmToMm,
  DEFAULT_ORIENTATION,
  DEFAULT_PAPER_SIZE,
  getPaperDimensions,
  MM_PER_CM,
  mmToCm,
  PAPER_SIZES,
} from '../utils/paperSizes';

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