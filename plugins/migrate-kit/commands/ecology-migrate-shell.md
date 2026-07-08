Execute the one-time app-shell / IA restructure — e.g. a top header nav → the
spoke's collapsible sidebar `modern-layout` — reimplementing the root shell
against the spoke's `AppShell` + an Angular reference, re-housing the navigation
(routes, auth/role gating, user menu) and preserving every guard exactly.

$ARGUMENTS

Load the **`ecology-migrate-shell`** skill and follow it, passing through any
`--app` / `--spoke` / `--reference-app` / `--beacon` / `--ecology` / `--dry-run`
arguments above. This runs once (Slice 0b), before the per-unit component/page
slices — everything renders inside the new frame.
