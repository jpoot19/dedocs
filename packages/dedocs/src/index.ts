/**
 * Public barrel for the `@dedocs` package.
 *
 * Consumers import from `@dedocs`:
 *
 *     import {
 *       DocumentEditor,
 *       PaginatedEditor,
 *       createDedocsEditor,
 *       dedocsStarterKit,
 *       DEFAULT_PAGE_SETUP,
 *       getPaperDimensions,
 *     } from '@dedocs';
 *
 * Layered exports:
 *   - Foundation types and paper-size helpers (Phase 1).
 *   - Engine extensions and Tiptap wrappers (Phase 2).
 *   - Glue: React context + hooks (Phase 3).
 *   - UI: `<DocumentEditor.*>` compound components + `<PaginatedEditor>` alias (Phase 4-5).
 */

// --- Page setup types and defaults ---------------------------------------
export {
  DEFAULT_BAND_HEIGHT_CM,
  DEFAULT_BAND_HEIGHT_FRACTION,
  DEFAULT_PAGE_SETUP,
  MAX_BAND_HEIGHT_FRACTION,
  PAGE_SETUP_CSS_VARS,
  type BandHeightConfig,
  type BandNodeConfig,
  type BandValidationResult,
  type DedocsBandOptions,
  type DedocsEditorContent,
  type DedocsEditorOptions,
  type PageMargins,
  type PageSetupOptions,
  type PaginationBreak,
  type PaginationState,
} from './types';

// --- Paper size utilities -------------------------------------------------
export {
  DEFAULT_ORIENTATION,
  DEFAULT_PAPER_SIZE,
  PAPER_SIZES,
  cmToMm,
  getDefaultBandHeightCm,
  getDefaultBandHeightCmFor,
  getMaxBandHeightCm,
  getMaxBandHeightCmFor,
  getPaperDimensions,
  mmToCm,
  MM_PER_CM,
  pageHeightMm,
  type Orientation,
  type PaperDimensions,
  type PaperSize,
} from './utils/paperSizes';

// --- Band validation helpers ---------------------------------------------
// Paper-size-aware variants live in `utils/bandValidation.ts`. The
// design.md `clampBandHeight(value, pageHeightMm)` /
// `validateBandHeight(value, pageHeightMm, label)` helpers live in
// `extensions/page-setup.ts` and are re-exported below under the same
// public names.
export {
  clampBandHeightToMax,
  getBandDefaultCm,
  getBandMaxCm,
  validateBandHeightForPaper,
} from './utils/bandValidation';
export {
  clampBandHeight,
  validateBandHeight,
  validateBandOptions,
  maxBandHeightCmFor,
  mergePageSetup,
  applyPageSetupCssVars,
  resolvePageSetupCssVars,
} from './extensions/page-setup';

// --- Engine extensions (Phase 2) ----------------------------------------
export * from './extensions/dedocsStarterKit';

// --- Styles --------------------------------------------------------------
// Consumers wire this into their bundler (Vite/Webpack) explicitly:
//     import '@dedocs/styles/page.css';
export const PAGE_CSS_PATH = './styles/page.css';

// --- Editor factory (Phase 5) -------------------------------------------
export { createDedocsEditor, DEDOCS_BASE_EXTENSIONS } from './editor/createDedocsEditor';

// --- React glue + UI (Phase 3, 4) ---------------------------------------
export { DocumentEditor } from './components/DocumentEditor';
export {
  DocumentEditorRoot,
  DocumentEditorCanvas,
  DocumentEditorToolbar,
  type DocumentEditorRootProps,
  type DocumentEditorCanvasProps,
  type DocumentEditorToolbarProps,
} from './components/DocumentEditor';
export { PaginatedEditor } from './components/PaginatedEditor';

// Context + hooks
export {
  DocumentEditorContext,
  type DocumentEditorContextValue,
} from './context/DocumentEditorContext';
export { useDocumentEditor } from './hooks/useDocumentEditor';
export {
  useResizeObserver,
  type UseResizeObserverOptions,
} from './hooks/useResizeObserver';