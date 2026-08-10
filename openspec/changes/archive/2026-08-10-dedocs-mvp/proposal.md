# Proposal: dedocs MVP

## Intent

Build a MIT-licensed React library that gives developers a paged document editor (Word/Google Docs feel) by composing Tiptap OSS extensions with our own pagination engine. Tiptap ships pagination behind its Pro paywall; dedocs fills that gap for any React app.

## Scope

### In Scope
- Auto-paginate content across visual pages (A4/Letter/Legal/A5, portrait/landscape, global margins per document).
- `PageBreak` marker node (insertable; draggable false; prints as hard break).
- Typography marks: font family, size, weight, color.
- Paragraph styles: alignment, indentation, line height.
- Bullet lists.
- React `PaginatedEditor` component: visual page frames + scroll.
- `dedocsStarterKit` exporting the configured extension set.

### Out of Scope
- Ordered/numbered lists, task lists (follow-up).
- Headers, footers, watermarks (later change; React overlays).
- Tables, images, footnotes (later; need atomic-block rules).
- Print/PDF export — rely on Chromium "Save as PDF"; fidelity gap documented.
- Collaboration, comments, revision history.
- Server / persistence layer — client-only.

## Capabilities

### New Capabilities
- `pagination`: ProseMirror plugin measuring top-level blocks via `ResizeObserver`, emitting `Decoration.widget` page-break markers. State held in plugin, not React.
- `page-setup`: extension declaring paper size + orientation + margins; emits CSS custom properties.
- `page-break`: atomic block node `<hr data-page-break>` for explicit breaks.
- `typography`: font family / size / weight / color marks (wraps Tiptap OSS extensions).
- `paragraph-styles`: alignment + indentation + line height (wraps Tiptap OSS extensions).
- `bullet-lists`: bullet list + list item (wraps Tiptap OSS extensions).
- `editor-shell`: `createDedocsEditor` factory + `PaginatedEditor` React component bundling everything.

### Modified Capabilities
- None. Repo is empty; no prior specs.

## Approach

Approach #2 (per exploration): absolutely-positioned page containers with fixed dimensions; `ResizeObserver` per top-level block → cumulative height → `Decoration.widget` page-break markers at boundaries. Debounced via `requestAnimationFrame`. Block splitting: when a single block overflows, split at the inline position closest to the boundary (text + list items splittable; tables/images atomic via min-block-height rule). Reuse Tiptap OSS packages directly — do not fork.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/dedocs/src/extensions/{pagination,page-setup,page-break,typography,paragraph-styles,bullet-lists}.ts` | New | Seven custom extensions (see Capabilities) |
| `packages/dedocs/src/editor/createDedocsEditor.ts` | New | Editor factory composing extensions |
| `packages/dedocs/src/components/PaginatedEditor.tsx` | New | React shell with visual page frames |
| `packages/dedocs/src/styles/page.css` | New | Print + page-frame CSS |
| `package.json` (root) | New | Workspace + Tiptap deps |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Pagination perf on large docs | High | ResizeObserver + rAF + per-block memoization; only re-measure changed blocks |
| Block-split correctness across marks/links | High | Design-phase algorithm spec; e2e fixtures for headings, lists, nested marks |
| ResizeObserver absent in jsdom | Med | happy-dom + manual `getBoundingClientRect` mocks for unit; Playwright e2e for real layout |
| Tiptap v3 API churn | Med | Pin `^3.29` minor range; CI against latest 3.x |
| Confusion with Tiptap Pro | Med | README clarifies dedocs owns pagination |
| Print fidelity vs editor view | Med | Document gap; rely on Chromium paged print |

## Rollback Plan

MVP ships as a single `dedocs` package; no consumers yet. Rollback = delete the package, revert root `package.json` deps, archive the change. Cost: one PR.

## Dependencies

- `@tiptap/core`, `@tiptap/pm`, `@tiptap/react` (`^3.29`).
- `@tiptap/extension-{paragraph,text,text-style,text-align,font-family,color,bold,italic,strike,underline,list,bullet-list,list-item,...}`.
- React 18 peer.
- happy-dom + Playwright (dev).

## Success Criteria

- [ ] `createDedocsEditor()` paginates correctly across A4 portrait with 2.54cm margins.
- [ ] `PageBreak` forces a new page and renders visibly.
- [ ] Font family, size, weight, color apply to selected text.
- [ ] Bullet list renders with nested levels; list items split across pages.
- [ ] Unit tests cover the splitting algorithm; e2e covers 4 representative docs.
- [ ] Bundle size < 250KB gzipped.
- [ ] README distinguishes dedocs from Tiptap Pro.
