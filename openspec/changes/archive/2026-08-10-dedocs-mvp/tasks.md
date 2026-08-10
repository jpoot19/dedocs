# Tasks: dedocs MVP

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,500–2,000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Engine) → PR 3 (Glue+UI+Toolchain) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation — types, interfaces, paperSizes, page.css, index.ts, engine.ts | PR 1 | Standalone; no other code depends on it |
| 2 | Engine — all 6 Tiptap extensions (pagination, page-setup, page-break, typography, paragraph-styles, bullet-lists, dedocsStarterKit) | PR 2 | Depends on PR 1 (types/interfaces) |
| 3 | Glue+UI+Toolchain — context, hooks, components, createDedocsEditor, configs, playground | PR 3 | Depends on PR 2; integrates everything |

**Chain strategy question**: Use **stacked PRs to main** (fast iteration, fix on the go) or **feature branch chain** (rollback control, tracker branch accumulates final integration)?

## Phase 1: Foundation

- [x] 1.1 Create `packages/dedocs/src/utils/paperSizes.ts` — A4/Letter/Legal/A5 dimension constants and helper types
- [x] 1.2 Create `packages/dedocs/src/types.ts` — `PageSetupOptions`, `PaginationBreak`, `DedocsEditorOptions` interfaces
- [x] 1.3 Create `packages/dedocs/src/styles/page.css` — `.dedocs-page`, `.dedocs-page-break`, `@page` print rules, page frame CSS
- [x] 1.4 Create `packages/dedocs/src/index.ts` — barrel export for `@dedocs`
- [x] 1.5 Create `packages/dedocs/src/editor/engine.ts` — `@dedocs/editor/engine` subpath exports

## Phase 2: Engine

- [x] 2.1 Create `packages/dedocs/src/extensions/page-setup.ts` — `PageSetup` extension emitting CSS custom properties
- [x] 2.2 Create `packages/dedocs/src/extensions/page-break.ts` — atomic `<hr data-page-break>` node, non-draggable
- [x] 2.3 Create `packages/dedocs/src/extensions/pagination.ts` — ResizeObserver + rAF + `Decoration.widget` plugin, block overflow split logic
- [x] 2.4 Create `packages/dedocs/src/extensions/typography.ts` — font-family, font-size, font-weight, color marks wrapping Tiptap OSS
- [x] 2.5 Create `packages/dedocs/src/extensions/paragraph-styles.ts` — text-align, line-height, indentation marks wrapping Tiptap OSS
- [x] 2.6 Create `packages/dedocs/src/extensions/bullet-lists.ts` — bullet list + list item nodes wrapping Tiptap OSS
- [x] 2.7 Create `packages/dedocs/src/extensions/dedocsStarterKit.ts` — re-exports all six extensions
- [x] 2.8 Add `resize-observer-polyfill` devDependency; document ResizeObserver mock pattern for Vitest

## Phase 3: Glue

- [x] 3.1 Create `packages/dedocs/src/context/DocumentEditorContext.tsx` — context exposing `editor`, `pageSetup`, `paginationState`
- [x] 3.2 Create `packages/dedocs/src/hooks/useDocumentEditor.ts` — returns context values; throws if used outside provider
- [x] 3.3 Create `packages/dedocs/src/hooks/useResizeObserver.ts` — ResizeObserver lifecycle hook with cleanup

## Phase 4: UI

- [x] 4.1 Create `packages/dedocs/src/components/DocumentEditor/Root.tsx` — `<DocumentEditor.Root pageSetup onUpdate>` provider component
- [x] 4.2 Create `packages/dedocs/src/components/DocumentEditor/Canvas.tsx` — reads CSS vars, renders page frames, scrollable
- [x] 4.3 Create `packages/dedocs/src/components/DocumentEditor/Toolbar.tsx` — page-break insert button, typography/paragraph-style controls
- [x] 4.4 Create `packages/dedocs/src/components/DocumentEditor/index.ts` — barrel re-export

## Phase 5: Integration

- [x] 5.1 Create `packages/dedocs/src/editor/createDedocsEditor.ts` — factory composing all extensions + pagination plugin
- [x] 5.2 Wire `createDedocsEditor` inside `<DocumentEditor.Root>` using `useEditor`
- [x] 5.3 Export `PaginatedEditor` alias pointing to `<DocumentEditor.Root>`

## Phase 6: Testing

- [x] 6.1 Write Vitest unit tests for `paperSizes.ts` — verify A4, Letter, Legal, A5 dimensions and orientation swap
- [x] 6.2 Write Vitest unit tests for `pagination.ts` — block-split offset logic, `computeBreaks` with mock `getBoundingClientRect`
- [x] 6.3 Write Vitest unit tests for `page-setup.ts` — CSS var emission values
- [x] 6.4 Write Vitest integration tests for extension composition via `createDedocsEditor`
- [x] 6.5 Write Playwright e2e test: long text paginating across multiple pages
- [x] 6.6 Write Playwright e2e test: explicit page break via toolbar
- [x] 6.7 Write Playwright e2e test: nested bullet lists with page split

## Phase 7: Toolchain

- [x] 7.1 Create `packages/dedocs/package.json` — name `@dedocs`, exports field with dual entries, Tiptap `^3.29` dependency
- [x] 7.2 Create `packages/dedocs/tsup.config.ts` — builds dual entries, bundles Tiptap extensions
- [x] 7.3 Create `packages/dedocs/vitest.config.ts` — `react`, `happy-dom`, `resize-observer-polyfill` globals
- [x] 7.4 Create `packages/dedocs/playwright.config.ts` — `reporter: 'list'`, `timeout: 10s`, `projects: [chromium]`
- [x] 7.5 Create `playground/` — Vite React app with `PaginatedEditor` demo (package.json, vite.config.ts, index.html, main.tsx, App.tsx)
