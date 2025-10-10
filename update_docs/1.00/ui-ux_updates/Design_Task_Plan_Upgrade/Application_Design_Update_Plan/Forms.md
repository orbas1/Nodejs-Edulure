# Forms — Input Experience Blueprint

## Form Types
1. **Quick Actions (Bottom Sheet):** Single-field microforms triggered from FAB (e.g., log learning hour). Height 240 dp, includes primary button and optional secondary text link.
2. **Standard Forms:** Multi-field up to 6 inputs, arranged single column with 24 dp spacing. Use sticky CTA bar when content exceeds viewport.
3. **Wizard / Stepper:** Up to 5 steps for provider upload flow. Each step has progress indicator (top 16 dp high) and context panel summarising requirements.

## Input Components
| Component | Height | Label Behaviour | Notes |
| --- | --- | --- | --- |
| Text Field | 56 dp | Floating label, shrinks to 12 dp when focused | Prefix/suffix icons 24 dp, 12 dp padding.
| Text Area | Min 120 dp | Label floats; auto-grow up to 3 lines before scroll | Character counter bottom-right, `caption/01`.
| Dropdown | 56 dp | Persistent label | Opens bottom sheet with search for >8 options.
| Date Picker | 56 dp trigger | Inline chip summary | Use native pickers when available; custom calendar uses 320 dp height.
| Toggle Switch | 32 dp height | Label left, helper text below | Active colour `accent/500`.
| Checkbox | 24 dp | Label right | Group spacing 12 dp vertical.
| Slider | 40 dp track height | Value label above right | Use for payout percentage.

## Validation States
- **Success:** Bottom border `success/500` (2 dp), helper text green.
- **Error:** Bottom border `error/500`, show error message in `caption/01` with icon `alert-circle` 16 dp.
- **Warning:** Border `warning/500` 2 dp, helper text italic.
- Display inline feedback immediately after blur; for server validation show toast anchored to field.

## Accessibility
- Minimum touch target 48 dp including whitespace.
- Associate labels with inputs via accessible IDs.
- Provide descriptive hint text (max 60 characters) using `caption/01`.
- Support voice input shortcuts (microphone icon) for search and note fields.

## Layout Spacing
- Group fields by topic with 32 dp separators and optional heading text using `overline/01`.
- Align buttons right; when stacked, maintain 12 dp gap.
- For wizards, place `Back` ghost button to left, `Next` primary to right within 72 dp-high sticky footer.

## Upload Flow Specifics
- Step 1 “Upload File”: drag-and-drop card 200 dp height with dashed border `rgba(37,99,235,0.35)`.
- Step 2 “Optimise”: toggle list for compression, transcripts; each item 64 dp height with icon.
- Step 3 “Publish”: scheduling controls (date picker + time chips), audience multi-select.
- Provide inline checklist with icons (check, warning) to show readiness.

## Microinteractions
- Focus ripple 180 ms radial using `rgba(37,99,235,0.08)`.
- Invalid shake: horizontal 4 dp amplitude, 120 ms.
- Loading states show 3-dot inline indicator adjacent to label.

## Implementation Notes
- Document form schema (JSON) referencing field IDs and validation rules.
- Provide Figma variants for default, focus, error, disabled states.
- For accessibility toggle (font, contrast), show preview chips in-line to confirm selection.
