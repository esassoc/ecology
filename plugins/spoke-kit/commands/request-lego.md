File a request on the ecology hub for a missing or insufficient lego (component,
pattern, or theming token hook). This is the right move whenever something you
need doesn't exist — spokes never edit the hub directly.

$ARGUMENTS

## 1. Make sure it's really missing

- List the live catalog: `ls node_modules/@esa/ecology/src/components/` and
  check the closest candidates (load the `component-first` skill's
  lego-lookup.md recipes). Maybe the need is a **token hook** on an existing
  lego rather than a new component — say which.

## 2. Gather (briefly)

- **What's missing** — one sentence.
- **The use case** — which prototype/screen needs it, for whom.
- **Closest existing lego** and why it doesn't fit.
- **Workaround used meanwhile** (if any) — e.g. a documented spoke-prefixed
  component with a `bcn-lego-checked:` justification.

## 3. File it

Confirm the summary with the user, then:

```bash
gh issue create --repo esassoc/ecology \
  --title "lego request: <short name>" \
  --body "<the four points above, plus the requesting spoke + date>"
```

If `gh` isn't authenticated, say so and offer the fallback: write the same
content to the user to send to Andy directly.

## 4. Set expectations

Tell the user: Andy triages hub requests; when the lego ships, a normal
start-of-day sync (`git -C ../ecology pull`, which /new-prototype does
automatically) picks it up — no reinstall needed.
