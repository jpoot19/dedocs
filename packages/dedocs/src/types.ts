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
 * Default band height as a fraction of the page height. ~20% of the page
 * is the typical letterhead / page-number band height. Applied per band
 * (header AND footer independently) when the consumer does not specify
 * an explicit height.
 */
export const DEFAULT_BAND_HEIGHT_FRACTION = 1 / 5;

/**
 * Absolute per-band cap, expressed as a fraction of the page height.
 * Each band is clamped to at most `pageHeight / 3` (~33%). With both
 * bands at their maximum the body area is still mathematically
 * guaranteed positive (`pageHeight / 3`), so no cross-band validation
 * is required.
 */
export const MAX_BAND_HEIGHT_FRACTION = 1 / 3;

/**
 * Fallback band height in cm, used only when the page height cannot be
 * determined (e.g. before `PageSetup` initialises). Matches the legacy
 * 1.25cm default.
 */
export const DEFAULT_BAND_HEIGHT_CM = 1.25;

/**
 * User-facing page setup options consumed by `<DocumentEditor.Root>` and the
 * `PageSetup` extension. The extension turns these options into CSS custom
 * properties on the editor container.
 */
export interface PageSetupOptions {
  paperSize: PaperSize;
  orientation: Orientation;
  margins: PageMargins;
  /** Header band height in cm. Defaults to `pageHeight / 5`. */
  headerHeight: number;
  /** Footer band height in cm. Defaults to `pageHeight / 5`. */
  footerHeight: number;
}

/**
 * Default page setup values used when the consumer does not provide any
 * options. Matches the spec baseline for A4 portrait with 2.54 cm (1 inch)
 * margins. Band heights default to `DEFAULT_BAND_HEIGHT_FRACTION` of the
 * A4 page height (297mm / 5 = 59.4mm ≈ 5.94cm).
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
  headerHeight: Object.freeze(5.94),
  footerHeight: Object.freeze(5.94),
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
  headerHeight: '--header-height',
  footerHeight: '--footer-height',
});

/**
 * Configuration consumed by the ProseMirror band node extension.
 *
 * Two top-level block nodes (`header`, `footer`) live in the
 * `dedocs-band` group; each one reads its own `bandHeight` attribute in
 * centimetres. Band heights are also surfaced through `PageSetupOptions`
 * — the duplication is intentional: the ProseMirror attribute lets a
 * single document carry per-band height metadata, while
 * `PageSetupOptions` configures the global default.
 */
export interface DedocsBandOptions {
  /** Node name (`'header'` or `'footer'`). */
  name: 'header' | 'footer';
  /** Height in cm. */
  bandHeight: number;
}

/**
 * Static configuration for one ProseMirror band node. Encapsulates the
 * Tiptap `Node.create` arguments so that the editor factory can iterate
 * over a uniform shape and instantiate both nodes from the same
 * template.
 */
export interface BandNodeConfig {
  /** Node name (`'header'` or `'footer'`). */
  name: 'header' | 'footer';
  /** Default band height in cm. */
  defaultHeightCm: number;
}

/**
 * Per-band height configuration. A `BandHeightConfig` describes how
 * tall a single band should be (in centimetres) and which CSS variable
 * carries the rendered value.
 */
export interface BandHeightConfig {
  /** Band role. */
  kind: 'header' | 'footer';
  /** Height in cm. */
  heightCm: number;
  /** CSS custom property name (e.g. `--header-height`). */
  cssVarName: string;
}

/**
 * Result of `validateBandHeight`. `value` is the (possibly clamped)
 * height that should be applied; `errors` is the list of human-readable
 * validation messages. An empty `errors` array means the input was
 * valid.
 */
export interface BandValidationResult {
  value: number;
  errors: string[];
}

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
  /** Page outer width in pixels (full paper width, including margins). */
  outerWidth: number;
  /** Page outer height in pixels (full paper height, including margins). */
  outerHeight: number;
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
