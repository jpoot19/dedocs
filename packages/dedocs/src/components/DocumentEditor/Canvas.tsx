/**
 * `<DocumentEditor.Canvas>` — the scrollable page-frame surface.
 *
 * Reads the current `pageSetup` + `paginationState` + `editor` from the
 * DocumentEditorContext and:
 *
 *   1. Mounts `<EditorContent>` inside the canvas so the editor's content
 *      actually lives in the same scrollable surface as the page frames.
 *      (The editor is the *real*, flowing page surface; the frames are
 *      decorative ghosts rendered behind it that mark the page boundaries.)
 *   2. Renders one absolutely-positioned `.dedocs-page` per logical page so
 *      users see the expected page structure even when the document is
 *      shorter than `pageCount` pages.
 *   3. Renders `.dedocs-band-header` and `.dedocs-band-footer` divs
 *      inside each `.dedocs-page`. The band divs are the portal targets:
 *      once each frame's band refs commit to the DOM, we mount the
 *      consumer-supplied header/footer slot content via `createPortal`.
 *
 * The pagination plugin continues to manage `Decoration.widget` markers
 * between blocks; the CSS in `styles/page.css` keeps both the editor and
 * the frame ghosts aligned to the same paper size / margins and reserves
 * the band areas even when no slot content is supplied.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/editor-shell/spec.md
 * Spec: openspec/changes/header-footer/specs/editor-shell/spec.md
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { EditorContent } from '@tiptap/react';

import { useDocumentEditor } from '../../hooks/useDocumentEditor';

export interface DocumentEditorCanvasProps {
  /** Optional class on the canvas wrapper element. */
  className?: string;
}

/**
 * Vertical gap between successive page frames, in CSS pixels. Matches the
 * `padding: 16px 0` declared on `.dedocs-canvas`.
 */
const PAGE_GAP_PX = 16;

/**
 * Per-frame ref pair used by the portal effect. Tracked in a ref-backed
 * `Map` so we don't trigger React re-renders every time a DOM node
 * commits — the ref mutations are coordination signals, not
 * state changes.
 */
interface PageBandRefs {
  headerEl: HTMLElement | null;
  footerEl: HTMLElement | null;
}

/**
 * Render the editor DOM plus N decorative `.dedocs-page` frames inside a
 * scrollable canvas. Each frame reads its dimensions from the CSS custom
 * properties emitted by the `PageSetup` extension; the editor itself takes
 * the same paper width and respects the configured margins via inner padding.
 *
 * For each frame, header and footer band divs are rendered. After the band
 * DOM nodes commit (tracked via callback refs), a `useLayoutEffect` flips
 * `refsReady` and the slot content is portaled into each band's container.
 */
export function DocumentEditorCanvas(
  props: DocumentEditorCanvasProps,
): ReactElement {
  const { className } = props;
  const {
    pageSetup,
    paginationState,
    editor,
    headerSlot,
    footerSlot,
  } = useDocumentEditor();

  // Build the array of page indices once per (pageCount, identity) change.
  const pageIndices = useMemo(() => {
    const count = Math.max(1, paginationState.pageCount);
    const indices: number[] = [];
    for (let i = 0; i < count; i += 1) indices.push(i);
    return indices;
  }, [paginationState.pageCount]);

  // Refs are stored in a ref-backed `Map` (NOT React state) so the
  // callback ref doesn't re-render the whole Canvas every time a DOM
  // node commits. The ref map is the source of truth that the layout
  // effect consults to decide whether portals can mount.
  const pageRefsRef = useRef<Map<number, PageBandRefs>>(new Map());
  // A monotonically-increasing counter bumped inside the ref callback
  // and inside the prune effect. The counter is consumed by a
  // memoised `refsReady` derivation so the layout effect re-runs when
  // the ref-set changes.
  const [refsRevision, setRefsRevision] = useState(0);
  const bumpRevision = useRef<() => void>(() => {
    setRefsRevision((prev) => prev + 1);
  }).current;

  // Stable ref callback for header band divs. Identical identity across
  // renders so React doesn't ping-pong null→element→null on every
  // re-render (which would trigger an infinite setState loop). The
  // page index is read from the element's `data-page-index` attribute
  // so we don't need a per-pageIndex closure.
  const headerRefCallback = useCallback(
    (el: HTMLElement | null): void => {
      if (el === null) return; // skip null cleanup; we prune in layout effect
      const pageIndex = Number(el.dataset.pageIndex);
      if (!Number.isFinite(pageIndex)) return;
      const map = pageRefsRef.current;
      const existing = map.get(pageIndex) ?? {
        headerEl: null,
        footerEl: null,
      };
      if (existing.headerEl === el) return;
      map.set(pageIndex, { ...existing, headerEl: el });
      bumpRevision();
    },
    [bumpRevision],
  );

  // Stable ref callback for footer band divs.
  const footerRefCallback = useCallback(
    (el: HTMLElement | null): void => {
      if (el === null) return;
      const pageIndex = Number(el.dataset.pageIndex);
      if (!Number.isFinite(pageIndex)) return;
      const map = pageRefsRef.current;
      const existing = map.get(pageIndex) ?? {
        headerEl: null,
        footerEl: null,
      };
      if (existing.footerEl === el) return;
      map.set(pageIndex, { ...existing, footerEl: el });
      bumpRevision();
    },
    [bumpRevision],
  );

  // Drop refs for pages that no longer exist (e.g. pageCount shrunk
  // after a content edit) so the stale entries don't satisfy the
  // "all refs ready" check.
  useLayoutEffect(() => {
    const map = pageRefsRef.current;
    const expected = new Set(pageIndices);
    let pruned = false;
    for (const idx of Array.from(map.keys())) {
      if (!expected.has(idx)) {
        map.delete(idx);
        pruned = true;
      }
    }
    if (pruned) bumpRevision();
  }, [pageIndices, bumpRevision]);

  // Compute `refsReady` from the ref map + page indices. Returning a
  // memoised boolean keeps the downstream portal renderer stable.
  const refsReady = useMemo(() => {
    if (headerSlot == null && footerSlot == null) return false;
    if (pageIndices.length === 0) return false;
    for (const idx of pageIndices) {
      const r = pageRefsRef.current.get(idx);
      if (!r || r.headerEl === null || r.footerEl === null) return false;
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsRevision, pageIndices, headerSlot, footerSlot]);

  // Outer page dimensions drive the per-page frame positioning. We read them
  // from the pagination state (which derives from the CSS vars emitted by
  // the PageSetup extension) so any runtime paper-size / orientation /
  // margin change automatically re-flows the layout. Until the pagination
  // plugin runs its first measurement the values are zero — in that case we
  // skip inline styles and let the editor's own size carry the layout.
  const outerHeight = paginationState.outerHeight;
  const hasMeasured = outerHeight > 0;

  // Total height the canvas needs to fully expose every page frame plus
  // top/bottom gutter. Only applied once the pagination engine has measured
  // the page metrics; otherwise the editor's own height drives layout.
  const canvasStyle = useMemo<CSSProperties | undefined>(() => {
    if (!hasMeasured) return undefined;
    const pageCount = Math.max(1, paginationState.pageCount);
    const totalHeight =
      pageCount * outerHeight + (pageCount + 1) * PAGE_GAP_PX;
    return { minHeight: `${totalHeight}px` };
  }, [hasMeasured, outerHeight, paginationState.pageCount]);

  return (
    <div
      className={['dedocs-canvas', className].filter(Boolean).join(' ')}
      data-paper-size={pageSetup.paperSize}
      data-orientation={pageSetup.orientation}
      role="presentation"
      style={canvasStyle}
    >
      {/* The editor DOM is mounted inside the canvas so its content shares
        the same scrollable surface as the page frames. */}
      <EditorContent editor={editor} />

      {pageIndices.map((pageIndex) => {
        const top = hasMeasured
          ? `${pageIndex * (outerHeight + PAGE_GAP_PX)}px`
          : undefined;
        const frameStyle: CSSProperties | undefined = top
          ? { top }
          : undefined;
        return (
          <div
            key={`page-${pageIndex}`}
            className="dedocs-page"
            data-page-index={pageIndex}
            aria-label={`Page ${pageIndex + 1}`}
            aria-hidden="true"
            style={frameStyle}
          >
            <div
              className="dedocs-band-header"
              data-band="header"
              data-page-index={pageIndex}
              ref={headerRefCallback}
            />
            <div
              className="dedocs-band-footer"
              data-band="footer"
              data-page-index={pageIndex}
              ref={footerRefCallback}
            />
          </div>
        );
      })}

      {/* Portals: mount header/footer slot content into each frame's
         band div once all refs have committed. Rendered into a child
         PortalMounts component so the layout effect runs in its own
         commit boundary. */}
      <PortalMounts
        ready={refsReady}
        pageIndices={pageIndices}
        pageRefs={pageRefsRef.current}
        headerSlot={headerSlot}
        footerSlot={footerSlot}
      />
    </div>
  );
}

interface PortalMountsProps {
  /** True when every expected page frame has both band divs committed. */
  ready: boolean;
  /** Expected page indices for the current render. */
  pageIndices: number[];
  /** Live refs snapshot keyed by page index. */
  pageRefs: Map<number, PageBandRefs>;
  /** Header slot ReactNode, or null when no slot was provided. */
  headerSlot: ReactNode;
  /** Footer slot ReactNode, or null when no slot was provided. */
  footerSlot: ReactNode;
}

/**
 * Render-less coordinator: mounts React portals into each page frame's
 * band divs. Split into a child component so the layout effect runs in
 * its own commit boundary (avoids the parent effect re-running on
 * unrelated state changes). The actual DOM nodes live on the parent
 * `.dedocs-canvas` tree.
 */
function PortalMounts(props: PortalMountsProps): ReactElement | null {
  const { ready, pageIndices, pageRefs, headerSlot, footerSlot } = props;

  // useLayoutEffect runs after the parent DOM commits, so the portals
  // mount in the same paint as the band divs — no visible flash.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    // No-op: the portals are self-contained React trees that
    // automatically unmount when this component re-renders without a
    // matching portal entry.
  }, [ready, pageIndices, headerSlot, footerSlot]);

  // Ensure the import is referenced (some bundlers tree-shake
  // useEffect as unused if not referenced — the pragma here keeps the
  // import live in case future slots need an effect-driven lifecycle).
  useEffect(() => undefined, []);

  if (!ready) return null;

  const portals: ReactElement[] = [];
  for (const pageIndex of pageIndices) {
    const refs = pageRefs.get(pageIndex);
    if (!refs) continue;
    if (headerSlot != null && refs.headerEl) {
      portals.push(
        createPortal(
          <div
            key={`header-${pageIndex}`}
            className="dedocs-band-header-content"
            data-band-content="header"
          >
            {headerSlot}
          </div>,
          refs.headerEl,
        ) as ReactElement,
      );
    }
    if (footerSlot != null && refs.footerEl) {
      portals.push(
        createPortal(
          <div
            key={`footer-${pageIndex}`}
            className="dedocs-band-footer-content"
            data-band-content="footer"
          >
            {footerSlot}
          </div>,
          refs.footerEl,
        ) as ReactElement,
      );
    }
  }

  return <>{portals}</>;
}

DocumentEditorCanvas.displayName = 'DocumentEditor.Canvas';

export default DocumentEditorCanvas;