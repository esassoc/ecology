---
name: decomposition-review
description: The ADVISORY decomposition-quality pass for an @esa/ecology spoke — load during /design-qa (and on request) to judge whether a page's component decomposition is GOOD, not just well-formed. The form gates (check-manifest, check-component-first, check-adherence) already prove a page is a manifest of components; this judges the seams: missed reuse, wrong granularity, bad responsibility boundaries, promotion candidates, and manifest honesty. Runs AFTER the form gates are green, is grounded by scripts/decomposition-context.mjs, and NEVER blocks a build — it emits findings for a human to act on. Triggers on "is this decomposed well", "review the component boundaries", "should this be one component or three", "is this a duplicate", during /design-qa, and before promoting a spoke component.
---

# Decomposition Review (advisory judgment, grounded)

## What this is — and what it is NOT

The form gates enforce the **shape** of a composed page: a manifest exists
(`check-manifest`), every section resolves to a component, no hand-rolled primitives
(`check-component-first`), and the page composes what it declares (`check-adherence` +
`manifest-crosscheck`). Those are deterministic and they **block**.

This pass judges the **quality** of the decomposition — right boundaries, right
granularity, right reuse. That is model judgment, not regex. It is **advisory**: it runs
**after the form gates are green**, and it **never fails a build**. The form gates decide
what *ships*; this decides what's *good*, and surfaces it for a human call.

> Severity here is `suggestion | consider | strong` — never `error`. If you find yourself
> wanting to "block," you're in the wrong pass: that belongs in a form gate.

## Ground BEFORE you judge (non-negotiable)

Ungrounded decomposition critique degrades output — it drifts into taste and invents
problems. So gather the real artifacts first, exactly like `/design-qa` runs
`check-adherence.mjs` before any visual judgment. Run the grounding script:

```bash
# scope = the working-tree change (default); or pass the page/component files under review
node ../ecology/scripts/decomposition-context.mjs
node ../ecology/scripts/decomposition-context.mjs src/pages/app/index.astro src/components/foo.astro
```

It returns one JSON bundle — your evidence base:

| Field | What it grounds |
|-------|-----------------|
| `scope` / `diff` | what actually changed (line-level) — granularity + seam signal |
| `changedPages[].manifest` | each changed page's section **names + resolvers + layout** — manifest fidelity |
| `changedComponents[]` | each new/changed `<spoke>-*` component as `{ name, purpose, props }` |
| `hubInventory` / `spokeInventory` | EVERY `esa-*` lego + existing spoke component as `{ name, purpose, props }` — the reuse catalog |
| `reuseHints[]` | prop-overlap candidates per changed component — a HINT to compare, never itself a finding |

**Every finding must cite a specific grounded fact** (a file, a component name, a prop set,
a manifest line). No grounded fact → no finding. When the change is clean, say so — do not
manufacture findings to look thorough.

Load the house rules these judgments lean on (don't restate them): **`component-first`**
(the lego lookup order + manifest-first discipline) and **`design-principles`** (the
canonical aesthetic/token rules). Promotion judgments follow the hub's
`docs/promotion-path.md` criteria.

## The rubric — five dimensions

Evaluate each. Cite specifics from the bundle.

### 1. Missed reuse
Did the change introduce a new component that **duplicates** something that already exists
— a hub lego or an existing spoke component? Compare by **purpose + props, not name**.
- Start from `reuseHints` (prop overlap is the cheap signal), then open the candidate's
  `purpose` in `hubInventory`/`spokeInventory` and compare it to the changed component's
  job. A high prop overlap with a matching purpose ⇒ a real duplicate.
- **Guard against false positives:** prop overlap ≠ duplication. A component that shares
  `{title, subtitle, icon}` with `esa-card` but adds genuinely different structure or
  behavior is legitimate composition, not a dup. Judge the *purpose*.
- **Suggest** reusing the lego, or *parameterizing* the existing component (add the prop/
  slot that the new variant needed) instead of forking it.
- Severity: `strong` for a near-exact re-implementation of a hub lego; `consider` for a
  partial overlap a small parameterization would absorb.

### 2. Granularity
Is the split the right size?
- **Over-split** — trivial wrappers that add no structure, no reuse, and no props beyond
  passthrough (the classic: a one-line footer broken into three components that only ever
  appear together). Signal: changed components with ~0–1 props wrapping a single child;
  several micro-siblings that are always rendered as a set. **Suggest** collapsing them
  into one component.
- **Under-split** — one oversized component doing several unrelated jobs (a header **and**
  a data table **and** a map in one file). Signal: a single changed component with a large
  mixed render and many unrelated props/sections (read the `diff` / the file). **Suggest**
  breaking it out along its responsibilities.
- Severity: `consider` by default; `strong` when an under-split file is clearly several
  unrelated sections fused.

### 3. Seam quality
Are boundaries drawn along **responsibility and shared state**, not arbitrary visual lines?
- Components that **share interactive state belong together.** Filters that drive both a map
  and a table are one stateful unit — splitting them across components forces a brittle
  cross-component event bus. If the cut splits a shared-state cluster, **suggest
  co-locating** it in one component (the map/table can still be sub-components *inside* it).
- Conversely, **unrelated concerns sharing one file should split.** This is the mirror of
  under-split, judged by responsibility rather than size.
- Severity: `strong` when a split would require cross-component wiring of shared state;
  `consider` for a softer responsibility smell.

### 4. Promotion signal
Is a new `<spoke>-*` component **brand-agnostic** enough that it should graduate to a hub
`esa-*` lego? Per `docs/promotion-path.md`, a candidate composes **only tokens + legos +
slots/props** — no spoke-specific data, naming, or hard-coded brand values.
- Read the changed component: does its markup/props reference spoke data or naming, or does
  it read only tokens and accept content via slots/props? A generic, data-free component
  (e.g. a `<spoke>-page-header` that just wraps `esa-page-header` with no spoke specifics)
  is a promotion candidate — **and** possibly already a missed-reuse finding (#1) if the
  lego it wraps already covers it.
- **List it as a candidate** (suggest `/request-lego`, or note it for promotion). This is a
  signal for the human + Andy to triage — never an automatic move.
- Severity: `suggestion` (it's a heads-up); `consider` if the duplication-of-a-lego angle
  is strong.

### 5. Manifest fidelity
Do the manifest's section **names and structure honestly describe** what the page composes?
- The *mechanical* declared-vs-used check lives in `check-adherence` (a form gate). Here
  judge it **semantically**, using `changedPages[].manifest` + reading the page: a section
  named `hero` that resolves to a footer; vague/misleading names (`content`, `section-2`)
  that hide what's really there; a manifest whose structure no longer matches the page's
  actual section order or grouping.
- **Suggest** the honest name / structure.
- Severity: `suggestion` for a naming nit; `consider` when the manifest actively misleads a
  future reader about the page's composition.

## Output

Lead with a **one-line verdict**, then the findings as JSON mirroring `check-adherence`'s
shape (advisory severity, `target` = the component/section at issue):

```
Verdict: minor — one missed-reuse and one over-split worth a look; everything else clean.

[
  {
    "severity": "strong",
    "file": "src/components/laureate-info-card.astro",
    "target": "laureate-info-card",
    "issue": "Re-implements esa-card: same purpose (titled content surface) and props {title, subtitle, icon, variant} — reuseHints shows 0.8 prop overlap with esa-card.",
    "suggestion": "Delete laureate-info-card and compose <EsaCard> directly; if it needs a tweak esa-card lacks, /request-lego that prop instead of forking."
  },
  {
    "severity": "consider",
    "file": "src/components/laureate-footer-legal.astro",
    "target": "laureate-footer-legal / -links / -copyright",
    "issue": "The footer is split into three single-line wrappers that only ever render together and carry no props — over-split.",
    "suggestion": "Collapse into one laureate-footer component composing a .cluster of links + the legal line."
  }
]
```

- `severity`: `suggestion` (minor/optional) · `consider` (real, worth a look) · `strong`
  (clear problem a human should likely act on). **Never `error`.**
- Verdict word: **clean** (no findings) · **minor** (only suggestions/considers) ·
  **needs rework** (one or more `strong`).
- Keep `issue` grounded (name the prop set / manifest line / file) and `suggestion`
  actionable (name the lego, the prop, the collapse/split).

> **Publishing note:** edits to this skill only reach spokes after the plugin is
> republished — bump `plugins/spoke-kit/.claude-plugin/plugin.json`, push the hub, then
> `claude plugin marketplace update ecology`. Local hub edits are inert until then.
