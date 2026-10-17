# Surface Recipe

The three chrome surfaces (top bar, sidenav, canvas) **share the same hue and
saturation; only lightness shifts, by one or two points** (HSL lightness).

The code is `src/surfaces.ts`: one shared hue and saturation, a base
lightness (the canvas), and a lightness offset per surface. The palettes, the
generator and the panel's readout all read the same `RECIPE` bands there.

## The Rule in Numbers

Offsets are HSL lightness points from the canvas. Negative is darker.

### Light

| Measure | Too close reads flat | Band | Too far reads heavy | Beacon | PS Info | Generated |
|---|---|---|---|---|---|---|
| Canvas lightness | above 99.5 (reads stark white) | 96 to 99.5 | below 96 (drifts toward mid-gray) | 98.0 | 98.0 | 98.0 |
| Sidenav offset | above 0 (lighter than the canvas) | −2.5 to 0 | below −2.5 | 0 | −2.4 | −1.5 |
| Top bar offset | above −2.5 | −6 to −2.5 | below −6 | −4.3 | −4.5 | −4.5 |
| Top bar below sidenav | under 1.5 | at least 1.5 | (held by the bar band) | 4.3 | 2.2 | 3.0 |
| Tint (OKLCH chroma, any surface) | (floor 0) | 0 to 0.012 | above 0.012 (too much tint) | 0 | 0.008 | 0.001 to 0.008 |
| Mid-gray | | every surface above L 90 | any surface below L 90 | 93.7 | 93.5 | 93.5 |

### Dark

| Measure | Too close reads flat | Band | Too far reads heavy | Generated |
|---|---|---|---|---|
| Canvas lightness | below 8 (reads black) | 8 to 14 | above 14 (drifts toward mid-gray) | 12 |
| Sidenav offset | above −0.5 | −3 to −0.5 | below −3 | −2 |
| Top bar offset | above −2 | −5 to −2 | below −5 | −4 |
| Top bar below sidenav | under 1 | at least 1 | (held by the bar band) | 2 |
| Tint (OKLCH chroma, any surface) | (floor 0) | 0 to 0.012 | above 0.012 | 0 to 0.011 |
| Mid-gray | | every surface below L 22 | any surface above L 22 | 12 |

In dark, nothing equals anything else: the sidenav band stops at −0.5.

### Hue and Saturation

- One hue and one saturation for all three. Surfaces "match" when they render
  the same to within one 8-bit step per channel. Near white, HSL saturation
  swings widely for an invisible difference, so a literal equality test fails
  on rounding alone (PS Info, below).
- Saturation means different amounts of color at different lightness. HSL
  chroma is S × (1 − |2L − 1|), so the same S tints the bar (L 93.5) about three
  times as hard as the canvas (L 98), and tints near-black five times as hard
  as near-white. That is why the bar carries the visible tint, and why dark
  needs its own, lower S.
- The generator sets dark S so the dark canvas carries the tint the light top
  bar does: `S_dark = S_light × room(93.5) / room(12)`, where
  `room(L) = 1 − |2L − 1|`.

### Borders and Brand

- A hairline border separates the sidenav from the canvas and the top bar from
  everything below it, in both references. It carries the edge when the
  sidenav sits on the canvas (Beacon) or a point or two below it.
- Brand color goes only on the active nav item and primary actions, never on a
  surface.

## Calibration

Andy's one-to-two point step, against Beacon and PS Info:

- **Sidenav vs canvas: holds.** Beacon 0 (with a border), PS Info −2.4. Andy's
  past feedback sets both edges: "Rail is too light. Drop the sunken idea. Light
  gray with a light gray border is fine" (no lighter than the canvas; a border
  is enough) and "The records rail is too dark" (no deeper than about −2.5).
- **Card vs canvas: holds, upward.** Beacon +0.8 (the hub's raised surface,
  #fcfcfc), PS Info +2.0 (white). Cards sit a point or two lighter than the
  canvas.
- **Top bar: does not hold.** Both bars sit about 4.5 points below the canvas,
  two to three of Andy's steps. The bar is the one deliberate darker neutral
  (artifact-kit rule); the band is −6 to −2.5. Below −2.5 it merges with the
  sidenav; past −6 it reads as a gray slab ("don't like the midgray
  sidebar... looks so blah").
- **Same hue and saturation: holds.** Beacon is pure neutral (S 0 on all
  three). PS Info reads H 210, 210, 213 and S 40, 27, 27, but the canvas's S 40
  is one unit of 8-bit rounding: at S 27 it renders #f9fafb against the
  measured #f8fafc. All three match within one step per channel.
- **Chroma floor is 0, not "low but not zero".** Beacon is pure gray and has to
  pass, so the floor is zero. What keeps a surface from looking flat is the
  lightness ramp and the mid-gray limit, not a minimum tint.

## Measured

Neither Beacon nor PS Info ships a dark scheme: every surface is a fixed hex in
the light theme, with no `[data-scheme="dark"]` block. Radial's defaults take
Beacon's light values and the generator's dark ones, and the Beacon and PS Info palettes take their dark
ramps from the generator, using each one's hue and saturation.

Sources: `beacon-design/src/styles/theme-beacon.css` (the `--bcn-gray-*` ramp)
and `src/layouts/AppShell.astro` (`.topbar` gray-100 with a gray-300 bottom
border, `.side-nav` gray-50 with a gray-200 right border, main gray-50; cards
read `--color-background-elevation-raised`, the hub's gray-1).
`ps-info-design/src/styles/theme-ps-info.css` (`--ps-info-app-surface`,
`--ps-info-rail-bg`, `--ps-info-bar-bg`, `--color-surface`) and
`src/layouts/PsInfoAppShell.astro` (bar border `--color-border-strong`, rail
border `--color-border`).

### Beacon, light

| Surface | Hex | HSL | OKLCH | ΔL (HSL) | ΔL (OKLCH) |
|---|---|---|---|---|---|
| Top bar | #efefef | 0 0% 93.73% | 95.21% 0 — | −4.31 | −3.30 |
| Sidenav | #fafafa | 0 0% 98.04% | 98.51% 0 — | 0 | 0 |
| Canvas | #fafafa | 0 0% 98.04% | 98.51% 0 — | 0 | 0 |
| Card | #fcfcfc | 0 0% 98.82% | 99.11% 0 — | +0.78 | +0.60 |
| Top bar border | #bdbdbd | 0 0% 74.12% | 79.84% 0 — | −23.92 | −18.67 |
| Sidenav border | #dcdcdc | 0 0% 86.27% | 89.45% 0 — | −11.76 | −9.06 |

### PS Info, light

| Surface | Hex | HSL | OKLCH | ΔL (HSL) | ΔL (OKLCH) |
|---|---|---|---|---|---|
| Top bar | #eaeef3 | 213.3 27.3% 93.53% | 94.75% 0.0080 253.9 | −4.51 | −3.66 |
| Sidenav | #f1f4f7 | 210 27.3% 95.69% | 96.57% 0.0051 247.9 | −2.35 | −1.84 |
| Canvas | #f8fafc | 210 40% 98.04% | 98.42% 0.0034 247.9 | 0 | 0 |
| Card | #ffffff | 0 0% 100% | 100% 0 — | +1.96 | +1.58 |
| Top bar border | #c4ccd4 | 210 15.7% 80.00% | 84.14% 0.0142 248.0 | −18.04 | −14.27 |
| Sidenav border | #dfe4e9 | 210 18.5% 89.41% | 91.65% 0.0087 247.9 | −8.63 | −6.77 |

Hue shift across the three: 3.3 degrees (bar to canvas). OKLCH chroma rises
from canvas to bar (0.0034, 0.0051, 0.0080) at a constant OKLCH hue of about
248 to 254: the constant-S ramp at work.

### Radial today

Radial's defaults are Beacon's (theme-app.css, 2026-10-16): light as measured,
dark from the generator at Beacon's hue and saturation (pure neutral).

| Surface | Light | ΔL | Dark | ΔL |
|---|---|---|---|---|
| Top bar | #efefef (93.73%) | −4.31 | #141414 (7.84%) | −4.31 |
| Sidenav | #fafafa (98.04%) | 0 | #1a1a1a (10.20%) | −1.96 |
| Canvas | #fafafa (98.04%) | 0 | #1f1f1f (12.16%) | 0 |
| Card | #fcfcfc (98.82%) | +0.78 | #252525 (14.51%) | +2.35 |

Both modes are on recipe. (Before, dark was off: its top bar sat lighter than
the canvas and its card below it.)

## Palettes

Whole themes, in `src/palettes.ts`: each sets, per mode, the top bar,
sidenav, canvas, card, sunken, hover, three border strengths, two inks and the
brand roles (fill, hover, on-fill text, muted fill, brand text, focus ring).
The tech-forward set and Ecology Today are read from `src/presets.json`
as given. A brand color is not automatically a button color: Ink, Geist and
Zinc button in near-black, so `primary` is the primary-action fill and
`accentText` and `accentMuted` are the brand-tinted text and fills.

The recipe column grades each palette's chrome against the bands above, as
given. The panel shows the same flags (a dot on the card, the list in the
readout); nothing is corrected except where noted below.

| Group | Palette | Light bar, sidenav, canvas | Light primary | Dark bar, sidenav, canvas | Dark primary | Recipe, light | Recipe, dark |
|---|---|---|---|---|---|---|---|
| Ecology Directions | Ecology Today | #f0f0f0 #fcfcfc #fcfcfc | #46a758 | #070707 #111111 #111111 | #46a758 | on recipe | canvas black, rail flat |
| Ecology Directions | Ink | #f2f0ec #fbfaf8 #fbfaf8 | #1d1b18 | #100f0e #151413 #151413 | #eeebe6 | on recipe | canvas black, rail flat |
| Ecology Directions | Slate | #eef2f6 #f8fafc #f8fafc | #2f5bd3 | #0b0f14 #0f141a #0f141a | #5b84f0 | on recipe | rail flat, tint |
| Ecology Directions | Forest | #f1efe9 #faf9f6 #faf9f6 | #2f5d46 | #0e100d #131512 #131512 | #5f9c7c | on recipe | canvas black, rail flat |
| References | Beacon | #efefef #fafafa #fafafa | #005862 | #141414 #1a1a1a #1f1f1f | #249ba8 | on recipe | on recipe |
| References | PS Info | #eaeef3 #f1f4f7 #f8fafc | #0a3b5c | #111417 #16191d #1a1e23 | #2473a8 | on recipe | on recipe |
| Tech-Forward | Geist (Vercel-like) | #ffffff #ffffff #ffffff | #171717 | #000000 #000000 #000000 | #ededed | canvas stark white, bar flat, bar near rail | canvas black, bar flat, rail flat, bar near rail |
| Tech-Forward | Linear (Linear-like) | #f4f5f8 #fcfcfd #fcfcfd | #5e6ad2 | #0b0c0d #0f1011 #0f1011 | #5e6ad2 | on recipe | canvas black, bar flat, rail flat |
| Tech-Forward | Supabase (Supabase-like) | #f8f8f8 #fcfcfc #fcfcfc | #3ecf8e | #0f0f0f #121212 #121212 | #3ecf8e | bar flat | canvas black, bar flat, rail flat |
| Tech-Forward | Stripe (Stripe-like) | #ffffff #f6f8fa #f6f8fa | #635bff | #0a0e14 #0d1117 #0d1117 | #7a73ff | bar flat, bar near rail, rail own H/S, canvas own H/S | canvas black, bar flat, rail flat, tint |
| Tech-Forward | Primer (GitHub-like) | #f6f8fa #ffffff #ffffff | #1f883d | #010409 #0d1117 #0d1117 | #238636 | canvas stark white | canvas black, bar heavy, rail flat, rail own H/S, canvas own H/S, tint |
| Tech-Forward | Raycast (Raycast-like) | #f3f3f3 #fbfbfb #fbfbfb | #ff6363 | #0b0b0b #101010 #101010 | #ff6363 | on recipe | canvas black, rail flat |
| Tech-Forward | Notion (Notion-like) | #fbfbfa #ffffff #ffffff | #2383e2 | #151515 #191919 #191919 | #2383e2 | canvas stark white, bar flat | bar flat, rail flat |
| Tech-Forward | Zinc (shadcn/ui-like) | #fafafa #ffffff #ffffff | #18181b | #050506 #09090b #09090b | #fafafa | canvas stark white, bar flat | canvas black, bar flat, rail flat |
| Tech-Forward | Clerk (Clerk/Resend-like) | #f6f6f8 #fafafb #fafafb | #6c47ff | #0a0a0d #0e0e11 #0e0e11 | #7c5cff | bar flat, bar near rail | canvas black, bar flat, rail flat |
| Tech-Forward | Atlassian (Atlassian-like) | #ffffff #ffffff #ffffff | #0c66e4 | #161a1d #1d2125 #1d2125 | #579dff | canvas stark white, bar flat, bar near rail | rail flat |

Where values are derived rather than given:

- **Ecology Directions** set the sidenav and canvas from one default surface and
  the top bar from sunken. Ecology Today's dark sunken (#0d0d0f) sits −1.2 below
  the default, outside the bar band, so its dark top bar takes the recipe's −4
  at the default's hue: #070707. Every other direction's sunken sits in band.
  Ink, Slate and Forest are given no on-fill text or focus ring: on-fill is
  whichever of white, the text or the default contrasts most with the brand,
  and the ring is the brand text where it clears 3:1 on canvas, card and
  sunken (it does in all three). Ecology Today takes every value from presets.json
  except its brand text, which is Andy's own from his Palette Options page
  (#2a7e3b light, #71d083 dark; presets.json has #203c25 and #c2f0c2).
- **References** are measured in light (beacon-design `theme-beacon.css`,
  ps-info-design `theme-ps-info.css`). Beacon leaves hover, on-fill and the
  ring to the hub (gray-4 #e8e8e8, white, its brand fill). PS Info's hover is
  its shell's 7% primary wash flattened on the rail (#e1e7ec); its ring is
  orange-600, 2.9:1 on its canvas. Dark comes from the generator at each light
  ramp's hue and saturation, with the rest at fixed lightness on that hue:
  card +2.5, hover +8, borders L 24 / 20 / 30, text L 93 and 71, and the brand
  at its own hue, S at most 65, L 40 fill, 46 hover, 72 text, 15 muted.
- **Every palette** derives the secondary button's hover: a tenth of the way
  from the muted fill to the brand text.
