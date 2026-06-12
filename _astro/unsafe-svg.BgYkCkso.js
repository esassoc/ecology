import{A as n,E as u}from"./lit-element.C8p3bJxG.js";/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const a={CHILD:2},o=s=>(...t)=>({_$litDirective$:s,values:t});class h{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,c){this._$Ct=t,this._$AM=e,this._$Ci=c}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class i extends h{constructor(t){if(super(t),this.it=n,t.type!==a.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===n||t==null)return this._t=void 0,this.it=t;if(t===u)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const e=[t];return e.raw=e,this._t={_$litType$:this.constructor.resultType,strings:e,values:[]}}}i.directiveName="unsafeHTML",i.resultType=1;const d=o(i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class r extends i{}r.directiveName="unsafeSVG",r.resultType=2;const $=o(r);export{d as a,$ as o};
