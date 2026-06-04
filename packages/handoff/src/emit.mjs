// Write the handoff/<name>/ folder: a self-contained, de-scoped HTML page, the
// trimmed stylesheet, a human-readable token contract + component manifest, and
// the machine-readable manifest.json the live overlay consumes.
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';
import prettier from 'prettier';

const TIER_ORDER = ['brand', 'semantic', 'component', 'primitive'];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';

// Which esa-*/cbf-* component blocks appear in a chunk of markup.
function componentsIn(html) {
  const blocks = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/))
      if (/^(esa|cbf)-/.test(c)) blocks.add(c.split('__')[0].split('--')[0]);
  return [...blocks].sort().map((b) => `${b} (${b.startsWith('cbf-') ? 'spoke' : 'hub'})`);
}

// A self-contained, fetchable spec for one section (or the full page): the prompt
// + de-scoped markup + used CSS + token table. This is what "Copy for Claude"
// links to — Claude web-fetches this one file and has everything to re-implement.
function specMarkdown({ label, name, url, theme, tag, html, css, tokens }) {
  const toks = tokens.length
    ? '| Token | Value | Tier |\n|---|---|---|\n' +
      tokens.map((t) => `| \`${t.name}\` | \`${t.value}\` | ${t.tier} |`).join('\n')
    : '_None._';
  return `# ${label}

Re-implement this UI section faithfully on your stack. Keep the CSS custom-property
names (\`var(--…)\`) so it stays themeable — the values below are the resolved
\`${theme || 'default'}\` theme of the **${name}** design system (an ESA Ecology spoke).

- **Source prototype:** ${url}
- **Section element:** \`<${tag}>\`
- **Components:** ${componentsIn(html).join(', ') || '—'}

## Markup (de-scoped, framework-free)
\`\`\`html
${html.trim()}
\`\`\`

## Styles (only what this section uses; tokens resolved for the theme)
\`\`\`css
${css.trim() || '/* inherits global/utility styles only */'}
\`\`\`

## Tokens
${toks}

---
_Full page, complete stylesheet, and all tokens: \`./full-page.md\`, \`../styles.css\`, \`../index.html\`._
`;
}

// Collect root-absolute asset refs (/foo.png) from HTML src= and CSS url(...).
function collectAssets(html, css) {
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+\.(?:png|jpe?g|svg|webp|gif))"/g)) refs.add(m[1]);
  for (const m of css.matchAll(/url\((\/[^)]+\.(?:png|jpe?g|svg|webp|gif))\)/g)) refs.add(m[1]);
  return [...refs];
}

function rewriteAssetPaths(text, refs) {
  let out = text;
  for (const ref of refs) {
    out = out.split(ref).join('assets/' + basename(ref));
  }
  return out;
}

async function copyAssets(refs, publicDirs, outDir) {
  if (!refs.length) return [];
  await mkdir(join(outDir, 'assets'), { recursive: true });
  const copied = [];
  for (const ref of refs) {
    const name = basename(ref);
    for (const dir of publicDirs) {
      try {
        await copyFile(join(dir, ref), join(outDir, 'assets', name));
        copied.push(name);
        break;
      } catch {
        /* try next public dir */
      }
    }
  }
  return copied;
}

const fmt = (source, parser) =>
  prettier.format(source, { parser, printWidth: 100 }).catch(() => source);

export async function emit({ outDir, name, capture, rootCss, tokens, components, publicDirs }) {
  await mkdir(outDir, { recursive: true });
  // Clear our generated subdirs first so stale assets/specs from a prior run
  // (e.g. an image since renamed or re-encoded) don't linger in the bundle.
  for (const sub of ['assets', 'claude', 'fonts']) {
    await rm(join(outDir, sub), { recursive: true, force: true });
  }

  const styleSheet = `${rootCss}\n\n${capture.componentCss}`;
  const assets = collectAssets(capture.bodyHtml, styleSheet);
  const copied = await copyAssets(assets, publicDirs, outDir);
  // Only rewrite refs we actually copied; leave un-found ones as original paths.
  const liveRefs = assets.filter((r) => copied.includes(basename(r)));

  const cssOut = rewriteAssetPaths(styleSheet, liveRefs);
  const bodyOut = rewriteAssetPaths(capture.bodyHtml, liveRefs);

  // --- index.html (standalone) ---
  const themeAttr = capture.themeAttr ? ` data-theme="${capture.themeAttr}"` : '';
  const html = `<!doctype html>
<html lang="en"${themeAttr}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${capture.title}</title>
${capture.fontLinks.join('\n')}
<style>
${cssOut}
</style>
</head>
<body>
${bodyOut}
</body>
</html>`;
  await writeFile(join(outDir, 'index.html'), await fmt(html, 'html'));
  await writeFile(join(outDir, 'styles.css'), await fmt(cssOut, 'css'));

  // --- tokens.md ---
  const byTier = (tier) => tokens.contract.filter((t) => t.tier === tier);
  let tokenMd = `# Token contract — ${name}\n\n`;
  tokenMd += `The ${tokens.contract.length} design tokens this page actually uses, resolved to their `;
  tokenMd += `final values for the \`${capture.themeAttr || 'default'}\` theme. Component CSS still `;
  tokenMd += `references them by name (\`var(--color-primary)\`), so the names carry the intent; the `;
  tokenMd += `values below are what they currently resolve to.\n\n`;
  for (const tier of TIER_ORDER) {
    const rows = byTier(tier);
    if (!rows.length) continue;
    tokenMd += `## ${tier[0].toUpperCase() + tier.slice(1)}\n\n`;
    tokenMd += `| Token | Value |\n|---|---|\n`;
    for (const t of rows) tokenMd += `| \`${t.name}\` | \`${t.value}\` |\n`;
    tokenMd += `\n`;
  }
  if (tokens.scoped.length) {
    tokenMd += `## Component-scoped\n\nDefined per-component (not at \`:root\`); see the component's own rule in \`styles.css\`.\n\n`;
    tokenMd += tokens.scoped.map((t) => `- \`${t.name}\``).join('\n') + '\n';
  }
  await writeFile(join(outDir, 'tokens.md'), tokenMd);

  // --- components.md ---
  let compMd = `# Components — ${name}\n\n`;
  compMd += `The component blocks composing this page. Hub (\`esa-*\`) components are the shared `;
  compMd += `standard; spoke (\`cbf-*\`) components are project-specific. Re-implement these on your `;
  compMd += `stack against the markup in \`index.html\` and the styles in \`styles.css\`.\n\n`;
  compMd += `| Component | Origin | Source |\n|---|---|---|\n`;
  for (const c of components) {
    const src = c.source ? c.source.replace(/^.*\/(packages|src)\//, '$1/') : '—';
    compMd += `| \`${c.component}\` | ${c.origin} | ${src} |\n`;
  }
  await writeFile(join(outDir, 'components.md'), compMd);

  // --- manifest.json (toolbar-app data source) ---
  // tier lookup so each section's tokens carry value + provenance; the panel
  // hides private (--_*) impl tokens and renders the rest grouped + with swatches.
  const tierOf = new Map(tokens.classified.map((t) => [t.name, t.tier]));
  const claudeDir = join(outDir, 'claude');
  await mkdir(claudeDir, { recursive: true });
  const usedSlugs = new Set();
  const uniqueSlug = (label) => {
    let s = slugify(label);
    while (usedSlugs.has(s)) s += '-2';
    usedSlugs.add(s);
    return s;
  };

  // Write one Claude spec per section; record BOTH a served path (→ hosted URL)
  // and the authoritative repo-relative path (for devs working in a checkout).
  const writeSpec = async (slug, spec) => {
    const file = join(claudeDir, `${slug}.md`);
    await writeFile(file, specMarkdown(spec));
    return { claudePath: `claude/${slug}.md`, repoPath: relative(process.cwd(), file) };
  };

  const sections = [];
  for (const s of capture.sections) {
    const secTokens = s.tokens
      .filter((n) => !n.startsWith('--_'))
      .map((n) => ({ name: n, value: (s.tokenValues || {})[n] || '', tier: tierOf.get(n) || 'component' }))
      .filter((t) => t.value);
    // Pre-formatted so the panel can highlight clean, indented code.
    const html = await fmt(rewriteAssetPaths(s.html, liveRefs), 'html');
    const css = await fmt(rewriteAssetPaths(s.css, liveRefs), 'css');
    const spec = await writeSpec(uniqueSlug(s.label), {
      label: s.label, name, url: capture.url, theme: capture.themeAttr, tag: s.tag, html, css, tokens: secTokens,
    });
    sections.push({ index: s.index, label: s.label, tag: s.tag, html, css, tokens: secTokens, ...spec });
  }

  // Whole-page payload + its spec, for the inspector's "Full page" option.
  const fullHtml = await fmt(bodyOut, 'html');
  const fullCss = await fmt(cssOut, 'css');
  const fullSpec = await writeSpec('full-page', {
    label: 'Full page', name, url: capture.url, theme: capture.themeAttr, tag: 'page', html: fullHtml, css: fullCss, tokens: tokens.contract,
  });

  const manifest = {
    name,
    url: capture.url,
    theme: capture.themeAttr,
    stats: capture.stats,
    tokens: tokens.contract,
    components,
    sections,
    full: { label: 'Full page', html: fullHtml, css: fullCss, tokens: tokens.contract, ...fullSpec },
  };
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // --- README.md ---
  const readme = `# Handoff — ${name}

Generated by \`@esa/handoff\` from a rendered prototype. A faithful, framework-free
snapshot of one page for a developer (or an AI agent) to re-implement on any stack.

- **\`index.html\`** — the page, de-scoped (no Astro \`data-astro-cid\` attributes) and
  standalone (trimmed CSS inlined, assets copied locally). Open it directly in a browser.
- **\`styles.css\`** — only the CSS rules this page uses, on plain class selectors, with a
  flattened token block at the top (each token defined once at its resolved value).
- **\`tokens.md\`** — the token contract: name → value, grouped by tier.
- **\`components.md\`** — the component blocks composing the page + their source.
- **\`manifest.json\`** — per-section data powering the live dev-mode overlay.

Source URL: ${capture.url}
Rules shipped: ${capture.stats.rulesMatched} · Tokens referenced: ${capture.stats.tokensReferenced}
`;
  await writeFile(join(outDir, 'README.md'), readme);

  return { assets: copied };
}
