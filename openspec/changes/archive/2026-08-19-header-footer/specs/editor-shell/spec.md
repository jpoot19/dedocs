# Delta for editor-shell

## MODIFIED Requirements

### Requirement: Editor Factory

The system SHALL export `createDedocsEditor(options?)` returning a configured Tiptap editor instance with all MVP extensions composed including the `header-footer` extension.
(Previously: Editor factory did not include header-footer extension)

#### Scenario: Editor factory includes header-footer

- GIVEN `createDedocsEditor()` is called
- WHEN the editor is inspected
- THEN the `header` and `footer` node types are present in the schema
- AND the `dedocs-band` group is registered

### Requirement: Header/Footer Slot Components

The system SHALL export `DocumentEditor.Header` and `DocumentEditor.Footer` components usable as children of `DocumentEditor.Root`. These components are slot markers that render `null` themselves but capture their children for portal mounting. The `slotType` is `'header'` and `'footer'` respectively.

#### Scenario: Header slot marker captures children

- GIVEN `<DocumentEditor.Root><DocumentEditor.Header><em>My Header</em></DocumentEditor.Header></DocumentEditor.Root>`
- WHEN Root renders
- THEN the header slot children include `<em>My Header</em>`
- AND the Header component renders null

#### Scenario: Footer slot marker captures children

- GIVEN `<DocumentEditor.Root><DocumentEditor.Footer>Footer text</DocumentEditor.Footer></DocumentEditor.Root>`
- WHEN Root renders
- THEN the footer slot children include `Footer text`
- AND the Footer component renders null

### Requirement: Root Slot Capture

The system SHALL modify `DocumentEditor.Root` to use `React.Children.forEach` to traverse its children and capture elements with `slotType === 'header'` and `slotType === 'footer'`. Captured slot content SHALL be exposed via `DocumentEditorContext` as `headerSlot: ReactNode` and `footerSlot: ReactNode`.

#### Scenario: Root extracts header slot from children

- GIVEN `<DocumentEditor.Root><DocumentEditor.Header>Title</DocumentEditor.Header><Canvas /></DocumentEditor.Root>`
- WHEN Root renders
- THEN `headerSlot` in context contains the `Title` children
- AND `footerSlot` in context is null or empty

#### Scenario: Root extracts footer slot from children

- GIVEN `<DocumentEditor.Root><Canvas /><DocumentEditor.Footer>© 2026</DocumentEditor.Footer></DocumentEditor.Root>`
- WHEN Root renders
- THEN `footerSlot` in context contains `© 2026`
- AND `headerSlot` in context is null or empty

### Requirement: Canvas Band Portal Mounting

The system SHALL modify `DocumentEditor.Canvas` to mount header and footer portals per page frame. After each page frame commits to the DOM, a callback ref sets `refsReady = true`. `useLayoutEffect` then calls `createPortal(slot, bandRef)` for each band in each frame. Bands are rendered inside `.dedocs-page` as `.dedocs-band-header` and `.dedocs-band-footer`.
(Previously: Canvas rendered only body page frames with no band portals)

#### Scenario: Canvas mounts band portals per frame

- GIVEN a DocumentEditor with header and footer slot content configured
- WHEN Canvas renders 3 page frames
- THEN each frame has one header portal and one footer portal mounted
- AND slot content renders at the top and bottom of each frame respectively

#### Scenario: Bands reserve space when slots are empty

- GIVEN a DocumentEditor with no header slot content
- WHEN pages render
- THEN each frame has an empty header band div with reserved height via CSS
- AND body content is offset by the reserved band height

### Requirement: Band Context Provider

The system SHALL provide `BandContext` with `{ pageSetup }` so that band content components can read page configuration. This context is distinct from `DocumentEditorContext`.
(Previously: No band-specific context)

#### Scenario: Band components access page setup via context

- GIVEN a band content component that reads from BandContext
- WHEN it renders inside a header or footer band
- THEN `pageSetup` values including `headerHeight` and `footerHeight` are available
