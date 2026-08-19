/**
 * `<DocumentEditor.Root>` — the context provider that wires the Tiptap
 * editor instance, the current `PageSetup`, the live pagination
 * snapshot, and the captured header/footer slot children together for
 * every descendant component.
 *
 * Usage:
 *
 *     <DocumentEditor.Root pageSetup={opts} onUpdate={fn}>
 *       <DocumentEditor.Toolbar />
 *       <DocumentEditor.Header>
 *         <strong>ACME Corp</strong>
 *       </DocumentEditor.Header>
 *       <DocumentEditor.Canvas />
 *       <DocumentEditor.Footer>
 *         <em>© 2026</em>
 *       </DocumentEditor.Footer>
 *     </DocumentEditor.Root>
 *
 * The Root owns:
 *   - `useEditor(createDedocsEditor({...}))` — instantiates the editor.
 *   - A `useState` subscription to the pagination plugin key so child
 *     components re-render when breaks change.
 *   - The default page-setup value used as context fallback while the
 *     editor is still mounting.
 *   - Slot capture: a single `React.Children.forEach` traversal over
 *     the consumer's children that identifies `<DocumentEditor.Header>`
 *     and `<DocumentEditor.Footer>` markers (via their static
 *     `slotType`) and lifts their children into the context as
 *     `headerSlot` / `footerSlot` for `<DocumentEditor.Canvas>` to
 *     portal-mount into every page frame.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/editor-shell/spec.md
 * Spec: openspec/changes/header-footer/specs/editor-shell/spec.md
 */

import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import { useEditor } from '@tiptap/react';

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
  /** Children — typically `<DocumentEditor.Toolbar />`, `<DocumentEditor.Canvas />`,
   * and optional `<DocumentEditor.Header>` / `<DocumentEditor.Footer>` slot markers. */
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
  outerWidth: 0,
  outerHeight: 0,
}) as PaginationState;

/**
 * Marker type strings used by `<DocumentEditor.Header>` and
 * `<DocumentEditor.Footer>`. Mirrors the `HEADER_SLOT_TYPE` /
 * `FOOTER_SLOT_TYPE` exports — duplicated here as strings so the
 * capture logic doesn't need a direct import (keeps Root lean and
 * avoids a circular dep through the component barrel).
 */
const SLOT_TYPE_HEADER = 'header';
const SLOT_TYPE_FOOTER = 'footer';

/**
 * Walk `children` and pull out the inner content of any element whose
 * static `slotType` marker matches one of the known band roles. Order
 * doesn't matter — if the consumer accidentally passes two headers,
 * the last one wins (deterministic for the common case).
 *
 * Returns `null` for any slot that wasn't supplied so the consumer's
 * `headerSlot === null` check is meaningful.
 */
function captureSlotChildren(
  children: ReactNode,
): { headerSlot: ReactNode; footerSlot: ReactNode } {
  let headerSlot: ReactNode = null;
  let footerSlot: ReactNode = null;

  Children.forEach(children, (child) => {
    if (!child) return;
    if (typeof child !== 'object') return;
    // `Children.forEach` yields `ReactElement | Iterable<ReactNode> |
    // ReactPortal | Promise<...>`. Only ReactElement instances carry
    // `.type` (the function/class reference) and `.props.children`,
    // so we narrow the union by checking for the `type` property
    // before reading it.
    if (!('type' in child)) return;
    // The marker components attach `slotType` directly to the function
    // via `(Header as ...).slotType = 'header'`. After JSX compilation
    // the type stays on the function reference, so we read it from
    // there.
    const slotType = (child.type as unknown as { slotType?: string })
      ?.slotType;
    if (slotType === SLOT_TYPE_HEADER) {
      headerSlot = (child as unknown as ReactElement<{ children?: ReactNode }>)
        .props.children;
    } else if (slotType === SLOT_TYPE_FOOTER) {
      footerSlot = (child as unknown as ReactElement<{ children?: ReactNode }>)
        .props.children;
    }
  });

  return { headerSlot, footerSlot };
}

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

  // Capture header/footer slot children. Memoised on `children` so
  // unrelated parent re-renders don't re-walk the tree.
  const { headerSlot, footerSlot } = useMemo(
    () => captureSlotChildren(children),
    [children],
  );

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
        outerWidth: next.outerWidth,
        outerHeight: next.outerHeight,
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
      headerSlot,
      footerSlot,
    }),
    [editor, pageSetup, paginationState, headerSlot, footerSlot],
  );

  return (
    <DocumentEditorContext.Provider value={contextValue}>
      <div ref={containerRef} className={className ?? 'dedocs-root'}>
        {children}
      </div>
    </DocumentEditorContext.Provider>
  );
}

DocumentEditorRoot.displayName = 'DocumentEditor.Root';

export default DocumentEditorRoot;