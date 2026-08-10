# Paragraph Styles Specification

## Purpose

Apply alignment, indentation, and line-height to paragraphs via Tiptap OSS extensions.

## Requirements

### Requirement: Text Alignment

The system SHALL apply text-align marks (left, center, right, justify) to paragraphs.

### Requirement: Line Height

The system SHALL apply line-height values to paragraphs using Tiptap's line-height extension.

### Requirement: Paragraph Indentation

The system SHALL apply indentation (left margin offset) to paragraphs.

### Requirement: Styles Apply to Containing Paragraph

The system SHALL apply paragraph styles to the entire paragraph containing the cursor, not just selected text.

## Scenarios

#### Scenario: Align paragraph center

- GIVEN cursor within a paragraph
- WHEN user applies center alignment
- THEN the paragraph text renders centered

#### Scenario: Set line height

- GIVEN cursor within a paragraph
- WHEN user applies line-height "1.5"
- THEN paragraph text line spacing reflects 1.5

#### Scenario: Indent paragraph

- GIVEN cursor within a paragraph
- WHEN user applies 2em indentation
- THEN paragraph left margin is offset by 2em

#### Scenario: Alignment does not affect other paragraphs

- GIVEN two separate paragraphs, first centered, second left-aligned
- WHEN alignment changes on first paragraph
- THEN second paragraph remains left-aligned
