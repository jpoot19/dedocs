/**
 * Paragraph styles extensions.
 *
 * Wraps `TextAlign` from Tiptap OSS and ships two minimal local
 * extensions (`LineHeight`, `Indent`) since Tiptap core does not include
 * them. Both local extensions store their values as attributes on the
 * configured block types — same shape as Tiptap's `TextAlign` so the
 * three compose cleanly.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/paragraph-styles/spec.md
 */

import { Extension, type CommandProps } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import TextAlign from '@tiptap/extension-text-align';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line-height attribute on the current block.
       */
      setLineHeight: (value: string | number) => ReturnType;
      /**
       * Remove the line-height attribute from the current block.
       */
      unsetLineHeight: () => ReturnType;
    };
    indent: {
      /**
       * Set a fixed indent (in em units) on the current block.
       */
      setIndent: (value: number) => ReturnType;
      /**
       * Increase the indent by the configured step.
       */
      increaseIndent: () => ReturnType;
      /**
       * Decrease the indent by the configured step.
       */
      decreaseIndent: () => ReturnType;
      /**
       * Remove the indent attribute from the current block.
       */
      unsetIndent: () => ReturnType;
    };
  }
}

/**
 * Default block types these extensions apply to. Mirrors Tiptap's
 * recommended defaults for paragraph-style attributes.
 */
const DEFAULT_TYPES = ['heading', 'paragraph'] as const;

/**
 * `LineHeight` extension.
 *
 * Stores `lineHeight` as a numeric or unitless value (e.g. `1.5`) on the
 * configured block types. Renders as the CSS `line-height` property.
 */
export const LineHeight = Extension.create<{
  types?: readonly string[];
  defaultValue?: string | number | null;
}>({
  name: 'lineHeight',

  addOptions() {
    return {
      types: [...DEFAULT_TYPES],
      defaultValue: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          lineHeight: {
            default: this.options.defaultValue ?? null,
            parseHTML: (element: HTMLElement) =>
              element.style.lineHeight || element.getAttribute('data-line-height') || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              const value = attributes.lineHeight as string | number | null;
              if (value === null || value === undefined || value === '') {
                return {};
              }
              return { style: `line-height: ${value}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string | number) =>
        ({ commands }: CommandProps) => {
          const types = this.options.types ?? DEFAULT_TYPES;
          return types
            .map((type: string) => commands.updateAttributes(type, { lineHeight }))
            .every((result: boolean) => result);
        },
      unsetLineHeight:
        () =>
        ({ commands }: CommandProps) => {
          const types = this.options.types ?? DEFAULT_TYPES;
          return types
            .map((type: string) => commands.resetAttributes(type, 'lineHeight'))
            .every((result: boolean) => result);
        },
    };
  },
});

/**
 * `Indent` extension.
 *
 * Stores `indent` as a numeric value (in `em`) on the configured block
 * types. Renders as a `padding-left` (or `margin-left`) offset so the
 * change survives heading/paragraph level transitions.
 *
 * Negative values are supported (hanging indent / outdent).
 */
export const Indent = Extension.create<{
  types?: readonly string[];
  defaultValue?: number;
  minIndent?: number;
  maxIndent?: number;
  step?: number;
}>({
  name: 'indent',

  addOptions() {
    return {
      types: [...DEFAULT_TYPES],
      defaultValue: 0,
      minIndent: -10,
      maxIndent: 10,
      step: 1,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          indent: {
            default: this.options.defaultValue,
            parseHTML: (element: HTMLElement) => {
              const raw = element.getAttribute('data-indent');
              if (raw === null) return this.options.defaultValue;
              const parsed = Number.parseInt(raw, 10);
              return Number.isFinite(parsed) ? parsed : this.options.defaultValue;
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const value = attributes.indent as number | null | undefined;
              if (value === null || value === undefined || value === 0) {
                return {};
              }
              const ems = `${value}em`;
              return {
                'data-indent': String(value),
                style: `padding-left: ${ems}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const types = this.options.types ?? DEFAULT_TYPES;
    const minIndent = this.options.minIndent ?? -10;
    const maxIndent = this.options.maxIndent ?? 10;
    const step = this.options.step ?? 1;
    return {
      setIndent:
        (indent: number) =>
        ({ commands }: CommandProps) => {
          const clamped = Math.min(Math.max(indent, minIndent), maxIndent);
          return types
            .map((type: string) => commands.updateAttributes(type, { indent: clamped }))
            .every((result: boolean) => result);
        },
      increaseIndent:
        () =>
        ({ commands, editor }: CommandProps) => {
          const current = readCurrentIndent(editor.state, types);
          return types
            .map((type: string) =>
              commands.updateAttributes(type, {
                indent: Math.min(current + step, maxIndent),
              }),
            )
            .every((result: boolean) => result);
        },
      decreaseIndent:
        () =>
        ({ commands, editor }: CommandProps) => {
          const current = readCurrentIndent(editor.state, types);
          return types
            .map((type: string) =>
              commands.updateAttributes(type, {
                indent: Math.max(current - step, minIndent),
              }),
            )
            .every((result: boolean) => result);
        },
      unsetIndent:
        () =>
        ({ commands }: CommandProps) => {
          return types
            .map((type: string) => commands.resetAttributes(type, 'indent'))
            .every((result: boolean) => result);
        },
    };
  },
});

function readCurrentIndent(state: EditorState, types: readonly string[]): number {
  const $from = state.selection.$from;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (types.includes(node.type.name)) {
      const attr = node.attrs?.indent;
      if (typeof attr === 'number' && Number.isFinite(attr)) {
        return attr;
      }
    }
  }
  return 0;
}

/**
 * Re-exported TextAlign (from Tiptap OSS).
 * Indent and LineHeight are already exported as `export const` above.
 */
export { TextAlign };

/**
 * Default paragraph-styles stack.
 */
export const ParagraphStyles: ReadonlyArray<unknown> = Object.freeze([
  TextAlign.configure({ types: [...DEFAULT_TYPES] }),
  LineHeight,
  Indent,
]);

export default ParagraphStyles;
