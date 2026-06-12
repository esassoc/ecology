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

## The mapping — what to re-point in `theme-<slug>.css`

Work the theme skeleton's seven sections. Map source → ecology semantic token:

### (a) Brand PRIMITIVE ramp (if it diverges)
Many brands ship a ramp that matches the hub's generic ramp at only one step.
**Beacon's teal matches the hub only at 900** — every other tint a component shows
(`primary-subtle`, `primary-border`, `secondary`) must come from Beacon's own
ramp or it renders off-brand. So: define the raw `--<scope>-brand-*` ramp in
section (7), then feed it into `--color-primary` / `-subtle` / `-border` /
`--color-secondary` in section (1). Skip only if the source ramp is identical to
the hub at every step.

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
button renders. Beacon example: `--color-success: var(--color-green-700)`
(`#2e7571`, not the hub's `#22c55e`); `--color-info: #228be6` (a standalone azure,
not on the blue ramp); `--color-ai: var(--color-blue-500)` (hub default is copper).

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
