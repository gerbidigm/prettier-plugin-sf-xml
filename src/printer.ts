
import * as xml2js from "xml2js";

import type { Printer, SorterCustomKeys } from "./types";
import { defaultCustomSortElements, defaultNonSelfClosingElements, sorterOptions, xmlBuilderOptions } from "./settings.js";
import { sort } from "./sorter.js";

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

const escapeTextQuotes = (xml: string): string => {
    let output = "";
    let index = 0;

    while (index < xml.length) {
        if (xml.startsWith("<!--", index)) {
            const end = xml.indexOf("-->", index + 4);
            const next = end < 0 ? xml.length : end + 3;
            output += xml.slice(index, next);
            index = next;
        } else if (xml.startsWith("<![CDATA[", index)) {
            const end = xml.indexOf("]]>", index + 9);
            const next = end < 0 ? xml.length : end + 3;
            output += xml.slice(index, next);
            index = next;
        } else if (xml.startsWith("<?", index)) {
            const end = xml.indexOf("?>", index + 2);
            const next = end < 0 ? xml.length : end + 2;
            output += xml.slice(index, next);
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

            output += xml.slice(index, end);
            index = end;
        } else if (xml[index] === '"') {
            output += "&quot;";
            index += 1;
        } else if (xml[index] === "'") {
            output += "&apos;";
            index += 1;
        } else {
            output += xml[index];
            index += 1;
        }
    }

    return output;
};

// xml2js's builder always renders empty elements as an explicit `<tag></tag>`
// pair (see xmlBuilderOptions.renderOpts.allowEmpty). Most Salesforce metadata
// prefers the self-closing form, but a handful of elements are quirky about
// it depending on the schema, so this collapses every empty-element pair to
// `<tag/>` except the ones the consumer has opted out of via
// `xmlNonSelfClosingElements` (either a bare tag name, or `Root.tag` to scope
// the exception to one root metadata type).
const collapseSelfClosingTags = (xml: string, rootName: string, nonSelfClosingElements: string[]): string => {
    const exceptions = new Set(nonSelfClosingElements);
    const isExcluded = (tagName: string): boolean =>
        exceptions.has(tagName) || exceptions.has(`${rootName}.${tagName}`);

    let output = "";
    let index = 0;

    while (index < xml.length) {
        if (xml.startsWith("<!--", index)) {
            const end = xml.indexOf("-->", index + 4);
            const next = end < 0 ? xml.length : end + 3;
            output += xml.slice(index, next);
            index = next;
        } else if (xml.startsWith("<![CDATA[", index)) {
            const end = xml.indexOf("]]>", index + 9);
            const next = end < 0 ? xml.length : end + 3;
            output += xml.slice(index, next);
            index = next;
        } else if (xml.startsWith("<?", index)) {
            const end = xml.indexOf("?>", index + 2);
            const next = end < 0 ? xml.length : end + 2;
            output += xml.slice(index, next);
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

            const tagText = xml.slice(index, end);
            const nameMatch = tagText.match(/^<([\w:.-]+)/);
            const isClosingTag = tagText.startsWith("</");
            const isAlreadySelfClosing = /\/>$/.test(tagText);

            if (!isClosingTag && !isAlreadySelfClosing && nameMatch) {
                const tagName = nameMatch[1];
                const closingTag = `</${tagName}>`;
                if (!isExcluded(tagName) && xml.startsWith(closingTag, end)) {
                    output += tagText.slice(0, -1) + "/>";
                    index = end + closingTag.length;
                    continue;
                }
            }

            output += tagText;
            index = end;
        } else {
            output += xml[index];
            index += 1;
        }
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
        const sortedJsonObj = sort(path.getValue().parsedXML, runtimeSorterOptions, null);
        let sortedXML = builder.buildObject(sortedJsonObj);

        const rootName = Object.keys(sortedJsonObj)[0] ?? "";
        sortedXML = collapseSelfClosingTags(sortedXML, rootName, opts.xmlNonSelfClosingElements ?? defaultNonSelfClosingElements);

        // add new line at the end of the file if not exist
        if (!sortedXML.endsWith("\n")) {
            sortedXML += "\n";
        }

        return escapeTextQuotes(sortedXML);
    }
}

export default printer;
