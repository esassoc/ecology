# Brand Extraction — source tokens → ecology semantic re-points

**Step zero that's always skipped.** If a SOURCE app repo is given (the real
product the spoke mirrors, e.g. `~/Dev/Beacon`), READ its
design tokens, DRAFT the `theme-<slug>.css` re-points, and **SURFACE for human
review — never silently apply.** Flag every value as *sourced* vs *guessed*.

If no source repo: leave the theme skeleton's `/* __FILL__ */` markers in place
and tell the user the theme needs a human pass.

## Where to read in the source (SCSS / theme files)

Beacon stores brand tokens under `Beacon.Web/src/scss/variables/`. Generalize the
hunt to any source stack:

| What to extract | Beacon source file | Look for |
|---|---|---|
| Brand color ramp | `_colors.scss` | `$palette` teal/brand map |
| Neutral / gray chain | `_colors.scss` | `$palette` gray map |
| Semantic feedback (success/warning/info) | `_colors.scss`, `ui-button.scss` | `$button-colors`, `$info` |
| Fonts | `_webfonts.scss` | `@font-face`, `$font-*` families |
| Form sizing | `_form-inputs.scss` | `$input-height-*` |
| Control radius | `_radii.scss`, `_form-inputs.scss` | `$radius-*`, `$input-border-radius` |

For a non-SCSS source, the equivalents are CSS custom-property theme files,
`tailwind.config` token objects, or a Figma token export.

## Radix 12-step scale — which step for what

The hub's primitives are **Radix color scales** (`--color-<hue>-1` … `-12`), and
every semantic token maps onto a step whose meaning is fixed by Radix's own spec.
**Author this spoke's raw ramps (`--<scope>-brand-*`, `--<scope>-gray-*`) as full
12-step Radix scales** — never a Tailwind 50–900 ramp — so the re-points below are
a mechanical 1:1 step mapping. Generate a scale from one brand hex + one neutral at
<https://www.radix-ui.com/colors/custom> (it emits 12 steps + alpha + P3).

| Step | Radix role | Typical semantic re-point |
|------|-----------|---------------------------|
| **1** | App background | `--color-background` (or gray-2) |
| **2** | Subtle background | `--color-primary-subtle`, `--color-background` |
| **3** | Component bg — normal | `--color-primary-bg`, `--color-surface-sunken` |
| **4** | Component bg — hover | `--color-primary-bg-hover` |
| **5** | Component bg — pressed/selected | selected-row / active washes |
| **6** | Subtle border, separator | `--color-primary-border`, `--color-border-light` |
| **7** | UI element border, focus ring | `--color-border` |
| **8** | Strong border, hovered UI border | `--color-border-strong`, secondary fill |
| **9** | **Solid fill** (the purest, most-saturated step) | `--color-primary`, `--color-success/warning/info/ai` |
| **10** | Solid fill — hover | `--color-primary-hover` / `-active` |
| **11** | Low-contrast text on surface | `--color-primary-strong`, `--color-text-secondary` |
| **12** | High-contrast text | `--color-text-primary`, on-fill text for bright fills |

Bright hues (Radix Lime, Yellow, Amber, Sky, Mint) have a *light* step 9 — white
text fails on their fill, so those need **dark** on-fill text (step 12). Check
contrast whenever a fill uses one of those scales.

**Author every ramp P3-first with a hex fallback — never hex-only.** The hub
ships each primitive as a hex value on `:root` plus a `color(display-p3 …)`
override inside `@media (color-gamut: p3)`; capable displays get the vivid P3,
everyone else falls back to hex. A spoke's raw ramps must do the same. The Radix
custom-palette tool and Radix's stock scales BOTH output the sRGB (hex) and P3
versions — take both: paste hex into the `[data-theme]` block (section 7 of the
theme skeleton) and the matching `color(display-p3 …)` into the
`@media (color-gamut: p3)` block (section 8). Keep the two in lockstep — every
`--<scope>-*` step needs its P3 twin. Shipping a ramp as hex-only is a bug the
pre-commit review flags (Check 8).

## The mapping — what to re-point in `theme-<slug>.css`

Work the theme skeleton's seven sections. Map source → ecology semantic token:

### (a) Brand PRIMITIVE ramp (if it diverges)
Many brands ship a ramp that matches the hub's generic ramp at only one step
(often just the solid fill, **step 9**) — every other tint a component shows
(`primary-subtle` = step 2, `primary-border` = step 6, `secondary` = step 8) will
render off-brand unless it comes from the spoke's own ramp. So: author the raw
`--<scope>-brand-*` ramp as a 12-step Radix scale in section (7), then feed it
step-for-step into `--color-primary` (9) / `-hover` (10) / `-subtle` (2) /
`-bg` (3) / `-border` (6) / `-strong` (11) / `--color-secondary` (8) in section
(1). Skip only if the source ramp is identical to the hub at every step.

### (b) Neutral / gray chain
Define `--<scope>-gray-*` (section 7), re-point the whole neutral chain
(`--color-text-*`, `--color-border*`, `--color-background`, `--color-surface-sunken`)
onto it in section (2). This is what warms or cools the entire UI vs the hub.

### (c) Fonts
Set `--font-sans` / `--font-mono` / `--font-display` / `--font-decorative` to the
faces loaded via `__FONT_LINKS__`. Leave a token out to inherit the hub default.

### (d) Feedback + AI — the sneaky one
The hub's SEMANTIC `--color-success/warning/info/ai` default to **generic
brights** that often differ from the source's actual button palette *even when the
underlying primitive ramps match*. Re-point each onto the exact color the source's
button renders — using the **fill step (9)** of the matching hub hue, or a literal
when the source color isn't on a hub ramp. Examples:
`--color-success: var(--color-green-9)`; `--color-ai: var(--color-blue-9)`
(hub default is copper); `--color-info: #228be6` (a standalone azure that isn't on
the hub blue ramp, so a literal). Grab the fill from step 9 and, if the source also
tints hover, step 10 (`--color-ai-hover: var(--color-blue-10)`).

### (e) Form sizing + control radius
Re-point `--form-height-{xs,sm,md,lg}` and `--form-radius-{xs,sm,md,lg}` if the
source runs more compact or flatter. **Beacon is a flat 4px (`--radius-100`) on
every control; the hub defaults md/lg to 8px** — a very visible delta. Beacon
heights: 24 / 28 / 36 / 44.

### (f) `--button-on-warning`
Set to `#fff` if the warning fill is dark enough for white text (Beacon's
`#f2770e` is); leave the hub default (dark text) for a lighter amber.

### Spoke-only tokens (no ecology equivalent)
Status palettes, progress pairs, citation surfaces, step accents, etc. live ONLY
in the theme file as `--<scope>-*`, exposed under the brand's own names if ported
views reference them. See `theme-beacon.css` sections after (7) for examples.

## Review handoff

Present the drafted theme as a diff/table to the user before writing the final
file. For each value, state: the source value, the ecology token it maps to, and
whether it was **sourced** (read from the repo) or **guessed** (sensible default).
Address the (a)/(d)/(e)/(f) deltas explicitly — those are the ones that read
"off-brand" when missed.
