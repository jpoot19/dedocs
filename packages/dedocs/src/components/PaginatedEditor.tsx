/**
 * Convenience alias: `<PaginatedEditor>` resolves to `<DocumentEditor.Root>`.
 *
 * Matches the public name called out in the editor-shell spec ("The system
 * SHALL export a `PaginatedEditor` React component that renders the editor
 * with visual page frames."). Importing this file as a side effect
 * attaches `PaginatedEditor` to the default export.
 */

import { DocumentEditorRoot } from '../components/DocumentEditor/Root';

export const PaginatedEditor = DocumentEditorRoot;
export default PaginatedEditor;