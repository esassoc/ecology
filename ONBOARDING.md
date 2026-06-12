# Building Prototypes with Claude — Onboarding

Welcome! This guide gets you from a fresh Windows machine to **building and
publishing interface prototypes with Claude** — no coding background needed.
You'll work in a *spoke* repo (e.g. `cb-fish-design`): a small website of
prototypes that re-skins ESA's **Ecology design system** (the *hub*). Claude
does the building; you direct it in plain language. Guardrails are built in.

**The three things this is for:** business-development demos, client-alignment
prototypes, and dev handoff. Everything you publish is **PUBLIC** — rule #1
below exists because of that.

---

## Part 1 — Accounts (one-time; some need IT or Andy)

1. **GitHub account** — create one at github.com if needed, then ask Andy to
   invite you to the **esassoc** organization with **write** access to your
   spoke repo (e.g. `cb-fish-design`).
2. **Claude seat** — ask Andy; you'll sign in when you first run Claude Code.

## Part 2 — Install the tools (one-time)

Open **PowerShell** and run each line (if your machine blocks installs, ask IT
to run them):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install GitHub.cli
```

Then install **Claude Code** per the current instructions at
https://code.claude.com (Windows installer). Close and reopen your terminal
after installs.

## Part 3 — Connect your accounts (one-time)

In a fresh terminal (Git Bash or PowerShell):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@esassoc.com"
gh auth login          # choose GitHub.com → HTTPS → login with browser
gh auth setup-git      # IMPORTANT: without this, publishing fails later
```

## Part 4 — Get the code (one-time)

The two repos must sit **next to each other**, and **not** in a OneDrive-synced
folder (no Documents/Desktop — sync breaks the link between them). Use a plain
folder like `C:\Users\<you>\Dev`:

```bash
mkdir -p ~/Dev && cd ~/Dev
git clone https://github.com/esassoc/ecology.git
git clone https://github.com/esassoc/cb-fish-design.git   # or your spoke

cd ecology && npm install && npm run build:tokens   # builds the design tokens
cd ../cb-fish-design && npm install
```

## Part 5 — First launch

1. In your terminal: `cd ~/Dev/cb-fish-design` then run `claude`
2. When asked, **trust the folder** and **accept the "spoke-kit" plugin
   install** — that plugin is the guardrails.
3. Type `npm run doctor` in a second terminal (or ask Claude to run it). Every
   line should say `ok`. Each failure prints its own fix.
   - If doctor itself won't start ("Cannot find module"), the `ecology` folder
     isn't cloned next to your spoke — redo Part 4.

---

## The daily loop

1. **Start of day**: ask Claude to "pull the latest in this repo and the hub"
   (or run `/new-prototype` — it does this automatically).
2. **`/new-prototype`** — Claude interviews you (who's it for, what's the
   scenario, what's on the screen), then builds it from the design-system
   components and shows you a local preview link.
3. **Iterate in plain language** — "make the filters a sidebar", "the table
   needs a status column", "this feels cramped". No jargon needed.
4. **`/design-qa`** — a quality pass (design rules, broken styles, build
   check). Claude fixes what's safe and asks about the rest.
5. **`/ship`** — saves your work, syncs with teammates, publishes to the
   public site, and gives you the link to share.

## The rules (short, important)

1. **Everything committed here is public.** Client-sensitive material
   (proposals, pricing, contacts, real correspondence) goes ONLY in
   `docs/private/` — it is never uploaded. When in doubt, ask Andy.
2. **Mock data is invented.** Realistic, but fictional — never copied or
   "lightly edited" from client documents.
3. **Never edit the hub** (the `ecology` folder). If a component or style hook
   you need doesn't exist, run **`/request-lego`** — it files the request and
   Andy builds it into the system. (Claude is blocked from hub edits
   automatically; this rule is for you.)
4. **Ship freely.** These are low-stakes prototypes — publishing early and
   often is the point. `/ship` protects you and your teammates from
   overwriting each other.

## When something's weird

- Run `npm run doctor` first — it diagnoses the common problems with fixes.
- Claude said something was "BLOCKED" — that's a guardrail working, and the
  message says what to do instead (usually: use the design-system component,
  or `/request-lego`).
- Still stuck → message Andy with the doctor output and what you were doing.
