# Spoke — project instructions

## What this repo IS

An **Astro spoke of `@esa/ecology`**. It re-skins and composes the hub's `esa-*` web components for one brand/tenant. Its job is to **assemble existing legos**, not to hand-roll bespoke CSS/HTML primitives.

Reinventing a control that an `esa-*` lego already provides is a **bug**: it drifts from the design system, duplicates tested behavior, and rots.

## The non-negotiable lookup order

When ANY UI is needed, walk these tiers **in order**. Stop at the first hit.

1. **Ecology first — the `esa-*` legos.** Live at `~/Dev/ecology/packages/ecology/src/components/` (symlinked here as `node_modules/@esa/ecology`).
   - List the catalog (source of truth — it grows): `ls ~/Dev/ecology/packages/ecology/src/components/`
   - `.astro` lego → `import EsaCard from '@esa/ecology/esa-card.astro';` (frontmatter)
   - `.ts` lego → `import '@esa/ecology/esa-dialog';` in a client `<script>`, then use `<esa-dialog>` in markup.
2. **Beacon next — the prod app.** `~/Dev/Beacon/Beacon.Web/src/app/shared/ui/components/` (Angular `ui-*`) and `~/Dev/Beacon/Beacon.Web/src/scss/`. Port the pattern faithfully (tokens, structure).
3. **Only then a `bcn-` component.** If nothing exists, build a *real, reusable, documented* component prefixed `bcn-` — never a one-off page blob. Token-driven, reusable in isolation.

## Reinvented → use the lego (cautionary)

Illustrative anti-patterns — don't hand-roll the left column; reach for the right.

| Reinvented (don't) | Use instead |
|--------------------|-------------|
| raw `<input>` / `<select>` / styled `<button>` | esa-text-field / esa-select / esa-button |
| a `.foo-modal` / `.foo-sidedrawer` CSS block | esa-dialog / esa-side-dialog |
| a `.foo-dropzone` + uploaded-file rows | esa-file-upload |
| a `.foo-icon-btn` styled icon button | esa-icon-button |
| a `.foo-card` / `.foo-tag` / `.foo-count` badge | esa-card / esa-pill / esa-badge |
| a `.foo-empty` empty state | esa-empty-state |

## Escape hatch — `bcn-lego-checked:`

A **PreToolUse hook** (`.claude/hooks/check-component-first`) **blocks** Write/Edit/MultiEdit that introduces bespoke UI in `.astro`/`.css`/`.scss`. To legitimately proceed (you walked Ecology → Beacon and nothing fits), assert it in the content:

```html
<!-- bcn-lego-checked: no esa- X fits because Y; checked Beacon (Z); bcn-foo is the reusable home -->
```

CSS file: `/* bcn-lego-checked: ... */`. The token is a *claim that you did the lookup* — write a real reason.

## More

- Skill: `.claude/skills/component-first/SKILL.md` (→ `lego-lookup.md`, `bcn-authoring.md`)
- Hook: `.claude/hooks/check-component-first`
