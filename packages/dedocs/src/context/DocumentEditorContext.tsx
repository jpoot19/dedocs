/**
 * DocumentEditor context.
 *
 * The shared, mutable runtime state for a mounted `<DocumentEditor.Root>`:
 *
 *   - `editor`           — the live Tiptap editor instance (or `null` while
 *                          mounting). Mutating operations go through here.
 *   - `pageSetup`        — the current `PageSetupOptions` (the same value
 *                          `PageSetup` extension holds in its storage).
 *   - `paginationState`  — a read-only snapshot of the pagination plugin's
 *                          current decorations / breaks / page count.
 *   - `headerSlot`       — React children captured from
 *                          `<DocumentEditor.Header>` children. Rendered
 *                          into the header band of every page frame via
 *                          React portal.
 *   - `footerSlot`       — React children captured from
 *                          `<DocumentEditor.Footer>` children. Rendered
 *                          into the footer band of every page frame via
 *                          React portal.
 *
 * Consumers should prefer the `useDocumentEditor()` hook over importing
 * `DocumentEditorContext` directly — the hook provides a "must be used
 * inside a Provider" guard.
 */

import { createContext, type ReactNode } from 'react';

import type { Editor } from '@tiptap/core';

import type {
  PageSetupOptions,
  PaginationState,
} from '../types';

export interface DocumentEditorContextValue {
  /** Tiptap editor instance, or `null` until `useEditor` resolves. */
  editor: Editor | null;
  /** Resolved page setup. Defaults to `DEFAULT_PAGE_SETUP` until the
   *  editor's `PageSetup` storage is read for the first time. */
  pageSetup: PageSetupOptions;
  /** Latest pagination snapshot (breaks, page count, dimensions). */
  paginationState: PaginationState;
  /**
   * React children captured from the `<DocumentEditor.Header>` marker
   * by `Root`. Portaled into the header band of every page frame by
   * `Canvas`. `null` when no `<DocumentEditor.Header>` child was
   * supplied.
   */
  headerSlot: ReactNode;
  /**
   * React children captured from the `<DocumentEditor.Footer>` marker
   * by `Root`. Portaled into the footer band of every page frame by
   * `Canvas`. `null` when no `<DocumentEditor.Footer>` child was
   * supplied.
   */
  footerSlot: ReactNode;
}

export const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(
  null,
);

DocumentEditorContext.displayName = 'DocumentEditorContext';

export default DocumentEditorContext;