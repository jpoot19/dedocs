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
 *
 * The pagination plugin continues to manage `Decoration.widget` markers
 * between blocks; the CSS in `styles/page.css` keeps both the editor and
 * the frame ghosts aligned to the same paper size / margins.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/editor-shell/spec.md
 */

import { useMemo, type CSSProperties, type ReactElement } from 'react';
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
 * Render the editor DOM plus N decorative `.dedocs-page` frames inside a
 * scrollable canvas. Each frame reads its dimensions from the CSS custom
 * properties emitted by the `PageSetup` extension; the editor itself takes
 * the same paper width and respects the configured margins via inner padding.
 */
export function DocumentEditorCanvas(
  props: DocumentEditorCanvasProps,
): ReactElement {
  const { className } = props;
  const { pageSetup, paginationState, editor } = useDocumentEditor();

  // Build the array of page indices once per (pageCount, identity) change.
  const pageIndices = useMemo(() => {
    const count = Math.max(1, paginationState.pageCount);
    const indices: number[] = [];
    for (let i = 0; i < count; i += 1) indices.push(i);
    return indices;
  }, [paginationState.pageCount]);

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
          />
        );
      })}
    </div>
  );
}

DocumentEditorCanvas.displayName = 'DocumentEditor.Canvas';

export default DocumentEditorCanvas;