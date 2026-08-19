/**
 * Header / Footer band ProseMirror nodes.
 *
 * Two top-level block nodes (`header`, `footer`) live in a dedicated
 * `dedocs-band` group. They are schema anchors only — all visual
 * rendering happens via React portals anchored to the page-frame band
 * containers in `<DocumentEditor.Canvas>`. This separation keeps the
 * ProseMirror document body-only while still allowing the schema to
 * declare band presence.
 *
 * Properties:
 *   - `atom: true`        — ProseMirror treats the node as a single unit
 *                            (no inline editing inside the node).
 *   - `selectable: false` — bands are not interactive in the editor;
 *                            users interact with them via React slots.
 *   - `content: ''`       — atom + empty content → no inner document.
 *   - `group: 'dedocs-band'` — namespaced group so pagination can filter
 *                              out band nodes via `isBandNode`.
 *
 * Spec: openspec/changes/header-footer/specs/header-footer/spec.md
 * Spec: openspec/changes/header-footer/specs/editor-shell/spec.md
 */

import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Group name for header / footer band nodes. Single string (matching the
 * existing single-group convention `'block'`) — namespaced so it cannot
 * collide with other extensions.
 */
export const BAND_GROUP = 'dedocs-band';

/**
 * Per-node default band height in cm. Used by the `bandHeight`
 * attribute when the consumer does not provide an explicit value.
 * Falls back to the legacy 1.25cm default to match prior behaviour
 * for empty / attribute-less band nodes.
 */
export const DEFAULT_BAND_HEIGHT_CM = 1.25;

/**
 * Shape of the `bandHeight` attribute exposed on both `header` and
 * `footer` nodes. Stored in centimetres; read by pagination and CSS
 * variable emission to position the band.
 */
export interface BandHeightAttributeOptions {
  /**
   * Default band height in cm, applied when the attribute is absent
   * from a parsed document.
   */
  defaultBandHeight: number;
}

/**
 * Helper: given a ProseMirror node, return `true` if it belongs to the
 * `dedocs-band` group. Used by `collectTopLevelBlocks` to filter band
 * nodes out of the body block list passed to the pagination engine.
 */
export function isBandNode(node: { type: { spec: { group?: string } } }): boolean {
  return node.type.spec.group === BAND_GROUP;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    headerFooter: {
      /**
       * Insert a header band node at the current selection.
       */
      setHeaderBand: (options?: { bandHeight?: number }) => ReturnType;
      /**
       * Insert a footer band node at the current selection.
       */
      setFooterBand: (options?: { bandHeight?: number }) => ReturnType;
    };
  }
}

/**
 * The `header` band node — top-level block in the `dedocs-band` group.
 * Schema anchor for the React-driven header portal mounted by
 * `<DocumentEditor.Canvas>`.
 */
export const HeaderNode = Node.create<BandHeightAttributeOptions>({
  name: 'header',

  group: BAND_GROUP,

  atom: true,

  selectable: false,

  /**
   * Empty content model — atom nodes cannot have inline content, and
   * `content: ''` makes the schema accept this node anywhere a
   * `dedocs-band` is permitted without dragging in any child nodes.
   */
  content: '',

  addOptions() {
    return {
      defaultBandHeight: DEFAULT_BAND_HEIGHT_CM,
    };
  },

  addAttributes() {
    return {
      /**
       * Band height in cm. Read by the `PageSetup` extension (when
       * computing CSS variables) and by `Pagination` (when
       * subtracting band height from the body content area).
       */
      bandHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-band-height');
          if (raw === null) return null;
          const parsed = parseFloat(raw);
          return Number.isFinite(parsed) ? parsed : null;
        },
        renderHTML: (attributes) => {
          const value =
            attributes.bandHeight ?? this.options.defaultBandHeight;
          return { 'data-band-height': String(value) };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-node-type="header"]' },
      { tag: 'header' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-node-type': 'header',
          class: 'dedocs-band-header',
        },
        HTMLAttributes,
      ),
    ];
  },

  addCommands() {
    return {
      setHeaderBand:
        (options?: { bandHeight?: number }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { bandHeight: options?.bandHeight ?? null },
          }),
    };
  },
});

/**
 * The `footer` band node — top-level block in the `dedocs-band` group.
 * Schema anchor for the React-driven footer portal mounted by
 * `<DocumentEditor.Canvas>`.
 */
export const FooterNode = Node.create<BandHeightAttributeOptions>({
  name: 'footer',

  group: BAND_GROUP,

  atom: true,

  selectable: false,

  content: '',

  addOptions() {
    return {
      defaultBandHeight: DEFAULT_BAND_HEIGHT_CM,
    };
  },

  addAttributes() {
    return {
      bandHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-band-height');
          if (raw === null) return null;
          const parsed = parseFloat(raw);
          return Number.isFinite(parsed) ? parsed : null;
        },
        renderHTML: (attributes) => {
          const value =
            attributes.bandHeight ?? this.options.defaultBandHeight;
          return { 'data-band-height': String(value) };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-node-type="footer"]' },
      { tag: 'footer' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-node-type': 'footer',
          class: 'dedocs-band-footer',
        },
        HTMLAttributes,
      ),
    ];
  },

  addCommands() {
    return {
      setFooterBand:
        (options?: { bandHeight?: number }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { bandHeight: options?.bandHeight ?? null },
          }),
    };
  },
});

/**
 * The flat list `[HeaderNode, FooterNode]`. Spread into the dedocs
 * extension array so the editor schema accepts both band types. The
 * ordering is stable: header first, footer second.
 */
export const HeaderFooter: ReadonlyArray<unknown> = Object.freeze([
  HeaderNode,
  FooterNode,
]);

export default HeaderFooter;