# Delta for page-setup

## MODIFIED Requirements

### Requirement: CSS Custom Property Emission

The system SHALL emit CSS custom properties `--page-width`, `--page-height`, `--page-margin-top`, `--page-margin-right`, `--page-margin-bottom`, `--page-margin-left`, `--header-height`, and `--footer-height` on the editor container.
(Previously: Only page dimension and margin properties were emitted)

#### Scenario: Band height vars emitted

- GIVEN page-setup with default configuration (A4, no explicit band heights)
- WHEN the editor initializes
- THEN `--header-height` and `--footer-height` are present on the editor container
- AND values reflect `pageHeight / 5` (≈59.4mm for A4)

### Requirement: Paper Size Configuration

The system SHALL accept paper size identifiers (A4, Letter, Legal, A5) with band height options. Default band heights are computed as `pageHeight / 5` and MUST NOT exceed `pageHeight / 3` per band independently.
(Previously: Paper size only affected page dimensions and margins; no band height defaults)

#### Scenario: A4 with default band heights

- GIVEN page-setup configured for A4 with no explicit band heights
- WHEN the editor initializes
- THEN `--header-height` ≈ 59.4mm and `--footer-height` ≈ 59.4mm (both pageHeight / 5)
- AND each band is independently capped at pageHeight / 3 ≈ 99mm

#### Scenario: A4 with explicit band heights

- GIVEN page-setup configured for A4 with headerHeight=2cm, footerHeight=1.5cm
- WHEN the editor initializes
- THEN `--header-height` = 20mm and `--footer-height` = 15mm
- AND body content area is reduced by both bands

### Requirement: Band Height Default and Max Constraints

The system SHALL default each band to `pageHeight / 5` (~20% of page height). Each band SHALL be independently clamped to `pageHeight / 3` (~33%) via `clampBandHeight(value, pageHeight)`. No cross-validation between header and footer SHALL occur.
(Previously: Default was 1.25cm fixed; max was 50% of page height with cross-validation)

#### Scenario: Default computed from page height

- GIVEN page-setup with no explicit band heights
- WHEN `getDefaultBandHeightCm(pageHeightMm)` is called with A4 (297mm)
- THEN the result is approximately 5.94cm (pageHeightMm / 5 / 10 = 297/5/10 = 5.94cm)
- AND this value is used as the default for both header and footer

#### Scenario: Independent max clamping per band

- GIVEN page-setup with headerHeight=150mm on A4 (pageHeight = 297mm, max per band = 99mm)
- WHEN `clampBandHeight(150, 297)` is called
- THEN the result is 99mm (pageHeight / 3)
- AND footer is validated independently with no cross-band influence

#### Scenario: Fallback default when page height unknown

- GIVEN page-setup with no paper size or page height available
- WHEN `getDefaultBandHeightCm()` fallback is used
- THEN `DEFAULT_BAND_HEIGHT_CM = 1.25` is returned
- AND this is used as the absolute fallback for both bands

### Requirement: Validation Function

The system SHALL provide `validateBandHeight(value, pageHeight, label)` which returns `{ value: number; errors: string[] }`. This function is called per band during `PageSetup.onCreate` and `setPageSetup`. Errors are stored in `PageSetupStorage.errors` and emitted via `console.warn`.
(Previously: No per-band validation function existed)

#### Scenario: Validation returns error when exceeding max

- GIVEN page-setup with headerHeight=120mm on A4 (max ≈ 99mm)
- WHEN `validateBandHeight(120, 297, 'header')` is called
- THEN the returned `value` is 99mm (clamped)
- AND `errors` contains a message indicating the header band exceeded the maximum

#### Scenario: Validation passes for valid height

- GIVEN page-setup with headerHeight=2cm on A4
- WHEN `validateBandHeight(20, 297, 'header')` is called
- THEN the returned `value` is 20mm
- AND `errors` is an empty array

#### Scenario: Both bands validated independently

- GIVEN page-setup with headerHeight=2cm and footerHeight=120mm on A4
- WHEN both bands are validated
- THEN header validation passes (20mm < 99mm)
- AND footer validation returns an error (120mm > 99mm, clamped to 99mm)
- AND each band's result is independent of the other

### Requirement: PageSetupStorage Errors Array

The system SHALL store validation errors in `PageSetupStorage.errors` as an array of strings. Each entry SHALL describe which band violated the constraint and by how much.
(Previously: No errors array in storage)

#### Scenario: Errors stored on validation failure

- GIVEN page-setup with invalid band heights
- WHEN `setPageSetup({ headerHeight: 200 })` is called on A4
- THEN `PageSetupStorage.errors` contains at least one entry
- AND the error message references the header band
