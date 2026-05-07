# PPT Design Enhancement Walkthrough

I have updated the PowerPoint generation code to align with corporate design standards. The changes focus on readability, professional spacing, and visual hierarchy.

## Changes Made

### 1. Typography System
- Switched to **Segoe UI** as the primary font for a modern, clean look.
- Implemented a consistent font scale:
    - **Titles**: 24pt
    - **Subtitles**: 16pt
    - **Section Labels**: 13pt
    - **Body/Table Text**: 11.5pt

### 2. Layout & Alignment
- **Margins & Spacing**: Increased default margins and gaps to prevent the content from feeling crowded.
- **Vertical Alignment**: Ensured all text elements are centered vertically (`valign: 'middle'`) within their defined containers for a more polished look.
- **Number Alignment**: Standardized right-alignment for numerical data in tables while keeping text labels left-aligned.

### 3. Visual Hierarchy
- Increased the prominence of the **NET DEAL** total to make it the clear focal point of the summary.
- Improved the separation between the header, summary box, and the detailed data table.

## Verification Results

### Manual Review
- The code snippet was refactored to use standard `pptxgenjs` options that are compatible with Office 365 and Desktop PowerPoint.
- Font sizes and positions were calculated to fit within a standard 16:9 layout (`LAYOUT_WIDE`).
