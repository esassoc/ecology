# Brand Extraction — source tokens → ecology semantic re-points

**EXTRACT SEEDS, THEN GENERATE. Do not hand-fill a theme file.**

The job here changed on 2026-08-16. It used to be "read fifty values out of the
source and write fifty declarations", and the record says that did not work: the
one local spoke still ships the template's placeholder grey ramp verbatim, and
**no hand-filled theme has ever declared the eight `--color-content-on-*`
foregrounds** — all eight of which are `fail`-level rows in `check-contrast.mjs`.
That is why `beacon` fails `content-on-brand-secondary` at 3.64:1.

So extract the **seeds** — the handful of things only the source repo knows —
and let `make-theme.mjs` derive the rest and prove it against the gate:

| Seed | What to read out of the source | Default if absent |
|---|---|---|
| `brand` | the primary brand hex, at its SOLID FILL step (see below) | required |
| `neutral` | is the grey warm, cool or neutral? → `warm` / `cool` / `pure` | `pure` |
| `corners` | the control radius → `flat` (0–4px) / `soft` (2–12px) / `round` (4–16px) | `soft` |
| `fontSans`, `fontMono` | the `@font-face` / `$font-*` families | hub defaults |
| `accent`, `ai`, `info`, `success`, `warning`, `danger` | only where the brand genuinely owns one | `derive` |

```bash
node ../ecology/scripts/make-theme.mjs --recipe theme-<slug>.json --out src/styles --force
node ../ecology/scripts/check-contrast.mjs                                   # light
node ../ecology/scripts/check-contrast.mjs src/styles/theme-<slug>.css --scheme dark
```

**Which step is the seed?** The generator puts your hex on **step 9** and
interpolates the rest, so hand it the brand's SOLID FILL — the colour on a
primary button, not the wash behind a selected row and not the darkest tint. A
source ramp named `50…900` usually has it at `500`–`700`; Beacon's teal is the
exception and sits at `900`. Get this wrong and every other step is wrong with it.

**If a value the generator produced is not what the brand uses**, do not edit the
CSS — add it to the recipe's `"pinned"` map. Pins are applied last, survive
regeneration, and (for a fill) drive their own foreground. Editing the CSS instead
means the next regeneration silently reverts it.

If no source repo and no brand colour yet: leave the skeleton's `/* __FILL__ */`
markers in place and tell the user the theme needs a human pass. Say plainly that
the skeleton's eight `--color-content-on-*` slots are the ones that decide whether
the contrast gate passes.

Everything below is still how you find the seeds in a source repo — and how to
hand-fill if you must.

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
section (7), then feed it into `--color-background-brand` / `-subtle` / `-border` /
`--color-background-brand-secondary` in section (1). Skip only if the source ramp is identical to
the hub at every step.

### (b) Neutral / gray chain
Define `--<scope>-gray-*` (section 7), re-point the whole neutral chain
(`--color-text-*`, `--color-border-default*`, `--color-background-default`, `--color-background-elevation-sunken`)
onto it in section (2). This is what warms or cools the entire UI vs the hub.

### (c) Fonts
Set `--typography-font-family-sans` / `--typography-font-family-mono` / `--typography-font-family-display` / `--font-decorative` to the
faces loaded via `__FONT_LINKS__`. Leave a token out to inherit the hub default.

### (d) Feedback + AI — the sneaky one
The hub's SEMANTIC `--color-background-utility-success/warning/info/ai` default to **generic
brights** that often differ from the source's actual button palette *even when the
underlying primitive ramps match*. Re-point each onto the exact color the source's
button renders. Beacon example: `--color-background-utility-success: #2e7571` (a dark teal-green that
sits on no hub ramp, so it terminates in a literal — not the hub's lime `#bdee63`);
`--color-background-utility-info: #228be6` (a standalone azure, not on the blue ramp);
`--color-background-ai: var(--color-blue-9)` (hub default is copper).

Ramp steps are Radix's 1–12 scale — step 9 is the solid fill, 10 its hover, 2 a
subtle surface, 11 coloured text. There is no `-500`/`-700` step; that was an
earlier scale and those names resolve to nothing.

### (e) Control radius
Re-point the tier-2 **`--radius-{xs,sm,md,lg}`** scale if the source runs
flatter or rounder. **Beacon is a flat 4px on every control; the hub defaults
md/lg to 8px** — a very visible delta. Buttons can diverge from fields via
`--button-radius-{xs,sm,md,lg}`, which is the one control axis that keeps a
tier-3 hook (pill buttons beside square inputs is an ordinary house style).

**THERE IS NO CONTROL HEIGHT LEVER, and this section used to claim there was.**
It instructed re-pointing `--form-height-*` and `--form-radius-*`, both of which
were deleted (2026-08-14 and 2026-08-16). A control is now as tall as its padding
plus its own text, because a px height cannot grow with rem text — raise the
browser font size and the box could not follow. Beacon's 24 / 28 / 36 / 44 are
therefore not settable here; if a spoke genuinely needs tighter controls, that is
a `/request-lego`, not a theme override.

Do not re-add either name. A spoke that DECLARES a deleted token gets no error —
the declaration is simply inert — which is exactly how air-exchange ended up
carrying eight of them. `npm run doctor` now fails on that rather than warning.

### (f) `--button-on-warning`
Set to `#fff` if the warning fill is dark enough for white text (Beacon's
`#f2770e` is); leave the hub default (dark text) for a lighter amber.

### Spoke-only tokens (no ecology equivalent)
Status palettes, progress pairs, citation surfaces, step accents, etc. live ONLY
in the theme file as `--<scope>-*`, exposed under the brand's own names if ported
views reference them. See `theme-beacon.css` sections after (7) for examples.

## Review handoff

**The review is still mandatory, and it got shorter.** Present the SEEDS, not the
fifty declarations — a table nobody can check is a table nobody checks. For each
seed state the source value, the recipe key, and whether it was **sourced** (read
from the repo) or **guessed** (a sensible default):

| Seed | Source value | Where it came from | sourced / guessed |
|---|---|---|---|
| `brand` | `$palette-teal-900: #00706b` | `_colors.scss:41` | sourced |
| `neutral` | greys lean slightly warm | `_colors.scss` gray map | guessed |
| `corners` | `$input-border-radius: 4px` | `_form-inputs.scss:12` | sourced |

Then run the generator and **relay its notes verbatim**. They are the interesting
part of the review:

- a `note` line means the generator moved one of ITS OWN fills a step so the text
  on it could reach AA — worth a glance, not a decision;
- a `FAIL` line means it could not, and that is a fact about the brand the user
  needs to hear: this colour cannot carry readable text as a solid fill. The fix
  is theirs (a darker step for filled surfaces, or no text on it), not yours to
  paper over.

Finally show the **pinned vs derived** split — anything in the recipe's `pinned`
map is a human decision overriding the generator, and it should be short and
explicable. A long pin list means the seeds are wrong.
