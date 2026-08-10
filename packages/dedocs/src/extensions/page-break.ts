/**
 * PageBreak node.
 *
 * Atomic, non-draggable block node rendered as `<hr data-page-break>`.
 * The visual styling (dashed rule + "Page break" label) lives in
 * `styles/page.css` under `.dedocs-page-break`. The node carries no
 * editable content; the toolbar uses `setPageBreak` to insert one at
 * the current cursor position.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/page-break/spec.md
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const PAGE_BREAK_NODE_NAME = 'pageBreak';

export interface PageBreakOptions {
  /** Extra HTML attributes merged into the rendered `<hr>` element. */
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Insert an atomic page-break node at the current selection.
       * The cursor is parked immediately after the inserted break.
       */
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * Atomic `<hr data-page-break>` node. `draggable: false` keeps the node
 * pinned in place; `selectable: true` lets the user click it to focus
 * but not edit it; `atom: true` makes ProseMirror treat it as a single
 * indivisible unit when applying marks or splits.
 */
export const PageBreak = Node.create<PageBreakOptions>({
  name: PAGE_BREAK_NODE_NAME,

  group: 'block',

  atom: true,

  selectable: true,

  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'hr[data-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'hr',
      mergeAttributes(
        {
          'data-page-break': 'true',
          class: 'dedocs-page-break',
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

export default PageBreak;
