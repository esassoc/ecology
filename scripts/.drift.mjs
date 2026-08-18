import { parseHex, oklchToHex } from './lib/color.mjs';
import CURVES from './lib/radix-curves.json' with { type: 'json' };
import { createRequire } from 'node:module';
const radix = createRequire(import.meta.url)('@radix-ui/colors');
let worst = 0, name = '';
for (const scale of ['indigo','orange','blue','crimson','cyan','violet','teal','grass']) {
  for (const scheme of ['light','dark']) {
    const curve = CURVES.curves[scheme][scale];
    const obj = radix[scheme === 'dark' ? scale + 'Dark' : scale];
    for (let i = 0; i < 12; i++) {
      const gen = oklchToHex(curve[i]);
      const real = obj[scale + (i + 1)].toLowerCase();
      const a = parseHex(gen), b = parseHex(real);
      const d = Math.max(...a.map((v, j) => Math.abs(v - b[j])));
      if (d > worst) { worst = d; name = `${scale}-${scheme}-${i+1}: generated ${gen} vs real ${real}`; }
    }
  }
}
console.log('worst per-channel drift (0-255):', worst);
console.log(' ', name);
