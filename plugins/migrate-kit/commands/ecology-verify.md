Visual-fidelity gate for a migration — render before/after against the real
theme tokens (an isolated harness for primitives; the live authenticated app
for pages/shells), emit a self-contained side-by-side page + a navigable index,
and adjudicate each delta as intentional vs regression (plus a handoff section's
`acceptance` checks when one applies).

$ARGUMENTS

Load the **`ecology-verify`** skill and follow it, passing through any
`--component` / `--before` / `--after` / `--app` / `--ecology` / `--beacon` /
`--out-root` / `--handoff` arguments above. The output is a gitignored review
gallery under `.playwright-mcp/ecology-verify/`.
