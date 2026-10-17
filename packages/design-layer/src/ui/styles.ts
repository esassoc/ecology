// The design layer's control kit, matched to Figma UI3's right panel. Every
// number comes from the measured reference (esa drafts/ecology/design-layer/
// figma-reference/SPEC.md): Andy's 2x screenshots measured pixel by pixel, and
// Figma's own design-system variables read from figma.com in both themes.
//
// The grid has no label column: 16 · field · 8 · field · 8 · icon 24 · 8.
// At 240 the fields are 88; dragged wider, the two field columns share the
// growth. Words live in a section title, a field's prefix slot, or a field's
// right-aligned suffix (Figma's "Fill" / "Hug").
//
// The face is Inter, registered under a private family name (fonts.ts) so it
// never reaches the page. 450 is body, 550 strong: Inter's variable axis.
export const UI_CSS = `
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }

  /* ── Figma's semantic tokens, light and dark (figma-tokens.json) ── */
  .ui, .ui[data-theme="light"] {
    --bg: #ffffff;
    --field: #f5f5f5;
    --hover: #f5f5f5;
    --pressed: #e6e6e6;
    --line: #e6e6e6;
    --line-strong: #2c2c2c;
    --check-line: #c4c4c4;
    --ink: rgba(0, 0, 0, 0.9);
    --ink-2: rgba(0, 0, 0, 0.5);
    --ink-3: rgba(0, 0, 0, 0.3);
    --brand: #0d99ff;
    --brand-hover: #007be5;
    --on-brand: #ffffff;
    --selected: #e5f4ff;
    --selected-ink: #007be5;
    --focus: #0d99ff;
    --chip: #e6e6e6;
    --danger: #dc3412;
    --shadow: 0px 2px 5px 0px #00000026, 0px 10px 16px 0px #0000001f, 0px 0px .5px 0px #0000001f;
    --menu-bg: #ffffff;
    --menu-ink: rgba(0, 0, 0, 0.9);
    --menu-ink-2: rgba(0, 0, 0, 0.5);
    --menu-ink-3: rgba(0, 0, 0, 0.3);
    --menu-line: #e6e6e6;
    --menu-active: #0d99ff;
    color-scheme: light;
  }
  .ui[data-theme="dark"] {
    --bg: #2c2c2c;
    --field: #383838;
    --hover: #383838;
    --pressed: #444444;
    --line: #444444;
    --line-strong: rgba(255, 255, 255, 0.9);
    --check-line: #757575;
    --ink: #ffffff;
    --ink-2: rgba(255, 255, 255, 0.7);
    --ink-3: rgba(255, 255, 255, 0.4);
    --brand: #0c8ce9;
    --brand-hover: #0a6dc2;
    --selected: #394360;
    --selected-ink: #7cc4f8;
    --focus: #0c8ce9;
    --chip: #444444;
    --danger: #fca397;
    --shadow: 0px 2px 5px 0px #00000059, 0px 10px 16px 0px #00000047, 0px 0px .5px 0px #ffffff40;
    --menu-bg: #1e1e1e;
    --menu-ink: #ffffff;
    --menu-ink-2: rgba(255, 255, 255, 0.7);
    --menu-ink-3: rgba(255, 255, 255, 0.4);
    --menu-line: #383838;
    --menu-active: #0c8ce9;
    color-scheme: dark;
  }
  .ui {
    /* The panel's width: a setting, dragged on the left edge (240 to 480). */
    --w: 280px;
    font: 450 11px/16px 'Design Layer UI', Inter, system-ui, -apple-system, sans-serif;
    letter-spacing: 0.055px;
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
  .ui button, .ui input, .ui textarea { font: inherit; letter-spacing: inherit; color: inherit; margin: 0; }
  .ui button { cursor: default; }
  .ui :focus { outline: none; }
  /* Figma's focus: a 1px accent border drawn inside the control, radius unchanged, no outer ring. */
  .ui :focus-visible { outline: none; box-shadow: inset 0 0 0 1px var(--focus); }
  .ui input:focus, .ui textarea:focus { outline: none; }
  .ui textarea:focus-visible { box-shadow: none; }
  .ui svg { display: block; width: 24px; height: 24px; flex: none; }

  /* ── the grid every row sits on ── */
  .g { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 24px; column-gap: 8px; row-gap: 8px; align-items: center; }
  .g > .span2 { grid-column: 1 / 3; }
  .g > .span3 { grid-column: 1 / -1; }
  .g > .c2 { grid-column: 2; }
  .g > .c3 { grid-column: 3; }

  /* ── panel frame ── */
  .p { position: relative; display: flex; flex-direction: column; width: calc(var(--w) + 2px); height: 100%; background: var(--bg); border: 1px solid var(--line); border-radius: 13px; overflow: hidden;
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12), 0 12px 32px rgba(0, 0, 0, 0.18), 0 32px 64px -16px rgba(0, 0, 0, 0.16); }
  .p-resize { position: absolute; top: 0; bottom: 0; left: 0; width: 6px; cursor: ew-resize; z-index: 1; }
  .p-top { display: flex; align-items: center; gap: 2px; height: 40px; padding: 8px; border-bottom: 1px solid var(--line); flex: none; }
  .p-top .grow { flex: 1; }
  .p-body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; }

  /* selection header: 48 high, a 13/550 title, icon actions */
  .sel { display: flex; align-items: center; gap: 4px; height: 48px; padding: 0 8px 0 16px; border-bottom: 1px solid var(--line); }
  .sel .grow { flex: 1; }
  .sel .dd { margin-left: -6px; font: 550 13px/22px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: -0.032px; }

  /* ── section: 40 head, rows 4 below it, 32 pitch, 16 below the last ── */
  .sec { border-bottom: 1px solid var(--line); }
  .sec__h { display: flex; align-items: center; gap: 4px; height: 40px; padding: 0 8px 0 16px; }
  .sec__title { flex: 1; margin: 0; font-size: inherit; line-height: inherit; min-width: 0; font-weight: 550; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sec[data-empty] .sec__title { color: var(--ink-2); }
  .sec__b { padding: 4px 8px 16px 16px; }
  .sec[data-empty] .sec__b { display: none; }
  .sec[data-collapsed] .sec__b { display: none; }
  .sec[data-collapsed] .sec__title { color: var(--ink-2); }
  .sec__toggle { display: block; width: 100%; padding: 0; border: 0; background: none; font: inherit; color: inherit; text-align: left; overflow: hidden; text-overflow: ellipsis; }
  .sec__toggle:focus-visible { box-shadow: none; text-decoration: underline; text-decoration-color: var(--focus); text-underline-offset: 3px; }

  /* ── icon button: 24, ink at rest ── */
  .ib { position: relative; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--ink); flex: none; }
  .ib:hover { background: var(--hover); }
  .ib[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .ib[aria-expanded="true"] { background: var(--pressed); }
  .ib--dim { color: var(--ink-2); }
  .ib[data-warn]::after { content: ''; position: absolute; top: 4px; right: 4px; width: 4px; height: 4px; border-radius: 50%; background: var(--danger); }

  /* ── tabs: Figma's Design / Prototype pill ── */
  .tabs { display: flex; gap: 0; min-width: 0; overflow: hidden; }
  .tabs button { height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink-2); font-weight: 550; white-space: nowrap; }
  .tabs button:hover { color: var(--ink); }
  .tabs button[aria-selected="true"] { background: var(--field); color: var(--ink); }
  .tabs .n { margin-left: 4px; color: var(--ink-3); font-variant-numeric: tabular-nums; }

  /* ghost dropdown: text and a chevron ("20% ⌄") */
  .dd { display: inline-flex; align-items: center; height: 24px; padding: 0 0 0 6px; border: 0; border-radius: 5px; background: none; color: var(--ink); white-space: nowrap; }
  .dd:hover, .dd[aria-expanded="true"] { background: var(--hover); }
  .dd svg { margin-left: -4px; }

  /* buttons */
  .btn { height: 24px; padding: 0 8px; border: 1px solid var(--line-strong); border-radius: 5px; background: none; color: var(--ink); font-weight: 450; white-space: nowrap; }
  .btn:hover:not(:disabled) { background: var(--hover); }
  .btn--primary { border-color: transparent; background: var(--brand); color: var(--on-brand); font-weight: 550; }
  .btn--primary:hover:not(:disabled) { background: var(--brand-hover); }
  .btn:disabled { border-color: transparent; background: var(--field); color: var(--ink-3); }
  .tb { height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink); white-space: nowrap; }
  .tb:hover { background: var(--hover); }

  /* ── field: 24, radius 5, filled, no border ── */
  .f { position: relative; display: flex; align-items: center; min-width: 0; height: 24px; border: 1px solid transparent; border-radius: 5px; background: var(--field); color: var(--ink); }
  .f:hover { border-color: var(--line); }
  .f:focus-within { border-color: var(--focus); background: var(--bg); }
  .f--outline { background: var(--bg); border-color: var(--line); }
  .f__pre { display: grid; place-items: center; flex: none; width: 23px; height: 22px; margin-left: -1px; color: var(--ink-2); text-align: center; }
  .f__pre[data-scrub] { cursor: ew-resize; }
  .f__input { flex: 1 0 32px; min-width: 32px; width: 100%; height: 100%; padding: 0; border: 0; background: none; color: inherit; font-variant-numeric: tabular-nums; text-overflow: ellipsis; }
  /* a11y-checked: the input's keyboard focus ring is the field's own 1px focus-blue border (.f:focus-within above), Figma's ring; an inner outline as well would double it */
  .f__input:focus-visible { outline: none; box-shadow: none; }
  .f[data-inherited] .f__input { color: var(--ink-2); }
  .f__suf { flex: 0 1 auto; min-width: 0; padding: 0 7px 0 4px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* the reference: a 4px dot where the value departs from it; click to use it */
  .f__ref { flex: none; width: 12px; height: 22px; margin-right: 2px; padding: 0; border: 0; background: none; display: grid; place-items: center; }
  .f__ref::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: var(--brand); }
  /* apply a variable: a 24 icon over the field's right end on hover */
  .f__tok { position: absolute; top: -1px; right: -1px; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 0 5px 5px 0; background: inherit; color: var(--ink-2); opacity: 0; }
  .f:hover .f__tok, .f__tok[aria-expanded="true"], .f__tok:focus-visible { opacity: 1; }
  .f__tok:hover { color: var(--ink); }
  /* bound to a variable: the variable's name in a chip */
  .chip { flex: 1; display: flex; align-items: center; gap: 4px; min-width: 0; height: 16px; margin-right: 4px; padding: 0 4px; border: 0; border-radius: 3px; background: var(--chip); color: var(--ink); text-align: left; }
  .chip__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip { height: 18px; }
  .chip__glyph { display: grid; place-items: center; flex: none; width: 12px; height: 12px; color: var(--ink-2); }
  .chip__glyph svg { width: 18px; height: 18px; }

  /* colour: a 14 swatch in the prefix slot */
  .sw { display: block; width: 14px; height: 14px; padding: 0; border: 0; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1); }
  .f--color .f__input { flex-basis: 52px; min-width: 52px; text-transform: uppercase; }
  .f__name { flex: 1; min-width: 0; height: 22px; padding: 0 4px 0 0; border: 0; background: none; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .f__native { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

  /* select: Figma's bordered dropdown */
  .f--select { width: 100%; padding: 0 0 0 8px; gap: 4px; background: var(--bg); border-color: var(--line); text-align: left; }
  .f--select:hover { border-color: var(--line); }
  .f--select .f__value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .f--select .f__suf { padding: 0; }
  .f--select > svg { margin-right: -1px; color: var(--ink); }
  .f--select[aria-expanded="true"] { border-color: var(--focus); }

  /* ── checkbox: 16, Figma's grey box ── */
  .cb { display: flex; align-items: center; gap: 8px; height: 24px; padding: 0; border: 0; background: none; color: var(--ink); text-align: left; }
  .cb__box { display: grid; place-items: center; width: 16px; height: 16px; border: 1px solid var(--check-line); border-radius: 3px; background: var(--field); }
  .cb__box svg { width: 16px; height: 16px; opacity: 0; color: var(--on-brand); }
  .cb[aria-checked="true"] .cb__box { border-color: var(--brand); background: var(--brand); }
  .cb[aria-checked="true"] .cb__box svg { opacity: 1; }

  /* ── segmented: a choice group (selected cell white, bordered) ── */
  .seg { display: flex; height: 24px; border-radius: 5px; background: var(--field); }
  .seg button { flex: 1; display: grid; place-items: center; min-width: 0; height: 24px; padding: 0 6px; border: 1px solid transparent; border-radius: 5px; background: none; color: var(--ink-2); white-space: nowrap; }
  .seg button:hover { color: var(--ink); }
  .seg button[aria-pressed="true"] { background: var(--bg); border-color: var(--line); color: var(--ink); }
  /* an icon group: cells divided by 1px of panel */
  .seg--icons { gap: 1px; background: none; }
  .seg--icons button { background: var(--field); border-radius: 0; color: var(--ink); }
  .seg--icons button:first-child { border-radius: 5px 0 0 5px; }
  .seg--icons button:last-child { border-radius: 0 5px 5px 0; }

  /* ── popovers: panel-coloured, radius 13; menus follow the panel theme ── */
  .pop { position: fixed; z-index: 2147483100; min-width: 160px; max-width: 320px; border-radius: 13px; background: var(--bg); box-shadow: var(--shadow); color: var(--ink); overflow: hidden; }
  .pop--menu { padding: 8px; background: var(--menu-bg); color: var(--menu-ink); }
  .menu { max-height: 360px; overflow-y: auto; }
  .mi { display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 8px; width: 100%; height: 24px; padding: 0 8px 0 4px; border: 0; border-radius: 5px; background: none; color: var(--menu-ink); text-align: left; white-space: nowrap; }
  .mi svg { width: 16px; height: 16px; }
  .mi[data-active] { background: var(--menu-active); color: #ffffff; }
  .mi:disabled { color: var(--menu-ink-3); }
  .mi:disabled[data-active] { background: none; color: var(--menu-ink-3); }
  .mi__meta { color: var(--menu-ink-2); font-variant-numeric: tabular-nums; }
  .mi[data-active] .mi__meta { color: #ffffff; }
  .mi__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .mh { padding: 4px 8px 4px 28px; color: var(--menu-ink-3); }
  .msep { height: 1px; margin: 8px -8px; background: var(--menu-line); }
  .mi__sw { width: 12px; height: 12px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(128,128,128,.25); justify-self: center; }
  .mi__glyph { color: var(--menu-ink-3); text-align: center; font-size: 9px; }

  /* a popover's own head: a title and a close button, 40 high */
  .pop__h { display: flex; align-items: center; height: 40px; padding: 0 8px 0 16px; border-bottom: 1px solid var(--line); font-weight: 550; }
  .pop__h span { flex: 1; }
  .pop__b { padding: 12px 8px 16px 16px; }

  /* token picker: a dark menu with search */
  .tp { width: 280px; max-width: 280px; padding: 0; }
  .tp__search { display: flex; align-items: center; height: 32px; margin: 4px 4px 0; padding: 0 4px; border: 1px solid transparent; border-radius: 5px; color: var(--menu-ink-3); }
  .tp__search:focus-within { border-color: var(--menu-active); }
  .tp__search input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--menu-ink); }
  .ui .tp__search input:focus-visible { box-shadow: none; }
  .tp__search input::placeholder { color: var(--menu-ink-3); }
  .tp .menu { margin-top: 4px; padding: 8px; max-height: 320px; border-top: 1px solid var(--menu-line); }
  .tp__empty { padding: 16px; color: var(--menu-ink-3); }

  /* palette picker: whole themes, by group */
  .pp { width: 280px; max-width: 280px; }
  .pp .pop__b { padding: 8px; max-height: 420px; overflow-y: auto; }
  .pp__group { padding: 8px 8px 4px; color: var(--ink-2); }
  .pp__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 4px; }
  .pp__item { display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px 0 5px; border: 0; border-radius: 5px; background: none; text-align: left; white-space: nowrap; }
  .pp__item:hover { background: var(--hover); }
  .pp__item[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .pp__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .pp__off { flex: none; width: 4px; height: 4px; margin-left: auto; border-radius: 50%; background: var(--danger); }
  .pal-strip { display: flex; flex: none; width: 14px; height: 14px; border-radius: 2px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
  .pal-strip i { flex: 1; }

  /* readouts and a contrast table */
  .note { color: var(--ink-2); }
  .note--fail { color: var(--danger); }
  .grid-table { display: grid; gap: 0 8px; font-variant-numeric: tabular-nums; }
  .grid-table > span { height: 24px; line-height: 24px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grid-table .h { color: var(--ink-2); }
  .grid-table .fail { color: var(--danger); }
`;
