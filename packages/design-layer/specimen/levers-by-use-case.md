# Levers by use case

How each kind of design value is adjusted, tested, evaluated and accepted in the
design layer. One row per use case. "Evaluate" is always one measured line under
the lever, never a lint wall; a failing check turns that line red and travels
with the change into the review and into `design/changes.md`.

| Use case | Adjust | Test (see it) | Evaluate (is it right) | Accept |
|---|---|---|---|---|
| Type size | Ramp lever over the type scale | The page live; hold B for before | Rank on the page ("2nd largest"), collision ("Same size as the Page Title"), fluid range ("phone 26 px, wide 36 px") | Review row, rung tokens in the tooltip |
| Line height | Ramp: None, Tight, Normal, Relaxed; Suggested rung from size (≥ 24 px Tight, else Normal) | Line boxes painted on the text with their px | "47 px lines on 36 px text" | Review row |
| Weight | Ramp of the face's real weights only (DM Sans 300 to 700, never 350) | The page live | (none needed) | Review row |
| Text color | Swatches by role (Default, Secondary, Disabled, Brand); chevron opens the hue's 12 steps | The page live | Contrast against what's actually behind it, light and dark; failing swatches carry a red dot BEFORE you pick | Review row, flagged if under 4.5 (3 for large text) |
| Icon color | Same swatches | The page live | Contrast at the 3:1 non-text floor, both schemes | Review row |
| Background / fill | Surface-role swatches + hue ramp | The page live | Worst contrast of everything sitting on it; edge against the parent ("the fill matches the page") | Review row |
| Padding | Pair lever (X/Y linked, unlink for two); or drag the green bands on the page, snapping to the spacing scale (Alt for one axis) | Green bands with px on the page | Against what it contains: "Tighter than the 8 px gap inside" | Review row |
| Gap | Ramp lever; or drag the hatched bands on the page | Hatched bands with px | Proximity: gap inside a group must stay under the gap between groups | Review row |
| Corners / radius | Ramp: None, XS, SM, MD, LG, Pill | The page live | Nesting: an inner element rounder than its container is flagged | Review row |
| Border width | Ramp: None, 1 to 4 px | The page live | "No edge" when width is None and the fill matches the page | Review row |
| Border color | Line-role swatches | The page live | Edge contrast against the page, both schemes (info, not a gate) | Review row |
| Icon size | Ramp XS to XL; Suggested rung pairs with the adjacent text (≈ 1.25 × its size) | The page live | "Pairs with the 17 px label" | Review row |
| Columns | Ramp 1 to 4 | The page live | Resulting card width | Review row |
| Brand (page) | Hue swatches at step 9 | Whole page re-colours | Button text on the brand fill, both schemes; failing hues dotted | Review row |
| Neutral (page) | Six neutrals | Whole page | Body text contrast | Review row |
| Corners / Density / Type Scale (page) | Three-rung ramps | Whole page | (none yet) | Review row |

Shared across all of them:

- **Scope** is one switch: All N / This One. With All, every peer is outlined on the page.
- **Before**: hold B (or the Before button) to see the page without your changes.
- **Undo / redo** per rung moved.
- **Accept** is the review: one row per change ("Stat Cards · Padding 16 px → 24 px"), each revertible, failing checks shown under the row, comments listed after. Send to Claude writes `design/changes.md` + `changes.json` and copies one prompt.
