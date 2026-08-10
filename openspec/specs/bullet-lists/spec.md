# Bullet Lists Specification

## Purpose

Render bullet lists that support nesting and split across pages with list items flowing naturally.

## Requirements

### Requirement: Bullet List Node

The system SHALL provide a bullet list node wrapping Tiptap's bullet-list extension.

### Requirement: List Item Node

The system SHALL provide list item nodes that contain block content.

### Requirement: Nested Lists

The system SHALL support nested bullet lists up to at least 3 levels deep.

### Requirement: List Item Page Split

When a list item's content exceeds page height, the system SHALL split the item at the appropriate inline position and continue rendering on the next page with bullet preserved.

### Requirement: Bullet Rendering

The system SHALL render bullet markers visually at the start of each list item.

## Scenarios

#### Scenario: Create bullet list

- GIVEN cursor in empty paragraph
- WHEN user initiates bullet list
- THEN a bullet list with one empty item is created

#### Scenario: Nested bullet levels

- GIVEN a bullet list item
- WHEN user indents to create nested item
- THEN nested item renders with deeper indent and proper bullet marker

#### Scenario: List item splits at page boundary

- GIVEN a bullet list item with content spanning page boundary
- WHEN pagination occurs
- THEN the content splits
- AND continuation on next page shows bullet marker

#### Scenario: Multiple list items on one page

- GIVEN bullet list with 5 items totaling less than page height
- WHEN rendered
- THEN all items appear on same page with bullets
