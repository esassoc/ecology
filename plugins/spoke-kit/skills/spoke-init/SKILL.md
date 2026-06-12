---
name: spoke-init
description: Reference detail for scaffolding a new ESA Ecology design-system spoke (an Astro brand re-skin of @esa/ecology). Use with the /spoke-init command. Covers the 4-package contract, the brand-token extraction map (source SCSS → ecology semantic tokens), the source-catalog → esa-* component mapping, dogfood-page porting, and the definition-of-done checklist that GUARANTEES a complete spoke.
---

# Spoke Init Reference

The `/spoke-init` command orchestrates spinning up a new Ecology spoke from
`packages/spoke-template/` in the ecology hub checkout (run the command from the
hub root). This skill holds the heavy reference detail the command body keeps
out of the way.

A **spoke** is a small Astro app that re-skins the Ecology hub via a single
`[data-theme="<slug>"]` block and documents it. Worked example to pattern-match
against: `../beacon-design/`, a sibling of the hub (freshest, most faithful spoke).

## The #1 job: guarantee the full contract

The failure this command exists to prevent: a hand-spun spoke installed only 2 of
the 4 hub packages, so Claude hand-rolled its own foundations and had no
landing/design-system reference. **Completeness beats cleverness.** Every spoke
MUST ship all four `@esa/*` packages and the full page tree (see DoD checklist).

## The 4-package contract

All four come from the sibling `../ecology` checkout via `file:` links — the spoke
must live as a sibling of `ecology`.

| Package | Dep type | Role |
|---|---|---|
| `@esa/tokens` | dependency | Primitives + default semantic tokens. |
| `@esa/ecology` | dependency | The `esa-*` components. |
| `@esa/docs` | dependency | `DocsShell` + token-driven foundation components (`ColorFoundation`, etc.). |
| `@esa/handoff` | devDependency | Dev-mode handoff export. |

`package.json.tmpl` already encodes all four. The job is just to NOT lose any of
them — verify after substitution.

## Placeholder legend

Substitute every occurrence across every file (including the
`theme-__SPOKE_SLUG__.css` filename):

| Placeholder | Meaning | Beacon example |
|---|---|---|
| `__SPOKE_NAME__` | Display name | `Beacon` |
| `__SPOKE_SLUG__` | Lowercase id (`data-theme`, theme filename, DocsShell `theme`) | `beacon` |
| `__SPOKE_DIR__` | Repo/dir name + GitHub Pages base | `beacon-design` |
| `__SCOPE__` | npm scope (`@<scope>/design`) + raw token prefix `--<scope>-*` | `beacon` (`--bcn-*`) |
| `__BRAND_MARK__` | Short sidebar text mark | `B` |
| `__FONT_LINKS__` | Brand Google Fonts `<link>` tags (BaseLayout + DocsLayout) | DM Sans / Roboto Mono links |
| `__SPOKE_TAGLINE__` | Landing hero one-liner | `The brand language…for the Beacon platform` |

Note: the raw spoke token prefix is the *scope*, but spokes may abbreviate it in
the theme (Beacon uses `--bcn-*` not `--beacon-*`). Confirm the abbreviation with
the user; default to the slug.

## Documentation

- [Brand extraction: source tokens → ecology semantic re-points](brand-extraction.md)
- [Catalog: source ui-* → esa-* mapping + dogfood-page porting](catalog-mapping.md)
- [Definition-of-done checklist (the contract the command enforces)](definition-of-done.md)
