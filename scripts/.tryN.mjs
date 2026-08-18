import fs from 'node:fs';
const src = fs.readFileSync('scripts/lib/dataviz.mjs', 'utf8');
const { gradeCategorical } = await import('./lib/cvd.mjs');
const surfaces = { light: ['#fcfcfc', '#f9f9f9'], dark: ['#191919', '#111111'] };

const options = {
  'A: +orange-dark,teal-dark (8 hues)': ['red','orange','yellow','lime','grass','green','teal','blue'],
  'B: A + indigo,violet (10 hues)':     ['red','orange','yellow','lime','grass','green','teal','blue','indigo','violet'],
  'C: B + crimson,cyan (12 hues)':      ['red','orange','yellow','lime','grass','green','teal','blue','indigo','violet','crimson','cyan'],
};
for (const [label, wheel] of Object.entries(options)) {
  const tmp = `scripts/lib/.w${wheel.length}.mjs`;
  fs.writeFileSync(tmp, src.replace(/const WHEEL = \[[^\]]*\];/, `const WHEEL = ${JSON.stringify(wheel)};`));
  const { deriveDataviz } = await import(`./lib/.w${wheel.length}.mjs`);
  const d = deriveDataviz({ seedHex: '#46a758', neutral: 'pure', surfaces });
  const g = ['light','dark'].map((s) => gradeCategorical(d[s].categorical, s));
  console.log(`${label}\n   slots ${d.hues.length}  tier ${d.tier}  worstCVD ${g.map(x=>x.worstCvd.toFixed(1)).join('/')}  ok ${g.map(x=>x.ok).join('/')}`);
  console.log('   ', d.hues.join(' → '));
  fs.unlinkSync(tmp);
}
