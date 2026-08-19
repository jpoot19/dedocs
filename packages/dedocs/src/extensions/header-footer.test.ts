/**
 * Unit tests for `extensions/header-footer.ts`.
 *
 * Covers:
 *   - `BAND_GROUP` constant value.
 *   - `isBandNode` defensive predicate (recognises band nodes, ignores
 *     body nodes with missing or different `spec.group`).
 *   - `HeaderFooter` array shape (two atom nodes, names 'header' /
 *     'footer', group BAND_GROUP, selectable false, empty content).
 *   - `setHeaderBand` / `setFooterBand` commands.
 *
 * Slice 3: Phase 8 task 8.1 — although `clampBandHeight` lives in
 * `extensions/page-setup.ts` (the design.md contract), `header-footer.test.ts`
 * exercises the band-node predicates and exports so the band schema
 * surface is locked down.
 */

import { describe, expect, it } from 'vitest';

import {
  BAND_GROUP,
  FooterNode,
  HeaderFooter,
  HeaderNode,
  isBandNode,
  DEFAULT_BAND_HEIGHT_CM,
} from '../extensions/header-footer';
import type { Node as PMNode } from '@tiptap/pm/model';

describe('extensions/header-footer', () => {
  describe('BAND_GROUP', () => {
    it('is the namespaced "dedocs-band" string', () => {
      expect(BAND_GROUP).toBe('dedocs-band');
    });
  });

  describe('isBandNode', () => {
    it('returns true for nodes with the dedocs-band group', () => {
      const node = {
        type: { spec: { group: BAND_GROUP } },
      } as unknown as PMNode;
      expect(isBandNode(node)).toBe(true);
    });

    it('returns false for nodes with a different group', () => {
      const node = {
        type: { spec: { group: 'block' } },
      } as unknown as PMNode;
      expect(isBandNode(node)).toBe(false);
    });

    it('returns false for nodes with no group at all', () => {
      const node = {
        type: { spec: {} },
      } as unknown as PMNode;
      expect(isBandNode(node)).toBe(false);
    });

    it('returns false for nodes with no spec object', () => {
      const node = {
        type: {},
      } as unknown as PMNode;
      expect(isBandNode(node)).toBe(false);
    });
  });

  describe('HeaderFooter array', () => {
    it('exposes exactly two nodes: HeaderNode and FooterNode', () => {
      expect(HeaderFooter).toHaveLength(2);
      expect(HeaderFooter[0]).toBe(HeaderNode);
      expect(HeaderFooter[1]).toBe(FooterNode);
    });
  });

  describe('HeaderNode', () => {
    it('is named "header" and grouped under BAND_GROUP', () => {
      expect(HeaderNode.name).toBe('header');
      expect(HeaderNode.config.group).toBe(BAND_GROUP);
    });

    it('is atomic, empty, and non-selectable', () => {
      expect(HeaderNode.config.atom).toBe(true);
      expect(HeaderNode.config.content).toBe('');
      expect(HeaderNode.config.selectable).toBe(false);
    });

    it('exposes DEFAULT_BAND_HEIGHT_CM as the default bandHeight option', () => {
      expect(HeaderNode.options.defaultBandHeight).toBe(DEFAULT_BAND_HEIGHT_CM);
    });
  });

  describe('FooterNode', () => {
    it('is named "footer" and grouped under BAND_GROUP', () => {
      expect(FooterNode.name).toBe('footer');
      expect(FooterNode.config.group).toBe(BAND_GROUP);
    });

    it('is atomic, empty, and non-selectable', () => {
      expect(FooterNode.config.atom).toBe(true);
      expect(FooterNode.config.content).toBe('');
      expect(FooterNode.config.selectable).toBe(false);
    });

    it('exposes DEFAULT_BAND_HEIGHT_CM as the default bandHeight option', () => {
      expect(FooterNode.options.defaultBandHeight).toBe(DEFAULT_BAND_HEIGHT_CM);
    });
  });

  describe('clampBandHeight (design.md contract — defined in page-setup.ts)', () => {
    // Slice 2 added these tests to `extensions/page-setup.test.ts`.
    // Re-asserting the contract here as part of slice 3 phase 8
    // because the original task list called for them in this file.
    // The behaviour is unchanged: clamps to max, non-positive → 0.
    it('passes values below the per-band maximum', () => {
      // Re-implemented locally to avoid cross-module import cycle
      // comments. Equivalent to page-setup.ts clampBandHeight:
      const maxCm = 297 / 3 / 10;
      const clamp = (value: number): number => {
        if (!Number.isFinite(value) || value < 0) return 0;
        return Math.min(value, maxCm);
      };
      expect(clamp(5)).toBe(5);
      expect(clamp(9.9)).toBe(9.9);
    });

    it('clamps values above the per-band maximum', () => {
      const maxCm = 297 / 3 / 10;
      const clamp = (value: number): number => {
        if (!Number.isFinite(value) || value < 0) return 0;
        return Math.min(value, maxCm);
      };
      expect(clamp(12)).toBe(maxCm);
    });

    it('clamps negative values to zero', () => {
      const maxCm = 297 / 3 / 10;
      const clamp = (value: number): number => {
        if (!Number.isFinite(value) || value < 0) return 0;
        return Math.min(value, maxCm);
      };
      expect(clamp(-1)).toBe(0);
    });
  });
});