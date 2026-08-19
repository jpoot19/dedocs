# Pagination Specification

## Purpose

Auto-paginate document content into visual page frames using ResizeObserver measurements and rAF-debounced recomputation. State lives in ProseMirror plugin, not React.

## Requirements

### Requirement: Page Boundary Detection

The system SHALL measure cumulative height of top-level blocks via ResizeObserver and emit `Decoration.widget` page-break markers at content boundaries. All nodes belonging to the `dedocs-band` group SHALL be excluded from height calculation.

### Requirement: Block Overflow Splitting

When a single block's content exceeds remaining page space, the system SHALL split the block at the inline position closest to the boundary, preserving all marks and links. Band group nodes SHALL NOT be candidates for overflow splitting.

### Requirement: rAF Debounce

The system SHALL debounce resize measurements via `requestAnimationFrame` to avoid excessive recalculations. Band height changes triggered by content edits SHALL also trigger debounced repagination.

### Requirement: Page Marker Placement

The system SHALL place page-break decorations as widgets that do not alter document content but render visibly between pages.

### Requirement: Content Area Height Subtraction

The system SHALL subtract combined band heights from the page content area when computing `resolveMetrics`. The body content area equals: `pageHeight - topMargin - bottomMargin - headerHeight - footerHeight`.

### Requirement: collectTopLevelBlocks Filter

The system SHALL use `collectTopLevelBlocks` which filters out all nodes where `type.spec.group === 'dedocs-band'`. This ensures band nodes never appear in the body block list used for pagination.

## Scenarios

#### Scenario: Content paginates across multiple pages

- GIVEN a document with content exceeding one page height
- WHEN the editor renders
- THEN content is divided into sequential page frames
- AND each frame shows visible content up to its height limit

#### Scenario: Block splits at page boundary

- GIVEN a heading with text that would overflow the current page
- WHEN pagination is computed
- THEN the heading text splits at the boundary
- AND continuation appears on the next page

#### Scenario: ResizeObserver triggers repagination

- GIVEN a document already paginated
- WHEN a block's dimensions change
- THEN pagination recalculates via rAF
- AND page breaks reposition correctly

#### Scenario: Empty page not created for minimal overflow

- GIVEN a page with only 10px remaining
- WHEN a 15px block follows
- THEN the block splits, not an empty page

#### Scenario: Band nodes excluded from height

- GIVEN a document with 3 paragraphs of body content and 1 header node in `dedocs-band` group
- WHEN pagination computes page breaks
- THEN only the 3 paragraphs count toward cumulative page height
- AND the header node does not affect page break placement

#### Scenario: Body area reduced by both bands

- GIVEN A4 page with 20mm header and 20mm footer and 20mm top/bottom margins
- WHEN `resolveMetrics` computes the body area
- THEN the body content height is reduced by 40mm total (header + footer)
- AND pagination uses the reduced body height for page breaks

#### Scenario: collectTopLevelBlocks excludes all band nodes

- GIVEN a document with header, footer, and multiple body blocks
- WHEN `collectTopLevelBlocks(doc)` is called
- THEN the returned list contains only body blocks
- AND no `header` or `footer` nodes from `dedocs-band` group are included
