/**
 * Typography extensions.
 *
 * Composes Tiptap OSS mark extensions into a single array consumers can
 * pass to `extensions: [..., ...Typography]`. Covers:
 *
 *   - `TextStyle`        — foundation for arbitrary CSS properties (font-size)
 *   - `FontFamily`       — `font-family` mark
 *   - `Color`            — `color` mark
 *   - `Bold`             — font-weight: bold
 *   - `Italic`           — font-style: italic (utility; spec does not require)
 *   - `Strike`           — line-through (utility)
 *   - `Underline`        — underline (utility)
 *
 * Spec: openspec/changes/dedocs-mvp/specs/typography/spec.md
 *
 * NOTE: `TextStyle` must be loaded BEFORE the marks that depend on it
 * (FontFamily / Color). This file intentionally preserves that order.
 */

import Bold from '@tiptap/extension-bold';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';

/**
 * Re-exported individual extensions so library authors can compose them
 * into their own editor without pulling in the whole array.
 */
export {
  Bold,
  Color,
  FontFamily,
  Italic,
  Strike,
  TextStyle,
  Underline,
};

/**
 * Default typography stack. Consumers who only need font-family / size /
 * color / bold can spread this into their `extensions` array:
 *
 *     new Editor({ extensions: [StarterKit, ...Typography, Pagination] })
 *
 * Underline, Italic, and Strike are included for convenience — they
 * fall outside the strict spec scope but match the typography domain
 * and are cheap to keep available.
 */
export const Typography: ReadonlyArray<unknown> = Object.freeze([
  TextStyle,
  FontFamily,
  Color,
  Bold,
  Italic,
  Strike,
  Underline,
]);

export default Typography;
