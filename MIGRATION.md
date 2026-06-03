# Ecology → Astro Migration Brief

You are migrating ONE entry point of the Angular `@esa/ecology` library into the
Astro hub. Read this entire file before writing code. Every agent follows it
identically so the 50-component result is consistent.

## Source & target

- **Source (Angular, read-only):** `/Users/andrewlovseth/Dev/ecology/packages/ecology/<entry-point>/src/...`
- **Target components:** `/Users/andrewlovseth/Dev/ecology-hub/packages/ecology/src/components/`
- **Target specimen pages:** `/Users/andrewlovseth/Dev/ecology-hub/apps/site/src/pages/components/`

For each Angular component, read its `.component.ts`, `.component.html` (if any),
and `.component.scss` for full fidelity. Preserve inputs, variants, sizes, states,
and visual styling faithfully.

## The two buckets — decide per component

**Heuristic:** does the component need JS at runtime — internal state, keyboard
handling, focus management, open/close, positioning, or a form value? 
→ **Lit Web Component.** Otherwise → **`.astro`**.

### Bucket A — Presentational → `.astro`
Pattern to copy EXACTLY: `packages/ecology/src/components/esa-badge.astro`
- Frontmatter `interface Props` (typed), destructure with defaults.
- Build a class string from variant/size/boolean props.
- Scoped `<style>` using private `--_*` tokens that read public tokens with literal
  fallbacks (mirrors the Angular SCSS convention).
- Angular `host: { '[class.x]': ... }` → entries in the class list.
- Angular `@if` → `{cond && <.../>}`.

### Bucket B — Interactive → Lit Web Component (`.ts`)
Pattern to copy EXACTLY: `packages/ecology/src/components/esa-switch-toggle.ts`
- **Decorator-free** Lit (`static properties` + `declare` fields + constructor defaults).
  Do NOT use `@customElement`/`@property` decorators.
- Reflect variant/size/boolean attributes you select on with `:host([attr])`.
- Scoped `static styles = css\`...\`` using `--_*` private tokens + public-token
  fallbacks. CSS custom properties inherit through shadow DOM, so theming works.
- **Form controls** (anything that was a `ControlValueAccessor`: text-field, textarea,
  select, combobox, checkbox, radio-group, date-picker, range-slider, color-picker,
  file-upload) MUST be form-associated: `static formAssociated = true`,
  `this.internals = this.attachInternals()`, `this.internals.setFormValue(...)` on
  change, and dispatch a bubbling/composed `change` CustomEvent.
- Keyboard handling: preserve the Angular component's key logic (Space/Enter/Arrows/Esc).
- Overlays (dialog, popover, tooltip, dropdown, command-palette): position with plain
  CSS/JS. Do NOT pull in Angular CDK. Trap focus for modal dialogs.
- End the file with a self-register guard:
  ```ts
  if (!customElements.get('esa-name')) customElements.define('esa-name', EsaName);
  ```

## Conventions (both buckets)

- Keep the `esa-` selector/name and the existing component file basename.
- Sizes are full words: `small | medium | large` (`type EsaSize = 'small'|'medium'|'large'`).
- Use ONLY token names that exist in `packages/tokens/dist/tokens.css` (read it) and the
  type utility classes in `packages/tokens/src/type-roles.css`. Common ones:
  `--color-primary`, `--color-secondary`, `--color-accent`, `--color-surface`,
  `--color-surface-sunken`, `--color-border`, `--color-text-primary`,
  `--color-text-muted`, `--color-text-inverse`, `--color-success|warning|danger|info`,
  `--spacing-{050..1000}`, `--radius-{050..500,full}`, `--type-size-{050..1000}`,
  `--font-sans`, `--font-mono`, `--font-weight-{light..bold}`,
  `--line-height-{tight,normal,relaxed}`, `--shadow-{50..400}`,
  `--transition-{fast,base,slow}`, `--z-{dropdown..tooltip}`, `--focus-ring-*`,
  `--icon-size-{small,medium,large}`. ALWAYS include a literal fallback in `var(...)`.
- Icons: the source uses `lucide-angular`. In Astro/Lit, inline the needed Lucide SVG
  (copy the path from lucide.dev) rather than adding an icon dependency. Keep it simple.

## Per-component specimen page

For every component you migrate, create
`apps/site/src/pages/components/<name>.astro` using `BaseLayout` + `Stack`. Show all
variants, sizes, and key states. For Lit components, register them with a local script:
```astro
<script>import '@esa/ecology/<name>';</script>
```
Use UNIQUE filenames (one per component) — never edit another component's page.

## Do NOT

- Do NOT edit `package.json` (wildcard exports already resolve every file).
- Do NOT edit `apps/site/src/pages/index.astro` or any file outside your component
  list and its specimen pages (avoids collisions with other agents).
- Do NOT add dependencies beyond `lit` (already installed).
- Do NOT reimplement third-party wrappers (grid, map, rich-text-editor) as functional —
  those are reference pages only (see the data/maps/editors assignment).

## Verify before finishing

Do NOT run `npm run build` — other agents are building concurrently and would race on
the shared `dist/`/`.astro` caches. Instead, self-check by re-reading each file you
wrote against the golden pattern and confirming: typed Props/properties, only-existing
token names with fallbacks, self-register guard (Lit), unique specimen filenames.
The orchestrator runs one consolidated build afterward.

Report the list of components migrated, each tagged `[.astro]` or `[wc]`, plus any you
converted to a reference page with the reason.
