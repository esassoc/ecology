#!/usr/bin/env node
/**
 * a11y-names — does every form control actually HAVE the name you think it has?
 *
 * WHY THIS EXISTS SEPARATELY FROM `npm run a11y`
 *
 * axe answers "is there a name?" This answers "is it the RIGHT one?" — and the gap
 * between those two questions is where this kit was sitting on 2026-08-16:
 *
 *   esa-input-tag     visible label "Tags"         accessible name "Add a tag"
 *   esa-color-picker  visible label "Brand color"  accessible name "#000000"
 *
 * Both took their name from the PLACEHOLDER, because the visible <label> had no
 * `for`. axe's `label` rule passes that — a placeholder satisfies it — so
 * `npm run a11y` was green on both. It is nonetheless SC 2.5.3 Label in Name
 * (Level A): a speech-control user says what they SEE, and "click Tags" matches
 * nothing when the name is "Add a tag".
 *
 * The other half — controls with NO name at all — axe DOES catch, as
 * `aria-toggle-field-name` and `label`. Those are reported here too, because the
 * fix is the same edit and splitting the report across two tools helps nobody.
 *
 * WHAT IT DOES
 *
 * Serves the built site, drives Chromium, and for every form-associated control
 * inside an `esa-*` shadow root reads the accessible name out of CHROME'S OWN
 * accessibility tree (CDP `Accessibility.getPartialAXTree`) — not from the markup,
 * and not from a regex. Then compares it to the host's `label` attribute.
 *
 *   NO NAME   the control is exposed to AT and has no name        SC 4.1.2
 *   MISMATCH  it has a name that does not contain the visible one SC 2.5.3
 *
 * IGNORED NODES ARE SKIPPED, and that is not a detail. `esa-file-upload`'s
 * `input[type=file]` is `display: none` — it is not in the accessibility tree at
 * all, so "it has no name" is true and meaningless; the real control is the
 * `role="button"` drop zone beside it, which is named. An earlier version of this
 * script reported that hidden input as a failure and sent a fix after a non-bug.
 *
 * USAGE
 *   npm run build && node scripts/a11y-names.mjs
 *   node scripts/a11y-names.mjs --strict   # exit 1 on any finding (CI)
 *   node scripts/a11y-names.mjs --all      # every component, not just form controls
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/site/dist');
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const all = argv.includes('--all');

// The form-associated controls. Scoped by default because a full 66-page sweep
// runs well past two minutes and the interesting failures all live here.
const FORM_COMPONENTS = [
  'esa-text-field', 'esa-textarea', 'esa-select', 'esa-combobox', 'esa-date-picker',
  'esa-checkbox', 'esa-checkbox-group', 'esa-radio-group', 'esa-chip-group',
  'esa-color-picker', 'esa-file-upload', 'esa-range-slider', 'esa-switch-toggle',
  'esa-input-tag', 'esa-button-toggle',
];

const CONTROLS = [
  'input', 'textarea', 'select',
  '[role=combobox]', '[role=checkbox]', '[role=radio]', '[role=switch]',
  '[role=slider]', '[role=spinbutton]', '[role=textbox]', '[role=listbox]',
].join(',');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

if (!existsSync(DIST)) {
  console.error('No build found at apps/site/dist — run `npm run build` first.');
  process.exit(1);
}

// The production build sets Astro's `base` to /ecology/, so every asset URL carries
// that prefix. Serving dist at the root 404s all of them, the custom elements never
// upgrade, and the audit cheerfully reports zero controls. Strip it.
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]).replace(/^\/ecology/, '');
  let file = path.join(DIST, url);
  if (file.endsWith('/')) file = path.join(file, 'index.html');
  else if (!path.extname(file)) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/ecology`;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed — `npm i -D playwright && npx playwright install chromium`.');
  server.close();
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Accessibility.enable');
await cdp.send('DOM.enable');

const slugs = all
  ? readdirSync(path.join(DIST, 'components')).filter((d) => d.startsWith('esa-'))
  : FORM_COMPONENTS.filter((s) => existsSync(path.join(DIST, 'components', s)));

const findings = [];
let checked = 0;

for (const slug of slugs) {
  await page.goto(`${base}/components/${slug}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  // Auditing pre-upgrade HTML is how you get a meaningless all-clear on a kit that
  // is half web components — the same trap `npm run a11y` documents.
  const upgraded = await page
    .waitForFunction((t) => !!customElements.get(t), slug, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!upgraded) { console.log(`  ⚠️  ${slug} never upgraded — skipped, results would be meaningless`); continue; }
  await page.waitForTimeout(250);

  // Only hosts that carry a visible label: with nothing to compare against there is
  // no MISMATCH to find, and NO NAME on an unlabelled specimen is the page's choice.
  const targets = await page.evaluate(([tag, ctrl]) => {
    const out = [];
    document.querySelectorAll(tag).forEach((host, hi) => {
      const label = host.getAttribute('label');
      if (!host.shadowRoot || !label) return;
      const els = [...host.shadowRoot.querySelectorAll(ctrl)].filter((e) => e.type !== 'hidden');
      els.forEach((el, ci) => {
        const desc = el.tagName.toLowerCase()
          + (el.getAttribute('type') ? `[${el.getAttribute('type')}]` : '')
          + (el.classList[0] ? `.${el.classList[0]}` : '');
        // How many controls this host owns decides which question to ask — see the
        // note at `isGroupMember` below.
        out.push({ hi, ci, label, desc, siblings: els.length });
      });
    });
    return out.slice(0, 2); // two specimens per component is enough to prove the shape
  }, [slug, CONTROLS]).catch(() => []);

  for (const t of targets) {
    const expr = `(()=>{const h=[...document.querySelectorAll('${slug}')][${t.hi}];`
      + `return h && h.shadowRoot ? h.shadowRoot.querySelectorAll('${CONTROLS}')[${t.ci}] : null;})()`;
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: false });
    if (!result.objectId) continue;
    let node;
    try {
      ({ node } = await cdp.send('DOM.describeNode', { objectId: result.objectId }));
    } catch { continue; }
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
      backendNodeId: node.backendNodeId, fetchRelatives: false,
    });
    const ax = nodes.find((n) => n.backendDOMNodeId === node.backendNodeId);
    // Absent from the tree, or present but ignored (display:none, aria-hidden,
    // inert): not exposed to AT, so it has no name to get wrong.
    if (!ax || ax.ignored) continue;

    checked++;
    const name = (ax.name?.value ?? '').trim();
    const from = (ax.name?.sources ?? []).find((s) => s.value?.value)?.type ?? 'none';
    // A host with MANY controls is a group — a radio group, a chip group, a button
    // toggle. Its `label` names the GROUP; each member is named by its own option
    // text, so "Priority" vs "Low" is correct and comparing them is a category
    // error. (The first version of this script did exactly that and reported eight
    // false positives on components that had just been fixed.) Members still have
    // to HAVE a name — that half applies to everything.
    const isGroupMember = t.siblings > 1;
    if (!name) {
      findings.push({ slug, ...t, name, from, kind: 'NO NAME', sc: 'SC 4.1.2' });
    } else if (!isGroupMember && !name.toLowerCase().includes(t.label.toLowerCase())) {
      findings.push({ slug, ...t, name, from, kind: 'MISMATCH', sc: 'SC 2.5.3' });
    }
  }
}

await browser.close();
server.close();

console.log(`\naccessible-name audit — ${checked} exposed control(s) across ${slugs.length} component(s)\n`);
if (findings.length === 0) {
  console.log('  ✓ every control\'s accessible name contains its visible label\n');
} else {
  for (const f of findings) {
    console.log(`  [${f.kind}] ${f.slug} → ${f.desc}   (${f.sc})`);
    console.log(`      visible label   ${JSON.stringify(f.label)}`);
    console.log(`      accessible name ${JSON.stringify(f.name)}  (from: ${f.from})\n`);
  }
  console.log(`  ${findings.length} finding(s).`);
}

console.log(
  'Note: this does not replace `npm run a11y`, and neither replaces a keyboard.\n'
  + 'It answers one question axe cannot — whether the name a control HAS is the one\n'
  + 'a user can SEE and say.\n',
);

if (strict && findings.length) process.exit(1);
