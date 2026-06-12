# Definition of Done — the contract /spoke-init enforces

Run this checklist after install + build and report each item pass/fail. A spoke
is NOT done until every box is checked. This is the guardrail against the
half-installed spoke that started this whole effort.

## Package contract
- [ ] **All FOUR `@esa/*` packages** present in `package.json`:
      `@esa/tokens`, `@esa/ecology`, `@esa/docs` (dependencies),
      `@esa/handoff` (devDependency). Grep `package.json` — if any is missing,
      the spoke is broken; restore from `package.json.tmpl`.
- [ ] All four `@esa/*` deps use `file:../ecology/packages/*` and the spoke is a
      sibling of the `ecology` checkout (so the `file:` links resolve).

## Page tree exists
- [ ] Landing `src/pages/index.astro` — with Design System + Pattern Library
      layer cards and the prototypes list.
- [ ] `src/pages/design-system/index.astro`
- [ ] `src/pages/design-system/foundations/{color,typography,spacing,radius,iconography}.astro`
- [ ] `src/pages/design-system/components/` — one page per catalog entry.
- [ ] `src/pages/patterns/index.astro`

## Right components in the right place
- [ ] Foundations use the **token-driven `@esa/docs` components**
      (`ColorFoundation`, `TypeFoundation`, etc.) — NOT hand-rolled markup.
- [ ] `color.astro` passes the spoke's primitive ramp(s) via the `ramps` prop
      (the `TODO(spoke-init)` is resolved).
- [ ] `DocsLayout.astro` wraps `@esa/docs/DocsShell.astro` with the spoke theme
      + nav (`allGroups` from `ds-nav.ts`).
- [ ] `ds-nav.ts` `componentGroups` reflects the real catalog (not the scaffold
      single-Button entry) and every item has a matching component page.

## Theme reviewed
- [ ] `theme-<slug>.css` re-points were **reviewed by a human**.
- [ ] If a source repo was given: the primitive-ramp divergence, the
      feedback/AI re-points, the form radius/height deltas, and `--button-on-warning`
      were each addressed (see `brand-extraction.md` (a)/(d)/(e)/(f)).
- [ ] No leftover `/* __FILL__ */` markers or `__PLACEHOLDER__` tokens remain in
      any file (grep the repo for both).

## Build green
- [ ] `npm run build` succeeds.
- [ ] `npx tsc --noEmit` clean.
- [ ] **No undefined tokens**: grep every referenced `var(--x)` in `theme-<slug>.css`
      and the pages, and confirm each is defined in `@esa/tokens`
      (`dist/tokens.css` + `component-tokens.css`) or in the theme file itself.

## Intelligence layer (the guardrail against the biochar miss)
- [ ] `.claude/settings.json` exists, declares the `ecology` marketplace
      (`extraKnownMarketplaces` → github `esassoc/ecology`) and enables
      `"spoke-kit@ecology"` in `enabledPlugins`.
- [ ] `.claude/settings.json` is **trackable**: `git check-ignore
      .claude/settings.json` matches nothing (a blanket `.claude/` ignore
      silently strips the intelligence layer from clones).
- [ ] The **spoke-kit plugin is installed and fresh**: confirm via the
      `/plugin` UI or `claude plugin marketplace update ecology`. If Claude
      Code was just opened here, the install prompt must have been accepted.
- [ ] **Hook smoke test** — pipe synthetic PreToolUse JSON at the hook source
      in the sibling hub (`../ecology/plugins/spoke-kit/hooks/check-component-first`);
      `file_path` must be an ABSOLUTE path inside this spoke. Three cases:
      1. content with a raw `<input>` → **exit 2** (blocked)
      2. content composing `esa-*` legos → **exit 0** (allowed)
      3. same raw-`<input>` payload but `file_path` inside `../ecology` → **exit 0**
         (hub excluded)
      ```bash
      printf '{"tool_input":{"file_path":"%s/src/pages/smoke.astro","content":"<input type=\\"text\\" />"}}' "$PWD" \
        | ../ecology/plugins/spoke-kit/hooks/check-component-first; echo "exit: $?"   # expect 2
      ```
- [ ] `CLAUDE.md` exists at the spoke root (project conventions; the
      component-first discipline itself comes from the plugin).

## Handoff to the user
- [ ] Report the DoD pass/fail table.
- [ ] Point the user at the **`spoke-precommit-review`** skill for ongoing diffs
      (it reviews token usage, type contract, component decomposition, CSS
      conventions, and quality gates before each commit).
