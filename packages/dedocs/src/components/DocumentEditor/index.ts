/**
 * `<DocumentEditor.*>` compound component barrel.
 *
 * Consumers compose the editor via:
 *
 *     import { DocumentEditor } from '@dedocs';
 *
 *     <DocumentEditor.Root pageSetup={opts}>
 *       <DocumentEditor.Toolbar />
 *       <DocumentEditor.Header>
 *         <strong>ACME Corp</strong>
 *       </DocumentEditor.Header>
 *       <DocumentEditor.Canvas />
 *       <DocumentEditor.Footer>
 *         © 2026
 *       </DocumentEditor.Footer>
 *     </DocumentEditor.Root>
 *
 * The namespace shape (Root, Toolbar, Canvas, Header, Footer) is
 * exported both as named members of `DocumentEditor` and as direct
 * re-exports so consumers can pick their preferred ergonomics.
 */

import { DocumentEditorRoot } from './Root';
import { DocumentEditorCanvas } from './Canvas';
import { DocumentEditorToolbar } from './Toolbar';
import { DocumentEditorHeader } from './Header';
import { DocumentEditorFooter } from './Footer';

export {
  DocumentEditorRoot,
  DocumentEditorCanvas,
  DocumentEditorToolbar,
  DocumentEditorHeader,
  DocumentEditorFooter,
};
export type { DocumentEditorRootProps } from './Root';
export type { DocumentEditorCanvasProps } from './Canvas';
export type { DocumentEditorToolbarProps } from './Toolbar';
export type { DocumentEditorHeaderProps, HEADER_SLOT_TYPE } from './Header';
export type { DocumentEditorFooterProps, FOOTER_SLOT_TYPE } from './Footer';

export const DocumentEditor = Object.freeze({
  Root: DocumentEditorRoot,
  Canvas: DocumentEditorCanvas,
  Toolbar: DocumentEditorToolbar,
  Header: DocumentEditorHeader,
  Footer: DocumentEditorFooter,
});

export default DocumentEditor;