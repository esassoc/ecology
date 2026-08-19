import"./esa-text-field.Dykg5UPI.js";import"./esa-textarea.NZXISw1f.js";import"./esa-date-picker.astro_astro_type_script_index_0_lang.N8GeBe2U.js";import"./esa-input-tag.DfnUr1gC.js";import"./lit-element.D8DSg5zn.js";import"./typography.KBHeYOQc.js";import"./a11y.sqk3bMt7.js";import"./announcer.D25EqVSf.js";const o=getComputedStyle(document.documentElement);document.querySelectorAll(".probe").forEach(e=>{e.textContent=o.getPropertyValue(e.dataset.probe).trim()});const t=document.createElement("style");t.textContent=`
    :where(a, button, summary, input, select, textarea, [tabindex]):focus-visible {
      outline: revert; outline-offset: revert; border-radius: revert;
    }
    :where(a, button, summary, input, select, textarea, [tabindex]):focus:not(:focus-visible) {
      outline: revert;
    }`;document.getElementById("kill-focus")?.addEventListener("change",e=>{e.target.checked?document.head.appendChild(t):t.remove()});
