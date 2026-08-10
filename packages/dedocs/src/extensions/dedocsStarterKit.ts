/**
 * dedocsStarterKit — convenience bundle of the six MVP extensions.
 *
 * Consumers who want the full engine without picking extensions
 * individually can spread this into their `extensions` array:
 *
 *     import { dedocsStarterKit } from '@dedocs';
 *
 *     new Editor({
 *       extensions: [dedocsStarterKit, /* custom extensions *\/],
 *     });
 *
 * The six extensions:
 *
 *   1. `PageSetup`       — emits CSS vars for paper size / margins
 *   2. `PageBreak`       — atomic `<hr data-page-break>` node
 *   3. `Pagination`      — ResizeObserver + rAF + Decoration.widget
 *   4. `Typography`      — TextStyle / FontFamily / Color / Bold / etc.
 *   5. `ParagraphStyles` — TextAlign / LineHeight / Indent
 *   6. `BulletLists`     — BulletList / ListItem
 *
 * Extension order matters: `TextStyle` (inside `Typography`) must come
 * before FontFamily / Color; `BulletList` must come before `ListItem`.
 * Each individual export preserves its own order; the StarterKit just
 * composes them.
 */

import Heading from '@tiptap/extension-heading';

import BulletLists from './bullet-lists';
import { PageBreak } from './page-break';
import { PageSetup } from './page-setup';
import { Pagination } from './pagination';
import ParagraphStyles from './paragraph-styles';
import Typography from './typography';

// Re-export individual extensions so library authors can pull single
// pieces from the StarterKit without losing the import surface.
export { PageBreak, PageSetup, Pagination };
export {
  PAGINATION_PLUGIN_KEY,
  getPaginationState,
  computeBreaks,
  resolveMetrics,
  SCREEN_PX_PER_MM,
  type PaginationPluginState,
  type PaginationResolvedMetrics,
} from './pagination';
export { Typography, ParagraphStyles, BulletLists };
export { BulletList, ListItem } from './bullet-lists';
export {
  Bold,
  Color,
  FontFamily,
  Italic,
  Strike,
  TextStyle,
  Underline,
} from './typography';
export { Indent, LineHeight, TextAlign } from './paragraph-styles';
export { PAGE_BREAK_NODE_NAME } from './page-break';
export {
  applyPageSetupCssVars,
  mergePageSetup,
  resolvePageSetupCssVars,
} from './page-setup';

/**
 * The flat extension array. Spread into a Tiptap `Editor`'s
 * `extensions` option. Frozen to prevent accidental mutation by
 * consumers.
 */
export const dedocsStarterKit: ReadonlyArray<unknown> = Object.freeze([
  Heading.configure({ levels: [1, 2, 3] }),
  PageSetup,
  PageBreak,
  Pagination,
  ...Typography,
  ...ParagraphStyles,
  ...BulletLists,
]);

export default dedocsStarterKit;
