/**
 * Bullet list extensions.
 *
 * Wraps `BulletList` and `ListItem` from Tiptap OSS. The default
 * `BulletList` already supports arbitrary nesting because `ListItem` is
 * a block node that can contain another `BulletList`. CSS in
 * `styles/page.css` handles the visual bullet marker on each item, so
 * page splits preserve the bullet naturally.
 *
 * Spec: openspec/changes/dedocs-mvp/specs/bullet-lists/spec.md
 */

import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';

/**
 * Re-exported individual extensions for library authors who want to
 * compose them into their own editor.
 */
export { BulletList, ListItem };

/**
 * Default bullet-list stack. Order matters — `BulletList` must come
 * before `ListItem` because the schema declares `listItem` as a child
 * of `bulletList`.
 */
export const BulletLists: ReadonlyArray<unknown> = Object.freeze([
  BulletList,
  ListItem,
]);

export default BulletLists;
