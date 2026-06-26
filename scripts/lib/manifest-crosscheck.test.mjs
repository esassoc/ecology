/*
 * Smoke test for the manifest<->reality cross-check (run: `npm test`).
 * Zero deps — node:test + node:assert, same ethos as the rest of spoke-kit.
 *
 * Fixtures mirror a demo spoke's reference pages (the canonical zero-CSS
 * manifest pattern), including the load-bearing edge case: a slotted sub-component
 * (<DemoButtonLink> inside <DemoPageHeader>) must NOT read as drift.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossCheckManifest } from './manifest-crosscheck.mjs';

const rules = (src) => crossCheckManifest(src).errors.map((e) => e.rule);

// A clean composed page: every declared section is imported + used at section level;
// a button-link is slotted INSIDE the page-header section (legit, not a section).
const CLEAN = `---
import AppLayout from '../../layouts/AppLayout.astro';
import EsaBreadcrumbs from '@esa/ecology/esa-breadcrumbs.astro';
import DemoPageHeader from '../../components/demo-page-header.astro';
import DemoButtonLink from '../../components/demo-button-link.astro';
import DemoStatGroup from '../../components/demo-stat-group.astro';
import { withBase } from '../../lib/base';
---
<AppLayout title="Home">
  <!-- manifest:
    layout: stack(2xl)
    sections:
      - crumbs -> esa-breadcrumbs
      - hero   -> demo-page-header
      - stats  -> demo-stat-group
  -->
  <div class="center stack" data-gap="2xl">
    <EsaBreadcrumbs items={crumbs} />
    <DemoPageHeader title="t" lede="l">
      <DemoButtonLink href={withBase('/x')} variant="primary">Explore</DemoButtonLink>
      <DemoButtonLink href={withBase('/y')}>Browse</DemoButtonLink>
    </DemoPageHeader>
    <DemoStatGroup stats={stats} />
  </div>
</AppLayout>
`;

test('clean page passes — section components reconcile, slotted child is exempt', () => {
  const { manifest, errors } = crossCheckManifest(CLEAN);
  assert.equal(manifest, true);
  assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
});

test('declared-but-absent fires when a declared section loses its import', () => {
  // Drop the DemoStatGroup import line — manifest still declares `stats`.
  const broken = CLEAN.replace(/import DemoStatGroup.*\n/, '');
  const errs = crossCheckManifest(broken).errors;
  assert.ok(
    errs.some((e) => e.rule === 'manifest-declared-absent' && /demo-stat-group/.test(e.detail)),
    JSON.stringify(errs, null, 2),
  );
  // It must NOT also (falsely) report the slotted button-link as undeclared drift.
  assert.ok(!rules(broken).includes('manifest-undeclared-section'));
});

test('used-but-undeclared fires for a stray section-level component', () => {
  // Add a top-level <EsaWhatever/> that no manifest section declares.
  const drifted = CLEAN.replace(
    '<DemoStatGroup stats={stats} />',
    '<DemoStatGroup stats={stats} />\n    <EsaWhatever />',
  );
  const errs = crossCheckManifest(drifted).errors;
  assert.ok(
    errs.some((e) => e.rule === 'manifest-undeclared-section' && /esa-whatever/.test(e.detail)),
    JSON.stringify(errs, null, 2),
  );
});

test('no manifest -> cross-check is skipped (existence is gate-1 check-manifest)', () => {
  const noManifest = CLEAN.replace(/<!-- manifest:[\s\S]*?-->/, '');
  const { manifest, errors } = crossCheckManifest(noManifest);
  assert.equal(manifest, false);
  assert.deepEqual(errors, []);
});

test('a section declared but never rendered fires declared-but-absent', () => {
  // Manifest declares `extra -> demo-footer`; nothing imports or renders it.
  const declaresGhost = CLEAN.replace(
    '      - stats  -> demo-stat-group',
    '      - stats  -> demo-stat-group\n      - extra  -> demo-footer',
  );
  const errs = crossCheckManifest(declaresGhost).errors;
  assert.ok(
    errs.some((e) => e.rule === 'manifest-declared-absent' && /demo-footer/.test(e.detail)),
    JSON.stringify(errs, null, 2),
  );
});
