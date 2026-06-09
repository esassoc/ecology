# Authoring a `bcn-` Component

You reach this file only after [lego-lookup.md](lego-lookup.md) came up empty in **both** Ecology and Beacon. Building a `bcn-` component is a *documented decision*, not a shortcut.

## The bar for a new `bcn-` component

Before writing one, you must answer all three:
1. **Which `esa-*` did I rule out, and why?** (No close fit, or fit but missing a required behavior.)
2. **Which Beacon `ui-*` / SCSS pattern did I rule out, and why?**
3. **Is this genuinely reusable** — would another page import it, or am I about to build a one-off?

If #3 is "one-off," you do not have a `bcn-` component. You have a page blob like `.rd-*`/`.tt-*` — and that is exactly what we are stamping out. Compose legos instead.

## Naming

- **Prefix every class with `bcn-`** — never `.rd-`, `.tt-`, or an undocumented prefix.
- Use BEM-ish structure: `bcn-kanban`, `bcn-kanban__column`, `bcn-kanban__card`, `bcn-kanban--compact`.
- Name by what it *is* (the component), not where it first appeared (the page).

## Structure

- All values from design tokens — `var(--token)`. No hardcoded colors, spacing, type, or radius. (Same rule as `esa-*`.)
- Parent owns spacing; children are portable.
- A real component is **reusable in isolation**: someone can drop it on another page and it works.
- If it's complex enough to warrant its own file, make one — don't bury it in a page's `<style>`.

## The `bcn-lego-checked:` token (required to pass the hook)

The PreToolUse hook blocks bespoke UI. To proceed, the new content must carry the assertion token. Put it near the component:

```html
<!-- bcn-lego-checked: no esa- component supports a draggable kanban column; checked Beacon ui-* (none); bcn-kanban-column is the reusable home -->
```

CSS-only file:
```css
/* bcn-lego-checked: no esa- progress ring exists; ported Beacon scss/_charts.scss; bcn-progress-ring is the reusable home */
```

The token is a **claim that you walked Ecology → Beacon first**. Write a real reason. Reviewers (and future you) will read it to decide whether the `bcn-` component was justified or whether a lego was missed.

## After you build one

- It is now part of the spoke's vocabulary — treat it like a lego in future work (reuse, don't re-reinvent).
- If the same need later shows up in Ecology as a real `esa-*`, migrate to the lego and delete the `bcn-`.
