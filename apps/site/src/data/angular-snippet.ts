// The hub's wiring for the Angular code tab: hands the pure transform in
// `scripts/lib/angular-snippet.mjs` the type oracle it needs, memoizes the
// result, and accumulates a build-time coverage report.
//
// The split is the point. The transform is isomorphic and testable; this file is
// the part that knows where the components live and which of them are real
// custom elements. `packages/docs/src/Preview.astro` — shared with every spoke —
// knows about neither, and only ever receives a finished string.
//
// WHICH TAGS ARE REAL ELEMENTS is the fact nothing else here records, and it is
// the one that keeps the tab honest: 39 of the 70 components are Lit `.ts` and
// register a custom element; the other 31 are `.astro`, compile-time only. The
// obvious names are in the wrong bucket — `esa-button`, `esa-badge`, `esa-icon`,
// `esa-form-field` are all `.astro`. Writing `<esa-badge>` in an Angular template
// renders literally nothing, so those pages get no Angular tab at all rather than
// a sample that silently does nothing.
// COMPONENTS, componentApi and ELEMENTS all come from component-api rather than
// being recomputed here. Two reasons, and the second is the one that bit:
//   (1) this module gets inlined into whichever chunk imports it, so counting
//       directories up from `import.meta.url` lands somewhere different depending
//       on the caller — it broke the build the first time these two files met.
//   (2) ELEMENTS was built HERE by a second walk of the same directory reading
//       the same files, and `ApiTable` imported it from this module. When the
//       table moved into `@esa/docs` (2026-08-19) it could not follow — this
//       module reads hub sources a spoke does not install. So the fact moved to
//       where it is already being read, and this is now its only consumer.
import { componentApi, COMPONENTS, ELEMENTS, isCustomElement } from './component-api';
import { toAngular } from '../../../../scripts/lib/angular-snippet.mjs';

export { isCustomElement };

type Outcome = 'generated' | 'override' | 'dead-override' | 'skipped';

interface Note { page: string; outcome: Outcome; reason?: string }

const notes: Note[] = [];
let reported = false;
const cache = new Map<string, { ok: true; code: string } | { ok: false; reason: string }>();

function transform(code: string, slug: string) {
  const key = `${slug}\0${code}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = toAngular(code, { api: componentApi, elements: ELEMENTS, slug });
    cache.set(key, hit);
  }
  return hit;
}

/**
 * Resolve the Angular snippet for one `<Preview>`.
 *
 * @param code      the HTML/Astro sample the page already shows
 * @param slug      the component the page documents
 * @param override  `string` to hand-write it, `false` to suppress the tab
 */
export function angularFor(
  code: string,
  slug: string,
  override?: string | false,
): string | null {
  if (override === false) {
    notes.push({ page: slug, outcome: 'skipped', reason: 'suppressed by the page' });
    return null;
  }

  const result = transform(code, slug);

  if (typeof override === 'string') {
    // A dead override is one the transform already agrees with — it adds a
    // second place to maintain and buys nothing. Same idea as reportApiDrift:
    // the failure is silent otherwise.
    const outcome: Outcome =
      result.ok && result.code.trim() === override.trim() ? 'dead-override' : 'override';
    notes.push({ page: slug, outcome });
    return override;
  }

  notes.push(
    result.ok
      ? { page: slug, outcome: 'generated' }
      : { page: slug, outcome: 'skipped', reason: result.reason },
  );
  return result.ok ? result.code : null;
}

/**
 * Print what the transform could and could not do, once per build.
 *
 * The escape hatch has to stay VISIBLE. A transform that quietly declines half
 * the corpus looks identical, from the outside, to one that covers it — and the
 * thing being measured is exactly how much of the documentation an Angular
 * reader actually gets.
 *
 * Fired from `process.on('exit')` rather than called by a layout, because pages
 * render one at a time and the notes are still accumulating: a call from
 * `ComponentDoc.astro` would report on whichever page happened to build first.
 * Nothing prints in dev, where the process never exits — this is a build report.
 */
export function reportAngularCoverage(): void {
  if (!notes.length || reported) return;
  reported = true;

  const generated = notes.filter((n) => n.outcome === 'generated').length;
  const overrides = notes.filter((n) => n.outcome === 'override').length;
  const dead = notes.filter((n) => n.outcome === 'dead-override');
  const skipped = notes.filter((n) => n.outcome === 'skipped');

  const covered = generated + overrides + dead.length;
  console.log(
    `\nangular snippets: ${covered}/${notes.length} covered ` +
      `(${generated} generated, ${overrides + dead.length} authored)`,
  );

  for (const d of dead) {
    console.warn(
      `⚠️  dead angular override on ${d.page}: the transform already produces this. ` +
        `Delete the \`angular\` prop.`,
    );
  }

  if (skipped.length) {
    const byReason = new Map<string, string[]>();
    for (const s of skipped) {
      const key = (s.reason ?? 'unknown').split(':')[0];
      byReason.set(key, [...(byReason.get(key) ?? []), s.page]);
    }
    console.log(`  no angular tab on ${skipped.length}:`);
    for (const [reason, pages] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`    ${String(pages.length).padStart(3)}  ${reason}  (${[...new Set(pages)].join(', ')})`);
    }
  }
}

process.on('exit', reportAngularCoverage);
