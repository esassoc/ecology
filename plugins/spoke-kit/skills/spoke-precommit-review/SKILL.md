---
name: spoke-precommit-review
description: Pre-commit / pre-PR review for ESA ecology hub-and-spoke design-system projects (e.g. cb-fish-design, an Astro brand spoke of @esa/ecology). Use when about to commit, open a PR, or asked for a "pre-commit review", "review before committing", or "ready to commit" in an ecology-spoke repo. Reviews the working diff for token usage, type contract, component decomposition, CSS conventions, asset hygiene, and quality gates; reports findings by severity and applies the safe fixes.
---

# Spoke Pre-Commit Review

## Purpose
Review the working diff of an ESA ecology **spoke** (a brand-specific Astro app that re-skins the `@esa/ecology` hub via a `[data-theme]` block) before commit/PR. Catches the failure modes that recur in this model: undefined tokens, hardcoded values that have a token, font weights that aren't loaded, duplicated render logic, JS-built DOM that can't carry Astro's scope hash, and asset dupes. **Report by severity; apply Must-fix and clear Should-fix automatically; surface Consider items.**

## When this applies
A repo is an ecology spoke when `package.json` depends on `@esa/ecology` + `@esa/tokens` (usually `file:../ecology/...`) and ships a `src/styles/theme-<brand>.css` with a `[data-theme="<brand>"]` block. Identify the current spoke's brand prefix from its theme file (e.g. cb-fish uses `--cbf-*`, beacon uses `--bcn-*`) and substitute it throughout — the checklist's worked examples use cb-fish values.

## Review Flow

1. **Scope to the diff.** `git status` + `git diff` (unstaged) + `git diff --cached` (staged). Review only what is changing. Note new/deleted files.
2. **Run the automated greps** (see `checklist.md` → "Automated Greps"). These find: undefined custom properties, bare `var(--radius)`, hardcoded hex/px that maps to a token, font weights not in the loaded `<link>`, `border-left` status colors, sub-16px font sizes.
3. **Categorize every finding** into one of three buckets (below).
4. **Apply** all Must-fix and clear Should-fix edits directly. **List** Consider items for the user — do not auto-apply judgment calls.
5. **Re-run the gates** after editing: `npx astro build`, then `npx tsc --noEmit` on changed `.ts` modules. Report green (or the remaining errors).

## Severity Buckets

| Bucket | Auto-apply? | What lands here |
|--------|-------------|-----------------|
| **Must-fix** | Yes | Undefined/broken token (`var(--radius)` — ecology ships `--radius-050/100/200/...`, not `--radius`), `tsc` errors, `astro build` failure, font-weight used but not loaded |
| **Should-fix** | Yes (when mapping is unambiguous) | Hardcoded value with an exact existing token; a chrome value appearing 2+ times that should be promoted to `theme-<brand>.css`; copy-pasted render logic that belongs in a shared `.ts` |
| **Consider** | No — list only | Whether a one-off rgba stays inline; whether a near-match value should snap to a token or get a new spoke token; component-split judgment calls; intentional vs accidental asset dupes |

## The Six Checks (summary — full detail + greps in `checklist.md`)

1. **Ecology token usage** — map raw hex/px to semantic tokens (`#1e5386`→`--color-primary`, `#f3f7fc`→`--color-primary-subtle`, IBM Plex→`--font-sans`/`--font-display`, spacing→`--spacing-*`, radius→`--radius-100`/`--radius-200`). **Verify every referenced custom property actually exists** by grepping `node_modules/@esa/tokens/`. Recurring chrome values (2+ uses) → promote to `theme-<brand>.css` as `--cbf-*` or a reassigned semantic token. Primitives never move — re-point the consuming semantic token. `--cbf-*` raw-ramp tokens live ONLY in the theme file; components never read them directly.
2. **Type contract** — when a component overrides `--font-sans`/`--font-display`, every `font-weight` it uses must be in the Google Fonts `<link>` request in `BaseLayout.astro`. (Real bug: `font-weight: 500` used, link requested only `400;600` → silent faux-bold.)
3. **Legos / decomposition** — Primitive → Wrapper → Container tiers; small + composable. Shared logic extracted to `.ts` (e.g. `omni-render.ts` feeds both the command palette and `/search`), not duplicated. Reuse hub `esa-*` bricks; build new `cbf-*` only when no hub equivalent. Flag monoliths and copy-pasted render logic.
4. **CSS conventions** — each `.astro` carries a scoped `<style>`. JS-built (runtime) DOM can't get Astro's scope hash, so its CSS must be `<style is:global>` with every selector prefixed by one root class (e.g. `.cbf-search-surface ...`). No Tailwind. Divergence between two surfaces sharing one renderer belongs in a CSS scope boundary, not forked markup.
5. **User global prefs** — 16px base min (no `font-size: 11/12/13px` except genuine meta: timestamps, keycaps, counts); no ornamental section labels (uppercase + <14px + letter-spaced + light-gray); no `border-left: Npx solid <color>` as a status indicator; TypeScript types-first.
6. **Asset hygiene** — assets referenced from `.astro`/built pages live in `public/` with absolute paths. Flag duplicated assets; note whether a dupe is intentional (specimen source-of-truth in `specimens/assets/` vs shipped `public/` copy) or accidental.

## Quality Gates (must report)
- `npx astro build` passes.
- `npx tsc --noEmit` (strict; `astro/tsconfigs/strict`) clean on changed `.ts`. **The build uses esbuild, which strips types — type errors will NOT fail the build, so a separate tsc check is required.**
- No console errors when the changed pages load.

## Output Shape
Report grouped by bucket. For each finding: `file:line` → what's wrong → the fix. State which edits you applied and which you left for the user. End with the gate results.

## Documentation
- [Full checklist, automated greps, token map, examples](checklist.md)
