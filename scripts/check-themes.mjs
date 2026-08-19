#!/usr/bin/env node
/*
 * Grade every generated theme file across every axis it actually ships on.
 *
 * WHY THIS EXISTS. `check-contrast.mjs` grades ONE file, in ONE scheme, under ONE
 * profile — three axes it takes as flags and never iterates. So a theme file that
 * holds a light block, a dark block and two `[data-a11y-assurance]` blocks needs FOUR
 * runs to be covered, and the repo shipped npm scripts for none of them: `contrast` is
 * `--hub` only and `contrast:dark` targets docs-dark.css. Generated themes — the files a
 * spoke actually renders — were graded by hand or not at all, which for a gate means not
 * at all. This is the missing loop and nothing else.
 *
 * IT SHELLS OUT RATHER THAN IMPORTING THE GRADER, deliberately. Composing the token
 * layers (dist/tokens.css, then component-tokens.css, then the theme, filtered by scheme
 * and profile) is the part of check-contrast.mjs that is easy to reimplement almost
 * correctly — and that script's own history is a list of audits whose inputs quietly
 * stopped describing what they claimed to report on: one checked 0 pairs and exited 0
 * with "All text pairs pass AA". A second implementation of the composition is a second
 * chance at exactly that. One subprocess per combination costs a few hundred ms and
 * guarantees this tool and the gate can never disagree.
 *
 * PROFILES ARE DISCOVERED, NOT LISTED. The names come out of dist/tokens.css the same
 * way doctor.mjs reads them, so adding a `wcag-aaa` block to assurance.css puts it in
 * this matrix with no edit here. A hardcoded list is how the theme maker ended up
 * offering three of six neutral temperatures.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A path outside the cwd relativises to an ../../../.. chain that is longer and less
// readable than the absolute one. Show whichever is shorter to read.
const show = (f) => {
  const rel = path.relative(process.cwd(), f);
  return rel.startsWith('..') ? f : rel;
};

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRAST = path.join(HUB, 'scripts', 'check-contrast.mjs');
const SCHEMES = ['light', 'dark'];

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const paths = argv.filter((a) => !a.startsWith('--'));

if (argv.includes('--help')) {
  console.log(
    'usage: node scripts/check-themes.mjs [theme.css ...] [--verbose]\n\n' +
      'With no paths, looks for theme-*.css in src/styles (a spoke) then\n' +
      'apps/site/src/styles (this hub). Grades every file in every scheme,\n' +
      'with and without each assurance profile. Exits 1 if any run fails.',
  );
  process.exit(0);
}

// --- what to grade -----------------------------------------------------------
//
// BOTH LOCATIONS, because this script is for spokes as much as for the hub and the two
// disagree on layout. A spoke keeps its theme at src/styles/theme-<slug>.css; the hub's
// live under apps/site/. check-contrast.mjs only knows the spoke shape, which is why
// `npm run contrast` could never have covered the hub's own generated themes.
const discover = () => {
  for (const dir of ['src/styles', 'apps/site/src/styles']) {
    const abs = path.join(process.cwd(), dir);
    if (!existsSync(abs)) continue;
    const found = readdirSync(abs)
      .filter((f) => f.startsWith('theme-') && f.endsWith('.css'))
      .map((f) => path.join(abs, f));
    if (found.length) return found;
  }
  return [];
};

const themes = paths.length ? paths : discover();
if (!themes.length) {
  console.error(
    '✗ no theme files found — pass paths, or run from a repo with theme-*.css in\n' +
      '  src/styles or apps/site/src/styles.',
  );
  process.exit(1);
}

const tokensCss = path.join(HUB, 'packages/tokens/dist/tokens.css');
if (!existsSync(tokensCss)) {
  console.error('✗ packages/tokens/dist/tokens.css is missing — run `npm run build:tokens` first.');
  process.exit(1);
}
const profiles = [
  ...new Set(
    [...readFileSync(tokensCss, 'utf8').matchAll(/\[data-a11y-assurance="([^"]+)"\]/g)].map((m) => m[1]),
  ),
];

// --- run ---------------------------------------------------------------------

/*
 * One combination. check-contrast exits 1 on a failure OR on an under-resolved run, and
 * BOTH matter here — "only 41/64 pairs resolved" is not a pass with a caveat, it is an
 * audit that is not describing this theme. So the status is read from the output rather
 * than inferred from the exit code alone.
 */
function grade(file, scheme, profile) {
  const args = [CONTRAST, file, '--scheme', scheme, ...(profile ? ['--assurance', profile] : [])];
  let out;
  try {
    out = execFileSync(process.execPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // Non-zero exit is the normal path for a failing theme, not an error condition.
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    if (!out.trim()) return { status: 'error', detail: e.message, rows: [] };
  }
  const checked = /checked (\d+)\/(\d+) pairs/.exec(out);
  const failed = /(\d+) AA text-contrast failure\(s\)/.exec(out);
  const rows = out.split('\n').filter((l) => l.startsWith('FAIL ') || (verbose && l.startsWith('warn ')));
  if (/only \d+\/\d+ pairs resolved/.test(out)) return { status: 'unresolved', checked, rows };
  return {
    status: failed ? 'fail' : 'pass',
    failures: failed ? Number(failed[1]) : 0,
    checked: checked ? `${checked[1]}/${checked[2]}` : '?',
    rows,
  };
}

const COLUMNS = ['standard', ...profiles];
const W = Math.max(...COLUMNS.map((c) => c.length)) + 2;
let bad = 0;
// Which files failed their STANDARD column — read by the no-assurance-block note below,
// which needs to distinguish "no block because nothing needed moving" from "no block and
// something did". `bad` is a count and cannot answer that.
const failedStandard = new Set();

for (const file of themes) {
  console.log(`\n${show(file)}`);
  console.log(`  ${''.padEnd(W)}${SCHEMES.map((s) => s.padEnd(14)).join('')}`);
  const detail = [];
  for (const [i, profile] of [null, ...profiles].entries()) {
    const cells = [];
    for (const scheme of SCHEMES) {
      const r = grade(file, scheme, profile);
      if (r.status !== 'pass') {
        bad++;
        if (profile === null) failedStandard.add(file);
      }
      const cell =
        r.status === 'pass' ? `${r.checked} ok`
          : r.status === 'fail' ? `${r.checked} ✗${r.failures}`
          : r.status === 'unresolved' ? 'UNRESOLVED'
          : 'ERROR';
      cells.push(cell.padEnd(14));
      if (r.rows.length) detail.push([`${COLUMNS[i]} / ${scheme}`, r.rows]);
    }
    console.log(`  ${COLUMNS[i].padEnd(W)}${cells.join('')}`);
  }
  for (const [label, rows] of detail) {
    console.log(`\n  ${label}:`);
    for (const r of rows) console.log(`    ${r}`);
  }
}

/*
 * A THEME THAT DECLARES NO ASSURANCE BLOCK IS NOT FAILING, and the matrix has to say so
 * rather than showing an identical column. `make-theme.mjs` emits one for every theme, so
 * a flat column means a HAND-AUTHORED theme — which is the case this note is for, since
 * that author is the one who has never been told the axis exists.
 */
if (profiles.length) {
  // MATCH A SELECTOR, NOT THE STRING. A generated theme names the attribute in its own
  // header comment ("inert until <html data-a11y-assurance=...> is set"), so a substring
  // test reports every file as having a block — including one whose blocks were deleted.
  // Comments come out first, then a real rule is a selector followed by `{`.
  const hasBlock = (f) =>
    /\[data-a11y-assurance="[^"]+"\][^{}]*\{/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
  const flat = themes.filter((f) => !hasBlock(f));
  if (flat.length) {
    // AN ABSENT BLOCK IS THE NORMAL RESULT, and this note used to say the opposite.
    // It read "regenerate to get one" — advice that was already true when the only row
    // the generator emitted was `--color-content-default-muted` (step 10 -> 11), which
    // fired for every brand in both schemes. That role has since been merged into
    // `-secondary`, so a well-formed theme has nothing left to move and regenerating
    // produces the same empty block. Telling the reader to regenerate would send them
    // round a loop that cannot terminate.
    //
    // The profile columns still are not evidence — that part was and is correct, because
    // the hub's own profile cannot move a spoke's brand (equal specificity, and the theme
    // stylesheet loads later). So the note keeps the caveat and drops the instruction.
    const allPass = flat.every((f) => !failedStandard.has(f));
    console.log(
      `\nnote: ${flat.length} theme(s) declare no [data-a11y-assurance] block, so the profile\n` +
        '  columns above grade the base values twice. The hub\'s own profile cannot move a\n' +
        '  spoke\'s brand (equal specificity, theme loads later), so those columns are not\n' +
        `  evidence of anything: ${flat.map((f) => path.basename(f)).join(', ')}\n` +
        (allPass
          ? '  Those themes pass their standard columns, so an empty block is the CORRECT\n' +
            '  output rather than a missing one — it says the base theme is already AA.\n' +
            '  A block is only emitted when a brand fails something the profile can move.'
          : '  At least one of them FAILS a standard column, which a profile block could have\n' +
            '  rescued. Regenerate with `npm run theme:make --recipe <file>.json`.'),
    );
  }
}

console.log(
  bad
    ? `\n✗ ${bad} of ${themes.length * COLUMNS.length * SCHEMES.length} combination(s) failed.`
    : `\n✓ ${themes.length * COLUMNS.length * SCHEMES.length} combination(s) pass — ` +
        `${themes.length} theme(s) × ${COLUMNS.length} profile(s) × ${SCHEMES.length} scheme(s).`,
);
process.exit(bad ? 1 : 0);
