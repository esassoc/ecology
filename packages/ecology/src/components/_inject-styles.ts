const STYLE_ID = 'esa-wc-styles';
export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .esa-field { display:flex; flex-direction:column; gap:.375rem; font-family:var(--font-sans,system-ui); }
    .esa-field__label { font-size:.875rem; font-weight:600; color:var(--form-label-color,var(--color-text-secondary,#525252)); }
    .esa-field__req { color:var(--color-danger,#ef4444); }
    .esa-field__input, .esa-field__select, .esa-field__textarea {
      width:100%; padding:.5rem .75rem; border:1px solid var(--form-border-color,#e5e5e5);
      border-radius:.25rem; font-family:inherit; font-size:.9375rem;
      color:var(--form-text-color,#171717); background:var(--form-bg,#fff);
      transition:border-color .12s,box-shadow .12s; outline:none; box-sizing:border-box;
    }
    .esa-field__input:focus, .esa-field__select:focus, .esa-field__textarea:focus {
      border-color:var(--form-border-color-focus,var(--color-primary,#005862));
      box-shadow:0 0 0 3px var(--color-primary-subtle,rgba(0,88,98,.08));
    }
    .esa-field__input::placeholder, .esa-field__textarea::placeholder { color:var(--form-placeholder-color,#737373); }
    .esa-field__input--error, .esa-field__select--error, .esa-field__textarea--error { border-color:var(--form-border-color-error,#ef4444); }
    .esa-field__error { font-size:.8125rem; color:var(--form-error-color,#ef4444); }
    .esa-field__select { appearance:none; padding-right:2rem; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .75rem center; }
    .esa-field__textarea { resize:vertical; min-height:80px; }
  `;
  document.head.appendChild(s);
}
