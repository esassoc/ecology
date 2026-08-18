import fs from 'node:fs';
const src = fs.readFileSync('scripts/lib/dataviz.mjs', 'utf8');
const tmp = 'scripts/lib/.try6.mjs';
// restrict the wheel to scales that ship as primitives in BOTH schemes
fs.writeFileSync(tmp, src.replace(
  /const WHEEL = \[[^\]]*\];/,
  "const WHEEL = ['red', 'yellow', 'lime', 'grass', 'green', 'blue'];"
).replace(/const VARIANTS_PER_HUE = \d+;/, 'const VARIANTS_PER_HUE = 5;'));
const { deriveDataviz } = await import('./lib/.try6.mjs');
const { gradeCategorical } = await import('./lib/cvd.mjs');
const surfaces = { light: ['#fcfcfc', '#f9f9f9'], dark: ['#191919', '#111111'] };
const d = deriveDataviz({ seedHex: '#46a758', neutral: 'pure', surfaces });
console.log('hues:', d.hues.join(' → '), '| slots:', d.hues.length, '| tier:', d.tier);
for (const s of ['light','dark']) {
  const g = gradeCategorical(d[s].categorical, s);
  console.log(` ${s}:`, d[s].categorical.join(','));
  console.log(`   ${g.ok?'PASS':'FAIL'} worstCVD ${g.worstCvd.toFixed(1)} worstNormal ${g.worstNormal.toFixed(1)} outOfBand ${g.outOfBand.length}`);
}
fs.unlinkSync(tmp);
