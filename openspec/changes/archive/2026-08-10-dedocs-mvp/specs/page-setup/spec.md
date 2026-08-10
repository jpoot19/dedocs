# Page Setup Specification

## Purpose

Declare paper size, orientation, and margins per document. Emits CSS custom properties consumed by page frame rendering.

## Requirements

### Requirement: Paper Size Configuration

The system SHALL accept paper size identifiers (A4, Letter, Legal, A5) and SHALL emit corresponding CSS custom properties for dimensions.

### Requirement: Orientation Support

The system SHALL support portrait and landscape orientations, swapping width and height values.

### Requirement: Margin Configuration

The system SHALL accept margin values (top, right, bottom, left) in centimeters and SHALL emit them as CSS custom properties.

### Requirement: CSS Custom Property Emission

The system SHALL emit CSS custom properties `--page-width`, `--page-height`, `--page-margin-top`, `--page-margin-right`, `--page-margin-bottom`, `--page-margin-left` on the editor container.

## Scenarios

#### Scenario: A4 portrait defaults

- GIVEN page-setup with no explicit configuration
- WHEN the editor initializes
- THEN CSS custom properties reflect A4 portrait (210mm × 297mm) with 2.54cm margins

#### Scenario: Letter landscape configuration

- GIVEN page-setup configured for Letter landscape
- WHEN the editor initializes
- THEN `--page-width` = 279.4mm and `--page-height` = 215.9mm

#### Scenario: Custom margins applied

- GIVEN page-setup with top=3cm, bottom=2cm, left=2.5cm, right=2.5cm
- WHEN the editor initializes
- THEN each margin CSS property reflects the configured value
