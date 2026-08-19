# Header & Footer Specification

## Purpose

Add header and footer band support to dedocs via a slots-only API. Bands are reserved space on every page that repeats content but does not participate in body pagination.

## Requirements

### Requirement: Slots-Only API

The system SHALL provide `<DocumentEditor.Header>` and `<DocumentEditor.Footer>` as slot marker components used as children of `<DocumentEditor.Root>`. No props API SHALL be provided for header/footer content.

#### Scenario: Header slot renders custom content

- GIVEN `<DocumentEditor.Root><DocumentEditor.Header><strong>ACME Corp</strong></DocumentEditor.Header></DocumentEditor.Root>`
- WHEN the editor renders
- THEN "ACME Corp" appears in the header band of every page frame

#### Scenario: Footer slot with rich content

- GIVEN `<DocumentEditor.Root><DocumentEditor.Footer><em>Page footer</em></DocumentEditor.Footer></DocumentEditor.Root>`
- WHEN the editor renders
- THEN "Page footer" appears in the footer band of every page frame

### Requirement: Band Node Schema

The system SHALL expose two ProseMirror block nodes (`header`, `footer`) in a `dedocs-band` group. These nodes are `atom: true`, `selectable: false`, with empty content. They serve as schema anchors only; all rendering is via React portals.

#### Scenario: Empty document has no band nodes in doc

- GIVEN an empty document
- WHEN the schema is inspected
- THEN no `header` or `footer` nodes exist in the document tree
- AND band content is rendered entirely via React portals independent of ProseMirror document structure

### Requirement: Band Height Reservation (Empty Bands)

The system SHALL reserve header and footer band areas on every page frame even when empty. Reserved space SHALL be determined by `--header-height` and `--footer-height` CSS custom properties.

#### Scenario: Empty header band reserves space

- GIVEN a DocumentEditor with no header slot content
- WHEN pages render
- THEN the header band area is reserved (blank) at the top of each page frame
- AND body content begins below the reserved band

#### Scenario: Empty footer band reserves space

- GIVEN a DocumentEditor with no footer slot content
- WHEN pages render
- THEN the footer band area is reserved (blank) at the bottom of each page frame

### Requirement: Portal Mounting Per Frame

The system SHALL mount header and footer slot content into each page frame via `createPortal`. Each frame SHALL receive its own portal instance anchored to the frame's band container.

#### Scenario: Multiple pages each have portal

- GIVEN a DocumentEditor with header slot content configured
- WHEN 3 page frames are rendered
- THEN each frame has its own header portal containing the slot content
- AND editing slot content in one location updates all frames simultaneously

### Requirement: Band Height Constraints

The system SHALL default each band height to `pageHeight / 5` (~20% of page height). Each band SHALL be independently capped at `pageHeight / 3` (~33%). No cross-validation between header and footer SHALL occur.

#### Scenario: Default band height is page-relative

- GIVEN default page-setup with A4 (pageHeight ≈ 297mm)
- WHEN the editor initializes
- THEN `--header-height` ≈ 59.4mm (pageHeight / 5) and `--footer-height` ≈ 59.4mm
- AND body area is reduced by both bands plus margins

#### Scenario: Independent max clamping

- GIVEN an A4 page with headerHeight configured to 150mm
- WHEN `clampBandHeight(150, 297)` is called
- THEN the result is 99mm (pageHeight / 3)
- AND footer validation is independent and unaffected

#### Scenario: Valid explicit height passes through

- GIVEN page-setup with headerHeight=2cm on A4
- WHEN the editor initializes
- THEN `--header-height` = 20mm (no clamping applied)

### Requirement: Validation Behavior

The system SHALL call `validateBandHeight(value, pageHeight, label)` on each band during `PageSetup.onCreate` and `setPageSetup`. Validation errors SHALL be stored in `PageSetupStorage.errors` and emitted via `console.warn`. `clampBandHeight` SHALL enforce the maximum without throwing.

#### Scenario: Validation returns error on exceed

- GIVEN page-setup with headerHeight=120mm on A4 (max ≈ 99mm)
- WHEN `validateBandHeight(120, 297, 'header')` is called
- THEN the returned errors array contains an entry for the header band
- AND the clamped value is returned alongside errors

#### Scenario: Validation passes for valid height

- GIVEN page-setup with headerHeight=2cm on A4
- WHEN `validateBandHeight(20, 297, 'header')` is called
- THEN the returned errors array is empty
- AND the value passes through unchanged

### Requirement: Screen-First Rendering

The system SHALL render bands via React pure rendering per page frame. Print/PDF rendering is deferred to a future iteration. Bands are visible on screen and in browser print preview only.

#### Scenario: Bands visible in print preview

- GIVEN a DocumentEditor with header and footer content
- WHEN browser print preview is opened
- THEN header and footer bands appear on each printed page
