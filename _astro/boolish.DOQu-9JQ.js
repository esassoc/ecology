const o=new Set(["false","0","off","no"]),e={fromAttribute:t=>t!==null&&!o.has(t.trim().toLowerCase()),toAttribute:t=>t?"":null};export{e as b};
