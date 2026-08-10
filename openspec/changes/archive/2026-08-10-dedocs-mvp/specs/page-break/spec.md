# Page Break Specification

## Purpose

Insert explicit page breaks as atomic `<hr data-page-break>` nodes. Users insert via toolbar button; breaks are not draggable.

## Requirements

### Requirement: Page Break Node Type

The system SHALL provide an atomic block node rendered as `<hr data-page-break>` that forces a new page when encountered.

### Requirement: Toolbar Insertion

The system SHALL expose a toolbar button that inserts a page break node at the current cursor position.

### Requirement: Non-Draggable Behavior

The system SHALL prevent page break nodes from being dragged by the user.

### Requirement: Visual Rendering

The system SHALL render page break nodes as visible horizontal rules in the editor view.

## Scenarios

#### Scenario: Insert page break via toolbar

- GIVEN cursor is positioned within a paragraph
- WHEN user clicks the page-break toolbar button
- THEN a page break node is inserted after the current paragraph
- AND the cursor moves to the start of the next page

#### Scenario: Page break forces new page

- GIVEN content on page one followed by a page break node
- WHEN the document renders
- THEN all content after the break appears on page two

#### Scenario: Page break not draggable

- GIVEN a page break node in the document
- WHEN user attempts to drag it
- THEN the node remains in place
