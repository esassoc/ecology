// EsaMetaPair — one identifying fact about the record a surface is showing,
// with the field name that says what it is.
//
// Shared by esa-page-header and esa-card, which both render `meta` as a
// definition list: the label is the <dt>, the value is the <dd>.
//
// BOTH PARTS ARE REQUIRED, and that is the whole point of the type. A row of
// facts set side by side with the relation left to the reader — "SFO ·
// Shoreline Protection Program · Beacon" — is a banned construction, and a
// free-text slot makes it the easiest thing to write. A pair cannot express
// it: every value arrives attached to the name of its field.
//
// This is metadata, not content. A stat IS the page's content — the number the
// page exists to report — and belongs in esa-stat, at stat scale. Meta
// identifies the record the content is about: which project, which permit,
// which reporting period. When a figure would be the answer to "what does this
// page say?", it is a stat; when it answers "which record is this?", it is
// meta.
export interface EsaMetaPair {
  /** The field's name in the record: "Project", "Permit", "Reporting period". */
  label: string;
  /** The stored value: "Delta Conveyance Project", "USACE Section 404". */
  value: string;
}
