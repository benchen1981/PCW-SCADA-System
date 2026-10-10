# Debug Log - Phase 14: Global Optimizations (SAT Evidence & Global Tag Detail)

## 1. SubmainDetail.tsx SVG Click Handler Editing
**Issue:** Attempting to inject `onClick` handlers into the P&ID SVG in `SubmainDetail.tsx` failed due to target content mismatches during `replace_file_content` execution. The SVG structure was highly nested and identical across multiple instruments (`PT1S`, `TT1S`, `PT1R`, `TT1R`), making string matching prone to errors.
**Resolution:** Viewed the exact lines (110-170) of `SubmainDetail.tsx` to ensure exact character-for-character matching. Carefully replaced the `<g>` elements by adding `style={{ cursor: 'pointer' }} onClick={() => openTagDetail(getSensor('...')?.tagId || '')}` to each of the four main sensors in the diagram.

## 2. Duplicate Imports in LiveSensors.tsx
**Issue:** During the removal of unused local state and types in `LiveSensors.tsx` (as the component transitioned to using the Global Tag Detail drawer), the `pcwDataService` was accidentally imported twice on adjacent lines.
**Resolution:** Used `replace_file_content` to cleanly remove the duplicate import block at the top of the file.

## 3. ActiveAlarms.tsx Table Event Bubbling
**Issue:** When adding the tag detail link to the Tag ID cell inside the alarm table row, clicking the tag would also trigger the row's `onClick` handler (which selected the alarm for the local detail panel).
**Resolution:** Added `e.stopPropagation()` to the `onClick` event of the Tag ID span: `onClick={(e) => { e.stopPropagation(); openTagDetail(a.tagId); }}`. This ensures that opening the Tag Detail drawer does not simultaneously highlight the row for the alarm detail view.
