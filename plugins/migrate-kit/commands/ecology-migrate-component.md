Execute the migration of ONE reusable primitive to its `esa-*` target — build
the Angular lego against the reference (a prior migration's `esa-*` legos, else
Beacon `ui-*`) + the hub token contract, reconcile the public API, migrate
consumers to compose it, retire the bespoke original, and verify.

$ARGUMENTS

Load the **`ecology-migrate-component`** skill and follow it for the named
component, passing through any `--component` / `--reference-app` / `--app` /
`--ecology` / `--beacon` / `--target` / `--dry-run` arguments above. If a
`components/<target>.md` playbook exists next to the skill, read it first.
