# Spoke Pre-Commit Review — Full Checklist

Detailed checks, automated greps, the token map, and worked examples. Examples are from `cb-fish-design`; substitute the brand prefix (`--cbf-*`, theme `cb-fish`) for other spokes.

---

## Automated Greps

Run these scoped to changed files where possible. Paths assume repo root. `@esa/tokens` ships its compiled sheet at `node_modules/@esa/tokens/dist/tokens.css`; grep the whole `node_modules/@esa/tokens/` tree to catch component tokens too.

### 1. Does a referenced custom property actually exist?
The highest-value check. Code referencing a token the hub doesn't define renders nothing (CSS drops the declaration).

```bash
# List every --custom-property the diff REFERENCES via var(...)
git diff -U0 HEAD -- '*.astro' '*.css' '*.ts' \
  | grep '^+' | grep -oE 'var\(\s*--[a-z0-9-]+' \
  | grep -oE '\-\-[a-z0-9-]+' | sort -u > /tmp/referenced.txt

# List every --custom-property DEFINED (hub tokens + this spoke's theme file)
{ grep -rhoE '^\s*--[a-z0-9-]+\s*:' node_modules/@esa/tokens/ ;
  grep -rhoE '^\s*--[a-z0-9-]+\s*:' src/styles/ ; } \
  | grep -oE '\-\-[a-z0-9-]+' | sort -u > /tmp/defined.txt

# Anything referenced but never defined = Must-fix
comm -23 /tmp/referenced.txt /tmp/defined.txt
```
Known trap: `var(--radius)` is undefined — ecology ships `--radius-050/100/200/300/400/500/full`. Map `4px`→`--radius-100`, `8px`→`--radius-200`.

Confirm a specific token family before mapping to it:
```bash
grep -rhoE '\-\-color-gray-[0-9]+\s*:\s*#[0-9a-fA-F]+' node_modules/@esa/tokens/ | sort -u
grep -rhoE '\-\-spacing-[0-9]+\s*:\s*[^;]+'           node_modules/@esa/tokens/ | sort -u
grep -rhoE '\-\-radius[a-z0-9-]*\s*:\s*[^;]+'         node_modules/@esa/tokens/ | sort -u
```

### 2. Hardcoded hex colors in changed files
```bash
git diff -U0 HEAD -- '*.astro' '*.css' | grep '^+' | grep -inE '#[0-9a-fA-F]{3,8}\b'
```
Each hit: does it map to a token (→ Should-fix, apply)? Does it appear 2+ times across the diff (→ promote to theme file)? Or is it a genuine one-off (→ Consider, leave with a comment)?

### 3. Hardcoded px radii / spacing where a token exists
```bash
git diff -U0 HEAD -- '*.astro' '*.css' | grep '^+' \
  | grep -inE '(border-radius|gap|margin|padding)\s*:\s*[0-9]+px'
```

### 4. Font weights not loaded
```bash
# Weights the diff USES
git diff -U0 HEAD -- '*.astro' '*.css' | grep '^+' \
  | grep -oE 'font-weight\s*:\s*[0-9]{3}' | grep -oE '[0-9]{3}' | sort -u
# Weights the layout LOADS (the Google Fonts <link>)
grep -oE 'wght@[0-9;]+' src/layouts/BaseLayout.astro
```
Any used weight not in a loaded `wght@...` list = Must-fix (silent faux-bold / fallback). Either add the weight to the link or change the declaration to a loaded weight.

### 5. `border-left` status indicator (banned)
```bash
git diff -U0 HEAD -- '*.astro' '*.css' | grep '^+' \
  | grep -inE 'border-left\s*:\s*[0-9]+px\s+solid'
```

### 6. Sub-16px body text (banned unless genuine meta)
```bash
git diff -U0 HEAD -- '*.astro' '*.css' | grep '^+' \
  | grep -inE 'font-size\s*:\s*(11|12|13|14|15)px'
```
14/15px allowed only for genuine meta (timestamps, keycaps, counts). 11/12/13px on body text = fix. Watch for ornamental labels: uppercase + <14px + `letter-spacing` + light-gray together = banned label styling.

### 7. JS-built DOM scope check
```bash
grep -rln 'is:global' src/                 # which components use global styles
grep -rln 'innerHTML\|createElement\|insertAdjacentHTML' src/  # runtime-rendered DOM
```
A component that builds DOM at runtime AND has a scoped (non-global) `<style>` for that DOM is a bug — the scope hash never lands on runtime nodes. Its styles must be `<style is:global>` with every selector under one root class.

---

## Token Map (worked example: cb-fish)

A spoke's theme re-points should be reviewable against a map like this one
(cb-fish's). Substitute the current spoke's brand prefix and values — the
*shape* of the map is the contract, the values are per-spoke.

Reassigned semantic tokens (what components should read):

| Raw value | Token | Notes |
|-----------|-------|-------|
| `#1e5386` (navy) | `--color-primary` | also `--cbf-blue-700` |
| `#2770b2` | `--color-secondary` | also `--cbf-blue-600` |
| `#f3f7fc` (blue-50) | `--color-primary-subtle` / `--color-surface-sunken` | also `--cbf-blue-50` |
| `#c6dcf1` (blue-200) | `--color-primary-border` | also `--cbf-blue-200` |
| `#13273e` (blue-950) | `--color-surface-inverse` | also `--cbf-blue-950` |
| `#dcdcdc` | `--color-border` | |
| `#7c7c7c` | `--color-text-muted` | |
| neutral grays | `--color-gray-*` | confirm exact step via grep |
| IBM Plex Sans | `--font-sans` | |
| IBM Plex Sans Condensed | `--font-display` | |
| `4px` radius | `--radius-100` | |
| `8px` radius | `--radius-200` | |
| spacing steps | `--spacing-*` | `40px`→`--spacing-650`, `64px`→`--spacing-800` |

### Token-tier rules (spoke contract)
- **Primitives never move.** To change a brand color, re-point the consuming SEMANTIC token in `theme-<brand>.css`, never edit the primitive.
- **`--cbf-*` raw-ramp tokens live ONLY in `theme-<brand>.css`.** They feed the ecology tokens above; components never read `--cbf-*` directly.
- **A value that's really a gap in an ecology scale gets PROMOTED to the hub**, not pinned in the spoke (e.g. the old `--cbf-chrome-gap: 40px` became `--spacing-650`).
- Recurring hardcoded chrome (2+ uses) → promote to a `--cbf-*` or reassigned semantic token. Examples seen: `#f8f8f4` (gold/50), `#534c3b` (gold/900), `#f5f5f5` (section-header gray), `#13273e` (blue-950).
- A genuine one-off (e.g. a single overlay `rgba(...)`) may stay inline with a comment.

---

## Worked Examples

### Must-fix: undefined token
```css
/* BEFORE */ .card { border-radius: var(--radius); }
/* AFTER  */ .card { border-radius: var(--radius-200); }  /* 8px */
```
`--radius` is undefined in `@esa/tokens`; the declaration was silently dropped.

### Must-fix: font weight not loaded
```css
/* component overrides --font-sans to IBM Plex Sans Condensed, then: */
.stat { font-weight: 500; }
```
But `BaseLayout.astro` requested `IBM+Plex+Sans+Condensed:wght@400;600`. Fix: add `500` to the link (`wght@400;500;600`) or change to a loaded weight. Faux-bolding is invisible in code review — only the grep cross-check catches it.

### Should-fix: hardcoded value with a token
```css
/* BEFORE */ .pill { background: #f3f7fc; border: 1px solid #c6dcf1; }
/* AFTER  */ .pill { background: var(--color-primary-subtle);
                     border: 1px solid var(--color-primary-border); }
```

### Should-fix: promote recurring chrome
`#13273e` appears in two components. Don't inline it twice — it's already `--cbf-blue-950` feeding `--color-surface-inverse`. Re-point usage to `var(--color-surface-inverse)`.

### Should-fix: DRY render logic
Command-palette results and `/search` page both render result rows. Extract to `omni-render.ts`; both surfaces import it. Per-surface visual differences go in a CSS scope boundary (`.cbf-search-surface ...` global block), not forked markup.

### Consider (surface, don't auto-apply)
- A single `rgba(0,0,0,.4)` modal overlay — fine to leave inline with a comment, or promote if it recurs. Ask.
- A 30px value that's near `--spacing-600` (32px) but not exact — snap to token, or add a spoke token, or leave? Judgment call.
- `dam-illustration.jpg` in both `specimens/assets/` and `public/` — the specimen copy is the source-of-truth specimen; the `public/` copy is the shipped app asset. Likely intentional. Confirm before deleting either.

---

## Quality Gates

```bash
npx astro build                 # must pass
npx tsc --noEmit                # strict (astro/tsconfigs/strict) — REQUIRED separately
```

**Plugin freshness**: this skill, the component-first skill, and the
enforcement hook all come from the `spoke-kit` plugin (ecology marketplace).
If the hub changed recently, refresh before trusting the review:
`claude plugin marketplace update ecology` (or the `/plugin` UI). A stale
plugin re-creates the copy-drift problem this architecture replaced.
The Astro build uses esbuild, which strips TypeScript types without checking them, so type errors will NOT fail `astro build`. Always run `tsc --noEmit` on the changed `.ts` modules. Then load the changed pages and confirm no console errors.

Report the gate results at the end of the review (green, or remaining errors with file:line).
