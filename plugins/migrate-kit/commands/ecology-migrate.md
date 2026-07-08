Front door for the Ecology migration. Drives the whole pipeline — audit →
shell → the component and screen tracks, each gated by verify — **one unit at a
time, with a human review gate between each**. Never migrates the whole app
unattended.

$ARGUMENTS

Load the **`ecology-migrate`** skill (the conductor) and follow it end to end,
passing through any `--spoke` / `--app` / `--slice` / `--component` /
`--screen` / `--resume` arguments above. It sequences the other skills
(`ecology-audit`, `ecology-migrate-shell`, `ecology-migrate-component`,
`ecology-migrate-page`, `ecology-verify`) and checkpoints with you before and
after each unit.
