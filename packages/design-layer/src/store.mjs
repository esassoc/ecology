// The design layer's persistence, on the dev server's side: reads and writes
// <spoke>/<dataDir>/{tweaks.json, tweaks.css, feedback.jsonl}. Node only, no
// framework, so any dev adapter (Astro's today) can serve it. The real token
// files are never touched; promoting a tweak into them is a person's call.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} dir absolute path of the data folder */
export function createStore(dir) {
  mkdirSync(dir, { recursive: true });
  const file = (name) => join(dir, name);
  const read = (name, fallback) => (existsSync(file(name)) ? readFileSync(file(name), 'utf8') : fallback);
  const feedback = () => read('feedback.jsonl', '').split('\n').filter((l) => l.trim()).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
  const tweaks = () => {
    try { return JSON.parse(read('tweaks.json', '{}')); } catch { return {}; }
  };
  return {
    dir,
    css: () => read('tweaks.css', ''),
    /** What the panel renders from. */
    state: () => ({ tweaks: tweaks(), feedback: feedback() }),
    saveTweaks({ json, css }) {
      writeFileSync(file('tweaks.json'), `${JSON.stringify(json, null, 2)}\n`);
      writeFileSync(file('tweaks.css'), css);
    },
    addComment(record) {
      appendFileSync(file('feedback.jsonl'), `${JSON.stringify(record)}\n`);
    },
    setStatus({ id, status }) {
      const rows = feedback().map((r) => (r.id === id ? { ...r, status } : r));
      writeFileSync(file('feedback.jsonl'), rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
    },
  };
}
