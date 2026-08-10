/**
 * Public type contracts for the dedocs MVP package.
 *
 * These types are the shared vocabulary used by the engine, the React glue,
 * and the consumer-facing components. They are intentionally framework-free
 * so that the engine layer (pure ProseMirror) can be unit-tested without React.
 */

import type {
  Orientation,
  PaperSize,
} from './utils/paperSizes';

/**
 * Margin values are expressed in centimeters to match common authoring
 * conventions and the public API contract.
 */
export interface PageMargins {
  /** Top margin in cm. */
  top: number;
  /** Right margin in cm. */
  right: number;
  /** Bottom margin in cm. */
  bottom: number;
  /** Left margin in cm. */
  left: number;
}

/**
 * User-facing page setup options consumed by `<DocumentEditor.Root>` and the
 * `PageSetup` extension. The extension turns these options into CSS custom
 * properties on the editor container.
 */
export interface PageSetupOptions {
  paperSize: PaperSize;
  orientation: Orientation;
  margins: PageMargins;
}

/**
 * Default page setup values used when the consumer does not provide any
 * options. Matches the spec baseline for A4 portrait with 2.54 cm (1 inch)
 * margins.
 */
export const DEFAULT_PAGE_SETUP: PageSetupOptions = Object.freeze({
  paperSize: 'A4',
  orientation: 'portrait',
  margins: Object.freeze({
    top: 2.54,
    right: 2.54,
    bottom: 2.54,
    left: 2.54,
  }),
});

/**
 * CSS custom property names emitted by the `PageSetup` extension onto the
 * editor container. Centralised here so that the CSS file and the engine
 * share a single source of truth.
 */
export const PAGE_SETUP_CSS_VARS = Object.freeze({
  width: '--page-width',
  height: '--page-height',
  marginTop: '--page-margin-top',
  marginRight: '--page-margin-right',
  marginBottom: '--page-margin-bottom',
  marginLeft: '--page-margin-left',
});

/**
 * A single page break produced by the pagination engine.
 *
 * - `pos` is the ProseMirror document position immediately before the break.
 * - `pageIndex` is the zero-based index of the page that begins at `pos`.
 * - `kind` distinguishes automatic breaks (computed from content overflow)
 *   from explicit breaks (inserted by the user via the page-break node).
 */
export interface PaginationBreak {
  pos: number;
  pageIndex: number;
  kind: 'auto' | 'explicit';
}

/**
 * Read-only pagination state held by the ProseMirror `Pagination` plugin.
 * React consumers read this via `useDocumentEditor()` to drive visual page
 * frames.
 */
export interface PaginationState {
  /** Ordered list of break positions. */
  breaks: ReadonlyArray<PaginationBreak>;
  /** Total number of pages (at least one, even when empty). */
  pageCount: number;
  /** Content area width in pixels (page width minus horizontal margins). */
  pageWidth: number;
  /** Content area height in pixels (page height minus vertical margins). */
  pageHeight: number;
}

/**
 * Initial content accepted by `createDedocsEditor`. We accept either an HTML
 * string (parsed by Tiptap) or a raw ProseMirror JSON document.
 */
export type DedocsEditorContent = string | object;

/**
 * Options accepted by `createDedocsEditor()`. All fields are optional; the
 * factory applies sensible defaults for any field the consumer omits.
 */
export interface DedocsEditorOptions {
  /** Initial document content. Defaults to an empty paragraph. */
  content?: DedocsEditorContent;
  /** Whether the editor is interactive. Defaults to `true`. */
  editable?: boolean;
  /**
   * Partial page setup. Any missing field falls back to the corresponding
   * `DEFAULT_PAGE_SETUP` value.
   */
  pageSetup?: Partial<PageSetupOptions>;
  /** Called whenever the document state changes. */
  onUpdate?: (payload: { editor: unknown; content: object }) => void;
}
