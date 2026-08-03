# Getting Started — Building Prototypes with Claude

By the end of this you'll have two folders on your computer and one command that
opens a working prototype in your browser. You will not write code. You type a
handful of setup commands once, and from then on you work by talking to Claude
in plain English.

**Time:** about 45 minutes the first time, most of it waiting on downloads.
Parts 1–6 happen once, ever. Part 9 is what you do every day.

**What you're making:** prototypes — clickable, realistic screens used for
business-development demos, client-alignment conversations, and developer
handoff. Each one lands on a public web address you can send to anyone.

**Everything you publish is public.** That's how the sharing works, and it's why
[The rules](#the-rules) matter. Client-sensitive material never goes in.

If a word in here is unfamiliar, it's defined in the [Glossary](#glossary).

---

## The mental model: two folders, side by side

You will end up with exactly this:

```
Dev/
├── ecology/          ← the hub (never edit)
└── cb-fish-design/   ← your spoke (your work)
```

The **hub** holds the shared building blocks: buttons, cards, tables, colors,
spacing. The **spoke** is one project's prototype site — it borrows every
building block from the hub and re-colors them for that project's brand.

Two rules follow from this, and nearly every setup problem traces back to
breaking one of them:

1. **The two folders must be siblings** — in the same parent folder, neither
   inside the other. The spoke finds the hub by looking for `../ecology`.
2. **They must not live in OneDrive** — not in Documents, not on the Desktop.
   OneDrive's syncing breaks the link between the two folders. Use a plain
   folder like `C:\Users\<you>\Dev`.

Want the fuller picture of how hub-and-spoke works? Read
[How it works](https://esassoc.github.io/ecology/guide/) — it's the concepts;
this document is the machine.

---

## Part 1 — Accounts

Two accounts, both one-time, both may need someone else.

1. **GitHub** — GitHub is where the code lives online. Create a free account at
   [github.com](https://github.com) if you don't have one, then ask Andy to
   invite you to the **esassoc** organization with **write** access to your
   spoke repo (e.g. `cb-fish-design`). Write access is what lets you publish.
2. **Claude seat** — ask Andy. You'll sign in the first time you run Claude Code
   in Part 8.

Wait until the GitHub invitation email arrives and accept it before continuing.

---

## Part 2 — Open a terminal

A **terminal** is a window where you type commands instead of clicking buttons.
That's all it is. Everything in Parts 3–7 happens in one.

**Windows:** press the Start key, type `PowerShell`, press Enter.

> **On a Mac:** press `Cmd` + `Space`, type `Terminal`, press Enter. Every
> command below works the same; only the install commands in Part 3 differ, and
> those are noted.

Six things to know, and then you're fluent enough:

- **The prompt** is the text ending in `>` (Windows) or `$` (Mac) with your
  cursor after it. Seeing the prompt means the terminal is ready for a command.
- **One command per line.** Type or paste it, press Enter, and *wait for the
  prompt to come back* before the next one. Rushing ahead is the single most
  common beginner mistake — commands don't queue.
- **Pasting:** `Ctrl` + `V` works, and so does right-clicking. (On a Mac,
  `Cmd` + `V`.)
- **`cd` means "change directory"** — the terminal is always sitting *inside* one
  folder, and `cd` is how you move it. `cd ~/Dev/cb-fish-design` moves it into
  your spoke. `~` is shorthand for your home folder.
- **`Ctrl` + `C` stops whatever is currently running.** You'll use this to stop
  the preview server in Part 9. It's safe.
- **Closing the window is always safe.** Nothing is lost.

Errors in a terminal are normal and not dangerous. They're messages, not damage.

---

## Part 3 — Install four tools

Run these one at a time in the terminal you just opened, waiting for the prompt
to return between each. If your machine blocks installs, ask IT to run them.

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install GitHub.cli
```

What you just installed:

- **Git** — the tool that tracks changes to files and moves them between your
  computer and GitHub. It's the engine; GitHub is the website.
- **Node** (short for Node.js) — the program that runs the prototype site on
  your own computer so you can look at it in a browser before publishing. You'll
  never use it directly; the commands in Part 6 and Part 9 use it for you. Pick
  the **LTS** version ("Long Term Support"), which is what the command above
  installs — the system needs Node 20 or newer.
- **npm** — comes bundled with Node. It downloads the pieces a project depends
  on. This is what `npm install` does.
- **GitHub CLI** (`gh`) — lets the terminal sign in to your GitHub account so
  publishing works without pasting passwords.

> **On a Mac:** `xcode-select --install` for Git, then install
> [Node LTS from nodejs.org](https://nodejs.org), then `brew install gh` for the
> GitHub CLI. (`brew` is [Homebrew](https://brew.sh) — install it first if you
> don't have it.)

Then install **Claude Code** — the tool you'll actually work in — following the
current instructions at [code.claude.com](https://code.claude.com). On Windows,
use the installer.

**Now close your terminal and open a new one.** Newly installed tools are only
visible to terminals opened after the install. Then verify all four:

```bash
git --version
node --version
gh --version
claude --version
```

Each should print a version number. If one says "not recognized" or "command not
found", that tool didn't install — rerun its line above, then open a fresh
terminal again.

---

## Part 4 — Identify yourself to Git and GitHub

Git stamps your name on every change, so it needs to know who you are. Replace
the name and email with your own:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@esassoc.com"
gh auth login
gh auth setup-git
```

For `gh auth login`, choose **GitHub.com** → **HTTPS** → **login with a web
browser**, and follow the prompts in the browser that opens.

`gh auth setup-git` looks like it does nothing. It's the step that hands your
GitHub login to Git itself — **skip it and publishing fails later** with a
confusing password prompt. Run it.

---

## Part 5 — Download the two repos

"Cloning" means downloading a copy of a repo you can work in. Two clones, into a
plain `Dev` folder:

```bash
mkdir -p ~/Dev
cd ~/Dev
git clone https://github.com/esassoc/ecology.git
git clone https://github.com/esassoc/cb-fish-design.git
```

Swap the second line for your spoke if it's a different one:

| Spoke | Clone command |
|---|---|
| Beacon | `git clone https://github.com/esassoc/beacon-design.git` |
| CB Fish | `git clone https://github.com/esassoc/cb-fish-design.git` |
| Biochar Atlas | `git clone https://github.com/esassoc/biochar-design.git` |
| Noria | `git clone https://github.com/esassoc/noria-design.git` |
| Puget Sound Info | `git clone https://github.com/esassoc/ps-info-design.git` |

You now have `~/Dev/ecology` and `~/Dev/<your-spoke>` as siblings, which is
exactly what the two rules at the top require.

---

## Part 6 — Install each project's parts

A freshly cloned repo has the project's own files but not the outside pieces it
depends on. `npm install` downloads those. It prints a lot of text and takes a
few minutes per repo — that's normal, and warnings in the output are fine.

```bash
cd ~/Dev/ecology
npm install
npm run build:tokens
```

`npm run build:tokens` turns the design system's colors, spacing, and typography
into the stylesheet everything else reads. Your spoke can't render without it.

Then the spoke:

```bash
cd ~/Dev/cb-fish-design
npm install
```

---

## Part 7 — Check your work

From inside your spoke folder:

```bash
npm run doctor
```

This inspects your whole setup and prints one line per check. Every line should
start with `ok`, ending in **"All clear — you are ready to prototype."**

Any line starting with `FAIL` prints its own `fix:` line directly beneath it —
run that fix, then run `npm run doctor` again. Lines starting with `WARN` are
advisory; they won't stop you.

If `doctor` itself won't start and says "Cannot find module", the `ecology`
folder isn't sitting next to your spoke. Redo Part 5.

---

## Part 8 — First Claude Code launch

```bash
cd ~/Dev/cb-fish-design
claude
```

On first run you'll be asked to sign in with your Claude account. Then:

1. **Trust the folder** when prompted.
2. **Accept the "spoke-kit" plugin install.** This plugin is the whole point —
   it's the guardrails and the workflow commands. Without it, Claude doesn't
   know the rules of this system.
3. **Restart Claude Code** (type `/exit`, then `claude` again). Plugins load at
   startup, so the one you just installed isn't active until you do.

To confirm it worked, type `/` and look for `/new-prototype` in the list.

---

## Part 9 — See a prototype in your browser

This is the part you'll repeat constantly. In a **second terminal window** —
keep Claude running in the first:

```bash
cd ~/Dev/cb-fish-design
npm run dev
```

That starts a **preview server**: a small program that turns the project's files
into a real website served from your own computer. It prints a web address —
usually `http://localhost:4330`. Open it in your browser.

`localhost` means "this computer." Nobody else can see this address; it's your
private preview. Leave it running while you work — every change you or Claude
makes appears in the browser within a second, no refresh needed.

- **To stop it:** click that terminal and press `Ctrl` + `C`.
- **To start it again:** `npm run dev`.
- **If it says the port is in use:** it's already running in another window.
  Check your other terminals, or press `Ctrl` + `C` there.

Setup is done. Everything below is the actual work.

---

## The daily loop

Four commands, typed to Claude inside Claude Code. Claude explains what it's
doing as it goes; you never need to know the file names.

1. **`/new-prototype`** — Claude pulls the latest from both repos, interviews you
   (who's this for, what's the scenario, what's on the screen), then builds the
   screen out of design-system components and shows you the preview link.
2. **Iterate in plain language** — "make the filters a sidebar", "the table needs
   a status column", "this feels cramped", "use a lighter blue for the header."
   No jargon required. Watch the browser as it changes.
3. **`/design-qa`** — a quality pass: design rules, token discipline, broken
   styles, build check. Claude fixes what's safe and asks about the rest.
4. **`/ship`** — saves your work, syncs with teammates, publishes to the spoke's
   public site, and hands you the link. Published spokes live at
   `https://esassoc.github.io/<repo-name>/`.

Two more, as needed:

- **`/request-lego`** — when you need a component or style control the design
  system doesn't have yet. It files the request; Andy builds it into the hub.
- **`npm run doctor`** — whenever something feels broken.

---

## The rules

1. **Everything committed here is public.** Client-sensitive material —
   proposals, pricing, contacts, real correspondence — goes ONLY in
   `docs/private/`, which is never uploaded. When in doubt, ask Andy.
2. **Mock data is invented.** Realistic, credible, fictional. Never copied or
   "lightly edited" from client documents.
3. **Never edit the hub.** The `ecology` folder is shared by every project — a
   change there hits everyone. If something you need doesn't exist, run
   **`/request-lego`**. (Claude is blocked from hub edits automatically; this
   rule is for you.)
4. **Ship freely.** These are low-stakes prototypes, and publishing early and
   often is the point. `/ship` protects you and your teammates from overwriting
   each other's work.

---

## When something's weird

| What you see | What it means |
|---|---|
| Anything at all feels broken | Run `npm run doctor` first. It diagnoses the common problems and prints the fix. |
| Claude says something is **BLOCKED** | A guardrail working as designed. The message says what to do instead — usually "use the design-system component" or "run `/request-lego`". |
| `command not found` / `not recognized` | That tool isn't installed, or you're in a terminal opened before it was. Open a fresh terminal (Part 3). |
| "Cannot find module" from `doctor` | The `ecology` folder isn't a sibling of your spoke. Redo Part 5. |
| The browser page won't load | The preview server isn't running. `npm run dev` in your spoke folder (Part 9). |
| "Port already in use" | The preview server is already running in another terminal window. |
| Git asks for a password when publishing | You skipped `gh auth setup-git`. Run it (Part 4). |
| Your spoke looks unstyled or colors are wrong | The hub's tokens aren't built. `cd ~/Dev/ecology && npm run build:tokens`. |
| Still stuck | Message Andy with the `npm run doctor` output and what you were doing. |

---

## Glossary

| Term | What it is |
|---|---|
| **Terminal** | A window where you type commands instead of clicking. PowerShell on Windows, Terminal on Mac. |
| **Command line** | Another name for the same thing. |
| **Git** | The tool that tracks file changes and syncs them with GitHub. |
| **GitHub** | The website where the code lives, so a team can share it. |
| **Repo** (repository) | One project's folder of files, tracked by Git. |
| **Clone** | Download your own working copy of a repo. |
| **Commit** | Save a labeled snapshot of your changes. `/ship` does this for you. |
| **Push / pull** | Send your commits to GitHub / fetch teammates' commits down. |
| **Node** | The program that runs the site on your computer. |
| **npm** | Node's downloader for the outside pieces a project depends on. |
| **Dependency** | An outside piece of code a project needs to run. |
| **Astro** | The website framework the prototypes are built with. It turns component files into plain HTML — which is why prototypes hand off cleanly to any dev team. |
| **Preview server / dev server** | The program `npm run dev` starts to serve the site locally. |
| **localhost** | "This computer." A private web address only you can reach. |
| **Port** | The number after `localhost:` — which local program you're reaching. Spokes use `4330`. |
| **Hub** | The `ecology` repo. The shared design system. Never edited from a spoke. |
| **Spoke** | One project's prototype repo, re-skinning the hub. Where you work. |
| **Component** (or "lego") | A reusable interface piece — button, card, table, badge. |
| **Token** | A named design value — a color, a spacing step, a font size. Re-pointing tokens is how a spoke gets its brand. |
| **Claude Code** | The tool you work in — Claude, running in your terminal, with access to your project's files. |
| **spoke-kit** | The Claude plugin carrying this system's rules, guardrails, and `/`-commands into your spoke. |
| **Build** | Converting project files into the finished website. `/ship` does it before publishing. |
