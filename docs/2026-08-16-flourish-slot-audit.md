# Flourish-slot audit — ecology component library

2026-08-16 · read-only audit · no component changes made

Scope: `packages/ecology/src/components/` (all 61 legos, Astro + Lit), plus every
prose-shaped prop the two reference spokes declare on their own components.

Usage evidence: `apps/site` (hub), `/Dev/beacon-design`, `/Dev/cb-fish-design`.

**Fills** below counts distinct call sites in product/prototype code. A component's
own spec page is counted separately as *demo* — those pages exist to show the prop,
so they are weak evidence of what the prop invites. Where a hub prop has only demo
fills, that is stated.

---

## Summary

| Component | Slot | Real fills | Demo fills | % flourish | Verdict |
|---|---|---|---|---|---|
| esa-page-header | `lede` | 4 | 3 | **100%** | **REMOVE** |
| esa-button-toggle | `hint` | 0 | 2 | **100%** | **REMOVE** |
| esa-form-field | `helpText` | 4 | 2 | 50% | **CONSTRAIN** |
| esa-card | `subtitle` | 28 | 11 | 11% clear / 71% contested | **CONSTRAIN** |
| esa-empty-state | `description` | 21 | 3 | 29% | **CONSTRAIN** |
| esa-alert-box | default slot | 21 | 11 | 14% | KEEP (misuse, not API) |
| esa-stat | `sub` | 20 | 0 | 5% | KEEP |
| esa-page-header | `eyebrow` | 4 | 1 | 0% | KEEP |
| esa-empty-state | `title` | 21 | 3 | 0% | KEEP |
| esa-danger-zone | `description` | 3 | 2 | 0% | KEEP |
| esa-confirm-dialog | `message` | 6 | 6 | 0% | KEEP |
| esa-input-tag | `hint` | 0 | 1 | 0% | KEEP |
| esa-tooltip | `text` | 2 | 11 | 0% | KEEP |
| esa-link-column | `heading` | 14 | 5 | 0% | KEEP |
| esa-snackbar-item | `message` | 7 | 15 | 0% | KEEP |
| esa-entity-search | `subtitle`, `meta` | 0 | 13 | 0% | KEEP |
| esa-search-panel | `subtitle` | 0 | 5 | 0% | KEEP |
| esa-command-palette | `description` | 0 | 2 | 0% | KEEP |
| esa-text-field / -select / -textarea / -combobox / -date-picker | `help-text` | 7 | 10 | ~14% | KEEP |
| esa-app-shell | `subtitle` | 0 | 0 | — | KEEP (data field, mislabeled candidate) |
| esa-loading-overlay | `message` | 0 | 4 | 0% | KEEP |
| esa-progress-bar | `label` | 0 | 4 | 0% | KEEP |
| esa-collapsible | — | — | — | — | no prose prop exists |
| ComponentDoc / PatternDoc | `summary` | 75 | — | 100% prose | KEEP (docs genre) |

**Two removals. Three constraints. Nine call sites break, all of them trivial.**

---

## The finding that outranks the verdicts

The hub is not the main source of flourish text. **The two spokes declare 26 prose-shaped
props of their own** — more than the hub exposes — and those props carry a far higher
flourish rate than anything in `packages/ecology`.

`cb-fish-design` alone re-declares `lede` twice, plus `intro`, `tagline`, `caption`,
`overview`, `body`, `note`, `purpose`, and `summary` on its own `cbf-*` components.
`beacon-design` adds `subtext` (three components), `lede`, `description`, `hint`,
and `note`. Every one of those is a slot Claude created because it wanted somewhere
to put a sentence.

Removing a hub slot therefore *relocates* the behavior rather than preventing it — a
spoke that wants a lede writes `cbf-report-intro.lede` the same afternoon. The removal
list below is still worth executing, but the prevention that actually generalizes is
the second finding:

### The prop name and its doc comment predict the fill, almost perfectly

Same repos, same authors, same model, two adjacent slots:

- `esa-stat.sub` — documented in the component header as *"an optional muted sub/caption"*
  and *"Sub is muted meta"*. **20 fills, 1 flourish (5%).** Actual fills: `"FY 1999–2029"`,
  `"3 days or less"`, `"of 214 projects"`, `"1.4/wk average"`.
- `esa-page-header.lede` — documented as *"an optional lede at body-large in secondary
  text"*. **4 real fills, 4 flourish (100%).** Actual fills are three-clause sentences.

`sub` names a datum and its doc constrains the register. `lede` names a genre of
writing and its doc describes typography. The slots are the same shape and one field
apart in the same library. That gap is the whole mechanism, and it means **rewriting a
prop's JSDoc is a real intervention with zero blast radius** — cheaper than removal and
applicable to slots that have legitimate uses.

---

## REMOVE

### 1. `esa-page-header` — `lede`

`packages/ecology/src/components/esa-page-header.astro:20`, rendered at `:50`.
Renders a `<p>` below the `<h1>` at `--type-size-300` (18px) in
`--color-text-secondary`. Full page width, directly under the title — the most
prominent non-title text on any page that uses it.

**Fills — every real one is ABOUT the page:**

> "Every CBFish screen is one shared shell wrapping one body archetype. Each pattern
> below is a real, clickable page in this spoke — open one to see it render on the
> CBFish brand layer, then read what it composes from."
> — `cb-fish-design/src/components/patterns/cbf-pattern-intro.astro:30`

> "Review submitted invoices against the contract before they move to payment. Act
> before the review-by date on each."
> — `cb-fish-design/src/pages/invoice-review.astro:44`

> "Submit and track invoices for your Columbia Basin Fish & Wildlife Program contracts."
> — `cb-fish-design/src/components/vendor-dashboard/cbf-vendor-dashboard-header.astro:25`

The one fill that is *not* editorial is a hub demo string — `"Filed 12 days ago ·
awaiting review."` — which is data, and reads completely differently from the other six.

**Reasoning:** the slot's only real-world job has been narrating the page to its reader.
The hub's own pages do not use `esa-page-header` at all, so the hub loses nothing.

**Blast radius: 7 call sites** — 3 on the component's own spec page
(`apps/site/src/pages/components/esa-page-header.astro:29,47,62` and their paired live
renders), 4 in cb-fish-design (`cbf-pattern-intro.astro:30`,
`cbf-vendor-dashboard-header.astro:25`, `invoice-review.astro:44`,
`prototypes/editor.astro:68`). beacon-design: 0 — it never instantiates the component.

**Recommendation on the four spoke fills: delete the text, do not relocate it.** Three
of the four say what the page's own heading and grid already say.

### 2. `esa-button-toggle` — `hint`

`packages/ecology/src/components/esa-button-toggle.ts:48`, declared `:57`.

**Zero product uses.** All 20 `<esa-button-toggle>` instances across both spokes omit it.
Its only two fills anywhere are the hub and beacon spec pages, both the same string:

> `hint="Pick a layout"` — `apps/site/src/pages/components/esa-button-toggle.astro:75`
> and `beacon-design/src/pages/design-system/components/esa-button-toggle.astro:56`

**Reasoning:** a button-toggle's options *are* its labels. "Pick a layout" restates the
control — the catalogs' "redundant surface copy" class. The slot has never carried
information in production.

**Blast radius: 2 call sites, both spec pages.**

Note the asymmetry with `esa-input-tag.hint` (KEEP, below): identical prop name, but its
fill — `"Press Enter to add each tag."` — teaches a non-obvious keyboard interaction.
That is the one job a hint legitimately does.

---

## CONSTRAIN

These keep the slot and change only its name or its doc comment. **Zero call sites break.**

### 3. `esa-form-field` — `helpText`

`esa-form-field.astro:9`, rendered `:48` at `--type-size-100` (12px), muted.
Same contract on the five Lit controls via `help-text`.

Two of four real fills are banned classes rather than help:

> "We will never share your email." — `apps/site/.../esa-form-field.astro:21`
> (reassurance addressed to the reader)

> "This field cannot be edited." — `apps/site/.../esa-form-field.astro:40`, on a field
> that renders visibly disabled (redundant surface copy)

The other two are correct: `"As it appears on the notice of preparation."` and
`"Letters, numbers, hyphens; cannot be changed later"`.

**Constraint:** doc it as *"a constraint on what this field will accept — format, source,
or limit. Never reassurance, never a restatement of the field's state."* The hub already
models the right discipline elsewhere: `apps/site/src/pages/patterns/form-section.astro:117`
explicitly leaves `help-text` unset on the inner control to avoid double-labeling.

**Also worth sending to felix:** "We will never share your email" is a clean corpus
append — the reassurance class has no entry yet.

### 4. `esa-card` — `subtitle`

`esa-card.astro:10`, rendered `:68` at `--type-size-150` (14px), secondary, under the title.

Three distinct fill populations, and they need different answers:

**Data (8 fills) — correct.** `"Across 14 monitored sites"`, `"Next two weeks"`, and the
six permit names bound through `{r.permit}`.

**Editorial gloss (3 fills) — offenders.**

> "Active observations by compliance severity — select a segment to open that filtered list"
> — `beacon-design/src/components/bcn/BcnOversightHero.astro:88`

> "Miles cleared to date, with the projected path to full clearance from current agency estimates"
> — `beacon-design/src/pages/prototypes/permit-tracking.astro:386`

**Instructional (17 fills) — contested, and this one is your call.** beacon's settings
registry pipes 14 rule statements through `BcnSettingsSection` into this slot:

> "A field with no definition shows no tooltip." — `settings-registry.ts:441`
> "A required field blocks the record from being saved until it has a value." — `:535`
> "A tag stays on the list after the last record drops it — the count is how you find those." — `:1442`

These are text about *the product's behavior*, not about the page. Under a strict read of
the OF/ABOUT test they are ABOUT-text; under a looser read they are domain content a
settings screen legitimately owns. I would keep them — a settings page that only shows
switch labels makes the user guess — but they do not belong in a slot named `subtitle`.

**Constraint:** rename to `meta`, documented as *"a short datum qualifying the title — a
count, a range, a date, a status. Never a sentence."* The 17 instructional strings then
have to find a deliberate home rather than riding the title, which is the outcome worth
having. Renaming a prop is a breaking change across 5 call sites; keeping the name and
tightening only the doc is the zero-cost half of this and captures most of the benefit.

**Blast radius if renamed: 5 call sites** (2 hub pattern pages, 3 beacon components).
If doc-only: 0.

### 5. `esa-empty-state` — `description`

`esa-empty-state.astro:10`, rendered `:24` at 14px, centered under a 16px title.

**KEEP the slot.** An empty state is the one surface where prose *is* the content — by
definition there is no data to show, and a recovery instruction is a real affordance.
Fifteen of 21 fills do exactly that: `"Try fewer filters, or a different keyword."`,
`"Clear the Type filter to see the full feed."`

**CONSTRAIN the doc** to *"one imperative recovery action, ≤12 words."* Every offender
below exceeds it:

> "Components are the pieces of Delta Conveyance you track compliance against — intakes,
> shafts, forebays, staging areas. Add the first one to start rolling up its requirements,
> actions, and monitoring activity here."
> — `beacon-design/src/pages/prototypes/component-dashboard.astro:65`

> "Source documents, commitments, requirements, actions, components, evidence, work areas,
> and observations — search titles and full document text."
> — `beacon-design/src/components/bcn/BcnSearchResults.astro:75`

**Two fills are a separate problem — process narration leaking onto a product surface:**

> "Status board of actions by tracking state. **Not part of this prototype pass — Grid is
> the wired view.**"
> — `beacon-design/src/pages/prototypes/requirement-tracker.astro:233`, and the same
> construction at `:240`

That is session vocabulary ("this prototype pass") typeset where a user would read it.
It is a spoke bug regardless of the API verdict, and it is the single clearest catch in
the audit.

---

## KEEP — and why the clean ones are clean

`esa-stat.sub`, `esa-page-header.eyebrow`, `esa-danger-zone.description`,
`esa-confirm-dialog.message`, `esa-entity-search.subtitle`/`meta`,
`esa-search-panel.subtitle`, `esa-tooltip.text`, `esa-link-column.heading`,
`esa-snackbar-item.message`, `esa-progress-bar.label`, `esa-input-tag.hint`,
`esa-command-palette.description`, `esa-app-shell.subtitle`, `esa-loading-overlay.message`.

Three patterns separate these from the offenders:

1. **The slot names a datum, not a genre.** `sub`, `meta`, `eyebrow`, `label` got labels
   and data. `lede`, `subtitle`, `description` got sentences.
2. **The component's function requires the text.** A confirm dialog's `message` and a
   danger zone's `description` state the consequence of an irreversible action — that is
   the reason those components exist, not decoration on top of them. All 9 fills across
   both are consequence statements.
3. **The slot sits in a row, not above a page.** Search-result subtitles
   (`"Active · 2026"`, `"PDF · 2.1 MB"`, `"Project 2024-118"`) are constrained by the row
   they live in. Nobody writes a paragraph into a 200px result row.

Two entries need a note:

**`esa-app-shell.subtitle` is not a page subtitle** — it is a field on
`AppShellSearchEntry` (`esa-app-shell.astro:46`), adapted into `esa-entity-search`'s
result rows at `:106`. Mislabeled candidate; it is a search-index data field.

**`esa-alert-box` — KEEP the component, but flag the misuse.** The alert box is what
Claude reaches for when it wants to say something ABOUT the page and needs a container.
Three fills are exactly that:

> "Powered by Power BI / This report is rendered by Microsoft Power BI inside the CBFish
> shell. Scope and drill-through are controlled in the embed; the toolbar below owns
> export, refresh, and opening the report in Power BI."
> — `cb-fish-design/src/components/report-center/cbf-report-embed.astro:47`

> "Every invoice assigned to your contracts / Sort or filter the grid to triage. The list
> is sorted by the review-by clock so the most urgent invoices surface first; click a row
> to open the full review."
> — `cb-fish-design/src/pages/prototypes/table.astro:66` and `data-grid.astro:43`

The first is a provenance string wearing an alert. The remaining 18 fills are validation
and state messages and are correct. This is a `design-principles` line — *an alert states
a condition the user must act on, never describes the page* — not an API change.

---

## Spoke-declared prose props

Not in scope for a hub API change, but this is where the volume actually is. Listing them
because any prevention that only touches `packages/ecology` misses all of it.

**beacon-design** — `BcnDangerZone.description` (3 fills), `BcnKbHero.lede` (1),
`BcnMarketingSection.eyebrow`/`subtext` (6/5), `BcnScaleStats.eyebrow`/`subtext` (1/1),
`BcnSectionIntro.eyebrow`/`subtext` (pass-through), `BcnKeyValue.hint` (5),
`BcnFlagList.description` (3), `BcnProjectFacts.description` (1),
`BcnModelDiagram.note` (38), `BcnStarredComponents.note` (1).

`subtext` is the offender — 5 of 5 fills are marketing-page editorial:

> "Compliance isn't a flat to-do list. It's hierarchical, multi-dimensional, and
> relational. Purpose-built tools make the difference."
> — `beacon-design/src/pages/prototypes/homepage.astro:64`

`BcnModelDiagram.note` (38 fills) is the counter-example and should be left alone: its
fills are field annotations on a data-model diagram — `'per water year'`, `'the schedule
lives HERE'`, `'min start · max end of the subtree'`. Text about a diagram *is* the
diagram's content.

**cb-fish-design** — `lede` ×2, `eyebrow`, `tagline`, `intro` ×2, `caption` ×3,
`description` ×4, `sub` ×4, `overview` ×2, `note` ×2, `purpose`, `summary`, `body` ×2,
plus `bcn-date-picker.helpText` (0 fills). Highest-flourish:

> "An unprecedented view into the region's fish & wildlife mitigation."
> — `cbf-welcome-hero.tagline`, `src/pages/home.astro:21`

> "The design system gives you the bricks. The pattern library will give you the
> buildings — composed, multi-component patterns assembled from the primitives,
> documented and ready to lift."
> — `cbf-soon-hero.astro:25` (hard-coded, no prop)

`cbf-*` `summary` deserves its own note: cb-fish copied `ComponentDoc.astro` out of the
hub into a product spoke, and all 12 of its fills follow one generated formula —
*"The inherited Ecology &lt;X&gt;, wearing the CBFish skin. …"* A copied layout propagates
its prompt along with its markup.

---

## Out of scope, recorded

**`ComponentDoc.summary` / `PatternDoc.summary`** (`apps/site/src/layouts/ComponentDoc.astro:13`,
rendered `:36` as `<p class="lede" set:html={summary}>`) is by volume the largest prose
surface in ecology — 63 fills in the hub, 12 in cb-fish, every one a full sentence or
paragraph. It is also the site's real lede mechanism, which is why `esa-page-header` has
zero hub uses.

**KEEP, unchanged.** A component doc page's job is to explain the component; text about
the component is text *of* the docs page. Applying design-restraint here would be a
category error. Flagging it only so a later sweep does not re-open it.

**Sub-16px type on six of the audited slots** — `esa-card.subtitle` 14px,
`esa-empty-state.description` 14px (title 16px), `esa-stat.sub` 14px,
`esa-danger-zone.description` 15px, `esa-page-header.eyebrow` 15px,
`esa-form-field.helpText` 12px. Separate from this audit — the 2026-08-14 carve-out
covers dense data grids and the record panel, not page-content legos — but a slot that is
both prose-inviting and below the floor is wrong twice.

---

## What structural prevention would actually need

Removing two slots and re-documenting three is worth doing and costs 9 call sites. It
does not, on this evidence, prevent much: 26 of the prose props in the system are
spoke-declared, and a spoke will re-invent a removed slot rather than go without.

The generalizable levers, in the order I would rank them:

1. **Write the constraint into the prop's doc comment, everywhere.** `esa-stat.sub` vs
   `esa-page-header.lede` is a controlled experiment for this and the effect size is
   5% vs 100%. Zero blast radius, applies to all 24 hub slots today.
2. **A prop-declaration lint in `spoke-kit`.** felix's `design-gate` greps rendered
   strings; it cannot see a spoke *declaring* `lede?: string`. A `check-component-first`
   sibling that flags a new prose-genre prop name at author time closes the half of the
   problem the string gate structurally cannot reach.
3. **The two removals below.** Real, cheap, and they delete four live flourish strings
   from cb-fish — but they are the smallest of the three levers, not the largest.
