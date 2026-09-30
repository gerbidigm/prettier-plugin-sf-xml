
import * as xml2js from "xml2js";

import type { Printer, SorterCustomKeys } from "./types";
import { defaultCustomSortElements, defaultSelfClosingElements, sorterOptions, xmlBuilderOptions } from "./settings.js";
import { sort } from "./sorter.js";
import { restoreLeafComments } from "./commentPreservation.js";

const buildCustomSortElements = (elements: string[]): SorterCustomKeys => {
    const customSortElements: SorterCustomKeys = {};
    elements.forEach((key, index) => {
        customSortElements[key] = index + 1;
    });
    return customSortElements;
};

const getTab = function (tabWidth: number, useTabs: boolean): string {
    let tab = "";
    for (let i = 0; i < tabWidth; i++) {
        if (useTabs) {
            tab += "\t";
        } else {
            tab += " ";
        }
    }
    return tab;
}

// A single lexical unit of an XML document: a comment, a CDATA section, a
// processing instruction, a tag (opening, closing, or self-closing), or a run
// of plain text between tags. Shared by escapeTextQuotes and
// collapseSelfClosingTags so the tag/comment/CDATA/PI boundary-scanning logic
// (including bracket-depth tracking for internal DTD subsets and quoted
// attribute values) only has to be gotten right in one place.
type XmlToken = { type: "comment" | "cdata" | "pi" | "tag" | "text"; text: string };

const tokenizeXml = (xml: string): XmlToken[] => {
    const tokens: XmlToken[] = [];
    let index = 0;

    while (index < xml.length) {
        if (xml.startsWith("<!--", index)) {
            const end = xml.indexOf("-->", index + 4);
            const next = end < 0 ? xml.length : end + 3;
            tokens.push({ type: "comment", text: xml.slice(index, next) });
            index = next;
        } else if (xml.startsWith("<![CDATA[", index)) {
            const end = xml.indexOf("]]>", index + 9);
            const next = end < 0 ? xml.length : end + 3;
            tokens.push({ type: "cdata", text: xml.slice(index, next) });
            index = next;
        } else if (xml.startsWith("<?", index)) {
            const end = xml.indexOf("?>", index + 2);
            const next = end < 0 ? xml.length : end + 2;
            tokens.push({ type: "pi", text: xml.slice(index, next) });
            index = next;
        } else if (xml[index] === "<") {
            let quote: string | null = null;
            let bracketDepth = 0;
            let end = index + 1;

            for (; end < xml.length; end += 1) {
                const char = xml[end];
                if (quote) {
                    if (char === quote) quote = null;
                } else if (char === '"' || char === "'") {
                    quote = char;
                } else if (char === "[") {
                    bracketDepth += 1;
                } else if (char === "]") {
                    bracketDepth = Math.max(0, bracketDepth - 1);
                } else if (char === ">" && bracketDepth === 0) {
                    end += 1;
                    break;
                }
            }

            tokens.push({ type: "tag", text: xml.slice(index, end) });
            index = end;
        } else {
            let end = index;
            while (end < xml.length && xml[end] !== "<") end += 1;
            tokens.push({ type: "text", text: xml.slice(index, end) });
            index = end;
        }
    }

    return tokens;
};

const escapeTextQuotes = (xml: string): string =>
    tokenizeXml(xml)
        .map((token) => (token.type === "text" ? token.text.replace(/"/g, "&quot;").replace(/'/g, "&apos;") : token.text))
        .join("");

// xml2js's builder always renders empty elements as an explicit `<tag></tag>`
// pair (see xmlBuilderOptions.renderOpts.allowEmpty). That's the right default
// for Salesforce metadata, but some elements are known to be expected
// self-closing for a given schema, so this collapses an empty-element pair to
// `<tag/>` only for the elements the consumer has opted in via
// `xmlSelfClosingElements` (either a bare tag name, `Root.tag` to scope it to
// one root metadata type, or `Root.*` to match every tag under that root).
const collapseSelfClosingTags = (xml: string, rootName: string, selfClosingElements: string[]): string => {
    const included = new Set(selfClosingElements);
    const isIncluded = (tagName: string): boolean =>
        included.has(tagName) || included.has(`${rootName}.${tagName}`) || included.has(`${rootName}.*`);

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

            if (isIncluded(tagName) && next?.type === "tag" && next.text === closingTag) {
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

const printer: Printer = {
    print(path, opts, print) {
        xmlBuilderOptions.renderOpts.indent = getTab(opts.tabWidth, opts.useTabs);
        const builder = new xml2js.Builder(xmlBuilderOptions);
        const runtimeSorterOptions = {
            ...sorterOptions,
            customSortElements: buildCustomSortElements(opts.xmlCustomSortElements ?? defaultCustomSortElements)
        };
        const sortedJsonObj = sort(path.getValue().parsedXML, runtimeSorterOptions, undefined);
        let sortedXML = builder.buildObject(sortedJsonObj);

        const rootName = Object.keys(sortedJsonObj)[0] ?? "";
        sortedXML = collapseSelfClosingTags(sortedXML, rootName, opts.xmlSelfClosingElements ?? defaultSelfClosingElements);

        // add new line at the end of the file if not exist
        if (!sortedXML.endsWith("\n")) {
            sortedXML += "\n";
        }

        return restoreLeafComments(escapeTextQuotes(sortedXML));
    }
}

export default printer;
