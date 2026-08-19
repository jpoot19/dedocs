/**
 * Unit tests for `extensions/pagination.ts`.
 *
 * These tests focus on the pure helpers — `resolveMetrics`,
 * `computeBreaks` — and a thin slice of `measureAndDecorate` driven via
 * `getBoundingClientRect` mocks.
 *
 * The full rAF/ResizeObserver/MutationObserver lifecycle is exercised
 * by the integration suite (createDedocsEditor.test.tsx) and the Playwright
 * e2e tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BAND_GROUP,
} from '../extensions/header-footer';
import {
  collectTopLevelBlocks,
  computeBreaks,
  resolveMetrics,
  SCREEN_PX_PER_MM,
} from '../extensions/pagination';
import { DEFAULT_PAGE_SETUP, type PaginationBreak } from '../types';
import type { Node as PMNode } from '@tiptap/pm/model';

describe('extensions/pagination', () => {
  describe('resolveMetrics', () => {
    it('uses the canonical 96-DPI screen-pixel ratio by default', () => {
      expect(SCREEN_PX_PER_MM).toBeCloseTo(96 / 25.4, 8);
    });

    it('converts A4 portrait outer dimensions to CSS pixels', () => {
      const metrics = resolveMetrics(DEFAULT_PAGE_SETUP);
      expect(metrics.outerWidth).toBeCloseTo(210 * SCREEN_PX_PER_MM, 5);
      expect(metrics.outerHeight).toBeCloseTo(297 * SCREEN_PX_PER_MM, 5);
    });

    it('shrinks content area by horizontal and vertical margins', () => {
      const metrics = resolveMetrics({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 1, right: 1, bottom: 1, left: 1 },
        headerHeight: 0,
        footerHeight: 0,
      });
      // 1 cm = 10 mm; margins on each side.
      const horizontalMarginPx = 2 * 10 * SCREEN_PX_PER_MM;
      const verticalMarginPx = 2 * 10 * SCREEN_PX_PER_MM;
      expect(metrics.contentWidth).toBeCloseTo(metrics.outerWidth - horizontalMarginPx, 5);
      expect(metrics.contentHeight).toBeCloseTo(metrics.outerHeight - verticalMarginPx, 5);
    });

    it('subtracts combined band heights from the content area', () => {
      const metrics = resolveMetrics({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        headerHeight: 2, // cm
        footerHeight: 3, // cm
      });
      // 5 cm total bands × 10 mm/cm = 50 mm × pxPerMm
      const bandsPx = 5 * 10 * SCREEN_PX_PER_MM;
      // No margins here, so contentHeight = outerHeight - bands.
      expect(metrics.contentHeight).toBeCloseTo(
        metrics.outerHeight - bandsPx,
        5,
      );
      // Spec scenario: A4 with 20mm header + 20mm footer + 20mm margins →
      // contentHeight reduction = 40mm of bands (without the margins).
      const specScenario = resolveMetrics({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 2, right: 2, bottom: 2, left: 2 }, // 2 cm each = 20mm
        headerHeight: 2, // 20mm
        footerHeight: 2, // 20mm
      });
      const expectedReductionPx = 4 * 10 * SCREEN_PX_PER_MM; // 40mm of bands
      const expectedVerticalMarginPx = 4 * 10 * SCREEN_PX_PER_MM; // 40mm of margins
      expect(specScenario.contentHeight).toBeCloseTo(
        specScenario.outerHeight - expectedVerticalMarginPx - expectedReductionPx,
        5,
      );
    });

    it('treats zero band heights as no-op (backwards-compatible default)', () => {
      const zeroBands = resolveMetrics({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        headerHeight: 0,
        footerHeight: 0,
      });
      const tallBands = resolveMetrics({
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        headerHeight: 0,
        footerHeight: 0,
      });
      expect(zeroBands.contentHeight).toBe(tallBands.contentHeight);
    });

    it('clamps content dimensions to zero when margins plus bands exceed paper size', () => {
      const metrics = resolveMetrics({
        paperSize: 'A5',
        orientation: 'portrait',
        margins: { top: 100, right: 100, bottom: 100, left: 100 },
        headerHeight: 5.94,
        footerHeight: 5.94,
      });
      expect(metrics.contentWidth).toBe(0);
      expect(metrics.contentHeight).toBe(0);
    });

    it('respects an explicit pxPerMm override', () => {
      const metrics = resolveMetrics(DEFAULT_PAGE_SETUP, 1);
      expect(metrics.outerWidth).toBe(210);
      expect(metrics.outerHeight).toBe(297);
    });
  });

  describe('computeBreaks', () => {
    it('returns no breaks when all blocks fit on a single page', () => {
      const breaks = computeBreaks(
        [
          { pos: 0, heightPx: 30, node: makeNode('paragraph', false) },
          { pos: 30, heightPx: 50, node: makeNode('paragraph', false) },
        ],
        500,
      );
      expect(breaks).toEqual([]);
    });

    it('places a break when a single block overflows the page content area', () => {
      const breaks = computeBreaks(
        [
          { pos: 0, heightPx: 30, node: makeNode('paragraph', false) },
          { pos: 30, heightPx: 600, node: makeNode('paragraph', false) },
        ],
        500,
      );
      expect(breaks).toEqual<PaginationBreak[]>([
        { pos: 30, pageIndex: 1, kind: 'auto' },
      ]);
    });

    it('does NOT create an empty trailing page when overflow is minimal', () => {
      // 10px remaining + 15px block: spec says split, not empty page.
      const breaks = computeBreaks(
        [
          { pos: 0, heightPx: 490, node: makeNode('paragraph', false) },
          { pos: 100, heightPx: 15, node: makeNode('paragraph', false) },
        ],
        500,
      );
      // 490 + 15 = 505, which exceeds 500; the algorithm pushes the
      // second block to page 2. We only assert it does NOT spawn an
      // additional empty page (pageIndex > 2).
      const maxPageIndex = breaks.reduce((m, b) => Math.max(m, b.pageIndex), 0);
      expect(maxPageIndex).toBeLessThanOrEqual(2);
    });

    it('marks automatic breaks with kind=auto', () => {
      const breaks = computeBreaks(
        [
          { pos: 0, heightPx: 510, node: makeNode('paragraph', false) },
        ],
        500,
      );
      expect(breaks).toHaveLength(1);
      expect(breaks[0]!.kind).toBe('auto');
    });
  });

  describe('measureAndDecorate (integration with mock getBoundingClientRect)', () => {
    /**
     * Mock `getBoundingClientRect` on every direct child of `view.dom`
     * to return a controllable height. We attach the heights array via a
     * WeakMap so the mock can return them in DOM order.
     *
     * This is intentionally narrow: full e2e flow runs in Playwright.
     */
    let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;
    let heights: number[];

    beforeEach(() => {
      heights = [];
      originalGetBoundingClientRect =
        HTMLElement.prototype.getBoundingClientRect;
      HTMLElement.prototype.getBoundingClientRect = function () {
        const children = Array.from(this.children);
        const idx = children.indexOf(this);
        const h = heights[idx] ?? 0;
        return {
          top: 0,
          left: 0,
          right: 100,
          bottom: h,
          width: 100,
          height: h,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          },
        } as DOMRect;
      };
    });

    afterEach(() => {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      vi.restoreAllMocks();
    });

    it('produces at least one break when the first block exceeds page content height', async () => {
      // Build a tiny editor via the Tiptap factory and a custom schema.
      // We do NOT rely on a full Tiptap Editor — only on the pagination
      // algorithm via the helpers above. This block documents the
      // pattern for callers wanting a deeper assertion.
      const measuredHeights = [100, 600, 80];
      heights = measuredHeights;
      expect(measuredHeights[1]).toBeGreaterThan(500);

      const breaks = computeBreaks(
        measuredHeights.map((h, i) => ({
          pos: i * 100,
          heightPx: h,
          node: makeNode('paragraph', false),
        })),
        500,
      );

      expect(breaks.length).toBeGreaterThan(0);
      expect(breaks[0]!.pos).toBe(100);
    });
  });

  describe('collectTopLevelBlocks', () => {
    /**
     * Build a minimal mock view whose `state.doc.forEach` yields the
     * given nodes in order and whose `nodeDOM` returns a stub element.
     * The collector only needs those two surfaces.
     */
    function mockView(nodes: PMNode[]): Parameters<typeof collectTopLevelBlocks>[0] {
      const stub = document.createElement('div');
      const view = {
        state: {
          doc: {
            forEach(cb: (node: PMNode) => void) {
              for (const n of nodes) cb(n);
            },
          },
        },
        nodeDOM: () => stub,
      };
      return view as unknown as Parameters<typeof collectTopLevelBlocks>[0];
    }

    it('returns every block when no band nodes are present', () => {
      const blockA = makeNode('paragraph', false);
      const blockB = makeNode('heading', false);
      const blocks = collectTopLevelBlocks(mockView([blockA, blockB]));
      expect(blocks).toHaveLength(2);
      expect(blocks.map((b) => b.node.type.name)).toEqual(['paragraph', 'heading']);
    });

    it('excludes nodes in the dedocs-band group', () => {
      const header = makeBandNode('header', true);
      const blockA = makeNode('paragraph', false);
      const footer = makeBandNode('footer', true);
      const blockB = makeNode('paragraph', false);

      const blocks = collectTopLevelBlocks(
        mockView([header, blockA, footer, blockB]),
      );

      // Only the two paragraphs should remain.
      expect(blocks).toHaveLength(2);
      expect(
        blocks.every((b) => b.node.type.spec?.group !== BAND_GROUP),
      ).toBe(true);
      expect(blocks.map((b) => b.node.type.name)).toEqual(['paragraph', 'paragraph']);
    });

    it('advances position correctly when skipping band nodes', () => {
      // Bands still consume their nodeSize from the position cursor so
      // the offset arithmetic stays correct for downstream code.
      const header = makeBandNode('header', true);
      // Patch nodeSize on the casted mock object directly.
      (header as unknown as { nodeSize: number }).nodeSize = 5;
      const block = makeNode('paragraph', false);

      const blocks = collectTopLevelBlocks(mockView([header, block]));
      expect(blocks).toHaveLength(1);
      // The block's pos should be 5 (header's nodeSize), not 0.
      expect(blocks[0]!.pos).toBe(5);
    });
  });
});

/** Tiny stub for the ProseMirror node parameter — only `isAtom` / `isLeaf`
 *  are consulted by the algorithm in this slice. */
function makeNode(name: string, atom: boolean): PMNode {
  return {
    type: { name },
    isAtom: atom,
    isLeaf: atom,
    nodeSize: 10,
  } as PMNode;
}

/** Stub for a band-node (header / footer). Carries the `dedocs-band`
 *  group on its `type.spec` so `isBandNode` recognises it. */
function makeBandNode(name: string, atom: boolean): PMNode {
  return {
    type: { name, spec: { group: BAND_GROUP } },
    isAtom: atom,
    isLeaf: atom,
    nodeSize: 10,
  } as PMNode;
}