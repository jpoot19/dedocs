/**
 * `<DocumentEditor.Root>` — the context provider that wires the Tiptap
 * editor instance, the current `PageSetup`, and the live pagination
 * snapshot together for every descendant component.
 *
 * Usage:
 *
 *     <DocumentEditor.Root pageSetup={opts} onUpdate={fn}>
 *       <DocumentEditor.Toolbar />
 *       <DocumentEditor.Canvas />
 *     </DocumentEditor.Root>
 *
 * The Root owns:
 *   - `useEditor(createDedocsEditor({...}))` — instantiates the editor.
 *   - A `useState` subscription to the pagination plugin key so child
 *     components re-render when breaks change.
 *   - The default page-setup value used as context fallback while the
 *     editor is still mounting.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/editor-shell/spec.md
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import { EditorContent, useEditor } from '@tiptap/react';

import { createDedocsEditor } from '../../editor/createDedocsEditor';
import {
  PAGINATION_PLUGIN_KEY,
  type PaginationPluginState,
} from '../../extensions/pagination';
import {
  DEFAULT_PAGE_SETUP,
  type DedocsEditorOptions,
  type PageSetupOptions,
  type PaginationState,
  type PaginationBreak,
} from '../../types';
import {
  DocumentEditorContext,
  type DocumentEditorContextValue,
} from '../../context/DocumentEditorContext';
import { useResizeObserver } from '../../hooks/useResizeObserver';

export interface DocumentEditorRootProps {
  /** Initial / current page setup. Mirrors `PageSetup` extension options. */
  pageSetup?: PageSetupOptions;
  /** Initial document content (HTML string or ProseMirror JSON). */
  content?: DedocsEditorOptions['content'];
  /** Disable editing. Defaults to `true` (editable). */
  editable?: boolean;
  /** Forwarded from `createDedocsEditor.onUpdate`. */
  onUpdate?: DedocsEditorOptions['onUpdate'];
  /** Class on the outermost `<div>` container. */
  className?: string;
  /** Children — typically `<DocumentEditor.Toolbar />` and `<DocumentEditor.Canvas />`. */
  children?: ReactNode;
}

/**
 * Empty pagination snapshot used as the context fallback while the
 * editor is still mounting.
 */
const EMPTY_PAGINATION_STATE: PaginationState = Object.freeze({
  breaks: [] as ReadonlyArray<PaginationBreak>,
  pageCount: 1,
  pageWidth: 0,
  pageHeight: 0,
}) as PaginationState;

export function DocumentEditorRoot(props: DocumentEditorRootProps): ReactElement {
  const {
    pageSetup = DEFAULT_PAGE_SETUP,
    content,
    editable = true,
    onUpdate,
    className,
    children,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [paginationState, setPaginationState] =
    useState<PaginationState>(EMPTY_PAGINATION_STATE);

  const editorOptions = useMemo(
    () =>
      createDedocsEditor({
        content,
        editable,
        pageSetup,
        onUpdate,
      }),
    // We intentionally exclude `onUpdate` from deps to avoid rebuilding
    // the editor every time the consumer re-renders. The Tiptap
    // `useEditor` hook accepts a fresh options object via
    // `editor.setOptions({ onUpdate })` if hot-swapping is ever needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, editable, pageSetup],
  );

  const editor = useEditor(editorOptions, [pageSetup]);

  // Subscribe to pagination plugin updates. The plugin dispatches a
  // transaction with `setMeta(PAGINATION_PLUGIN_KEY, { state })` whenever
  // breaks recompute; we read that state and mirror it into React so
  // the Canvas re-renders the page frames.
  useEffect(() => {
    if (!editor) return undefined;
    const handleUpdate = () => {
      const next = PAGINATION_PLUGIN_KEY.getState(
        editor.state,
      ) as PaginationPluginState | undefined;
      if (!next) return;
      setPaginationState({
        breaks: next.breaks,
        pageCount: next.pageCount,
        pageWidth: next.pageWidth,
        pageHeight: next.pageHeight,
      });
    };
    handleUpdate();
    editor.on('transaction', handleUpdate);
    editor.on('update', handleUpdate);
    return () => {
      editor.off('transaction', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Re-observe the root container for size changes so the pagination
  // engine can re-derive metrics if the consumer resizes the host.
  useResizeObserver(containerRef, () => {
    // The Pagination plugin already observes the editor DOM. Our
    // observation here is a courtesy: it ensures consumers who resize
    // the outer container also trigger a recompute (the editor's
    // ResizeObserver covers only the editor's own subtree).
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta('dedocsContainerResized', true));
  });

  const contextValue = useMemo<DocumentEditorContextValue>(
    () => ({
      editor,
      pageSetup,
      paginationState,
    }),
    [editor, pageSetup, paginationState],
  );

  return (
    <DocumentEditorContext.Provider value={contextValue}>
      <div ref={containerRef} className={className ?? 'dedocs-root'}>
        {children}
        <EditorContent editor={editor} />
      </div>
    </DocumentEditorContext.Provider>
  );
}

DocumentEditorRoot.displayName = 'DocumentEditor.Root';

export default DocumentEditorRoot;