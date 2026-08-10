# Typography Specification

## Purpose

Apply font family, size, weight, and color marks to text via Tiptap OSS extensions.

## Requirements

### Requirement: Font Family Mark

The system SHALL apply font-family marks to selected text using Tiptap's font-family extension.

### Requirement: Font Size Mark

The system SHALL apply font-size marks to selected text using Tiptap's text style extension.

### Requirement: Font Weight Mark

The system SHALL apply font-weight marks (bold, normal) to selected text.

### Requirement: Text Color Mark

The system SHALL apply color marks to selected text using Tiptap's color extension.

### Requirement: Marks Apply to Selection

The system SHALL apply typography marks when text is selected and the corresponding formatting is applied.

## Scenarios

#### Scenario: Apply font family to selection

- GIVEN selected text "Hello"
- WHEN user applies font-family "Georgia"
- THEN the text renders in Georgia font

#### Scenario: Apply font size to selection

- GIVEN selected text "World"
- WHEN user applies font-size "24px"
- THEN the text renders at 24px

#### Scenario: Apply color to selection

- GIVEN selected text "Colored"
- WHEN user applies color "#FF0000"
- THEN the text renders in red

#### Scenario: Weight applies to nested marks

- GIVEN text with existing italic mark
- WHEN bold is applied
- THEN both marks coexist on the text
