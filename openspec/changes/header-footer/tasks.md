# Tasks: Header & Footer Bands

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1050 (new) + ~400 (modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation + Extension) → PR 2 (Pagination + PageSetup) → PR 3 (React + CSS + Tests) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main|feature-branch-chain|size-exception|pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + ProseMirror band extension | PR 1 → main | Types, constants, `header-footer.ts`, `dedocsStarterKit`, re-exports |
| 2 | Pagination skip + PageSetup band height | PR 2 → main | `resolveMetrics` subtracts bands, `collectTopLevelBlocks` filter, CSS vars, validators |
| 3 | React slots + Canvas portals + CSS + tests | PR 3 → main | Header/Footer slots, Root capture, Canvas portals, page.css, Vitest, E2E |

## Phase 1: Foundation

- [x] 1.1 Add band-height constants to `packages/dedocs/src/types.ts`: `DEFAULT_BAND_HEIGHT_FRACTION = 1/5`, `MAX_BAND_HEIGHT_FRACTION = 1/3`, `DEFAULT_BAND_HEIGHT_CM = 1.25`, extend `PAGE_SETUP_CSS_VARS` with `headerHeight: '--header-height'` and `footerHeight: '--footer-height'`
- [x] 1.2 Add `headerHeight: number` and `footerHeight: number` to `PageSetupOptions` interface in `types.ts`
- [x] 1.3 Export `pageHeightMm(opts: PageSetupOptions): number` and `getDefaultBandHeightCm(pageHeightMm: number): number` from `packages/dedocs/src/utils/paperSizes.ts`

## Phase 2: ProseMirror Band Extensions

- [x] 2.1 Create `packages/dedocs/src/extensions/header-footer.ts`: export `BAND_GROUP = 'dedocs-band'`, `isBandNode(node): boolean`, `HeaderFooter` array (two `Node.create` calls, `atom: true`, `content: ''`, `selectable: false`, group: `BAND_GROUP`)
- [x] 2.2 Modify `packages/dedocs/src/extensions/dedocsStarterKit.ts`: spread `HeaderFooter` into the kit; re-export `BAND_GROUP`, `isBandNode`
- [x] 2.3 Modify `packages/dedocs/src/editor/createDedocsEditor.ts`: import and add `HeaderFooter` to `DEDOCS_BASE_EXTENSIONS`; extend `Document` content schema to `(block | header | footer)*`
- [x] 2.4 Add `HeaderFooter`, `BAND_GROUP`, `isBandNode` exports to `packages/dedocs/src/index.ts`

## Phase 3: Pagination Skip + Metrics

- [x] 3.1 Modify `packages/dedocs/src/extensions/pagination.ts`: update `resolveMetrics` to subtract `(headerHeight + footerHeight) * MM_PER_CM * pxPerMm` from `contentHeight`
- [x] 3.2 Modify `collectTopLevelBlocks` in `pagination.ts`: filter out nodes where `type.spec.group === 'dedocs-band'` using `isBandNode`
- [x] 3.3 Update `readCssVarsKey` and `readPageSetupFromDom` in `pagination.ts` to read `--header-height` and `--footer-height` CSS vars; extend memo key

## Phase 4: PageSetup Band Integration

- [x] 4.1 Add `validateBandHeight(value, pageHeight, label): { value: number; errors: string[] }` helper to `packages/dedocs/src/extensions/page-setup.ts`
- [x] 4.2 Add `clampBandHeight(value, pageHeight): number` helper to `page-setup.ts` (min of value and `pageHeight / 3`)
- [x] 4.3 Modify `resolvePageSetupCssVars` in `page-setup.ts` to emit `--header-height` and `--footer-height` from `PageSetupOptions`
- [x] 4.4 Modify `mergePageSetup` in `page-setup.ts` to compute default `headerHeight`/`footerHeight` via `getDefaultBandHeightCm(pageHeightMm)`
- [x] 4.5 Add `errors: string[]` to `PageSetupStorage` interface; call `validateBandHeight` per band in `onCreate` and `setPageSetup` command; emit `console.warn` on errors
- [x] 4.6 Re-export `clampBandHeight`, `validateBandHeight`, `getDefaultBandHeightCm` from `page-setup.ts`

## Phase 5: React Slot Components

- [ ] 5.1 Create `packages/dedocs/src/components/DocumentEditor/Header.tsx`: slot marker component; renders `null`; exports static `slotType = 'header'`
- [ ] 5.2 Create `packages/dedocs/src/components/DocumentEditor/Footer.tsx`: slot marker component; renders `null`; exports static `slotType = 'footer'`
- [ ] 5.3 Add `headerSlot: ReactNode` and `footerSlot: ReactNode` to `DocumentEditorContextValue` in `context/DocumentEditorContext.tsx`
- [ ] 5.4 Modify `packages/dedocs/src/components/DocumentEditor/Root.tsx`: add `React.Children.forEach` traversal capturing `slotType === 'header'` and `slotType === 'footer'` children; pass `headerSlot`/`footerSlot` through context value
- [ ] 5.5 Modify `packages/dedocs/src/components/DocumentEditor/index.ts`: import and export `Header`, `Footer`; add to `DocumentEditor` namespace

## Phase 6: Canvas Portal Mounting

- [ ] 6.1 Modify `packages/dedocs/src/components/DocumentEditor/Canvas.tsx`: for each `.dedocs-page` frame, render `.dedocs-band-header` and `.dedocs-band-footer` divs
- [ ] 6.2 Add callback refs + `useLayoutEffect` in Canvas to flip `refsReady` after each frame div commits to DOM
- [ ] 6.3 After `refsReady`, call `createPortal(slot, bandRef)` per frame for both header and footer slots; clean up portals on effect teardown

## Phase 7: CSS — Band Reserved Areas

- [ ] 7.1 Add CSS custom properties `--header-height` and `--footer-height` defaults to `styles/page.css` (`:root, .dedocs-editor`)
- [ ] 7.2 Add `.dedocs-band-header` and `.dedocs-band-footer` CSS: `position: absolute`, `left: 0`, `right: 0`, heights from vars, `pointer-events: none`, `overflow: hidden`
- [ ] 7.3 Position `.dedocs-band-header` at top of `.dedocs-page`; `.dedocs-band-footer` at bottom via `bottom: 0`
- [ ] 7.4 Add `[data-node-type="header"], [data-node-type="footer"] { display: none }` to hide band nodes inside the ProseMirror editor DOM
- [ ] 7.5 Update `.dedocs-page` padding to account for band heights; update `@page` margin to include band areas

## Phase 8: Testing

- [ ] 8.1 Unit test `clampBandHeight`: value < max passes, value > max clamps, negative clamps to 0 in `extensions/header-footer.test.ts`
- [ ] 8.2 Unit test `getDefaultBandHeightCm(297)` returns ~1.485cm; fallback returns 1.25cm in `utils/paperSizes.test.ts`
- [ ] 8.3 Unit test `validateBandHeight(120, 297, 'header')` returns errors + clamped value; valid value returns no errors in `extensions/page-setup.test.ts`
- [ ] 8.4 Unit test `resolveMetrics` subtracts band heights from `contentHeight` in `extensions/pagination.test.ts`
- [ ] 8.5 Unit test `collectTopLevelBlocks` excludes `dedocs-band` group nodes in `extensions/pagination.test.ts`
- [ ] 8.6 Integration test: Root renders Header/Footer slots, context exposes `headerSlot`/`footerSlot` in `components/DocumentEditor/Root.test.tsx`
- [ ] 8.7 Integration test: Canvas mounts portal per frame; `refsReady` triggers `createPortal` in `components/DocumentEditor/Canvas.test.tsx`
- [ ] 8.8 E2E: Playwright — empty doc renders header/footer band divs on every page frame; slot content appears in all frames; band reserves space when empty; A4→Letter swap adjusts band proportions
