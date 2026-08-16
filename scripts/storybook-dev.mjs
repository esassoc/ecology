/**
 * Start both Storybooks in the ORDER COMPOSITION REQUIRES: the Astro one
 * (the ref) first, fully up, and only then the Lit one (the host).
 *
 * WHY ORDER MATTERS — this is the whole reason this script exists instead of a
 * one-line `npm-run-all --parallel`:
 *
 * The host resolves its refs by fetching <ref>/index.json. If the ref is already
 * listening, that fetch happens SERVER-SIDE, in Node, where CORS does not exist,
 * and the index is inlined into the manager. If the ref is not up yet, the host
 * falls back to fetching from the BROWSER — and there Storybook v10 sends
 * `credentials: 'include'` against a dev server that answers
 * `Access-Control-Allow-Origin: *`, which is illegal in credentials mode. The
 * browser blocks it and the sidebar shows an "Astro (.astro)" header with
 * nothing under it. No error surfaces in the Storybook UI; it is console-only.
 * See storybookjs/storybook#17696 and #33724.
 *
 * Running the two in parallel is therefore a RACE, and it silently loses about
 * half the time — which is exactly how all 31 .astro components (esa-button
 * among them) went missing from the sidebar while every build reported success.
 *
 * Three fixes that look right and do nothing, all measured — do not re-add them:
 *   - `credentials: 'omit'` on the ref in the host's main.ts. Not a supported
 *     ref option in v10; the request still goes out with credentials.
 *   - `server.cors` via viteFinal on the ref. Storybook writes its own header
 *     afterwards, so the wildcard wins.
 *   - `.storybook/middleware.js` on the ref. The /index.json route is registered
 *     BEFORE the middleware chain, so the middleware never runs for it.
 *
 * And never check this with curl: curl does not enforce CORS, so the wildcard
 * header looks perfectly healthy while every browser rejects it. Use a browser.
 */
import { spawn } from 'node:child_process';

const REF = { name: 'astro', workspace: '@esa/storybook-astro', port: 6007 };
const HOST = { name: 'lit', workspace: '@esa/storybook', port: 6006 };

const READY_TIMEOUT_MS = 120_000;
const POLL_MS = 400;

const children = [];

function start({ name, workspace }) {
  const child = spawn('npm', ['run', 'dev', '--workspace=' + workspace], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  child.on('exit', (code) => {
    // If either half dies the pair is useless — composition needs both.
    if (code !== 0 && code !== null) {
      console.error(`[storybook] ${name} exited with ${code}; shutting down`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
}

async function waitForPort(port, label) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/index.json`);
      if (res.ok) return true;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(
    `[storybook] ${label} did not become ready on :${port} within ${READY_TIMEOUT_MS / 1000}s. ` +
      `Starting the host anyway would silently drop every .astro component from the sidebar.`,
  );
}

function shutdown(code = 0) {
  for (const c of children) c.kill('SIGTERM');
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(`[storybook] starting ${REF.name} (the ref) on :${REF.port} — must be up before the host`);
start(REF);
await waitForPort(REF.port, REF.name);

console.log(`[storybook] ${REF.name} ready; starting ${HOST.name} (the host) on :${HOST.port}`);
start(HOST);
await waitForPort(HOST.port, HOST.name);

console.log(`\n[storybook] both up — open http://localhost:${HOST.port} (the .astro half appears under "Astro (.astro)")\n`);
