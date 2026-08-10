/**
 * `useDocumentEditor` hook.
 *
 * Returns the current `DocumentEditorContextValue` for the closest
 * enclosing `<DocumentEditor.Root>` provider. Throws if used outside a
 * provider — we fail fast because silently returning a stub would let
 * downstream commands execute against a null editor.
 */

import { useContext } from 'react';

import {
  DocumentEditorContext,
  type DocumentEditorContextValue,
} from '../context/DocumentEditorContext';

export function useDocumentEditor(): DocumentEditorContextValue {
  const ctx = useContext(DocumentEditorContext);
  if (ctx === null) {
    throw new Error(
      '[dedocs] useDocumentEditor() must be called inside a <DocumentEditor.Root> provider.',
    );
  }
  return ctx;
}

export default useDocumentEditor;