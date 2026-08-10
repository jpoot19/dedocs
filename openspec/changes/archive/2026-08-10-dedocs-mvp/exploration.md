# Exploration: dedocs MVP — Tiptap reuse vs build from scratch

> Tiptap source verified via https://github.com/ueberdosis/tiptap (main branch, v3.29.2).
> No code installed locally yet — seed repo, no `node_modules`.

## Current State (what Tiptap already gives us)

### License model — every package we touch is MIT

- Root `LICENSE.md` is MIT (Copyright Tiptap GmbH).
- All monorepo packages under `/packages/` declare `"license": "MIT"` (verified: `core`, `pm`, `react`, `starter-kit`, `extensions`, `extension-paragraph`, `extension-list`, `extension-table`, etc.).
- `SCOPES.md` enumerates ~55 native extensions — all in OSS.
- **Pagination, page-break, header, footer, and watermark are NOT in the OSS scopes.** The README explicitly says: "Editor Pro Extensions ... Pro Extensions need a valid subscription." These live behind a paywall in a separate (private) distribution. We must build them ourselves.

### Measuring / observation system — there isn't a general one

There is **no built-in `Measuring`/`Observer` class** in `@tiptap/core`. Two adjacent patterns exist; neither is reusable for our use case:

1. `core/src/lib/ResizableNodeView.ts` (image/video resizing)
   - Uses raw `element.offsetWidth` / `element.offsetHeight` snapshots at interaction start and end.
   - Uses document-level `mousemove` / `mouseup` / `keydown` listeners (Shift-key tracking).
   - Stores initial aspect ratio; no `ResizeObserver`.
   - Designed for a single node, not for streaming per-block height changes.

2. ProseMirror `columnResizing` plugin (re-exported via `@tiptap/pm/tables`, used by `extension-table`)
   - Measures column widths via DOM during pointer drag, updates a transaction's `colWidths` attribute.
   - Not extracted as a general-purpose utility; lives inside `prosemirror-tables`.

3. `core/src/Tracker.ts`
   - Tracks positions across a `Transaction` (steps mapping).
   - **Not** a DOM observer — easy to confuse by name.

4. `extensions/src/placeholder/`
   - Uses ProseMirror `Plugin` state + `DecorationSet`. Reads `selection.empty`, `node.isTextblock`, `node.content.size`, and the empty-class CSS hook (`is-editor-empty` / `is-empty`). No height measurement.

**Conclusion:** we'll build our own pagination measurement engine. Best modern tool for it is the browser-native `ResizeObserver` — it isn't used anywhere in Tiptap OSS, but it's the right primitive (debounced, batched, async-friendly).

### Page-break node — no OSS implementation

- No `extension-page-break` package, no parse rule for `<hr data-page-break>`, no `pageBreakAfter` node anywhere in `/packages`.
- `extension-horizontal-rule` is the only `<hr>`-producing node (a plain visual rule, no paged-media semantics).
- A page-break node for dedocs is trivial: a `Node.create({ group: 'block', parseHTML: () => [{ tag: 'hr[data-page-break]' }], renderHTML: () => ['hr', { 'data-page-break': '', class: 'dedocs-page-break' }] })`. The node is **a marker we own**, not a content boundary. The actual pagination lives in a CSS overlay + decoration layer, not in the document tree.

### Headers / footers / watermarks — no OSS implementation

- `extension-table/src/header/` is the **table** header (a `<th>` row), unrelated to paged headers.
- No `@tiptap/extension-header`, `-footer`, `-watermark`, `-pagination` in any scope.
- Headers/footers live *outside* the document's content flow in any paged editor (Word, Google Docs, LaTeX). Tiptap's model is one editable tree, so we need an architectural choice (see Approaches).

### Reusable OSS building blocks (verified in source)

These already solve the MVP's "typography + paragraph styles + lists" axis. We will **wrap, not reimplement**:

| Package | Role in MVP | Source verified |
|---|---|---|
| `@tiptap/core` | `Node.create` / `Extension.create` / `Editor` base | ✓ `core/src/Editor.ts`, `Node.ts` |
| `@tiptap/pm` | ProseMirror `Plugin`, `DecorationSet`, state, view, schema-list, tables | ✓ `pm/package.json` re-exports |
| `@tiptap/react` | `useEditor`, `EditorContent` hooks | ✓ `react/package.json` |
| `@tiptap/extension-paragraph` | Paragraph block | ✓ `paragraph.ts` — `Node.create({ group:'block', content:'inline*' })` |
| `@tiptap/extension-heading` | H1–H6 | (in `starter-kit` deps) |
| `@tiptap/extension-text` | Inline text | (in `starter-kit` deps) |
| `@tiptap/extension-text-style` | `TextStyle` mark (color, font, etc.) | (in `extension-text-style`) |
| `@tiptap/extension-text-align` | Paragraph alignment | (separate package) |
| `@tiptap/extension-font-family` | Font family mark | (separate package) |
| `@tiptap/extension-color` | Color mark | (separate package) |
| `@tiptap/extension-highlight` | Highlight mark | (separate package) |
| `@tiptap/extension-bold/-italic/-strike/-code/-underline` | Marks | (in `starter-kit` deps) |
| `@tiptap/extension-list` (+ `-list-item`, `-bullet-list`, `-ordered-list`) | Lists | ✓ `bullet-list.ts` — `Node.create` with `wrappingInputRule` |
| `@tiptap/extension-hard-break` | `<br>` | (in `starter-kit` deps) |
| `@tiptap/extension-horizontal-rule` | `<hr>` | (in `starter-kit` deps) |
| `@tiptap/extension-document` | Root doc node | (in `starter-kit` deps) |
| `@tiptap/extensions` (`@tiptap/extensions/focus`, `placeholder`) | Optional UX helpers | ✓ `placeholder.ts` |

## Affected Areas

- `package.json` (new) — declares workspace deps on the OSS packages above.
- `tsconfig.json` (new) — needs `moduleResolution: "Bundler"`, `strict: true`, JSX `react-jsx`, paths to `@/`.
- `packages/dedocs/` (workspace, new) — the library source.
  - `src/editor/createDedocsEditor.ts` — wraps `useEditor`, injects our extensions.
  - `src/extensions/page-break.ts` — owns the marker node (replaces no existing file).
  - `src/extensions/pagination.ts` — owns the measurement engine.
  - `src/extensions/page-setup/` — pure config (paper size, margins, orientation) → CSS custom properties.
  - `src/styles/page.css` — `@page` rules for print, page-break-after on our marker.
  - `src/components/PaginatedEditor.tsx` — React wrapper that lays out pages visually.
- `openspec/changes/dedocs-mvp/` — proposals/specs/design/tasks/verify for this change.
- No existing code is modified — repo is empty.

## Approaches for pagination strategy

1. **Print-CSS only** — `@page` rules + `page-break-after: always` on the marker. Pages are invisible in editor mode; only show on print/PDF export.
   - Pros: 1 file of CSS, zero runtime measurement.
   - Cons: Not WYSIWYG during editing. No page numbers visible while typing. Headers/footers need `position: running()` which is print-only (Chromium ignores it).
   - Effort: **Low**.

2. **DOM measurement + visual page frames (RECOMMENDED)** — render the editor inside an absolutely-positioned "page" container with fixed dimensions; use `ResizeObserver` on each top-level block (heading, paragraph, list, image) to compute heights; emit ProseMirror `Decoration.widget` page-break markers when cumulative height crosses `pageHeight - margins`.
   - Pros: WYSIWYG. Works in all browsers. Works for screen AND print (print just hides the page frames).
   - Cons: Re-measurement on every edit/selection-change — needs `requestAnimationFrame` debouncing + a `MutationObserver` fallback. Tables, lists, images are edge cases (a list with N items must break between items, not mid-item; images may be taller than a page).
   - Effort: **High** — this is the core engineering challenge.

3. **CSS `column-count` / `column-fill`** — let the browser flow content into N column-tracks that happen to match page width.
   - Pros: Pure CSS, GPU-accelerated, no JS measurement.
   - Cons: Browser picks break points — you cannot guarantee a heading never lands at the bottom of a page. No page numbers. Headers/footers impossible without overlay hacks.
   - Effort: **Low**, but **fails the brief** (no controlled pagination).

4. **Manual page nodes** — each page is a top-level Node; user must explicitly insert a new page.
   - Pros: Trivial to implement, fully deterministic.
   - Cons: Not "auto pagination". Fundamentally wrong product shape.
   - Effort: **Low**, but **wrong UX**.

**Recommendation:** Approach #2 (DOM measurement + visual page frames) is the only one that delivers a real paginated editor. Approach #1 is a useful *complement* — once we have a page-break marker node (#2), turning on print CSS is one extra stylesheet. We do NOT consider #3 or #4 because they don't meet the brief.

## Recommendation

Build dedocs as a thin library layer over Tiptap OSS:

1. **Wrap, don't fork.** Install `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, and the relevant `extension-*` packages directly. Expose a `createDedocsEditor(options)` that composes them with our three custom pieces below.

2. **Three custom pieces** (none exist in OSS, all need design work):
   - `PageSetup` extension — `addOptions` for `{ paperSize: 'A4'|'Letter'|'Legal'|'A5', orientation: 'portrait'|'landscape', margins: { top, right, bottom, left } }`. Emits CSS custom properties on `editor.options.editorProps.attributes`; the consumer stylesheet maps them to widths/heights.
   - `PageBreak` node — block node, atom, `group: 'block'`, `selectable: false`, `draggable: false`, renders `<hr data-page-break>`, carries `page-break-after: always` in print stylesheet.
   - `Pagination` extension — ProseMirror plugin that, on each transaction + on `ResizeObserver` fires, walks top-level blocks in document order, sums their `getBoundingClientRect().height` (relative to the page content frame), and emits `Decoration.widget` between blocks where the cumulative height crosses the page boundary. Debounced via `requestAnimationFrame`. Single source of truth: the ProseMirror `Plugin` state holds the current pageBreak positions; no React re-render of the document.

3. **Typography + paragraph styles + lists** ship as a `dedocsStarterKit` that re-exports the OSS extensions with sensible defaults. No reimplementation.

4. **MVP scope is explicit.** Headers/footers/watermarks are deferred. When we add them, the architecture decision is: keep them **outside the editor tree**, rendered as overlays by the React `PaginatedEditor` component (one per page slot), not as Tiptap nodes. This avoids the one-tree-fits-all problem.

5. **Licensing posture for the package:** every direct dep is MIT; we publish dedocs under MIT.

## Risks

- **R1 — Performance of #2.** Re-measurement on every transaction can stutter typing on large docs. Mitigation: `ResizeObserver` (browser-batched) + `requestAnimationFrame` + memoize per-block height until the block's content actually changes.
- **R2 — Tiptap v3 churn.** We're targeting v3.29.2; the API has changed across majors (e.g. `commands.toggleList` is newer). Pin a minor range, not just a major.
- **R3 — Print fidelity gap.** What you see in the editor (Approach #2) is not byte-identical to a Chromium "Save as PDF" because Chromium's print engine uses its own layout. We will document this gap rather than try to close it.
- **R4 — Tables and images taller than a page.** Out of MVP scope but architecturally important — the Pagination plugin must never split a table or image across pages. The plugin needs a "minimum atomic block height" rule: if a block's height > page content height, the block becomes its own page and the previous page leaves white space.
- **R5 — `ResizeObserver` in jsdom / test env.** Vitest's jsdom has no layout. Tests for the Pagination plugin must use either happy-dom + manual `getBoundingClientRect` mocks, or a Playwright e2e suite for the real-DOM behavior. We need to commit to one testing strategy in design phase.
- **R6 — Confusing with Tiptap Pro.** End users may assume dedocs uses Tiptap Pro and try to enable pagination features that are actually ours. README must make this explicit.
- **R7 — React 19 peer dep.** `@tiptap/react@3.29.2` declares `react: ^17 || ^18 || ^19`. If the consuming app pins React 18, we're fine; if it pins 17, certain hooks (`useSyncExternalStore`) require a polyfill that `@tiptap/react` bundles. Worth verifying with our target demo app.

## Ready for Proposal

**Yes — proceed to `sdd-propose`.**

The exploration confirmed:
- All MVP-needed extensions are MIT and reusable.
- Pagination, page-break, headers, footers, watermarks are NOT in Tiptap OSS (they are Pro-only); we must build them.
- Tiptap has no general measuring/observation system — we own that.
- The recommended approach (Approach #2: `ResizeObserver` + `Decoration.widget` + visual page frames) is technically sound and aligned with how the rest of the Tiptap ecosystem builds features.

No clarification needed from the user before proposal. The proposal should:
- Lock in Approach #2 (DOM measurement + visual page frames) as the MVP pagination strategy.
- Define the three custom pieces (`PageSetup`, `PageBreak`, `Pagination`) as the proposal's primary work.
- Defer headers/footers/watermarks to a follow-up change.
- Make testing strategy (jsdom mocks vs. Playwright e2e) a design-phase decision.