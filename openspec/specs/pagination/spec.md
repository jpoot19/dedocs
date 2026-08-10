# Pagination Specification

## Purpose

Auto-paginate document content into visual page frames using ResizeObserver measurements and rAF-debounced recomputation. State lives in ProseMirror plugin, not React.

## Requirements

### Requirement: Page Boundary Detection

The system SHALL measure cumulative height of top-level blocks via ResizeObserver and emit `Decoration.widget` page-break markers at content boundaries.

### Requirement: Block Overflow Splitting

When a single block's content exceeds remaining page space, the system SHALL split the block at the inline position closest to the boundary, preserving all marks and links.

### Requirement: rAF Debounce

The system SHALL debounce resize measurements via `requestAnimationFrame` to avoid excessive recalculations.

### Requirement: Page Marker Placement

The system SHALL place page-break decorations as widgets that do not alter document content but render visibly between pages.

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
