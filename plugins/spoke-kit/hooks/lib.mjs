// Shared helpers for the spoke-kit PreToolUse hooks. Node-only (no bash, no
// jq) so the hooks behave identically on macOS and Windows.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

/** Nearest EXISTING ancestor dir of p — Write targets may not exist yet. */
export function nearestExistingDir(p) {
  let dir = path.dirname(p);
  while (!existsSync(dir)) {
    const up = path.dirname(dir);
    if (up === dir) break; // filesystem root (works for both / and C:\)
    dir = up;
  }
  return dir;
}

function readPkg(dir) {
  try {
    return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Classify the repo containing `startDir` with ONE upward walk:
 *  - 'hub'   — a level has .claude-plugin/marketplace.json or a package.json
 *              named "ecology-hub". Checked FIRST at every level: a hub marker
 *              anywhere above wins, because the hub's own apps/site DEPENDS on
 *              @esa/ecology and would otherwise read as a spoke.
 *  - 'spoke' — some package.json on the walk lists @esa/ecology in
 *              dependencies/devDependencies (recorded, walk continues).
 *  - 'other' — neither.
 * startDir is realpath'd first: node_modules/@esa/ecology is a symlink into
 * the hub, and an unresolved walk from inside it never sees a hub marker.
 */
export function classifyDir(startDir) {
  let dir;
  try {
    dir = realpathSync(startDir);
  } catch {
    dir = path.resolve(startDir);
  }
  let spokeHit = false;
  for (;;) {
    if (existsSync(path.join(dir, '.claude-plugin', 'marketplace.json'))) return 'hub';
    const pkg = readPkg(dir);
    if (pkg) {
      if (pkg.name === 'ecology-hub') return 'hub';
      if (pkg.dependencies?.['@esa/ecology'] || pkg.devDependencies?.['@esa/ecology']) {
        spokeHit = true;
      }
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return spokeHit ? 'spoke' : 'other';
}

/** Parse the hook payload from stdin; null on any failure (callers fail open). */
export function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

/** Every piece of proposed text across Write / Edit / MultiEdit payloads. */
export function proposedContent(toolInput) {
  const parts = [];
  if (typeof toolInput.content === 'string') parts.push(toolInput.content);
  if (typeof toolInput.new_string === 'string') parts.push(toolInput.new_string);
  for (const e of toolInput.edits ?? []) {
    if (typeof e.new_string === 'string') parts.push(e.new_string);
  }
  return parts.join('\n');
}

/**
 * Opening-tag counts in a fragment, keyed by element name. Closing tags are
 * ignored: they mirror the openings, and an Edit fragment is routinely
 * unbalanced (`<div class="a">` on its own is a normal old_string).
 */
function tagCounts(s) {
  const counts = new Map();
  const re = /<([A-Za-z][\w.:-]*)(?=[\s/>])/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return counts;
}

/**
 * Does an Edit / MultiEdit payload COMPOSE structure — introduce an element
 * that was not already in the span it replaces?
 *
 * Composition gates exist to stop uncomponentized structure being ADDED. A
 * change that rewrites text, edits an attribute value, or deletes markup
 * introduces nothing, so it cannot violate a composition rule whatever state
 * the surrounding file is in. Counting (not just presence) keeps a second
 * <EsaCard> next to an existing one honest.
 *
 * Conservative on purpose: an ambiguous fragment reads as introducing
 * structure, so the gate still fires.
 */
export function editsIntroduceStructure(toolInput = {}) {
  const pairs = [];
  if (typeof toolInput.new_string === 'string') {
    pairs.push([toolInput.old_string ?? '', toolInput.new_string]);
  }
  for (const e of toolInput.edits ?? []) {
    if (typeof e.new_string === 'string') pairs.push([e.old_string ?? '', e.new_string]);
  }
  if (!pairs.length) return false;

  for (const [before, after] of pairs) {
    const b = tagCounts(before);
    for (const [name, n] of tagCounts(after)) {
      if (n > (b.get(name) ?? 0)) return true;
    }
  }
  return false;
}

/** Absolute target path — relative file_path resolves against the payload cwd. */
export function targetPath(payload) {
  const fp = payload?.tool_input?.file_path;
  if (!fp) return null;
  if (path.isAbsolute(fp)) return fp;
  const base = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return path.resolve(base, fp);
}
