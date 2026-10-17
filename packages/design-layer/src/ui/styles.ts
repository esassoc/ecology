// The design layer's control kit: one stylesheet for every control, dark and
// dense, laid out like Figma's right sidebar (40px section heads, 24px fields,
// two-up rows, full-bleed hairlines). Colours are the hub's own primitives:
// Radix gray-dark for surfaces and ink, grass-dark for focus and selection,
// red-dark for a failing check. Each is read through the page's tier-1 token
// with the same value as fallback, because primitives never move with a theme.
//
// The face is DM Sans, registered by the panel under its own family name
// ("Design Layer Sans", see fonts.ts) so tuning the spoke's fonts never
// restyles the tool tuning them.

export const UI_CSS = `
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }

  .ui {
    --ui-bg: var(--color-gray-dark-3, #222222);
    --ui-field: var(--color-gray-dark-5, #313131);
    --ui-field-hover: var(--color-gray-dark-6, #3a3a3a);
    --ui-raised: var(--color-gray-dark-4, #2a2a2a);
    --ui-menu: var(--color-gray-dark-2, #191919);
    --ui-line: var(--color-gray-dark-6, #3a3a3a);
    --ui-line-strong: var(--color-gray-dark-7, #484848);
    --ui-ink: var(--color-gray-dark-12, #eeeeee);
    --ui-ink-2: var(--color-gray-dark-11, #b4b4b4);
    --ui-ink-3: var(--color-gray-dark-9, #6e6e6e);
    --ui-accent: var(--color-grass-dark-9, #46a758);
    --ui-accent-ink: var(--color-grass-dark-11, #71d083);
    --ui-select: var(--color-grass-dark-3, #1b2a1e);
    --ui-fail: var(--color-red-dark-11, #ff9592);
    --ui-chip: var(--color-gray-dark-6, #3a3a3a);
    --ui-h: 24px;
    --ui-r: 5px;
    --ui-pad: 16px;
    font: 400 12px/16px 'Design Layer Sans', 'DM Sans', system-ui, sans-serif;
    font-optical-sizing: auto;
    color: var(--ui-ink);
    -webkit-font-smoothing: antialiased;
    color-scheme: dark;
  }
  .ui button, .ui input, .ui select, .ui textarea { font: inherit; color: inherit; margin: 0; }
  .ui button { cursor: default; }
  .ui :focus { outline: none; }
  .ui :focus-visible { outline: 1px solid var(--ui-accent); outline-offset: -1px; }
  .ui svg { display: block; width: 16px; height: 16px; flex: none; }

  /* ── section: a 40px head (title, actions), body rows, a full-bleed hairline ── */
  .sec { border-bottom: 1px solid var(--ui-line); padding: 0 0 8px; }
  .sec__h { display: flex; align-items: center; height: 40px; padding: 0 8px 0 var(--ui-pad); gap: 4px; }
  .sec__title { flex: 1; display: flex; align-items: center; gap: 4px; min-width: 0; height: 24px; padding: 0; border: 0; background: none; font-weight: 500; text-align: left; }
  .sec__title::after { content: ''; width: 5px; height: 5px; margin-left: 2px; border: solid var(--ui-ink-3); border-width: 0 1px 1px 0; transform: rotate(45deg) translate(-1px, -1px); opacity: 0; transition: opacity 80ms; }
  .sec__h:hover .sec__title::after { opacity: 1; }
  .sec[data-closed] .sec__title::after { transform: rotate(-45deg); }
  .sec[data-closed] { padding-bottom: 0; }
  .sec[data-closed] .sec__b { display: none; }
  .sec__actions { display: flex; align-items: center; gap: 2px; }
  .sec__b { display: grid; gap: 8px; padding: 0 var(--ui-pad); }

  /* ── rows ── */
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .row1 { display: grid; grid-template-columns: 1fr; }
  .rowl { display: grid; grid-template-columns: 64px 1fr; align-items: center; gap: 8px; }
  .rowl > .lbl { color: var(--ui-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rowl--2 { grid-template-columns: 48px 1fr 1fr; }
  .rowl--act { grid-template-columns: 64px 1fr 24px; }
  .sub { color: var(--ui-ink-2); padding-top: 4px; }

  /* ── icon button: 24px ghost ── */
  .ib { display: inline-grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--ui-r); background: none; color: var(--ui-ink-2); }
  .ib:hover { background: var(--ui-field); color: var(--ui-ink); }
  .ib[aria-pressed="true"] { background: var(--ui-field-hover); color: var(--ui-ink); }
  .ib:disabled { color: var(--ui-ink-3); background: none; }

  /* ── text button ── */
  .tb { height: 24px; padding: 0 8px; border: 0; border-radius: var(--ui-r); background: none; color: var(--ui-ink-2); white-space: nowrap; }
  .tb:hover { background: var(--ui-field); color: var(--ui-ink); }
  .tb[aria-pressed="true"] { color: var(--ui-accent-ink); }
  .btn { height: 24px; padding: 0 10px; border: 1px solid var(--ui-line-strong); border-radius: var(--ui-r); background: none; color: var(--ui-ink); font-weight: 500; white-space: nowrap; }
  .btn:hover:not(:disabled) { background: var(--ui-field); }
  .btn--primary { border-color: var(--ui-accent); background: var(--ui-accent); color: var(--color-gray-dark-1, #111111); }
  .btn--primary:hover:not(:disabled) { background: var(--color-grass-dark-10, #55b467); border-color: var(--color-grass-dark-10, #55b467); }
  .btn:disabled { color: var(--ui-ink-3); border-color: var(--ui-line); background: none; }

  /* ── field: the 24px box every input lives in ── */
  .f { position: relative; display: flex; align-items: center; min-width: 0; height: var(--ui-h); border: 1px solid transparent; border-radius: var(--ui-r); background: var(--ui-field); }
  .f:hover { border-color: var(--ui-line-strong); }
  .f:focus-within { border-color: var(--ui-accent); }
  .f__lead { flex: none; display: grid; place-items: center; width: 24px; height: 100%; color: var(--ui-ink-3); user-select: none; }
  .f__lead--text { width: auto; min-width: 24px; padding: 0 2px 0 8px; font-size: 11px; }
  .f--num .f__lead { cursor: ew-resize; }
  .f--num .f__lead:hover, .f[data-scrubbing] .f__lead { color: var(--ui-ink); }
  .f__input { flex: 1; min-width: 3.2ch; width: 100%; height: 100%; padding: 0 4px 0 2px; border: 0; background: none; font-variant-numeric: tabular-nums; }
  .f__input:first-child { padding-left: 8px; }
  .f__input::placeholder { color: var(--ui-ink-3); }
  .f__unit { flex: none; padding-right: 6px; color: var(--ui-ink-3); }
  .f__ref { flex: none; height: 16px; margin-right: 3px; padding: 0 4px; border: 0; border-radius: 3px; background: var(--ui-raised); color: var(--ui-ink-2); font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .f__ref:hover { background: var(--ui-field-hover); color: var(--ui-ink); }
  /* The token button floats over the field's right end on hover, so a narrow
     two-up field keeps its whole width for the value. */
  .f__tok { position: absolute; top: 1px; right: 1px; display: grid; place-items: center; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 3px; background: var(--ui-field); color: var(--ui-ink-3); opacity: 0; box-shadow: -6px 0 6px var(--ui-field); }
  .f__tok svg { width: 14px; height: 14px; }
  .f:hover .f__tok, .f:focus-within .f__tok, .f__tok[aria-expanded="true"] { opacity: 1; }
  .f__tok:hover { background: var(--ui-field-hover); color: var(--ui-ink); box-shadow: -6px 0 6px var(--ui-field); }

  /* a field bound to a token: the token's name in a chip, a detach button */
  .chip { flex: 1; display: flex; align-items: center; gap: 4px; min-width: 0; height: 18px; margin: 0 2px 0 3px; padding: 0 6px 0 4px; border: 0; border-radius: 3px; background: var(--ui-chip); color: var(--ui-ink); text-align: left; }
  .chip:hover { background: var(--ui-line-strong); }
  .chip svg { width: 12px; height: 12px; color: var(--ui-ink-2); }
  .chip__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip__sw { flex: none; width: 10px; height: 10px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }

  /* colour */
  .sw { flex: none; width: 14px; height: 14px; margin: 0 2px 0 5px; padding: 0; border: 0; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
  .f--color .f__input { padding-left: 6px; text-transform: lowercase; }
  .f__meta { flex: none; padding: 0 6px; border-left: 1px solid var(--ui-line); color: var(--ui-ink-3); font-variant-numeric: tabular-nums; }
  .f__native { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

  /* select: a field-shaped trigger and a menu */
  .f--select { padding: 0 4px 0 8px; gap: 6px; text-align: left; color: var(--ui-ink); width: 100%; }
  .f--select .f__value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .f--select .chev { width: 12px; height: 12px; color: var(--ui-ink-3); }
  .f--select:hover .chev { color: var(--ui-ink); }

  /* ── segmented control ── */
  .seg { display: flex; height: var(--ui-h); padding: 1px; gap: 1px; border-radius: var(--ui-r); background: var(--ui-field); }
  .seg button { flex: 1; display: grid; place-items: center; min-width: 0; padding: 0 8px; border: 1px solid transparent; border-radius: 4px; background: none; color: var(--ui-ink-2); white-space: nowrap; }
  .seg button:hover { color: var(--ui-ink); }
  .seg button[aria-pressed="true"] { background: var(--ui-bg); border-color: var(--ui-line-strong); color: var(--ui-ink); }
  .seg--fit { display: inline-flex; justify-self: start; }
  .seg--fit button { flex: none; }

  /* ── text tabs (panel head) ── */
  .tabs { display: flex; align-items: center; gap: 2px; }
  .tabs button { height: 24px; padding: 0 8px; border: 0; border-radius: var(--ui-r); background: none; color: var(--ui-ink-2); font-weight: 500; }
  .tabs button:hover { color: var(--ui-ink); }
  .tabs button[aria-selected="true"] { background: var(--ui-field); color: var(--ui-ink); }
  .tabs .n { margin-left: 4px; color: var(--ui-ink-3); font-variant-numeric: tabular-nums; }

  /* ── switch (12px tall, Figma's checkbox weight) ── */
  .sw-row { display: flex; align-items: center; justify-content: space-between; height: 24px; padding: 0; border: 0; background: none; width: 100%; color: var(--ui-ink-2); text-align: left; }
  .sw-row:hover { color: var(--ui-ink); }
  .track { position: relative; width: 24px; height: 14px; border-radius: 7px; background: var(--ui-line-strong); transition: background 100ms; }
  .track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--ui-ink); transition: transform 100ms; }
  [aria-checked="true"] > .track { background: var(--ui-accent); }
  [aria-checked="true"] > .track::after { transform: translateX(10px); }

  /* ── popover + menu ── */
  .pop { position: fixed; z-index: 2147483100; min-width: 160px; max-width: 320px; padding: 4px 0; border: 1px solid var(--ui-line); border-radius: 8px; background: var(--ui-menu);
    box-shadow: 0 4px 16px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.4); color: var(--ui-ink); }
  .menu { max-height: 320px; overflow-y: auto; }
  .mi { display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 6px; width: 100%; height: 24px; padding: 0 12px 0 8px; border: 0; background: none; text-align: left; white-space: nowrap; }
  .mi svg { width: 12px; height: 12px; }
  .mi[data-active] { background: var(--ui-accent); color: var(--color-gray-dark-1, #111111); }
  .mi[data-active] .mi__meta { color: inherit; }
  .mi__meta { color: var(--ui-ink-3); font-variant-numeric: tabular-nums; }
  .mi__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .mh { padding: 8px 12px 4px; color: var(--ui-ink-3); }
  .msep { height: 1px; margin: 4px 0; background: var(--ui-line); }

  /* token picker: search, then the tokens by group */
  .tp { width: 320px; max-width: 320px; padding: 0; }
  .tp__search { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-bottom: 1px solid var(--ui-line); color: var(--ui-ink-3); }
  .tp__search input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--ui-ink); outline: none; }
  .ui .tp__search input:focus-visible { outline: none; }
  .tp__search input::placeholder { color: var(--ui-ink-3); }
  .tp .menu { padding: 4px 0; max-height: 300px; }
  .tp .mi { grid-template-columns: 14px 1fr auto; }
  .tp .mi__sw { width: 12px; height: 12px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
  .tp .mi__glyph { color: var(--ui-ink-3); font-size: 10px; text-align: center; }
  .tp .mi[data-active] .mi__glyph { color: inherit; }
  .tp__empty { padding: 12px; color: var(--ui-ink-3); }

  /* palette picker: a field-shaped trigger, a grid of whole themes */
  .pal-strip { display: flex; flex: none; width: 34px; height: 14px; border-radius: 3px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
  .pal-strip i { flex: 1; }
  .pp { width: 296px; padding: 8px; }
  .pp__group { padding: 4px 4px 6px; color: var(--ui-ink-3); }
  .pp__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 6px; }
  .pp__item { display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 6px; border: 0; border-radius: var(--ui-r); background: none; text-align: left; white-space: nowrap; }
  .pp__item:hover, .pp__item[data-active] { background: var(--ui-field); }
  .pp__item[aria-pressed="true"] { background: var(--ui-select); box-shadow: inset 0 0 0 1px var(--ui-accent); }
  .pp__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .pp__off { flex: none; width: 4px; height: 4px; margin-left: auto; border-radius: 50%; background: var(--ui-fail); }

  /* readouts: a check's numbers on one line, failures in the fail ink */
  .readout { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--ui-ink-2); font-variant-numeric: tabular-nums; }
  .readout .fail { color: var(--ui-fail); }
  .grid-table { display: grid; grid-template-columns: 64px 1fr 1fr; gap: 0 8px; font-variant-numeric: tabular-nums; }
  .grid-table > * { height: 24px; display: flex; align-items: center; }
  .grid-table .h { color: var(--ui-ink-3); }
  .grid-table .fail { color: var(--ui-fail); }
`;
