// The markdown an agent reads: one spec per section, a README per prototype and an
// index per spoke. Pure functions over captured data, so they are testable without
// a browser.
//
// Order inside a spec is the order an agent needs it: what the section is (title,
// source, picture, guidance), what to build it from (components, data), then the
// evidence (markup, styles, tokens). Every link is the deployed URL.

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';

export const kb = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`);

/** First sentence of a piece of prose, for one-line listings. */
export function oneLine(text, max = 160) {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  const m = flat.match(/^.*?[.!?](?=\s|$)/);
  const first = m ? m[0] : flat;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

const bullets = (title, arr) => (arr?.length ? [`## ${title}`, '', ...arr.map((x) => `- ${x}`), ''] : []);

/**
 * Normalise a spec's `data` field. Accepts a fixture path, or
 * `{ fixture, store, fields, enums, notes }` where fixture may be a list and
 * fields a list of names or a name → description map.
 */
export function normaliseData(data) {
  if (!data) return null;
  if (typeof data === 'string') data = { fixture: data };
  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const fields = Array.isArray(data.fields)
    ? data.fields.map((name) => [name, ''])
    : Object.entries(data.fields || {});
  return {
    fixtures: list(data.fixture),
    stores: list(data.store),
    fields,
    enums: Object.entries(data.enums || {}),
    notes: list(data.notes),
  };
}

/** Section `data` wins field by field over the prototype-level `data`. */
export const mergeData = (page, own) => (page || own ? { ...(page || {}), ...(own || {}) } : null);

function dataLines(raw) {
  const d = normaliseData(raw);
  if (!d) return [];
  const out = ['## Data', ''];
  if (d.fixtures.length) out.push(`- Fixture: ${d.fixtures.map((f) => `\`${f}\``).join(', ')}`);
  if (d.stores.length) out.push(`- Client store: ${d.stores.map((f) => `\`${f}\``).join(', ')}`);
  for (const n of d.notes) out.push(`- ${n}`);
  if (d.fields.length) {
    out.push('', '| Field | Meaning |', '|---|---|');
    for (const [name, what] of d.fields) out.push(`| \`${name}\` | ${what || ''} |`);
  }
  for (const [name, values] of d.enums)
    out.push('', `\`${name}\`: ${(Array.isArray(values) ? values : [values]).map((v) => `\`${v}\``).join(' · ')}`);
  out.push('');
  return out;
}

function componentLines(components, target) {
  if (!components?.length) return [];
  const out = ['## Components', ''];
  for (const c of components) {
    const where = c.source ? ` · \`${c.source}\`` : '';
    const use = c.target ? ` → use \`${c.target}\`${target?.name ? ` in ${target.name}` : ''}` : '';
    out.push(`- \`${c.name}\` (${c.origin})${where}${use}`);
  }
  out.push('');
  return out;
}

const fence = (lang, body) => ['```' + lang, body, '```'];

// Split text at line boundaries into pieces of at most `max` bytes. A single line
// longer than that is cut rather than allowed to blow the budget.
export function chunkLines(text, max) {
  const chunks = [];
  let cur = '';
  for (const line of text.split('\n')) {
    for (let piece = line; ; ) {
      const head = piece.slice(0, max);
      if (cur && cur.length + head.length + 1 > max) {
        chunks.push(cur);
        cur = '';
      }
      cur += (cur ? '\n' : '') + head;
      piece = piece.slice(max);
      if (!piece) break;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [''];
}

/**
 * Render one section's spec, split to fit the budget.
 * @returns {{name:string, text:string}[]} The spec first, then any parts.
 */
export function renderSpec(s, ctx) {
  const { fileSlug, budget, urlFor, prototype, sourceUrl, target } = ctx;
  const g = s.guide || {};
  const head = [`# ${s.label}`, '', `${prototype} · source prototype: ${sourceUrl}`, ''];
  if (s.shots?.desktop) {
    head.push(`![${s.label}, desktop](${urlFor(s.shots.desktop)})`, '');
    if (s.shots.phone) head.push(`Phone width: ${urlFor(s.shots.phone)}`, '');
  }
  if (g.intent) head.push(g.intent, '');
  head.push(
    ...bullets('Key decisions', g.decisions),
    ...bullets('Gotchas', g.gotchas),
    ...bullets('Done when', g.acceptance),
    ...componentLines(s.components, target),
    ...dataLines(s.data)
  );

  const collapsedNote = s.stats?.collapsed
    ? [`_${s.stats.collapsed} repeated elements are collapsed in the markup below; the comments say where._`, '']
    : [];
  const markup = ['## Markup', '', ...collapsedNote, ...fence('html', s.html), ''];
  const styles = s.css ? ['## Styles', '', ...fence('css', s.css), ''] : [];
  const tokens = s.tokens?.length
    ? ['## Tokens', '', '| Token | Value | Tier |', '|---|---|---|', ...s.tokens.map((t) => `| \`${t.name}\` | \`${t.value}\` | ${t.tier} |`), '']
    : [];

  const whole = [...head, ...markup, ...styles, ...tokens].join('\n');
  if (whole.length <= budget) return [{ name: `${fileSlug}.md`, text: whole }];

  // Over budget: the spec keeps everything but the code, which moves into parts.
  // Tokens stay in the spec when they fit, since they are what a re-skin needs.
  const parts = [];
  const addParts = (kind, lang, body) => {
    const room = budget - 400;
    const chunks = chunkLines(body, room);
    chunks.forEach((chunk, i) => {
      const name = `${fileSlug}.${kind}${chunks.length > 1 ? `-${i + 1}` : ''}.md`;
      const title = `# ${s.label}: ${kind}${chunks.length > 1 ? `, part ${i + 1} of ${chunks.length}` : ''}`;
      parts.push({ name, kind, text: [title, '', ...fence(lang, chunk), ''].join('\n') });
    });
  };
  addParts('markup', 'html', s.html);
  if (s.css) addParts('styles', 'css', s.css);

  const index = ['## Markup and styles', '', ...collapsedNote];
  for (const p of parts) index.push(`- [${p.name}](${urlFor(p.name)}) (${kb(p.text.length)})`);
  index.push('');
  let spec = [...head, ...index, ...tokens].join('\n');
  if (spec.length > budget) {
    parts.push({ name: `${fileSlug}.tokens.md`, kind: 'tokens', text: [`# ${s.label}: tokens`, '', ...tokens].join('\n') });
    index.splice(index.length - 1, 0, `- [${fileSlug}.tokens.md](${urlFor(`${fileSlug}.tokens.md`)})`);
    spec = [...head, ...index].join('\n');
  }
  return [{ name: `${fileSlug}.md`, text: spec }, ...parts];
}

/** handoff/<bundle>/README.md: the front door to one prototype. */
export function renderReadme(m, { urlFor }) {
  const lines = [`# ${m.title}`, '', `Source prototype: ${m.url}`, ''];
  if (m.description) lines.push(m.description, '');
  if (m.generatedFrom !== 'spec')
    lines.push('No authored guidance yet: these sections were derived from the page structure.', '');
  lines.push(...dataLines(m.data));
  lines.push('| Section | What it is | Spec | Screenshots |', '|---|---|---|---|');
  for (const s of m.sections) {
    const shots = [s.shots?.desktop && `[desktop](${urlFor(s.shots.desktop)})`, s.shots?.phone && `[phone](${urlFor(s.shots.phone)})`]
      .filter(Boolean)
      .join(' · ');
    const size = `${kb(s.bytes)}${s.files > 1 ? ` in ${s.files} files` : ''}`;
    lines.push(`| ${s.label} | ${oneLine(s.guide?.intent) || ''} | [${s.claudePath.split('/').pop()}](${urlFor(s.claudePath)}) ${size} | ${shots} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/** handoff/index.md: every prototype the spoke has a bundle for. */
export function renderIndex(name, bundles, { urlFor }) {
  const lines = [`# ${name ? `${name} ` : ''}handoff`, ''];
  for (const m of bundles) {
    const total = m.sections.reduce((n, s) => n + (s.bytes || 0), 0);
    const kind = m.generatedFrom === 'spec' ? '' : ', no authored guidance';
    lines.push(
      `## ${m.title}`,
      '',
      `[README](${urlFor(`${m.dir}/README.md`)}) · [prototype](${m.url}) · ${m.sections.length} sections, ${kb(total)}${kind}`,
      ''
    );
    for (const s of m.sections) {
      const intent = oneLine(s.guide?.intent);
      lines.push(`- [${s.label}](${urlFor(`${m.dir}/${s.claudePath}`)})${intent ? `: ${intent}` : ''} (${kb(s.bytes)})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
