/**
 * `<DocumentEditor.*>` compound component barrel.
 *
 * Consumers compose the editor via:
 *
 *     import { DocumentEditor } from '@dedocs';
 *
 *     <DocumentEditor.Root pageSetup={opts}>
 *       <DocumentEditor.Toolbar />
 *       <DocumentEditor.Canvas />
 *     </DocumentEditor.Root>
 *
 * The namespace shape (Root, Toolbar, Canvas) is exported both as named
 * members of `DocumentEditor` and as direct re-exports so consumers can
 * pick their preferred ergonomics.
 */

import { DocumentEditorRoot } from './Root';
import { DocumentEditorCanvas } from './Canvas';
import { DocumentEditorToolbar } from './Toolbar';

export { DocumentEditorRoot, DocumentEditorCanvas, DocumentEditorToolbar };
export type { DocumentEditorRootProps } from './Root';
export type { DocumentEditorCanvasProps } from './Canvas';
export type { DocumentEditorToolbarProps } from './Toolbar';

export const DocumentEditor = Object.freeze({
  Root: DocumentEditorRoot,
  Canvas: DocumentEditorCanvas,
  Toolbar: DocumentEditorToolbar,
});

export default DocumentEditor;