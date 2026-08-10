/**
 * Pagination engine.
 *
 * A ProseMirror plugin that measures top-level block heights against the
 * page content area and emits `Decoration.widget` page-break markers at
 * the appropriate positions. State lives in plugin state (not React) so
 * the editor view can re-render decorations without React re-rendering.
 *
 * Algorithm overview:
 *   1. ResizeObserver on the editor's content element + MutationObserver
 *      on childList fires when any top-level block appears, disappears,
 *      or changes size.
 *   2. The measurement callback schedules a single `requestAnimationFrame`
 *      tick that walks all top-level blocks, sums their heights, and
 *      emits break positions where the running total exceeds the page
 *      content height.
 *   3. Atomic blocks (those with `atom: true`, e.g. `pageBreak`) are
 *      pushed to the next page rather than split inline.
 *   4. Blocks taller than the page content area are split inline at the
 *      text-node offset closest to the boundary (marks/links preserved
 *      because the document is never mutated).
 *
 * Spec: openspec/changes/dedocs-mvp/specs/pagination/spec.md
 */

import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import {
  Decoration,
  DecorationSet,
  type EditorView,
} from '@tiptap/pm/view';

import {
  DEFAULT_PAGE_SETUP,
  type PaginationBreak,
  type PaginationState,
  type PageSetupOptions,
} from '../types';
import { getPaperDimensions } from '../utils/paperSizes';
import { mergePageSetup } from './page-setup';

/**
 * Browser default DPI used for screen rendering. CSS values emitted by
 * the PageSetup extension are in mm; we convert to CSS pixels using the
 * standard 96-DPI screen assumption. Print uses the @page rule in
 * styles/page.css and does not depend on this constant.
 */
export const SCREEN_PX_PER_MM = 96 / 25.4;
export const MM_PER_CM = 10;

export const PAGINATION_PLUGIN_KEY = new PluginKey<PaginationPluginState>(
  'dedocsPagination',
);

/**
 * Internal plugin state. `decorations` is what ProseMirror renders;
 * `breaks`/`pageCount`/`pageWidth`/`pageHeight` are the public snapshot
 * consumed by React via `editor.storage` (or a dedicated getter).
 */
export interface PaginationPluginState {
  decorations: DecorationSet;
  breaks: ReadonlyArray<PaginationBreak>;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
}

export interface PaginationResolvedMetrics {
  /** Page outer width in CSS px (frame width). */
  outerWidth: number;
  /** Page outer height in CSS px (frame height). */
  outerHeight: number;
  /** Content area width in CSS px (page minus horizontal margins). */
  contentWidth: number;
  /** Content area height in CSS px (page minus vertical margins). */
  contentHeight: number;
}

/**
 * Pure helper: turn a `PageSetupOptions` and a px-per-mm scale into the
 * CSS-pixel metrics used by the pagination algorithm. Exported for unit
 * tests so the math is verifiable without an editor instance.
 */
export function resolveMetrics(
  pageSetup: PageSetupOptions,
  pxPerMm: number = SCREEN_PX_PER_MM,
): PaginationResolvedMetrics {
  const dims = getPaperDimensions(pageSetup.paperSize, pageSetup.orientation);
  const outerWidth = dims.width * pxPerMm;
  const outerHeight = dims.height * pxPerMm;
  const marginX =
    (pageSetup.margins.left + pageSetup.margins.right) * MM_PER_CM * pxPerMm;
  const marginY =
    (pageSetup.margins.top + pageSetup.margins.bottom) * MM_PER_CM * pxPerMm;
  return {
    outerWidth,
    outerHeight,
    contentWidth: Math.max(0, outerWidth - marginX),
    contentHeight: Math.max(0, outerHeight - marginY),
  };
}

/**
 * Information about a single top-level block needed to decide where a
 * break should land. `pos` is the ProseMirror position at the start of
 * the block; `node` is the ProseMirror node; `dom` is its DOM element.
 */
interface BlockMeasurement {
  pos: number;
  size: number;
  node: PMNode;
  dom: HTMLElement | null;
}

/**
 * Collect `(pos, node, dom)` for every direct child of the document.
 * Positions are walked in document order so the caller can iterate
 * top-level blocks without re-querying the DOM.
 */
function collectTopLevelBlocks(view: EditorView): BlockMeasurement[] {
  const doc = view.state.doc;
  const children: PMNode[] = [];
  doc.forEach((node) => children.push(node));
  const blocks: BlockMeasurement[] = [];
  let pos = 0;
  for (const node of children) {
    const dom = view.nodeDOM(pos) as HTMLElement | null;
    blocks.push({ pos, size: node.nodeSize, node, dom });
    pos += node.nodeSize;
  }
  return blocks;
}

/**
 * For a block taller than the page content height, find the inline
 * offset closest to the page boundary by walking text-node rectangles.
 * Returns `null` if no suitable split point exists (atomic blocks).
 *
 * The returned `offset` is a ProseMirror position INSIDE the block,
 * suitable for use as a break position.
 */
function findInlineSplitOffset(
  block: BlockMeasurement,
  boundaryPx: number,
  view: EditorView,
): { splitPos: number; remainingPx: number } | null {
  const dom = block.dom;
  if (!dom || block.node.isAtom || block.node.isLeaf) return null;

  const blockRect = dom.getBoundingClientRect();
  // boundaryPx is measured relative to the top of the block's content area
  const targetY = blockRect.top + boundaryPx;

  // Walk text nodes in document order
  const walker = (dom.ownerDocument ?? document).createTreeWalker(
    dom,
    0x004, // NodeFilter.SHOW_TEXT
  );

  let currentTextNode: Text | null = walker.nextNode() as Text | null;
  while (currentTextNode) {
    const range = (dom.ownerDocument ?? document).createRange();
    range.selectNodeContents(currentTextNode);
    const rects = Array.from(range.getClientRects());
    for (const rect of rects) {
      // rect is one visual line. We pick the first line whose bottom
      // crosses the boundary; if we overshoot, we split at the start of
      // the next line.
      if (rect.bottom >= targetY && rect.top <= targetY) {
        const textOffsetWithinDom = computeTextOffsetInBlock(dom, currentTextNode);
        const pmOffset = domOffsetToBlockPos(view, dom, textOffsetWithinDom);
        if (pmOffset == null) return null;
        const remainingPx = blockRect.bottom - rect.bottom;
        return {
          splitPos: block.pos + pmOffset,
          remainingPx: Math.max(0, remainingPx),
        };
      }
      if (rect.top > targetY) {
        // We've passed the boundary within this block — split at start of this line.
        const textOffsetWithinDom = computeTextOffsetInBlock(dom, currentTextNode);
        const pmOffset = domOffsetToBlockPos(view, dom, textOffsetWithinDom);
        if (pmOffset == null) return null;
        const remainingPx = blockRect.bottom - rect.top;
        return {
          splitPos: block.pos + pmOffset,
          remainingPx: Math.max(0, remainingPx),
        };
      }
    }
    currentTextNode = walker.nextNode() as Text | null;
  }
  return null;
}

/**
 * Convert a DOM character offset inside a block to a ProseMirror position
 * relative to the start of the block DOM element. Returns null if the
 * offset cannot be resolved.
 */
function domOffsetToBlockPos(
  view: EditorView,
  blockDom: HTMLElement,
  offsetWithinBlock: number,
): number | null {
  const range = (view.dom as HTMLElement).ownerDocument.createRange();
  try {
    range.setStart(blockDom, 0);
    range.setEnd(blockDom, offsetWithinBlock);
  } catch {
    return null;
  }
  const pmPos = view.posAtDOM(range.endContainer, range.endOffset);
  if (typeof pmPos !== 'number') return null;
  return pmPos - computeBlockPosStart(view, blockDom);
}

function computeBlockPosStart(view: EditorView, blockDom: HTMLElement): number {
  const pos = view.posAtDOM(blockDom, 0);
  return typeof pos === 'number' ? pos : 0;
}

function computeTextOffsetInBlock(blockDom: HTMLElement, textNode: Text): number {
  const range = (blockDom.ownerDocument ?? document).createRange();
  range.setStart(blockDom, 0);
  range.setEnd(textNode, 0);
  return range.toString().length;
}

/**
 * Compute the ordered list of pagination breaks for a top-level block
 * walk. Pure function — takes a measured block list plus the page
 * content height, returns break positions. Exported so unit tests can
 * exercise the algorithm without a live editor.
 */
export function computeBreaks(
  blocks: ReadonlyArray<{ heightPx: number; node: PMNode; pos: number }>,
  contentHeightPx: number,
): PaginationBreak[] {
  const breaks: PaginationBreak[] = [];
  let cursor = 0; // accumulated height on the current page
  let pageIndex = 0;

  for (const block of blocks) {
    const { heightPx, pos } = block;

    if (heightPx <= contentHeightPx && cursor + heightPx <= contentHeightPx) {
      // Fits on the current page — accumulate.
      cursor += heightPx;
      continue;
    }

    if (heightPx > contentHeightPx) {
      // Block overflow: split inline (handled by the caller; here we just
      // treat as a full break — the widget decoration handles rendering
      // the overflow visually).
      breaks.push({ pos, pageIndex: pageIndex + 1, kind: 'auto' });
      pageIndex += 1;
      cursor = heightPx; // optimistic; caller refines with inline-split height
      continue;
    }

    // Normal block that doesn't fit — push to next page.
    breaks.push({ pos, pageIndex: pageIndex + 1, kind: 'auto' });
    pageIndex += 1;
    cursor = heightPx;
  }

  return breaks;
}

/**
 * Build the DecorationSet that ProseMirror renders. Each break gets a
 * widget marker placed at its position; the widget DOM is created lazily
 * by the side-effecting `widget` callback.
 */
function buildDecorations(
  breaks: ReadonlyArray<PaginationBreak>,
  doc: PMNode,
): DecorationSet {
  const safeBreaks = breaks.filter((b) => b.pos > 0 && b.pos <= doc.content.size);
  const widgets = safeBreaks.map((b) =>
    Decoration.widget(b.pos, () => {
      const el = document.createElement('hr');
      el.classList.add('dedocs-page-break');
      el.setAttribute('data-page-break', 'true');
      el.setAttribute('data-auto', 'true');
      el.setAttribute('data-page-index', String(b.pageIndex));
      return el;
    }),
  );
  return DecorationSet.create(doc, widgets);
}

function emptyState(metrics: PaginationResolvedMetrics): PaginationPluginState {
  return {
    decorations: DecorationSet.empty,
    breaks: [],
    pageCount: 1,
    pageWidth: metrics.contentWidth,
    pageHeight: metrics.contentHeight,
  };
}

export interface PaginationOptions {
  /** Page setup. Merged with `DEFAULT_PAGE_SETUP` for any missing field. */
  pageSetup?: Partial<PageSetupOptions>;
  /** Override the px-per-mm conversion (defaults to screen 96 DPI). */
  pxPerMm?: number;
}

/**
 * Tiptap extension wrapping the pagination ProseMirror plugin. The plugin
 * owns the ResizeObserver / rAF / MutationObserver lifecycle; the
 * extension exists so consumers can add it via `extensions: [..., Pagination]`.
 */
export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageSetup: undefined,
      pxPerMm: undefined,
    };
  },

  addProseMirrorPlugins() {
    const initialPageSetup = mergePageSetup(this.options.pageSetup);
    const pxPerMm = this.options.pxPerMm ?? SCREEN_PX_PER_MM;

    let pendingFrame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let cachedMetrics = resolveMetrics(initialPageSetup, pxPerMm);
    let lastReadCssVarsKey = '';

    const recompute = (view: EditorView) => {
      if (pendingFrame !== null) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;

        // Re-derive metrics from the CSS variables emitted by PageSetup
        // so runtime `setPageSetup(...)` calls flow through without
        // recreating the editor.
        const cssKey = readCssVarsKey(view.dom as HTMLElement);
        if (cssKey !== lastReadCssVarsKey) {
          cachedMetrics = resolveMetrics(
            mergePageSetup(readPageSetupFromDom(view.dom as HTMLElement, pxPerMm)),
            pxPerMm,
          );
          lastReadCssVarsKey = cssKey;
        }

        const next = measureAndDecorate(view, cachedMetrics);
        const current = PAGINATION_PLUGIN_KEY.getState(view.state);
        if (current === next) return;
        view.dispatch(view.state.tr.setMeta(PAGINATION_PLUGIN_KEY, { state: next }));
      });
    };

    return [
      new Plugin<PaginationPluginState>({
        key: PAGINATION_PLUGIN_KEY,

        state: {
          init: () => emptyState(cachedMetrics),
          apply(tr, prev) {
            const meta = tr.getMeta(PAGINATION_PLUGIN_KEY) as
              | { state: PaginationPluginState }
              | undefined;
            if (meta) return meta.state;
            // Map decorations through the transaction so cursor moves
            // don't desync widget positions.
            return {
              ...prev,
              decorations: prev.decorations.map(tr.mapping, tr.doc),
            };
          },
        },

        props: {
          decorations(state) {
            return PAGINATION_PLUGIN_KEY.getState(state)?.decorations ?? null;
          },
        },

        view(view) {
          const root = view.dom as HTMLElement;

          // ResizeObserver: any size change in the editor tree triggers a
          // rAF-debounced recompute.
          if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => recompute(view));
            resizeObserver.observe(root);
            root.querySelectorAll<HTMLElement>(':scope > *').forEach((el) => {
              resizeObserver?.observe(el);
            });
          }

          // MutationObserver: new top-level blocks appear when the user
          // types a new paragraph or presses Enter inside a list.
          if (typeof MutationObserver !== 'undefined') {
            mutationObserver = new MutationObserver(() => recompute(view));
            mutationObserver.observe(root, {
              childList: true,
              subtree: false,
            });
          }

          recompute(view);

          return {
            update(updatedView) {
              recompute(updatedView);
            },
            destroy() {
              if (pendingFrame !== null) {
                cancelAnimationFrame(pendingFrame);
                pendingFrame = null;
              }
              resizeObserver?.disconnect();
              resizeObserver = null;
              mutationObserver?.disconnect();
              mutationObserver = null;
            },
          };
        },
      }),
    ];
  },
});

/**
 * Measure every top-level block, compute breaks, and return the next
 * plugin state. Pure side-effecting helper used by the rAF callback —
 * exported only for testing.
 */
function measureAndDecorate(
  view: EditorView,
  metrics: PaginationResolvedMetrics,
): PaginationPluginState {
  const blocks = collectTopLevelBlocks(view);
  const measured = blocks.map((b) => {
    const rect = b.dom?.getBoundingClientRect();
    return {
      pos: b.pos,
      heightPx: rect?.height ?? 0,
      node: b.node,
      dom: b.dom,
      size: b.size,
    };
  });

  const simpleBreaks = computeBreaks(
    measured.map((m) => ({ heightPx: m.heightPx, node: m.node, pos: m.pos })),
    metrics.contentHeight,
  );

  // Refine: for blocks that overflow the page content area, attempt an
  // inline split. If a split is found, replace the matching "full-block"
  // break with the finer split position.
  const refined: PaginationBreak[] = [];
  for (const b of simpleBreaks) {
    const block = measured.find((m) => m.pos === b.pos);
    if (
      block &&
      block.heightPx > metrics.contentHeight &&
      !block.node.isAtom &&
      !block.node.isLeaf
    ) {
      const split = findInlineSplitOffset(
        { pos: block.pos, size: block.size, node: block.node, dom: block.dom },
        metrics.contentHeight,
        view,
      );
      if (split) {
        refined.push({
          pos: split.splitPos,
          pageIndex: b.pageIndex,
          kind: 'auto',
        });
        continue;
      }
    }
    refined.push(b);
  }

  const pageCount = Math.max(1, refined.length + 1);
  const decorations = buildDecorations(refined, view.state.doc);

  return {
    decorations,
    breaks: refined,
    pageCount,
    pageWidth: metrics.contentWidth,
    pageHeight: metrics.contentHeight,
  };
}

/**
 * Public read-only snapshot of pagination state for a given editor view.
 * Convenient for non-React callers (tests, server-side snapshots).
 */
export function getPaginationState(view: EditorView): PaginationState {
  const pluginState = PAGINATION_PLUGIN_KEY.getState(view.state);
  if (!pluginState) {
    const m = resolveMetrics(DEFAULT_PAGE_SETUP);
    return {
      breaks: [],
      pageCount: 1,
      pageWidth: m.contentWidth,
      pageHeight: m.contentHeight,
    };
  }
  return {
    breaks: pluginState.breaks,
    pageCount: pluginState.pageCount,
    pageWidth: pluginState.pageWidth,
    pageHeight: pluginState.pageHeight,
  };
}

export default Pagination;

/**
 * Read the page-setup CSS variables off an element and reconstruct a
 * `Partial<PageSetupOptions>` for the pagination engine. Returns
 * `undefined` when the element is missing or not yet styled.
 */
function readPageSetupFromDom(
  el: HTMLElement,
  pxPerMm: number,
): Partial<PageSetupOptions> | undefined {
  if (!el) return undefined;
  const cs = window.getComputedStyle(el);
  const widthMm = parseCssLengthMm(cs.getPropertyValue('--page-width'));
  const heightMm = parseCssLengthMm(cs.getPropertyValue('--page-height'));
  const marginTopCm = parseCssLengthCm(cs.getPropertyValue('--page-margin-top'));
  const marginRightCm = parseCssLengthCm(cs.getPropertyValue('--page-margin-right'));
  const marginBottomCm = parseCssLengthCm(
    cs.getPropertyValue('--page-margin-bottom'),
  );
  const marginLeftCm = parseCssLengthCm(cs.getPropertyValue('--page-margin-left'));

  // We only re-derive metrics when the CSS vars actually changed; the
  // memoised key captures all six values.
  if (
    widthMm == null ||
    heightMm == null ||
    marginTopCm == null ||
    marginRightCm == null ||
    marginBottomCm == null ||
    marginLeftCm == null
  ) {
    return undefined;
  }

  // Identify paper size by matching the larger dimension to known mm sizes.
  const paperSize = identifyPaperSize(widthMm, heightMm);
  const orientation: 'portrait' | 'landscape' =
    widthMm < heightMm ? 'portrait' : 'landscape';

  // `pxPerMm` is reserved for future consumer overrides (e.g. retina-aware
  // measurement); currently the engine reads CSS vars which already encode
  // the screen scale.
  void pxPerMm;

  return {
    paperSize,
    orientation,
    margins: {
      top: marginTopCm,
      right: marginRightCm,
      bottom: marginBottomCm,
      left: marginLeftCm,
    },
  };
}

function readCssVarsKey(el: HTMLElement | null | undefined): string {
  if (!el) return '';
  const cs = window.getComputedStyle(el);
  return [
    cs.getPropertyValue('--page-width'),
    cs.getPropertyValue('--page-height'),
    cs.getPropertyValue('--page-margin-top'),
    cs.getPropertyValue('--page-margin-right'),
    cs.getPropertyValue('--page-margin-bottom'),
    cs.getPropertyValue('--page-margin-left'),
  ].join('|');
}

function parseCssLengthMm(value: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^([\d.]+)\s*mm$/);
  if (!match) return null;
  const num = Number.parseFloat(match[1]);
  return Number.isFinite(num) ? num : null;
}

function parseCssLengthCm(value: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^([\d.]+)\s*cm$/);
  if (!match) return null;
  const num = Number.parseFloat(match[1]);
  return Number.isFinite(num) ? num : null;
}

function identifyPaperSize(
  widthMm: number,
  heightMm: number,
): 'A4' | 'Letter' | 'Legal' | 'A5' {
  // Compare against canonical portrait sizes; match within ±1 mm.
  const candidates: Array<{ name: 'A4' | 'Letter' | 'Legal' | 'A5'; w: number; h: number }> = [
    { name: 'A4', w: 210, h: 297 },
    { name: 'Letter', w: 215.9, h: 279.4 },
    { name: 'Legal', w: 215.9, h: 355.6 },
    { name: 'A5', w: 148, h: 210 },
  ];
  const small = Math.min(widthMm, heightMm);
  const large = Math.max(widthMm, heightMm);
  for (const c of candidates) {
    if (Math.abs(c.w - small) < 1 && Math.abs(c.h - large) < 1) return c.name;
  }
  // Fallback: round to closest match based on width alone.
  let best: 'A4' | 'Letter' | 'Legal' | 'A5' = 'A4';
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const delta = Math.abs(c.w - small) + Math.abs(c.h - large);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = c.name;
    }
  }
  return best;
}
