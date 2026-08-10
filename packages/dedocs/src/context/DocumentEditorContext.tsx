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
 *
 * Consumers should prefer the `useDocumentEditor()` hook over importing
 * `DocumentEditorContext` directly — the hook provides a "must be used
 * inside a Provider" guard.
 */

import { createContext } from 'react';

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
}

export const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(
  null,
);

DocumentEditorContext.displayName = 'DocumentEditorContext';

export default DocumentEditorContext;