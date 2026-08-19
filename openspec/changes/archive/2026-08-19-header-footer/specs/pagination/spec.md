# Delta for pagination

## MODIFIED Requirements

### Requirement: Page Boundary Detection

The system SHALL measure cumulative height of top-level blocks via ResizeObserver and emit `Decoration.widget` page-break markers at content boundaries. All nodes belonging to the `dedocs-band` group SHALL be excluded from height calculation.
(Previously: All top-level blocks were measured for pagination)

#### Scenario: Band nodes excluded from height

- GIVEN a document with 3 paragraphs of body content and 1 header node in `dedocs-band` group
- WHEN pagination computes page breaks
- THEN only the 3 paragraphs count toward cumulative page height
- AND the header node does not affect page break placement

### Requirement: Block Overflow Splitting

When a single block's content exceeds remaining page space, the system SHALL split the block at the inline position closest to the boundary, preserving all marks and links. Band group nodes SHALL NOT be candidates for overflow splitting.
(Previously: All blocks were candidates for overflow splitting)

#### Scenario: Body block splits at boundary, bands ignored

- GIVEN a page with 50px remaining and a body paragraph of 80px
- WHEN pagination computes the break
- THEN the paragraph splits at the boundary
- AND band content is never evaluated for overflow or splitting

### Requirement: rAF Debounce

The system SHALL debounce resize measurements via `requestAnimationFrame`. Band height changes triggered by content edits SHALL also trigger debounced repagination.
(Previously: No band-aware debounce specified)

#### Scenario: Band content edit triggers repagination

- GIVEN a document with header and body content
- WHEN header content is edited
- THEN pagination recalculates via rAF after the edit
- AND body page breaks are adjusted accordingly

### Requirement: Content Area Height Subtraction

The system SHALL subtract combined band heights from the page content area when computing `resolveMetrics`. The body content area equals: `pageHeight - topMargin - bottomMargin - headerHeight - footerHeight`.
(Previously: Body content area did not account for band heights)

#### Scenario: Body area reduced by both bands

- GIVEN A4 page with 20mm header and 20mm footer and 20mm top/bottom margins
- WHEN `resolveMetrics` computes the body area
- THEN the body content height is reduced by 40mm total (header + footer)
- AND pagination uses the reduced body height for page breaks

### Requirement: collectTopLevelBlocks Filter

The system SHALL use `collectTopLevelBlocks` which filters out all nodes where `type.spec.group === 'dedocs-band'`. This ensures band nodes never appear in the body block list used for pagination.
(Previously: No dedocs-band filter existed)

#### Scenario: collectTopLevelBlocks excludes all band nodes

- GIVEN a document with header, footer, and multiple body blocks
- WHEN `collectTopLevelBlocks(doc)` is called
- THEN the returned list contains only body blocks
- AND no `header` or `footer` nodes from `dedocs-band` group are included
