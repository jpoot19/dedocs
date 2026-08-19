/**
 * `createDedocsEditor` factory.
 *
 * Composes every MVP extension plus Tiptap's minimum required schema
 * (`Document`, `Paragraph`, `Text`) into a single `EditorOptions`-shaped
 * value. Consumers can:
 *
 *   1. Pass it directly to `new Editor(opts)`.
 *   2. Spread it into their own configuration (`new Editor({ ...createDedocsEditor({...}), ...overrides })`).
 *   3. Pass it to `useEditor(createDedocsEditor({...}))`.
 *
 * The factory itself does NOT instantiate the editor — that's a
 * responsibility of the caller (React or imperative). This keeps the
 * factory usable both in the React shell and in standalone scripts.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/editor-shell/spec.md
 * Spec: openspec/changes/header-footer/specs/editor-shell/spec.md
 */

import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import type { EditorOptions } from '@tiptap/core';

import { Pagination } from '../extensions/pagination';
import { PageBreak } from '../extensions/page-break';
import { PageSetup } from '../extensions/page-setup';
import { Typography } from '../extensions/typography';
import { ParagraphStyles } from '../extensions/paragraph-styles';
import { BulletLists } from '../extensions/bullet-lists';
import HeaderFooter from '../extensions/header-footer';
import {
  DEFAULT_PAGE_SETUP,
  type DedocsEditorContent,
  type DedocsEditorOptions,
  type PageSetupOptions,
} from '../types';
import { mergePageSetup } from '../extensions/page-setup';

/**
 * The full set of extensions that compose a dedocs editor. The order
 * matches `dedocsStarterKit`; explicit listing here lets `useEditor`
 * inside `DocumentEditor.Root` merge with any consumer-supplied
 * extensions without surprising order changes.
 *
 * `Document` is configured with an extended content schema that
 * accepts body blocks plus the `header` / `footer` band nodes — see
 * `header-footer.ts` for the band-node definition. The schema
 * extension is the only schema-level wiring needed at the factory
 * boundary; consumers who instantiate `Document` directly should
 * mirror this content expression.
 */
export const DEDOCS_BASE_EXTENSIONS = Object.freeze([
  Document.configure({
    content: 'block (block | header | footer)*',
  }),
  Paragraph,
  Text,
  Heading.configure({ levels: [1, 2, 3] }),
  PageSetup,
  PageBreak,
  Pagination,
  ...HeaderFooter,
  ...Typography,
  ...ParagraphStyles,
  ...BulletLists,
]);

/**
 * Resolve the effective `EditorOptions` for a given `DedocsEditorOptions`.
 * Pure — no side effects, no editor instantiation.
 */
export function createDedocsEditor(options: DedocsEditorOptions = {}) {
  const {
    content,
    editable = true,
    pageSetup,
    onUpdate,
  } = options;

  const mergedPageSetup: PageSetupOptions = mergePageSetup(pageSetup);

  const extensions = DEDOCS_BASE_EXTENSIONS as EditorOptions['extensions'];

  const result: Partial<EditorOptions> = {
    extensions,
    content: content ?? '',
    editable,
    editorProps: {
      attributes: {
        class: 'dedocs-editor',
      },
    },
  };

  if (onUpdate) {
    result.onUpdate = ({ editor }) => {
      onUpdate({
        editor,
        content: editor.getJSON() as object,
      });
    };
  }

  return result;
}

/**
 * Default page setup, re-exported for consumers that want a stable
 * reference without importing from `../types`.
 */
export { DEFAULT_PAGE_SETUP };

export default createDedocsEditor;