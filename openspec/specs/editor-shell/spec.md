# Editor Shell Specification

## Purpose

Provide `createDedocsEditor` factory and `PaginatedEditor` React component bundling all extensions with visual page frames.

## Requirements

### Requirement: Editor Factory

The system SHALL export `createDedocsEditor(options?)` returning a configured Tiptap editor instance with all MVP extensions composed.

### Requirement: PaginatedEditor Component

The system SHALL export a `PaginatedEditor` React component that renders the editor with visual page frames.

### Requirement: Page Frame Rendering

The system SHALL render pages as absolutely-positioned containers within a scrollable canvas area.

### Requirement: Extension Composition

The system SHALL compose pagination, page-setup, page-break, typography, paragraph-styles, and bullet-lists extensions in `createDedocsEditor`.

### Requirement: dedocsStarterKit Export

The system SHALL export `dedocsStarterKit` containing all MVP extensions for consumer use.

## Scenarios

#### Scenario: createDedocsEditor returns configured editor

- GIVEN no options provided
- WHEN `createDedocsEditor()` is called
- THEN returned editor has all MVP extensions active

#### Scenario: PaginatedEditor renders pages

- GIVEN a PaginatedEditor with content exceeding one page
- WHEN rendered
- THEN multiple page frames are visible in scrollable canvas

#### Scenario: dedocsStarterKit exports extensions

- GIVEN consumer imports dedocsStarterKit
- THEN all MVP extensions are available for custom composition
