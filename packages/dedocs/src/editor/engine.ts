/**
 * `@dedocs/editor/engine` subpath entry point.
 *
 * Lower-level surface for library authors who want to compose dedocs
 * extensions into their own Tiptap editor instead of using the React
 * `<DocumentEditor>` component. Exposes the raw contracts and utilities
 * but does NOT export any React components.
 */

// --- Foundation contracts (Phase 1) -------------------------------------
// Note: getPaperDimensions, Orientation, PaperSize are re-exported via
// page-setup below to avoid duplicate-export conflicts.
export {
  PAPER_SIZES,
  MM_PER_CM,
  cmToMm,
  mmToCm,
  DEFAULT_PAPER_SIZE,
  DEFAULT_ORIENTATION,
  type PaperDimensions,
} from '../utils/paperSizes';
export * from '../types';

// --- Engine extensions (Phase 2) ----------------------------------------
// Note: dedocsStarterKit already re-exports Typography, ParagraphStyles,
// BulletLists, PageSetup, PageBreak, Pagination. Re-export everything from
// dedocsStarterKit to avoid DTS namespace conflicts.
export * from '../extensions/dedocsStarterKit';

// --- Editor factory (Phase 5 — engine surface) ---------------------------
// Consumers wiring their own `useEditor` / `new Editor(...)` can import
// the extension list and the factory here. The factory itself is also
// re-exported from the main `@dedocs` barrel.
export {
  createDedocsEditor,
  DEDOCS_BASE_EXTENSIONS,
} from './createDedocsEditor';