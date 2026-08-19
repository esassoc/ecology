import"./esa-text-field.CYc8qI_D.js";import"./esa-textarea.BufQdhpR.js";import"./esa-date-picker.astro_astro_type_script_index_0_lang.B81ydYs7.js";import"./esa-input-tag.Bxn2wbUh.js";import"./lit-element.D8DSg5zn.js";import"./typography.KBHeYOQc.js";import"./a11y.sqk3bMt7.js";import"./announcer.D25EqVSf.js";const o=getComputedStyle(document.documentElement);document.querySelectorAll(".probe").forEach(e=>{e.textContent=o.getPropertyValue(e.dataset.probe).trim()});const t=document.createElement("style");t.textContent=`
    :where(a, button, summary, input, select, textarea, [tabindex]):focus-visible {
      outline: revert; outline-offset: revert; border-radius: revert;
    }
    :where(a, button, summary, input, select, textarea, [tabindex]):focus:not(:focus-visible) {
      outline: revert;
    }`;document.getElementById("kill-focus")?.addEventListener("change",e=>{e.target.checked?document.head.appendChild(t):t.remove()});
