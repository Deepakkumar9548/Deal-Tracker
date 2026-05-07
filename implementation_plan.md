# PPT Design Enhancement Plan

The goal is to transform the provided PPT generation code snippet into a clean, professional, and corporate-style layout using `pptxgenjs` best practices.

## User Review Required

> [!IMPORTANT]
> The implementation assumes the existence of helper variables like `deal`, `headerSub`, `LX`, `ly`, `LW`, `colX`, `colW2`, `sbLabels`, `fN`, etc., as seen in the provided snippet. I will only update the formatting logic within the `addText` calls.

## Proposed Changes

### Refine PPT Generation Code

#### [MODIFY] PPT Logic (Code Snippet)
- **Font System**: Set `Calibri` as the primary font face.
- **Color Palette**: Use professional, muted colors (Deep Blue for headers, Light Grey for table backgrounds).
- **Header Section**: Increase title size to 24-26 and subheader to 16 for better hierarchy.
- **Section Labels**: Improve spacing and font weight.
- **Table Formatting**: 
    - Use a professional table header with consistent vertical alignment.
    - Improve cell padding (margins) and text alignment.
- **Auto-Fit**: Ensure `autoFit: true` and `wrap: true` are consistently applied to prevent text overflow.

## Verification Plan

### Manual Verification
- The user will need to replace their existing code section with the provided snippet and generate a PPT to verify the visual changes.
