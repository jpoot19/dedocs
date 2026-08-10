/**
 * `<DocumentEditor.Canvas>` — the scrollable page-frame surface.
 *
 * Reads the current `pageSetup` + `paginationState` from the
 * DocumentEditorContext and renders one absolutely-positioned `.dedocs-page`
 * per logical page. The actual content comes from the editor itself (a
 * single scrollable column inside the editor DOM); each visual frame
 * shows the slice of content that belongs to it.
 *
 * For the MVP, the Canvas does NOT physically clip the editor content to
 * individual frames — it renders N frames based on `paginationState.pageCount`
 * so users see the expected page structure. The pagination plugin
 * continues to manage `Decoration.widget` markers between blocks; the
 * CSS in `styles/page.css` ensures each `.dedocs-page` takes the right
 * dimensions.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/editor-shell/spec.md
 */

import { useMemo, type ReactElement } from 'react';

import { useDocumentEditor } from '../../hooks/useDocumentEditor';

export interface DocumentEditorCanvasProps {
  /** Optional class on the canvas wrapper element. */
  className?: string;
}

/**
 * Render N `.dedocs-page` frames. Each frame reads its dimensions from
 * the CSS custom properties set by the `PageSetup` extension.
 */
export function DocumentEditorCanvas(
  props: DocumentEditorCanvasProps,
): ReactElement {
  const { className } = props;
  const { pageSetup, paginationState } = useDocumentEditor();

  // Build the array of page indices once per (pageCount, identity) change.
  const pageIndices = useMemo(() => {
    const count = Math.max(1, paginationState.pageCount);
    const indices: number[] = [];
    for (let i = 0; i < count; i += 1) indices.push(i);
    return indices;
  }, [paginationState.pageCount]);

  return (
    <div
      className={['dedocs-canvas', className].filter(Boolean).join(' ')}
      data-paper-size={pageSetup.paperSize}
      data-orientation={pageSetup.orientation}
      role="presentation"
    >
      {pageIndices.map((pageIndex) => (
        <div
          key={`page-${pageIndex}`}
          className="dedocs-page"
          data-page-index={pageIndex}
          aria-label={`Page ${pageIndex + 1}`}
        />
      ))}
    </div>
  );
}

DocumentEditorCanvas.displayName = 'DocumentEditor.Canvas';

export default DocumentEditorCanvas;