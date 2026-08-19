# Proposal: Header & Footer

## Intent

Formal documents (letters, reports, invoices) need a letterhead that repeats on every page. dedocs only renders body today — no header, no footer, no reserved band. Pagination cannot ignore non-body content.

## Scope

### In Scope
- Two ProseMirror nodes (`header`, `footer`) with Tiptap rich content.
- `<DocumentEditor.Header>` / `<DocumentEditor.Footer>` components, one per page frame.
- `<DocumentEditor.Root header={...} footer={...}>` props API + children-slot API.
- Canvas reserves a configurable band even when empty — body never flows to the edge.
- Pagination skips header/footer nodes when measuring body and placing breaks.
- `PageSetup` emits `--header-height` / `--footer-height` CSS vars.

### Out of Scope
- Page numbering — second iteration.
- Print / PDF export — browser print; fidelity gap documented.
- First-page / odd-even variants, watermarks.

## Capabilities

### New Capabilities
- `header-footer`: ProseMirror nodes + React band components + props/slots API + reserved bands.

### Modified Capabilities
- `editor-shell`: `Root` gains `header`/`footer` props; new `Header`/`Footer`; `Canvas` mounts band portals per frame.
- `pagination`: skip `dedocs-band` group when measuring body.
- `page-setup`: emit band-height vars; `headerHeight`/`footerHeight` (default 1.25cm).

## Approach

New `header-footer` extension adds two top-level block nodes in a `dedocs-band` group. Pagination whitelists body blocks only — bands never push breaks. React mounts each band as a portal anchored to its `.dedocs-page` frame via CSS vars. Props materialize a hidden Tiptap editor teleported into the slot; slot children render as-is. Empty bands stay reserved.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `extensions/header-footer.ts` | New | Two ProseMirror nodes. |
| `extensions/dedocsStarterKit.ts` | Modified | Add to kit. |
| `extensions/pagination.ts` | Modified | Skip `dedocs-band`. |
| `extensions/page-setup.ts` | Modified | Emit band-height vars. |
| `components/DocumentEditor/Header.tsx` | New | Band portal target. |
| `components/DocumentEditor/Footer.tsx` | New | Band portal target. |
| `components/DocumentEditor/Root.tsx` | Modified | Accept props + slots. |
| `components/DocumentEditor/Canvas.tsx` | Modified | Mount portals per frame. |
| `styles/page.css` | Modified | Band positioning. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Pagination double-counts band | Med | Whitelist group; e2e. |
| Props vs slots drift | Low | One portal target. |
| Perf with N portals × M pages | Med | Memoize frame children. |
| Print fidelity gap | High (known) | Document; defer. |

## Rollback Plan

Revert PR; drop `header-footer.ts`; undo edits in `pagination.ts`, `page-setup.ts`, `Root.tsx`, `Canvas.tsx`; remove `Header.tsx`/`Footer.tsx`. No consumers; clean revert.

## Dependencies

`@tiptap/core`, `@tiptap/pm`, `@tiptap/react` (`^3.29`). React 19. Existing `PageSetup`, `Pagination`.

## Success Criteria

- [ ] `Root header={{left:'ACME',right:'2025'}}` renders header on every page.
- [ ] Slot API renders custom React nodes inside band.
- [ ] Band reserved (no body to edge) when empty.
- [ ] Pagination ignores band height — body breaks unchanged.
- [ ] Rich content (heading, bold, link, image) editable inside bands.
- [ ] Vitest + Playwright cover empty, single-line, overflowing bands.
- [ ] Paper-size / orientation re-flows band positioning without code edits.
