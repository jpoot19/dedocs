# Design: Header & Footer

## Technical Approach

Two top-level ProseMirror block nodes (`header`, `footer`) in a new `dedocs-band` group. Pagination skips band nodes and subtracts band heights from the body content area. `PageSetup` emits `--header-height` / `--footer-height` CSS vars. Each band height **defaults to `pageHeight / 5`** (~20% — typical document header/footer) and is **independently capped at `pageHeight / 3`** (~33% — absolute limit). Validation is per-band only — no cross-validation, since each band ≤ 1/3 leaves body area mathematically guaranteed positive (≥ `pageHeight / 3`). `<DocumentEditor.Header>` / `<DocumentEditor.Footer>` are slot markers; `<DocumentEditor.Root>` captures their children via `React.Children.forEach` and exposes them through context; `<DocumentEditor.Canvas>` portals slot content into a band container inside every page frame. Bands always reserve space via CSS even when empty.

## Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Node group | `dedocs-band` (single string) | Namespaced; matches existing single-group convention (`'block'`) |
| Band node shape | `atom: true`, `content: ''`, `selectable: false` | Slots are visual source of truth; nodes are schema anchors only — pagination math stays trivial |
| Schema content | `(block \| header \| footer)*` | Default empty doc has zero bands; user opts in via slots; nodes optional |
| Slot capture | Static `slotType` marker + `React.Children.forEach` in Root | Order-tolerant; no registration coupling |
| Portal mechanism | `createPortal(slot, bandRef)` per frame; callback refs + `useLayoutEffect` flips `refsReady` after commit | Single React tree per slot; shared state across frames |
| Band height default | `pageHeight / 5` (~20%) computed in `mergePageSetup` via `getDefaultBandHeightCm(pageHeightMm)`; constant fallback `DEFAULT_BAND_HEIGHT_CM = 1.25` when page height unknown | Matches typical document layout (letterhead, page-number footer); page-relative so it scales correctly across A4 / Letter / Legal / A5 |
| Band height max | `MAX_BAND_HEIGHT_FRACTION = 1/3` — per-band clamp via `clampBandHeight(value, pageHeight)` | Absolute cap leaves body area guaranteed positive (1 − 2×1/3 = 1/3); per-band math means no cross-validation required |
| Validation layer | New `validateBandHeight(value, pageHeight, label)` helper called per band from `PageSetup.onCreate` and `setPageSetup`; errors in storage + `console.warn` | Single source of truth; CSS can't enforce max; each band reasoned about in isolation |
| Pagination filter | `collectTopLevelBlocks` drops nodes where `type.spec.group === 'dedocs-band'` | Schema-level; no DOM coupling; defensive even with empty doc |
| Content-area math | `resolveMetrics` subtracts `(headerHeight + footerHeight) * MM_PER_CM * pxPerMm` from vertical | Backwards compatible (zero by default); one-place change |

## Data Flow

```
  Root: Children.forEach → capture slot children by slotType
        context = {editor, pageSetup, paginationState, headerSlot, footerSlot}
        Children: Header (marker) • Toolbar • Canvas • Footer (marker)
  PageSetup.init: mergePageSetup → default band = pageHeight/5 (per band)
                  → clampBandHeight(value, pageHeight) → emit --header-height, --footer-height
  Canvas: EditorContent + per-page frame with <div.dedocs-band-{h,f} ref>
          After commit (refsReady): createPortal(slot, bandRef) per frame
  Pagination (rAF): reads CSS vars → resolveMetrics = page−margins−bands
                    → collectTopLevelBlocks drops dedocs-band
                    → computeBreaks → Decoration.widget page breaks
```

## File Changes

| File | Action |
|---|---|
| `extensions/header-footer.ts` | Create. `Node.create` × 2, `group: 'dedocs-band'`, `atom`, `content: ''`. Export `BAND_GROUP`, names, `isBandNode`, `HeaderFooter` array |
| `extensions/dedocsStarterKit.ts` | Modify. Spread `HeaderFooter`; re-export helpers |
| `editor/createDedocsEditor.ts` | Modify. Add `HeaderFooter` to base; extend `Document` content |
| `extensions/pagination.ts` | Modify. `resolveMetrics` subtracts bands; `collectTopLevelBlocks` filters via `isBandNode`; CSS var key memo extended |
| `extensions/page-setup.ts` | Modify. `getDefaultBandHeightCm(pageHeightMm)` + `clampBandHeight(value, pageHeight)` + `validateBandHeight(...)` per band; emit two vars; `mergePageSetup` applies defaults; storage gets `errors[]`; warn on fail |
| `types.ts` | Modify. Band heights on `PageSetupOptions`; extend `PAGE_SETUP_CSS_VARS`; export `DEFAULT_BAND_HEIGHT_FRACTION = 1/5`, `MAX_BAND_HEIGHT_FRACTION = 1/3`, fallback `DEFAULT_BAND_HEIGHT_CM = 1.25` |
| `utils/paperSizes.ts` | Modify. Export `pageHeightMm(pageSetup)` + `getDefaultBandHeightCm(pageHeightMm)` (cm) |
| `components/DocumentEditor/Header.tsx` | Create. Slot marker; renders `null`; `slotType = 'header'` |
| `components/DocumentEditor/Footer.tsx` | Create. Slot marker; renders `null`; `slotType = 'footer'` |
| `components/DocumentEditor/Root.tsx` | Modify. `React.Children.forEach` captures slot children; expose via context |
| `components/DocumentEditor/Canvas.tsx` | Modify. Add band divs per page; callback refs + `useLayoutEffect` for `refsReady`; `createPortal` per frame |
| `components/DocumentEditor/index.ts` | Modify. Add `Header`/`Footer` to namespace |
| `context/DocumentEditorContext.tsx` | Modify. Add `headerSlot`/`footerSlot: ReactNode` |
| `styles/page.css` | Modify. `.dedocs-band-*` absolute positioning; page padding = margin + band; in-doc band `display: none`; `@page` updated |
| `index.ts` | Modify. Re-export `HeaderFooter`, `BAND_GROUP`, `isBandNode`, `clampBandHeight`, `getDefaultBandHeightCm` |

## Interfaces / Contracts

```ts
// types.ts
interface PageSetupOptions {
  paperSize: PaperSize; orientation: Orientation; margins: PageMargins;
  headerHeight: number;  // cm; default = pageHeight / 5 (≈5.94cm for A4)
  footerHeight: number;  // cm; default = pageHeight / 5
}
export const DEFAULT_BAND_HEIGHT_FRACTION = 1 / 5;
export const MAX_BAND_HEIGHT_FRACTION = 1 / 3;
export const DEFAULT_BAND_HEIGHT_CM = 1.25;  // fallback when pageHeight unknown
const PAGE_SETUP_CSS_VARS = { /* …existing… */ headerHeight: '--header-height', footerHeight: '--footer-height' };

// utils/paperSizes.ts
export function pageHeightMm(opts: PageSetupOptions): number;
export function getDefaultBandHeightCm(pageHeightMm: number): number;  // = pageHeightMm / 5 / 10

// extensions/page-setup.ts
export function clampBandHeight(value: number, pageHeightMm: number): number;  // min(value, pageHeightMm / 3 / 10)
interface PageSetupStorage { current: PageSetupOptions; errors: string[]; }
function validateBandHeight(value: number, pageHeightMm: number, label: 'header' | 'footer'): { value: number; errors: string[] };

// extensions/header-footer.ts
export const BAND_GROUP = 'dedocs-band';
export function isBandNode(node: PMNode): boolean { return node.type.spec.group === BAND_GROUP; }

// context
interface DocumentEditorContextValue {
  editor: Editor | null; pageSetup: PageSetupOptions; paginationState: PaginationState;
  headerSlot: ReactNode; footerSlot: ReactNode;
}
```

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `clampBandHeight` per-band; `getDefaultBandHeightCm` page-relative; `validateBandHeight` aggregates per band; `resolveMetrics` subtracts bands; `resolvePageSetupCssVars` emits band vars; `isBandNode` | Vitest pure helpers in existing test files + new `header-footer.test.ts` |
| Integration | Slot extraction in Root; `setPageSetup` clamps+emits; `collectTopLevelBlocks` excludes band group; defaults applied on init | Vitest + `@testing-library/react`; mock `getBoundingClientRect` + ResizeObserver |
| E2E | Slot renders into every page frame; band reserved when empty; overflow pushes body to next page; height change re-flows; default band matches page-relative ratio | Playwright: empty doc, single-line band, overflowing band, A4↔Letter swap, assert default ≈ 20% of page |

## Migration / Rollout

No migration script. **Behavioural change for existing consumers**: bands now default to `pageHeight / 5` (≈5.94cm for A4) instead of fixed 1.25cm — first paint reserves a noticeably larger band. Consumers wanting the old behaviour can pass explicit `headerHeight`/`footerHeight` in `pageSetup`. Body-only pagination and schema flexibility preserved.

## Open Questions

None blocking. Page numbering, odd/even, watermarks, first-page-different are out of scope. Per-band 1/3 cap leaves body area ≥ `pageHeight / 3` in the worst case — safe by construction, no cross-validation needed. **Resolved during archive: Spec deltas regenerated to reflect pageHeight/5 (~5.94cm for A4) default and pageHeight/3 max constraints.**