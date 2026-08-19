/**
 * `<DocumentEditor.Footer>` — slot marker for the page-footer band.
 *
 * Twin to `<DocumentEditor.Header>`; renders `null` itself and
 * publishes a `slotType = 'footer'` marker so `DocumentEditor.Root`
 * can extract its children during the slot capture traversal. The
 * captured children are exposed via context and portaled into the
 * `.dedocs-band-footer` div on every page frame by Canvas.
 *
 * Usage:
 *
 *     <DocumentEditor.Root>
 *       <DocumentEditor.Canvas />
 *       <DocumentEditor.Footer>
 *         Page <span data-page-number />
 *       </DocumentEditor.Footer>
 *     </DocumentEditor.Root>
 *
 * Spec: openspec/changes/header-footer/specs/editor-shell/spec.md
 */

import type { ReactElement, ReactNode } from 'react';

/**
 * Static marker read by `DocumentEditor.Root`'s slot capture.
 */
export const FOOTER_SLOT_TYPE = 'footer' as const;

export interface DocumentEditorFooterProps {
  /**
   * Slot content. Rendered into the footer band of every page frame
   * via React portals in `<DocumentEditor.Canvas>`. The marker
   * component itself returns `null`, so this content is never rendered
   * in place.
   */
  children?: ReactNode;
}

/**
 * Marker component. Returns `null`; the children are extracted by
 * `DocumentEditor.Root` during slot capture and exposed via context.
 */
export function DocumentEditorFooter(
  _props: DocumentEditorFooterProps,
): ReactElement | null {
  return null;
}

(DocumentEditorFooter as unknown as { slotType: string }).slotType =
  FOOTER_SLOT_TYPE;

DocumentEditorFooter.displayName = 'DocumentEditor.Footer';

export default DocumentEditorFooter;