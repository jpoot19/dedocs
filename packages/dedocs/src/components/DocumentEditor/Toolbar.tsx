/**
 * `<DocumentEditor.Toolbar>` — formatting controls.
 *
 * Buttons cover:
 *   - Page break insertion (via `setPageBreak()`)
 *   - Typography marks: bold, italic, underline, strike, color, font-family, font-size
 *   - Paragraph styles: text-align (left/center/right/justify),
 *     line-height, indent (increase/decrease), bullet list toggle.
 *
 * All buttons are disabled until the editor is ready (e.g. during
 * async hydration). They read selection state from the editor via
 * `editor.isActive(...)` and `getAttributes(...)`.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/{page-break,typography,paragraph-styles,bullet-lists}/spec.md
 */

import type { ChangeEvent, ReactElement } from 'react';
import type { Editor } from '@tiptap/core';

import { useDocumentEditor } from '../../hooks/useDocumentEditor';

export interface DocumentEditorToolbarProps {
  /** Optional class on the toolbar wrapper. */
  className?: string;
  /**
   * If `true` (default), renders the toolbar with built-in styles
   * (`<style>` tag) so it works in a standalone demo without the
   * consumer shipping extra CSS.
   */
  withStyles?: boolean;
}

const BUILTIN_STYLES = `
.dedocs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  align-items: center;
}
.dedocs-toolbar button,
.dedocs-toolbar select,
.dedocs-toolbar input[type="color"] {
  font: inherit;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
}
.dedocs-toolbar button[data-active="true"] {
  background: #e0e7ff;
  border-color: #6366f1;
}
.dedocs-toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dedocs-toolbar .dedocs-toolbar-separator {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}
.dedocs-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #374151;
}
`;

const FONT_FAMILY_OPTIONS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
] as const;

const FONT_SIZE_OPTIONS = ['12', '14', '16', '18', '24', '32'] as const;

const LINE_HEIGHT_OPTIONS = ['1', '1.15', '1.5', '2'] as const;

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
] as const;

type Alignment = (typeof ALIGN_OPTIONS)[number]['value'];

export function DocumentEditorToolbar(
  props: DocumentEditorToolbarProps,
): ReactElement {
  const { className, withStyles = true } = props;
  const { editor } = useDocumentEditor();

  // Local alias narrows the type — we only use `editor` inside branches
  // guarded by the `editor &&` checks.
  const ed: Editor | null = editor;

  const toggleBold = () => ed?.chain().focus().toggleBold().run();
  const toggleItalic = () => ed?.chain().focus().toggleItalic().run();
  const toggleStrike = () => ed?.chain().focus().toggleStrike().run();
  const toggleUnderline = () => ed?.chain().focus().toggleUnderline().run();

  const setColor = (event: ChangeEvent<HTMLInputElement>) =>
    ed?.chain().focus().setColor(event.target.value).run();

  const setFontFamily = (event: ChangeEvent<HTMLSelectElement>) =>
    ed?.chain().focus().setFontFamily(event.target.value).run();

  const setFontSize = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    ed?.chain().focus().setMark('textStyle', { fontSize: `${value}px` }).run();
  };

  const setLineHeight = (event: ChangeEvent<HTMLSelectElement>) =>
    ed?.chain().focus().setLineHeight(event.target.value).run();

  const setAlignment = (value: Alignment) =>
    ed?.chain().focus().setTextAlign(value).run();

  const increaseIndent = () =>
    ed?.chain().focus().increaseIndent().run();
  const decreaseIndent = () =>
    ed?.chain().focus().decreaseIndent().run();

  const toggleBulletList = () =>
    ed?.chain().focus().toggleBulletList().run();

  const insertPageBreak = () =>
    ed?.chain().focus().setPageBreak().run();

  const isReady = ed !== null;
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    isReady ? (ed as Editor).isActive(name, attrs) : false;

  return (
    <>
      {withStyles ? <style dangerouslySetInnerHTML={{ __html: BUILTIN_STYLES }} /> : null}
      <div
        className={['dedocs-toolbar', className].filter(Boolean).join(' ')}
        role="toolbar"
        aria-label="Document formatting"
        data-testid="dedocs-toolbar"
      >
        {/* Page break */}
        <button
          type="button"
          data-testid="dedocs-toolbar-page-break"
          onClick={insertPageBreak}
          disabled={!isReady}
        >
          Insert page break
        </button>

        <span className="dedocs-toolbar-separator" aria-hidden="true" />

        {/* Typography marks */}
        <button
          type="button"
          data-testid="dedocs-toolbar-bold"
          data-active={isActive('bold')}
          onClick={toggleBold}
          disabled={!isReady}
        >
          B
        </button>
        <button
          type="button"
          data-testid="dedocs-toolbar-italic"
          data-active={isActive('italic')}
          onClick={toggleItalic}
          disabled={!isReady}
        >
          I
        </button>
        <button
          type="button"
          data-testid="dedocs-toolbar-strike"
          data-active={isActive('strike')}
          onClick={toggleStrike}
          disabled={!isReady}
        >
          S
        </button>
        <button
          type="button"
          data-testid="dedocs-toolbar-underline"
          data-active={isActive('underline')}
          onClick={toggleUnderline}
          disabled={!isReady}
        >
          U
        </button>

        <span className="dedocs-toolbar-separator" aria-hidden="true" />

        <label>
          Color
          <input
            type="color"
            defaultValue="#000000"
            data-testid="dedocs-toolbar-color"
            onChange={setColor}
            disabled={!isReady}
          />
        </label>

        <label>
          Font
          <select
            data-testid="dedocs-toolbar-font-family"
            onChange={setFontFamily}
            disabled={!isReady}
            defaultValue=""
          >
            <option value="" disabled>
              —
            </option>
            {FONT_FAMILY_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </label>

        <label>
          Size
          <select
            data-testid="dedocs-toolbar-font-size"
            onChange={setFontSize}
            disabled={!isReady}
            defaultValue=""
          >
            <option value="" disabled>
              —
            </option>
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </label>

        <span className="dedocs-toolbar-separator" aria-hidden="true" />

        {/* Paragraph styles */}
        {ALIGN_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            data-testid={`dedocs-toolbar-align-${opt.value}`}
            data-active={isActive('paragraph', { textAlign: opt.value })}
            onClick={() => setAlignment(opt.value)}
            disabled={!isReady}
          >
            {opt.label}
          </button>
        ))}

        <label>
          Line height
          <select
            data-testid="dedocs-toolbar-line-height"
            onChange={setLineHeight}
            disabled={!isReady}
            defaultValue=""
          >
            <option value="" disabled>
              —
            </option>
            {LINE_HEIGHT_OPTIONS.map((lh) => (
              <option key={lh} value={lh}>
                {lh}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          data-testid="dedocs-toolbar-indent-decrease"
          onClick={decreaseIndent}
          disabled={!isReady}
          aria-label="Decrease indent"
        >
          Outdent
        </button>
        <button
          type="button"
          data-testid="dedocs-toolbar-indent-increase"
          onClick={increaseIndent}
          disabled={!isReady}
          aria-label="Increase indent"
        >
          Indent
        </button>

        <span className="dedocs-toolbar-separator" aria-hidden="true" />

        <button
          type="button"
          data-testid="dedocs-toolbar-bullet-list"
          data-active={isActive('bulletList')}
          onClick={toggleBulletList}
          disabled={!isReady}
        >
          Bullet list
        </button>
      </div>
    </>
  );
}

DocumentEditorToolbar.displayName = 'DocumentEditor.Toolbar';

export default DocumentEditorToolbar;