
import * as xml2js from "xml2js";

import type { Printer } from "./types";
import { sorterOptions, xmlBuilderOptions } from "./settings.js";
import { sort } from "./sorter.js";

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
        } else {
            output += xml[index] === '"' ? "&quot;" : xml[index];
            index += 1;
        }
    }

    return output;
};

const printer: Printer = {
    print(path, opts, print) {
        xmlBuilderOptions.renderOpts.indent = getTab(opts.tabWidth, opts.useTabs);
        let builder = new xml2js.Builder(xmlBuilderOptions);
        let sortedJsonObj = sort(path.getValue().parsedXML, sorterOptions, null);
        let sortedXML = builder.buildObject(sortedJsonObj);

        // add new line at the end of the file if not exist
        if (!sortedXML.endsWith("\n")) {
            sortedXML += "\n";
        }

        return escapeTextQuotes(sortedXML);
    }
}

export default printer;
