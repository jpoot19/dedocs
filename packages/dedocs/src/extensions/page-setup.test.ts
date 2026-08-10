/**
 * Unit tests for `extensions/page-setup.ts`.
 *
 * Covers:
 *   - `mergePageSetup` falling back to defaults for any omitted field.
 *   - `resolvePageSetupCssVars` emitting the canonical variable names with
 *     mm/cm values.
 *   - `applyPageSetupCssVars` writing to a real DOM element.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SETUP,
  PAGE_SETUP_CSS_VARS,
} from '../types';
import {
  applyPageSetupCssVars,
  mergePageSetup,
  resolvePageSetupCssVars,
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
  });

  describe('resolvePageSetupCssVars', () => {
    it('emits all six canonical CSS variables for A4 portrait', () => {
      const vars = resolvePageSetupCssVars(DEFAULT_PAGE_SETUP);
      expect(vars[PAGE_SETUP_CSS_VARS.width]).toBe('210mm');
      expect(vars[PAGE_SETUP_CSS_VARS.height]).toBe('297mm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginTop]).toBe('2.54cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginRight]).toBe('2.54cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginBottom]).toBe('2.54cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginLeft]).toBe('2.54cm');
    });

    it('swaps width and height for landscape Letter', () => {
      const vars = resolvePageSetupCssVars({
        paperSize: 'Letter',
        orientation: 'landscape',
        margins: { top: 2, right: 2, bottom: 2, left: 2 },
      });
      expect(vars[PAGE_SETUP_CSS_VARS.width]).toBe('279.4mm');
      expect(vars[PAGE_SETUP_CSS_VARS.height]).toBe('215.9mm');
    });

    it('reflects custom margin values verbatim', () => {
      const vars = resolvePageSetupCssVars({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 3, right: 2.5, bottom: 2, left: 2.5 },
      });
      expect(vars[PAGE_SETUP_CSS_VARS.marginTop]).toBe('3cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginRight]).toBe('2.5cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginBottom]).toBe('2cm');
      expect(vars[PAGE_SETUP_CSS_VARS.marginLeft]).toBe('2.5cm');
    });
  });

  describe('applyPageSetupCssVars', () => {
    it('writes the resolved CSS variables onto a DOM element', () => {
      const el = document.createElement('div');
      applyPageSetupCssVars(el, {
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 1, right: 1, bottom: 1, left: 1 },
      });
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.width)).toBe('210mm');
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.height)).toBe('297mm');
      expect(el.style.getPropertyValue(PAGE_SETUP_CSS_VARS.marginTop)).toBe('1cm');
    });

    it('is a no-op when called with a null element', () => {
      expect(() => applyPageSetupCssVars(null, DEFAULT_PAGE_SETUP)).not.toThrow();
    });
  });
});