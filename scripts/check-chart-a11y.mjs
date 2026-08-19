#!/usr/bin/env node
/*
 * check-chart-a11y — re-score AG Charts against the five questions, in a browser.
 *
 * WHY THIS EXISTS AND axe DOES NOT COVER IT. Every property asserted here was
 * measured, not read out of the vendor's docs, and axe reports a clean page while
 * all five are broken. A charting library's accessibility lives in behaviour —
 * whether arrows move between data points, whether animation stops when the OS asks
 * — and behaviour is not in the markup axe walks.
 *
 * The five questions are the library-selection rubric:
 *
 *   1. SVG or canvas?            canvas is opaque to AT unless something mirrors it
 *   2. Default role and name?    without them a chart announces as nothing, or noise
 *   3. Text/table alternative?   the robust way to convey values without sight
 *   4. Keyboard to data points?  tooltip-only data excludes keyboard and SR users
 *   5. prefers-reduced-motion?   entrance animation can disorient or nauseate
 *
 * AG Charts Community 14.1.0 answered: pass, pass-with-a-generic-name, FAIL, pass,
 * FAIL. `esa-chart` closes the two fails and the generic name. This asserts the
 * passes have not regressed AND that our own corrections are still applied — an
 * upgrade can silently undo either, and both would be invisible in a normal build.
 *
 * It also reports whether the tier-2 --color-background-dataviz-* family resolved or the
 * component's temporary fallback ramp fired, because a fallback that works silently
 * is how a token never gets wired.
 *
 *   node scripts/check-chart-a11y.mjs [--url http://localhost:4321] [--strict]
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bootSite } from './lib/site-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/site/dist');
const ROUTE = '/components/esa-chart/';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const baseUrl = args.includes('--url') ? args[args.indexOf('--url') + 1] : null;

/** The minimum a legend item must measure to satisfy SC 2.5.8. */
const TARGET_MIN = 24;

/*
 * Runs in the page. Returns raw observations only — every pass/fail decision is made
 * in node, so the rubric lives in one readable place rather than inside a string.
 */
const PROBE = `(async (targetMin) => {
  const hosts = [...document.querySelectorAll('esa-chart')];
  if (!hosts.length) return { error: 'no <esa-chart> on the page' };
  await customElements.whenDefined('esa-chart');
  // The library loads by dynamic import; give every chart a moment to paint.
  for (let i = 0; i < 60 && hosts.some((h) => !h.shadowRoot?.querySelector('canvas')); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }

  /*
   * MEASURE EVERY CHART, not just the first. The legend only exists on a chart with
   * more than one series, so probing a single host silently skips the SC 2.5.8 check
   * and reports a clean run — which is precisely the shape of failure this whole
   * script exists to prevent.
   */
  const host = hosts[0];
  const root = host.shadowRoot;
  if (!root) return { error: 'esa-chart has no shadow root' };

  const allLegendItems = hosts.flatMap((h) =>
    [...(h.shadowRoot?.querySelectorAll('.ag-charts-proxy-legend-toolbar [role="listitem"]') ?? [])]
      .map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }));

  const proxy = root.querySelector('.ag-charts-canvas-proxy');
  const canvas = root.querySelector('canvas');

  // The library names the focused datum via aria-labelledby into hidden siblings,
  // so aria-label alone reads as null on the very elements that carry the data.
  const nameOf = (el) => {
    if (!el) return null;
    const direct = el.getAttribute('aria-label');
    if (direct) return direct;
    const ref = el.getAttribute('aria-labelledby');
    if (!ref) return (el.textContent || '').trim() || null;
    const r = el.getRootNode();
    return ref.split(/\\s+/).map((id) => r.getElementById?.(id)?.textContent?.trim())
      .filter(Boolean).join(' ') || null;
  };

  // Focus the chart so the driver's REAL key presses land on it. Synthetic
  // KeyboardEvents are not enough here — dispatching one from script does move
  // through the listeners but does not drive the library's key handling, so an
  // in-page probe reports "arrows do nothing" on a chart that navigates fine.
  root.querySelector('[tabindex="0"]')?.focus();

  // Q5 + our fix: is animation actually off? The wrapper exposes its own state.
  const wrapper = root.querySelector('.ag-charts-wrapper');

  // SC 2.5.8: measure the rendered legend item, do not trust the config number.
  const legendItems = allLegendItems;

  return {
    chartCount: hosts.length,
    canvasCount: root.querySelectorAll('canvas').length,
    canvasHidden: canvas?.closest('[aria-hidden="true"]') != null,
    proxyPresent: proxy != null,
    proxyRole: proxy?.getAttribute('role') ?? null,
    proxyName: proxy ? nameOf(proxy) : null,
    focusable: root.querySelectorAll('[tabindex="0"]').length,
    animating: wrapper?.getAttribute('data-animating') ?? null,
    sceneRenders: Number(wrapper?.getAttribute('data-scene-renders') ?? 0),
    legendItems,
    targetMin,
    // Did the tier-2 family resolve, or did the fallback fire?
    dataviz: (() => {
      const out = [];
      for (let i = 1; i <= 8; i++) {
        const v = getComputedStyle(host).getPropertyValue('--color-background-dataviz-categorical-' + i).trim();
        if (v) out.push(v);
      }
      return { resolved: out.length, expected: 8 };
    })(),
  };
})(${TARGET_MIN})`;

const CHECK = (label, ok, detail) => ({ label, ok, detail });

/*
 * Does the chart PAINT at all, on each engine?
 *
 * Not a rubric question — a precondition for all five, and the one that has actually
 * broken. AG Charts ships its own colour parser, and a browser may serialise a
 * computed colour any equivalent way it likes: on a wide-gamut display Safari returns
 * `color(display-p3 …)` where Chrome and Firefox return `rgb(…)`. The parser throws,
 * `create()` never resolves, and the chart is an EMPTY BOX in Safari while looking
 * perfect in the browser you happen to be testing in. A single-engine check reports
 * five green passes on a component that is broken for every Safari user.
 */
async function renderSmokeTest(origin) {
  const pw = await import('playwright');
  const rows = [];
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    let browser;
    try {
      browser = await pw[engine].launch();
    } catch (e) {
      rows.push({ engine, ok: false, detail: `could not launch (${String(e.message).slice(0, 60)})` });
      continue;
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
    await page.goto(origin + ROUTE, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    const canvases = await page.evaluate(
      `[...document.querySelectorAll('esa-chart')].filter((h) => h.shadowRoot?.querySelector('canvas')).length`,
    );
    const total = await page.evaluate(`document.querySelectorAll('esa-chart').length`);
    rows.push({
      engine,
      ok: total > 0 && canvases === total,
      detail: `${canvases}/${total} chart(s) painted${errors.length ? ` — ${errors[0]}` : ''}`,
    });
    await browser.close();
  }
  return rows;
}

/**
 * Every Community series type, painted in the palette, with no option rejected.
 *
 * ADDED AFTER FOUR BUGS SURVIVED EVERY OTHER CHECK, all found by asking "which chart
 * types do we support?" rather than by any gate:
 *
 *   - pie and donut ignored the palette entirely — they take `fills` (an array, one
 *     per slice), `fill` was rejected, and AG Charts fell back to its OWN stock
 *     colours on a page whose entire point is the tokens;
 *   - scatter and bubble were sent a nested `marker`, which they do not accept
 *     (they ARE the marker) — a warning on every scatter chart the kit would draw;
 *   - bubble was sent `size`, which encodes its third variable and is derived;
 *   - scatter's default translucent fill painted 2.61:1 where the gated token
 *     measures 3.41:1 — BELOW SC 1.4.11, invisible to `check-contrast.mjs` because
 *     opacity is applied at paint time, downstream of every token check.
 *
 * The common shape: the chart still rendered and still looked deliberate. Only
 * comparing painted PIXELS against the token values catches any of it.
 */
const SERIES_CASES = {
  bar: [{ type: 'bar', xKey: 'month', yKey: 'rain' }],
  line: [{ type: 'line', xKey: 'month', yKey: 'rain' }],
  area: [{ type: 'area', xKey: 'month', yKey: 'rain' }],
  scatter: [{ type: 'scatter', xKey: 'temp', yKey: 'rain' }],
  bubble: [{ type: 'bubble', xKey: 'temp', yKey: 'rain', sizeKey: 'b' }],
  histogram: [{ type: 'histogram', xKey: 'rain' }],
  pie: [{ type: 'pie', angleKey: 'rain', legendItemKey: 'month' }],
  donut: [{ type: 'donut', angleKey: 'rain', legendItemKey: 'month', innerRadiusRatio: 0.6 }],
};

async function seriesTypeSweep(page) {
  const rejected = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' && /Unknown option/.test(m.text())) rejected.push(m.text().slice(0, 90));
  });

  const palette = await page.evaluate(`(() => {
    const cs = getComputedStyle(document.querySelector('esa-chart'));
    return Array.from({length: 8}, (_, i) =>
      cs.getPropertyValue('--color-background-dataviz-categorical-' + (i + 1)).trim().toLowerCase());
  })()`);

  await page.evaluate(`document.querySelector('esa-chart').data = [
    {month:'Jan',rain:20,temp:5,b:3},{month:'Feb',rain:35,temp:7,b:6},
    {month:'Mar',rain:28,temp:11,b:4},{month:'Apr',rain:42,temp:14,b:9}]`);

  const rows = [];
  for (const [name, series] of Object.entries(SERIES_CASES)) {
    rejected.length = 0;
    await page.evaluate(`document.querySelector('esa-chart').series = ${JSON.stringify(series)}`);
    await page.waitForTimeout(1200);
    // Count only EXACT palette pixels: anti-aliased edges are blends, and a blend is
    // precisely what the opacity bug produced, so near-matches must not count.
    const exact = await page.evaluate(
      `(() => {
        const cv = document.querySelector('esa-chart').shadowRoot.querySelector('canvas');
        const d = cv.getContext('2d', {willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;
        const seen = new Set();
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 250) continue;
          seen.add('#' + [d[i],d[i+1],d[i+2]].map((v) => v.toString(16).padStart(2,'0')).join(''));
        }
        return ${JSON.stringify(palette)}.filter((c) => seen.has(c)).length;
      })()`,
    );
    rows.push({ name, exact, rejected: [...rejected], ok: exact > 0 && rejected.length === 0 });
  }
  return rows;
}

async function main() {
  const { chromium } = await import('playwright');
  let boot;
  try {
    boot = await bootSite({ dist: DIST, url: baseUrl });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const { origin, server } = boot;

  const browser = await chromium.launch();
  const results = {};
  const consoleWarnings = [];

  for (const motion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ reducedMotion: motion });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'warning' && m.text().includes('esa-chart')) consoleWarnings.push(m.text());
    });
    await page.goto(origin + ROUTE, { waitUntil: 'load' });
    const observed = await page.evaluate(PROBE);

    // Q4 is driven from OUTSIDE the page: real key presses, not synthetic events.
    // The PROBE left focus on the chart; read the focused datum's name after each.
    const readFocusedName = () =>
      page.evaluate(`(() => {
        const root = document.querySelector('esa-chart')?.shadowRoot;
        const el = root?.activeElement;
        if (!el) return null;
        const ref = el.getAttribute('aria-labelledby');
        if (!ref) return el.getAttribute('aria-label');
        return ref.split(/\\s+/).map((id) => root.getElementById?.(id)?.textContent?.trim())
          .filter(Boolean).join(' ') || null;
      })()`);

    const dataNames = [await readFocusedName()];
    for (const key of ['ArrowRight', 'ArrowRight', 'End', 'Home']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
      dataNames.push(await readFocusedName());
    }
    results[motion] = { ...observed, dataNames };
    await ctx.close();
  }
  /*
   * BAIL BEFORE THE SWEEP, NOT AFTER IT. seriesTypeSweep() does
   * `document.querySelector('esa-chart').data = ...` with no guard, so on a route with
   * no <esa-chart> — a renamed page, a stale dist — the evaluate rejects. That used to
   * happen while this check still sat 8 lines below, so the intended
   * "✗ no <esa-chart> on the page" + exit 1 never printed; the process died on the
   * rejection instead, with the static server still listening.
   */
  const noChart = results['no-preference'];
  if (noChart?.error) {
    await browser.close();
    server?.close();
    console.error(`✗ ${noChart.error}`);
    process.exit(1);
  }

  // Series-type sweep on its own page, since it mutates the chart it measures.
  const sweepCtx = await browser.newContext();
  const sweepPage = await sweepCtx.newPage();
  await sweepPage.goto(origin + ROUTE, { waitUntil: 'load' });
  await sweepPage.waitForTimeout(4000);
  const seriesRows = await seriesTypeSweep(sweepPage);
  await sweepCtx.close();
  await browser.close();

  const engines = await renderSmokeTest(origin);
  server?.close();

  const r = results['no-preference'];

  const legendMin = r.legendItems.length ? Math.min(...r.legendItems.map((i) => i.h)) : null;

  const checks = [
    ...engines.map((e) => CHECK(`renders in ${e.engine}`, e.ok, e.detail)),
    CHECK(
      `all ${seriesRows.length} Community series types use the palette`,
      seriesRows.every((r) => r.ok),
      seriesRows.every((r) => r.ok)
        ? seriesRows.map((r) => r.name).join(', ')
        : seriesRows.filter((r) => !r.ok)
            .map((r) => `${r.name}: ${r.exact} palette colour(s)${r.rejected.length ? ` — ${r.rejected[0]}` : ''}`)
            .join('; '),
    ),
    CHECK(
      'Q1  canvas is mirrored by a proxy DOM',
      r.canvasCount > 0 && r.proxyPresent && r.canvasHidden,
      `canvas ${r.canvasCount}, proxy ${r.proxyPresent ? 'present' : 'MISSING'}, canvas ${r.canvasHidden ? 'aria-hidden' : 'NOT hidden from AT'}`,
    ),
    CHECK(
      'Q2  root has a role and a REAL name',
      r.proxyRole === 'figure' && !!r.proxyName && !/^chart, \d+ series$/.test(r.proxyName),
      `role=${r.proxyRole}, name=${JSON.stringify(r.proxyName)}`,
    ),
    CHECK(
      'Q4  arrow keys traverse data points',
      r.dataNames.filter(Boolean).length > 1 && new Set(r.dataNames.filter(Boolean)).size > 1,
      `${new Set(r.dataNames.filter(Boolean)).size} distinct datum name(s): ${JSON.stringify(r.dataNames.slice(0, 3))}`,
    ),
    CHECK(
      'Q5  animation is off under prefers-reduced-motion',
      results.reduce.animating !== 'true',
      `data-animating=${results.reduce.animating}`,
    ),
  ];

  /*
   * Legend target size is REPORTED, not asserted — the same stance
   * check-target-size.mjs takes, and for the same reason. A raw measurement under
   * 24px is not a violation: SC 2.5.8's spacing exception passes an undersized target
   * whose 24px circle clears its neighbours', axe implements that faithfully, and the
   * default legend earns it. Failing on the raw number here would demand a fix for a
   * conformant control. The verdict belongs to `npm run a11y`; this reports the size
   * so a layout change that quietly removes the exception is visible.
   */
  const legendNote =
    legendMin === null
      ? `no legend rendered across ${r.chartCount} chart(s) — a single-series chart has none, ` +
        'so this page does not exercise legend sizing'
      : `smallest of ${r.legendItems.length} legend item(s): ${legendMin}px tall` +
        (legendMin < TARGET_MIN
          ? ` — under the ${TARGET_MIN}px raw floor, passing 2.5.8 only by the spacing exception. ` +
            'Confirm with npm run a11y; the lever is legend.item.marker.size.'
          : '');

  console.log(`AG Charts accessibility rubric — ${ROUTE}\n`);
  for (const c of checks) console.log(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.label}\n         ${c.detail}`);

  // Q3 is a composition, not a component property — it cannot be asserted here.
  console.log(
    `\n  [MANUAL] Q3  text/data-table alternative\n` +
      `         AG Charts ships none. Satisfied by pairing the chart with an esa-grid,\n` +
      `         which is a page-authoring decision this script cannot see.`,
  );

  console.log(`\n  [REPORT] 2.5.8  legend target size\n         ${legendNote}`);

  const { resolved, expected } = r.dataviz;
  console.log(
    `\n  data-viz tokens: ${resolved}/${expected} of --color-background-dataviz-categorical-* resolved` +
      (resolved === expected ? '' : ' — component is on its TEMPORARY fallback ramp'),
  );
  if (consoleWarnings.length) {
    console.log('  component warnings:');
    for (const w of [...new Set(consoleWarnings)]) console.log(`    · ${w}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(
    failed.length
      ? `\n✗ ${failed.length} of ${checks.length} checks failed.`
      : `\n✓ all ${checks.length} automatable checks pass.`,
  );
  console.log(
    'Nothing here proves a screen reader ANNOUNCES any of it. That needs NVDA/Firefox\n' +
      'and VoiceOver/Safari — same limit npm run a11y:live carries.',
  );

  if (failed.length && strict) process.exit(1);
}

main().catch((err) => {
  // Without this the whole script dies on an unhandled rejection — non-zero, but with
  // no message a reader can act on, and any still-open handle keeps the process up.
  console.error('✗ check-chart-a11y failed:', err?.stack || err);
  process.exit(1);
});
