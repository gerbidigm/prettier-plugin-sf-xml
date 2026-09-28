"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreLeafComments = exports.protectLeafComments = void 0;
// xml2js's parser never registers a sax `oncomment` handler, so it silently
// drops every XML comment while parsing — there's no parser option to
// change this. Salesforce's translation metadata (CustomFieldTranslation,
// CustomLabelTranslation, etc.) relies on comments as placeholder content
// for untranslated fields, e.g. `<label><!-- Some Label --></label>`, so
// losing them corrupts those files on every format.
//
// This preserves that specific, evidenced pattern — a leaf element whose
// entire (trimmed) content is a single comment — by swapping the comment
// for a base64-encoded text placeholder before parsing (comments can't
// survive as a JS object property, but ordinary text can), then swapping it
// back to real comment syntax after the builder re-serializes the document.
// Base64 sidesteps having to reason about xml2js's entity-escaping of the
// placeholder text. This does not attempt to preserve comments in other
// positions (e.g. between sibling elements), which xml2js's object model
// isn't equipped to round-trip in general.
const SENTINEL_START = "";
const SENTINEL_END = "";
const LEAF_COMMENT_PATTERN = /(<([\w:.-]+)((?:\s[^>]*)?)>)\s*<!--([\s\S]*?)-->\s*(<\/\2>)/g;
const RESTORE_PATTERN = new RegExp(`${SENTINEL_START}([A-Za-z0-9+/=]*)${SENTINEL_END}`, "g");
const protectLeafComments = (xml) => xml.replace(LEAF_COMMENT_PATTERN, (_match, openTag, _tagName, _attrs, comment, closeTag) => {
    const encoded = Buffer.from(comment, "utf8").toString("base64");
    return `${openTag}${SENTINEL_START}${encoded}${SENTINEL_END}${closeTag}`;
});
exports.protectLeafComments = protectLeafComments;
const restoreLeafComments = (xml) => xml.replace(RESTORE_PATTERN, (_match, encoded) => `<!--${Buffer.from(encoded, "base64").toString("utf8")}-->`);
exports.restoreLeafComments = restoreLeafComments;
