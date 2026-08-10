# Design: dedocs MVP

## Technical Approach

Thin layer over Tiptap OSS. Three net-new pieces (`Pagination` plugin, `PageSetup`, `PageBreak` node) carry the paged-editor work; `typography`/`paragraph-styles`/`bullet-lists` wrap OSS extensions under `dedocsStarterKit`. Pagination state lives in a ProseMirror `Plugin` — React only renders. Pages are absolutely-positioned divs sized by CSS custom properties from `PageSetup`; same CSS drives screen frames and `@page` print.

## Architecture Decisions

### Decision: Plugin-state pagination (not React-state)

| Option | Tradeoff | Decision |
|---|---|---|
| React `useState` of breaks | Re-renders editor per keystroke; breaks PM model | Rejected |
| PM `Plugin` state + `Decoration.widget` | Stable identity; PM view renders widgets | **Chosen** |
| CSS `column-count` only | No controlled breaks; orphans headings | Rejected |

### Decision: 3-layer folder split (engine / glue / UI)

| Layer | Folder | Owns |
|---|---|---|
| Engine | `src/extensions/` | PM plugins, nodes, marks (pure JS) |
| Glue | `src/context/`, `src/hooks/` | Context, ResizeObserver lifecycle |
| UI | `src/components/` | `<DocumentEditor.*>` compound components |

Engine stays unit-testable without React; consumers can swap UI.

### Decision: CSS custom properties as PageSetup → Canvas contract

| Option | Tradeoff | Decision |
|---|---|---|
| Inline `style.width` per frame | Couples engine to CSS-in-JS runtime | Rejected |
| CSS vars on editor root (`--page-width`, `--page-height`, `--page-margin-*`) | Engine emits vars; consumer stylesheet owns layout; same vars feed `@page` | **Chosen** |
| JS event bus | Avoids CSS but loses WYSIWYG | Rejected |

### Decision: Overflow = inline-offset decoration split (no DOM mutation)

When a block's height exceeds remaining page space, insert a `Decoration.widget` at the inline offset closest to the boundary; continuation rendered by a second decorator on the next page. Marks/links preserved (no document mutation). Atomic blocks deferred; min-block-height rule reserved.

### Decision: Compound component API

| Option | Tradeoff | Decision |
|---|---|---|
| Single `<PaginatedEditor>` prop bag | Simple but inflexible | Rejected |
| `<DocumentEditor.Root><Canvas/><Toolbar/></DocumentEditor.Root>` | Composable toolbar + panels | **Chosen** |

`useDocumentEditor()` returns `{ editor, pageSetup, paginationState }`.

### Decision: Dual export surface

- `@dedocs` — barrel (`DocumentEditor.*`, `createDedocsEditor`, `dedocsStarterKit`). App devs.
- `@dedocs/editor/engine` — subpath: raw extensions + utils. Library authors.

Via `package.json` `exports` + `tsup` dual-entry.

## Data Flow

```
PageSetup options ──→ CSS custom properties on editor root
                                    │
user keystroke ──→ Tiptap ──→ ProseMirror state
                                    ▼
        ┌─────────────────────────────────┐
        │  Pagination plugin              │
        │  1. ResizeObserver per block    │
        │  2. rAF-debounced computeBreaks │
        │  3. Emit Decoration.widget set  │
        └────────────────┬────────────────┘
                         │ decorations
                         ▼
              PM EditorView ──→ DOM
                         │
                         ▼
              <DocumentEditor.Canvas>
                • reads CSS vars → page frames
                • reads context for editor
```

## File Changes

| File | Description |
|---|---|
| `extensions/pagination.ts` | ResizeObserver + rAF + Decoration.widget plugin |
| `extensions/page-setup.ts` | Options → CSS custom properties |
| `extensions/page-break.ts` | Atomic `<hr data-page-break>` node |
| `extensions/{typography,paragraph-styles,bullet-lists}.ts` | Wrap OSS extensions |
| `extensions/dedocsStarterKit.ts` | Re-exports all six |
| `context/DocumentEditorContext.tsx` | Context for editor + page setup |
| `hooks/{useDocumentEditor,useResizeObserver}.ts` | Consumer hooks |
| `components/DocumentEditor/{Root,Canvas,Toolbar}.tsx` | Compound components |
| `editor/createDedocsEditor.ts` | Factory composing extensions |
| `utils/paperSizes.ts` | A4/Letter/Legal/A5 dimensions |
| `styles/page.css` | `.dedocs-page`, `.dedocs-page-break`, `@page` |
| `index.ts`, `editor/engine.ts` | Barrel `@dedocs` + subpath |
| Root `package.json`, `tsup/vitest/playwright.config.ts` | Workspace + toolchain |

(All under `packages/dedocs/src/` unless noted; all created.)

## Interfaces / Contracts

```ts
interface PageSetupOptions {
  paperSize: 'A4' | 'Letter' | 'Legal' | 'A5';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number }; // cm
}
interface PaginationBreak { pos: number; pageIndex: number; kind: 'auto' | 'explicit' }

<DocumentEditor.Root pageSetup={opts} onUpdate={fn}>
  <DocumentEditor.Toolbar />
  <DocumentEditor.Canvas />
</DocumentEditor.Root>
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Break-compute algorithm, block-split offset, paper-size table, CSS-var emission | Vitest + happy-dom + `getBoundingClientRect` mocks + `resize-observer-polyfill` |
| Integration | Extension composition, Context wiring, toolbar commands | Vitest + React Testing Library |
| E2E | 4 representative docs (long text, headings, nested lists, explicit breaks); visual page-frame diff | Playwright real Chromium |
| Bundle | `< 250KB gzipped` assertion in CI | `size-limit` |

## Migration / Rollout

No migration required — new package, no consumers.

## Open Questions

- **ResizeObserver in tests** — happy-dom doesn't fire callbacks. Plan: `resize-observer-polyfill` + manual `trigger()`. Confirm in `sdd-tasks` whether `vi.mock` is cleaner.
- **Tiptap v3 stability** — pin `^3.29`; CI matrix against latest 3.x.
- **Atomic-block splitting** — out of MVP; algorithm reserves a min-block-height rule (block > page content → own page, previous leaves whitespace).
- **React 17 compat** — `@tiptap/react@3.29` claims `^17 || ^18 || ^19` but `useSyncExternalStore` needs a polyfill under 17. Confirm with target demo.
- **Print fidelity** — Chromium `@page` may not match editor frames 1:1. Document gap.