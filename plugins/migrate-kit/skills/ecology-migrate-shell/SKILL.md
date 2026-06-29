---
name: ecology-migrate-shell
description: Execute the one-time app-shell / IA restructure of an Angular app to match the design spoke's frame — e.g. a top header nav → the spoke's collapsible sidebar "modern-layout" (fixed topbar + sidenav + content). Reimplements the root shell against the spoke's AppShell + Beacon's Angular modern-layout reference, re-houses the app's navigation (routes, auth/role gating, user menu) and owns the handoff's chrome sections. Slice 0b — runs once, before component/page migration. Verified against the full-page prototype, not in isolation.
allowed-tools: [Agent, Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion, Skill]
---

The **shell axis** — the one-time, app-wide frame restructure. Where `ecology-migrate-component` swaps reusable primitives and `ecology-migrate-page` rebuilds screens, this rebuilds the app's **root shell** to match the spoke's `AppShell` — e.g. an app's top **header nav** → a collapsible **sidebar** "modern-layout" (fixed topbar + sidenav + scrolling content). It's a *different class* from a component swap: **structural, app-wide, design-led, run once and first** (Slice 0b — every screen renders inside it). It is verified against the **full-page prototype**, never an isolated harness.

## Consumption model

`@esa/ecology` is unpublished, and a real app's chrome usually outgrows `esa-app-shell` (which hardcodes its app-bar end slot to a single user menu — no room for an admin/utility cluster or env badge). So the spoke ports a **bespoke** shell, and so do we: **reimplement the root shell in Angular following the spoke's `AppShell` (the target) + Beacon's Angular `modern-layout` (the reference — `<beacon>/Beacon.Web/src/app/app.component.{html,scss}`), composing `esa-*` legos** (`esa-icon`, `esa-icon-button`, `esa-badge`, the `esa-sidebar-nav` Lit WC) and reading tokens.

## Arguments

`$ARGUMENTS`: `--app` (current repo), `--spoke` (`../<app>-design`), `--beacon` (`../Beacon`), `--ecology` (`../ecology`), `--dry-run` (plan only).

## Workflow

### Phase 0 — Resolve the shells
- **App's current shell:** the **root layout** that mounts the global nav + `<router-outlet>` (commonly `app.component.html` — e.g. a header/nav bar + `<main><router-outlet></main>` + a footer), plus the **nav source**: the routes, the nav components' links, and any **auth/role/flag gating** + the **user menu**.
- **Spoke target shell:** `<spoke>/src/layouts/AppShell.astro` + the handoff's **chrome sections** (top bar, side nav) with their `decisions`/`gotchas`/`acceptance`.
- **Beacon reference:** `<beacon>/Beacon.Web/src/app/app.component.{html,scss}` — the `.modern-layout` root shell the spoke ported.

### Phase 1 — Capture the current shell contract (preserve, don't lose)
Enumerate **every** nav destination and its **gating** (role / permission / feature-flag), the **user-menu** items, the **admin/utility** links, the brand/home link, and any env badge. The shell change is **layout only** — all of this must survive, re-housed. (This is the high-risk part: a restructure that silently drops a role-gated link or a menu item is a regression.)

### Phase 2 — Build the new root shell
Reimplement the root layout as the spoke's `modern-layout`:
- a fixed **topbar** (sidebar toggle + env badge · spacer · utility/admin cluster + user menu),
- a collapsible **sidenav** (brand lockup + primary nav · divider · secondary nav), and
- a **content** region wrapping `<router-outlet>`.
Follow the handoff's **top-bar + side-nav `decisions`/`gotchas` verbatim** (e.g. the collapse toggle, the 280↔72px rail, the topbar grid, the stacking/z-index rules). Compose `esa-*` legos — **but if the component axis hasn't run yet (no `esa-*` present in the app), substitute the app's existing equivalents** (its current `icon`/`icon-button`/`badge`/dropdown/nav components) in the new structure, and note the dependency. Don't block on legos that aren't migrated yet — the shell can ship with the app's current primitives and adopt `esa-*` as the component axis catches up. Read tokens; for a rung the app's theme lacks (e.g. a brand-ramp shade, a `--spacing-*` step, or a `--font-weight-*` the theme doesn't define), either **add the missing rung to the theme bridge** (preferred when it's a real scale gap — coordinate with the apply-theme step) or rely on the spoke's literal fallback, and **say which**.

### Phase 3 — Re-house the navigation (preserve gating exactly)
Map every destination from Phase 1 into the new chrome: **primary routes → sidenav**, **admin/utility → topbar cluster**, **user actions → user menu**. **Preserve the auth/role/flag gating exactly** — the shell changes *where* a link lives, never *who sees it*. Keep the `<router-outlet>` content slot intact so all routed pages render unchanged inside the new frame.

### Phase 4 — Verify (full-page, not isolation)
The shell is the frame, so verify the **whole app**, not a harness: hand the **top bar** + **side nav** sections to `ecology-verify --handoff` in its **live full-page mode** (mode B), which renders the **real authenticated app** — reusing the project's e2e auth harness if it has one (a fixture that bypasses the real login and attaches a test user), else a saved `storageState`/UI login — `goto`s a route, and compares the rendered shell to the spoke prototype's chrome + the handoff `acceptance`. Run the app's production build too.

### Phase 5 — Report
The new shell structure, **every re-housed destination + its preserved gating** (the audit trail that nothing was dropped), the `acceptance` verdict for the chrome sections, deferred items, and the build result.

## Notes
- **One-time, app-wide, first.** Slice 0b — runs before the component/page slices; everything renders inside it.
- **Preserve nav logic + gating exactly.** A layout change, not an access change — re-house every link and keep its guard.
- **Mirror the spoke `AppShell` + Beacon `modern-layout`.** Don't diverge; the spoke is a faithful port of Beacon's root shell, so the Angular reference is close to 1:1.
- **Verified full-page**, against the prototype + handoff `acceptance` — not the isolated harness `ecology-verify` uses for primitives.
- **App-specific logic stays app-owned** — auth, role resolution, the user menu's actions — just re-housed into the new chrome.
- **The root-shell edit may trip repo guardrails.** Restructuring touches the root component (e.g. `app.component.ts`), which often holds pre-existing imperative code (subscriptions, body-class side-effects); an rxjs/lint PreToolUse hook may block the edit on that *pre-existing* code. The restructure is legitimate — expect the guardrail and resolve it (fix forward / coordinate), don't silently bypass. A conductor running unattended should surface this as a checkpoint, not stall.
- **Skill-only / human-gated.** A big structural diff; the conductor checkpoints it as its own gate. Doesn't commit.
