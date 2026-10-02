"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const xml2js = __importStar(require("xml2js"));
const settings_js_1 = require("./settings.js");
const sorter_js_1 = require("./sorter.js");
const commentPreservation_js_1 = require("./commentPreservation.js");
const buildCustomSortElements = (elements) => {
    const customSortElements = {};
    elements.forEach((key, index) => {
        customSortElements[key] = index + 1;
    });
    return customSortElements;
};
const getTab = function (tabWidth, useTabs) {
    let tab = "";
    for (let i = 0; i < tabWidth; i++) {
        if (useTabs) {
            tab += "\t";
        }
        else {
            tab += " ";
        }
    }
    return tab;
};
const tokenizeXml = (xml) => {
    const tokens = [];
    let index = 0;
    while (index < xml.length) {
        if (xml.startsWith("<!--", index)) {
            const end = xml.indexOf("-->", index + 4);
            const next = end < 0 ? xml.length : end + 3;
            tokens.push({ type: "comment", text: xml.slice(index, next) });
            index = next;
        }
        else if (xml.startsWith("<![CDATA[", index)) {
            const end = xml.indexOf("]]>", index + 9);
            const next = end < 0 ? xml.length : end + 3;
            tokens.push({ type: "cdata", text: xml.slice(index, next) });
            index = next;
        }
        else if (xml.startsWith("<?", index)) {
            const end = xml.indexOf("?>", index + 2);
            const next = end < 0 ? xml.length : end + 2;
            tokens.push({ type: "pi", text: xml.slice(index, next) });
            index = next;
        }
        else if (xml[index] === "<") {
            let quote = null;
            let bracketDepth = 0;
            let end = index + 1;
            for (; end < xml.length; end += 1) {
                const char = xml[end];
                if (quote) {
                    if (char === quote)
                        quote = null;
                }
                else if (char === '"' || char === "'") {
                    quote = char;
                }
                else if (char === "[") {
                    bracketDepth += 1;
                }
                else if (char === "]") {
                    bracketDepth = Math.max(0, bracketDepth - 1);
                }
                else if (char === ">" && bracketDepth === 0) {
                    end += 1;
                    break;
                }
            }
            tokens.push({ type: "tag", text: xml.slice(index, end) });
            index = end;
        }
        else {
            let end = index;
            while (end < xml.length && xml[end] !== "<")
                end += 1;
            tokens.push({ type: "text", text: xml.slice(index, end) });
            index = end;
        }
    }
    return tokens;
};
const escapeTextQuotes = (xml) => tokenizeXml(xml)
    .map((token) => (token.type === "text" ? token.text.replace(/"/g, "&quot;").replace(/'/g, "&apos;") : token.text))
    .join("");
// xml2js's builder always renders empty elements as an explicit `<tag></tag>`
// pair (see xmlBuilderOptions.renderOpts.allowEmpty). That's the right default
// for Salesforce metadata, but some elements are known to be expected
// self-closing for a given schema, so this collapses an empty-element pair to
// `<tag/>` only for the elements the consumer has opted in via
// `xmlSelfClosingElements` (either a bare tag name, `Root.tag` to scope it to
// one root metadata type, or `Root.*` to match every tag under that root).
const collapseSelfClosingTags = (xml, rootName, selfClosingElements) => {
    const included = new Set(selfClosingElements);
    const isIncluded = (tagName) => included.has(tagName) || included.has(`${rootName}.${tagName}`) || included.has(`${rootName}.*`);
    const tokens = tokenizeXml(xml);
    let output = "";
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        if (token.type !== "tag") {
            output += token.text;
            i += 1;
            continue;
        }
        const tagText = token.text;
        const nameMatch = tagText.match(/^<([\w:.-]+)/);
        const isClosingTag = tagText.startsWith("</");
        const isAlreadySelfClosing = /\/>$/.test(tagText);
        if (!isClosingTag && !isAlreadySelfClosing && nameMatch) {
            const tagName = nameMatch[1];
            const closingTag = `</${tagName}>`;
            const next = tokens[i + 1];
            if (isIncluded(tagName) && (next === null || next === void 0 ? void 0 : next.type) === "tag" && next.text === closingTag) {
                output += tagText.slice(0, -1) + "/>";
                i += 2;
                continue;
            }
        }
        output += tagText;
        i += 1;
    }
    return output;
};
const printer = {
    print(path, opts, print) {
        var _a, _b, _c;
        settings_js_1.xmlBuilderOptions.renderOpts.indent = getTab(opts.tabWidth, opts.useTabs);
        const builder = new xml2js.Builder(settings_js_1.xmlBuilderOptions);
        const runtimeSorterOptions = {
            ...settings_js_1.sorterOptions,
            customSortElements: buildCustomSortElements((_a = opts.xmlCustomSortElements) !== null && _a !== void 0 ? _a : settings_js_1.defaultCustomSortElements)
        };
        const sortedJsonObj = (0, sorter_js_1.sort)(path.getValue().parsedXML, runtimeSorterOptions, undefined);
        let sortedXML = builder.buildObject(sortedJsonObj);
        const rootName = (_b = Object.keys(sortedJsonObj)[0]) !== null && _b !== void 0 ? _b : "";
        sortedXML = collapseSelfClosingTags(sortedXML, rootName, (_c = opts.xmlSelfClosingElements) !== null && _c !== void 0 ? _c : settings_js_1.defaultSelfClosingElements);
        // add new line at the end of the file if not exist
        if (!sortedXML.endsWith("\n")) {
            sortedXML += "\n";
        }
        return (0, commentPreservation_js_1.restoreLeafComments)(escapeTextQuotes(sortedXML));
    }
};
exports.default = printer;
