/**
 * Integration tests for `editor/createDedocsEditor.ts`.
 *
 * These exercise the full extension composition path. Each test
 * instantiates a Tiptap editor with the factory's output and asserts
 * the resulting editor has the expected extensions active.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';

import {
  createDedocsEditor,
  DEDOCS_BASE_EXTENSIONS,
} from '../editor/createDedocsEditor';

const editors: Editor[] = [];

function tracked<T extends Editor>(editor: T): T {
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
});

describe('editor/createDedocsEditor', () => {
  it('returns an EditorOptions-shaped value usable by `new Editor`', () => {
    const options = createDedocsEditor({ content: '<p>hello</p>' });
    expect(options).toBeTruthy();
    expect(Array.isArray(options.extensions)).toBe(true);

    const editor = tracked(new Editor({
      ...options,
      element: document.body,
    }));

    expect(editor).toBeInstanceOf(Editor);
    expect(editor.getText()).toContain('hello');
  });

  it('composes every MVP extension by default', () => {
    const options = createDedocsEditor();
    const names = options.extensions!
      .map((ext: unknown) => (ext as { name?: string }).name)
      .filter(Boolean);
    // Required engine extensions
    expect(names).toContain('pageSetup');
    expect(names).toContain('pageBreak');
    expect(names).toContain('pagination');
    // Typography marks
    expect(names).toContain('textStyle');
    expect(names).toContain('fontFamily');
    expect(names).toContain('color');
    expect(names).toContain('bold');
    // Paragraph styles
    expect(names).toContain('textAlign');
    expect(names).toContain('lineHeight');
    expect(names).toContain('indent');
    // Bullet lists
    expect(names).toContain('bulletList');
    expect(names).toContain('listItem');
  });

  it('exposes DEDOCS_BASE_EXTENSIONS for library authors', () => {
    expect(Array.isArray(DEDOCS_BASE_EXTENSIONS)).toBe(true);
    expect(DEDOCS_BASE_EXTENSIONS.length).toBeGreaterThan(0);
  });

  it('treats the editor as editable by default', () => {
    const options = createDedocsEditor({ content: '<p>x</p>' });
    expect(options.editable).toBe(true);

    const editor = tracked(new Editor({
      ...options,
      element: document.body,
    }));
    expect(editor.isEditable).toBe(true);
  });

  it('honours an explicit editable=false', () => {
    const options = createDedocsEditor({ content: '<p>x</p>', editable: false });
    expect(options.editable).toBe(false);
  });

  it('routes onUpdate payloads with the latest JSON content', () => {
    const seen: object[] = [];
    const options = createDedocsEditor({
      content: '<p>initial</p>',
      onUpdate: ({ content }) => seen.push(content),
    });
    const editor = tracked(new Editor({ ...options, element: document.body }));
    editor.commands.insertContent(' appended');
    expect(seen.length).toBeGreaterThan(0);
    const last = seen[seen.length - 1]!;
    expect(JSON.stringify(last)).toContain('appended');
  });

  it('injects the dedocs-editor CSS class on the editor DOM', () => {
    const options = createDedocsEditor({ content: '<p>x</p>' });
    const editor = tracked(new Editor({ ...options, element: document.body }));
    expect(editor.view.dom.classList.contains('dedocs-editor')).toBe(true);
  });
});