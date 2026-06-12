// Build-time collector for the /guide/toolkit page. Reads the spoke-kit plugin
// and hub scripts directly from the monorepo at BUILD time, so the published
// page always reflects the shipped toolkit — it cannot drift. No hand-edited
// lists: if it isn't in the plugin source, it isn't on the page.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// apps/site/src/data → repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const PLUGIN = path.join(ROOT, 'plugins', 'spoke-kit');

export interface ToolkitCommand {
  verb: string;
  summary: string;
}
export interface ToolkitSkill {
  name: string;
  description: string;
}
export interface ToolkitHook {
  name: string;
  matcher: string;
  summary: string;
}
export interface ToolkitScript {
  name: string;
  summary: string;
}

const read = (p: string) => readFileSync(p, 'utf8');

/** First N sentences of a text, markdown-stripped, clamped for table cells. */
function summarize(text: string, maxSentences = 2, maxChars = 230): string {
  const plain = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = plain.split(/(?<=[.!?])\s+/).slice(0, maxSentences).join(' ');
  return sentences.length > maxChars ? `${sentences.slice(0, maxChars - 1).trimEnd()}…` : sentences;
}

/** First paragraph (up to the first blank line) of a markdown file body. */
function firstParagraph(md: string): string {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, ''); // drop frontmatter if present
  const para = body.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? '';
  return para;
}

/** Header comment of an .mjs script: `//` block or `/** *\/` docblock after the shebang. */
function scriptHeader(src: string): string {
  const noShebang = src.replace(/^#!.*\n/, '');
  const slashes = noShebang.match(/^(\/\/[^\n]*\n)+/);
  if (slashes) return slashes[0].replace(/^\/\/ ?/gm, '');
  const block = noShebang.match(/^\/\*\*?([\s\S]*?)\*\//);
  if (block) return block[1].replace(/^\s*\* ?/gm, '');
  return '';
}

export const pluginVersion: string = JSON.parse(
  read(path.join(PLUGIN, '.claude-plugin', 'plugin.json')),
).version;

export const commands: ToolkitCommand[] = readdirSync(path.join(PLUGIN, 'commands'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({
    verb: `/${f.replace(/\.md$/, '')}`,
    summary: summarize(firstParagraph(read(path.join(PLUGIN, 'commands', f)))),
  }))
  .sort((a, b) => a.verb.localeCompare(b.verb));

export const skills: ToolkitSkill[] = readdirSync(path.join(PLUGIN, 'skills'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const md = read(path.join(PLUGIN, 'skills', d.name, 'SKILL.md'));
    const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? d.name;
    const description = summarize(fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? '');
    return { name, description };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const hooks: ToolkitHook[] = (() => {
  const config = JSON.parse(read(path.join(PLUGIN, 'hooks', 'hooks.json')));
  const out: ToolkitHook[] = [];
  for (const [event, entries] of Object.entries(config.hooks) as [string, any[]][]) {
    for (const entry of entries) {
      for (const h of entry.hooks ?? []) {
        const scriptArg = (h.args ?? []).find((a: string) => a.endsWith('.mjs'));
        if (!scriptArg) continue;
        const file = path.join(PLUGIN, 'hooks', path.basename(scriptArg));
        out.push({
          name: path.basename(scriptArg, '.mjs'),
          matcher: `${event}: ${entry.matcher ?? '*'}`,
          summary: summarize(scriptHeader(read(file)), 2),
        });
      }
    }
  }
  return out;
})();

export const scripts: ToolkitScript[] = ['create-spoke.mjs', 'doctor.mjs'].map((f) => ({
  name: `scripts/${f}`,
  summary: summarize(scriptHeader(read(path.join(ROOT, 'scripts', f))), 2),
}));

export const legoCount: number = readdirSync(path.join(ROOT, 'packages', 'ecology', 'src', 'components'))
  .filter((f) => f.startsWith('esa-'))
  .map((f) => f.replace(/\.(astro|ts)$/, ''))
  .filter((v, i, a) => a.indexOf(v) === i).length;
