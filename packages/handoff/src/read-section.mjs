// The in-page half of a capture: read one section's markup at a size an agent can
// read, plus every custom property resolving on it.
//
// Passed to page.evaluate, so it must stay self-contained: no imports, no closure.
//
// What makes a 119 KB spec out of a 3 KB design is the fixture: every row of a
// table, every card in a column, rendered in full. So on a CLONE of the section
// (the live page is untouched):
//   - a run of 4+ adjacent siblings sharing a tag and first class keeps its first
//     two, plus the first instance of each further class combination (so an
//     `--overdue` card variant survives), and the rest become one comment;
//   - <script> and <style> inside the section are dropped (data islands were the
//     megabyte case), each leaving a comment with its size;
//   - attribute values past 400 characters are cut, class and style excepted.
// Classes are read from the FULL markup before collapsing, so the styles of a
// dropped row still reach the spec.
export const READ_SECTION = ({ sel, keep = 2, variants = 3, attrMax = 400 }) => {
  const node = document.querySelector(sel);
  if (!node) return null;

  const fullHtml = node.outerHTML;
  const classes = [...new Set([...node.querySelectorAll('[class]'), node].flatMap((e) => [...e.classList]))];
  const tags = [...new Set([node, ...node.querySelectorAll('*')].map((e) => e.localName))];

  // Astro's scoping attributes come off the CLONE only: stripping them from the
  // live page un-styles every scoped component before its screenshot.
  const clone = node.cloneNode(true);
  for (const el of [clone, ...clone.querySelectorAll('*')])
    for (const a of [...el.attributes]) if (a.name.startsWith('data-astro-cid')) el.removeAttribute(a.name);
  let collapsed = 0;
  const kb = (n) => (n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);

  for (const el of [...clone.querySelectorAll('script, style')]) {
    const kind = el.localName === 'script' ? `script${el.type ? ` type="${el.type}"` : ''}` : 'style';
    el.replaceWith(document.createComment(` ${kind} removed (${kb(el.textContent.length)}) `));
  }
  for (const el of [clone, ...clone.querySelectorAll('*')])
    for (const a of [...el.attributes])
      if (a.name !== 'class' && a.name !== 'style' && a.value.length > attrMax)
        el.setAttribute(a.name, `${a.value.slice(0, 120)}… [${a.value.length} characters]`);

  const keyOf = (el) => `${el.localName}.${el.classList[0] || ''}`;
  const describe = (el) => `<${el.localName}${el.classList.length ? ` class="${el.className}"` : ''}>`;
  const walk = (parent) => {
    const kids = [...parent.children];
    let i = 0;
    while (i < kids.length) {
      let j = i + 1;
      while (j < kids.length && keyOf(kids[j]) === keyOf(kids[i])) j++;
      const run = kids.slice(i, j);
      if (run.length > keep + 1) {
        const shown = new Set();
        const kept = [];
        let extra = 0;
        run.forEach((el, n) => {
          const cls = el.getAttribute('class') || '';
          if (n < keep) kept.push(el);
          else if (!shown.has(cls) && extra < variants) {
            kept.push(el);
            extra++;
          } else return;
          shown.add(cls);
        });
        const keptSet = new Set(kept);
        const dropped = run.filter((el) => !keptSet.has(el));
        if (dropped.length) {
          kept[kept.length - 1].after(
            document.createComment(` …and ${dropped.length} more like this (${describe(run[0])}) `)
          );
          for (const el of dropped) el.remove();
          collapsed += dropped.length;
        }
      }
      i = j;
    }
    for (const child of parent.children) walk(child);
  };
  walk(clone);

  const root = getComputedStyle(document.documentElement);
  const cs = getComputedStyle(node);
  const values = {};
  for (const prop of root) if (prop.startsWith('--')) values[prop] = root.getPropertyValue(prop).trim();
  for (const prop of cs) if (prop.startsWith('--')) values[prop] = cs.getPropertyValue(prop).trim();

  return {
    html: clone.outerHTML,
    fullBytes: fullHtml.length,
    collapsed,
    classes,
    tags,
    tag: node.localName,
    values,
  };
};

// Guess sections for a route with no authored spec. Real page content only: when
// there is a <main>, its children (app chrome is shared, not the prototype), and a
// lone wrapper is descended through. Each section gets a structural selector so a
// fresh load can find it again, and a label from, in order: aria-label, landmark,
// a heading, a humanized component class, the tag.
export const DERIVE_SECTIONS = ({ prefixes }) => {
  const IGNORE = /^(script|style|link|template|noscript|astro-dev-toolbar|astro-island)$/;
  const visible = (el) => !IGNORE.test(el.localName) && el.getClientRects().length > 0;
  const kidsOf = (el) => [...el.children].filter(visible);
  let host = document.querySelector('main') || document.body;
  let kids = kidsOf(host);
  while (kids.length === 1 && kidsOf(kids[0]).length > 1) {
    host = kids[0];
    kids = kidsOf(host);
  }
  if (!kids.length) kids = [host];

  const path = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e === document.body) {
        parts.unshift('body');
        break;
      }
      if (e.id && /^[a-z][\w-]*$/i.test(e.id)) {
        parts.unshift(`#${e.id}`);
        break;
      }
      const n = [...e.parentElement.children].indexOf(e) + 1;
      parts.unshift(`${e.localName}:nth-child(${n})`);
    }
    return parts.join(' > ');
  };
  const LANDMARK = { nav: 'Nav', header: 'Header', footer: 'Footer', aside: 'Aside', form: 'Form' };
  const COMPONENT = new RegExp(`^(${prefixes.join('|')})-[a-z0-9-]+$`);
  const LAYOUT = /-(container|grid|row|col|stack|cluster|wrap|layout)(__|$)/;
  return kids.map((el) => {
    const heading = el.querySelector('h1,h2,h3')?.textContent?.trim().replace(/\s+/g, ' ');
    const cls = [el, ...el.querySelectorAll('[class]')]
      .flatMap((c) => [...c.classList])
      .find((c) => COMPONENT.test(c) && !c.includes('__') && !c.includes('--') && !LAYOUT.test(c));
    const humanized = cls?.replace(/^[a-z]+-/, '').replace(/-/g, ' ').replace(/^\w/, (m) => m.toUpperCase());
    const label =
      el.getAttribute('aria-label') || LANDMARK[el.localName] || heading || humanized || el.localName;
    return { label: label.slice(0, 60), selector: path(el) };
  });
};
