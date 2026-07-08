Execute the migration of ONE app screen — rebuild it to match the design
spoke's prototype, section by section per the spoke's handoff (`decisions` /
`gotchas` = build spec, `acceptance` = gate), composing migrated `esa-*`
primitives + bespoke page shells.

$ARGUMENTS

Load the **`ecology-migrate-page`** skill and follow it for the named screen,
passing through any `--screen` / `--prototype` / `--spoke` / `--app` /
`--ecology` / `--reference-app` / `--beacon` / `--dry-run` arguments above. Page
migration is handoff-driven — if no handoff exists for the screen, the skill
stops rather than guessing.
