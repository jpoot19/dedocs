/**
 * `<DocumentEditor.Header>` — slot marker for the page-header band.
 *
 * This component renders `null` itself; its only purpose is to:
 *
 *   1. Carry a static `slotType = 'header'` marker so the parent
 *      `<DocumentEditor.Root>` can identify it during a
 *      `React.Children.forEach` traversal.
 *   2. Capture any child content the consumer passes between the
 *      opening and closing tags — that content is what the Canvas
 *      portals into the `.dedocs-band-header` div on every page frame.
 *
 * Usage:
 *
 *     <DocumentEditor.Root>
 *       <DocumentEditor.Header>
 *         <strong>ACME Corp</strong>
 *       </DocumentEditor.Header>
 *       <DocumentEditor.Canvas />
 *     </DocumentEditor.Root>
 *
 * Note: this is intentionally NOT a regular React component that returns
 * its children. Header (and Footer) are markers — they exist to be
 * discovered by Root and have their children rerouted into the band
 * portals. Returning JSX here would double-render the slot content.
 *
 * Spec: openspec/changes/header-footer/specs/editor-shell/spec.md
 */

import type { ReactElement, ReactNode } from 'react';

/**
 * Static marker read by `DocumentEditor.Root`'s slot capture. Setting
 * this on the function itself (rather than via a separate registry)
 * keeps slot identification local to the component and avoids global
 * coupling.
 */
export const HEADER_SLOT_TYPE = 'header' as const;

export interface DocumentEditorHeaderProps {
  /**
   * Slot content. Rendered into the header band of every page frame
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
export function DocumentEditorHeader(
  _props: DocumentEditorHeaderProps,
): ReactElement | null {
  return null;
}

// Attach the slot-type marker to the component function itself so
// `React.Children.forEach` can identify it without an explicit
// registry.
(DocumentEditorHeader as unknown as { slotType: string }).slotType =
  HEADER_SLOT_TYPE;

DocumentEditorHeader.displayName = 'DocumentEditor.Header';

export default DocumentEditorHeader;