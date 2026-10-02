import * as xml2js from "xml2js";

import type { Parser } from "./types";
import { xmlParseOptions } from "./settings.js";
import { protectLeafComments } from "./commentPreservation.js";

// Salesforce metadata names its root element in PascalCase (CustomObject,
// Flow, Layout) and every element beneath it in camelCase. Root selectors
// like "/Layout" rely on that, so a PascalCase element below the root is
// worth flagging: it's either not Salesforce metadata or a shape the
// plugin's rules haven't accounted for. Each distinct path is reported once
// per file.
const findNestedPascalCaseElements = (parsedXML: Record<string, any>): string[] => {
    const found = new Set<string>();

    const walk = (value: any, path: string[]): void => {
        if (Array.isArray(value)) {
            value.forEach((item) => walk(item, path));
            return;
        }
        if (value === null || typeof value !== "object") {
            return;
        }
        Object.keys(value).forEach((key) => {
            // "$" holds attributes and "_" holds text, not child elements.
            if (key === "$" || key === "_") {
                return;
            }
            const childPath = [...path, key];
            if (path.length > 0 && /^[A-Z]/.test(key)) {
                found.add(`/${childPath.join("/")}`);
            }
            walk(value[key], childPath);
        });
    };

    walk(parsedXML, []);
    return [...found];
};

const parser: Parser = {
    parse(text, _parsers, options) {
        const parser = new xml2js.Parser(xmlParseOptions);
        let parsedXML: any;

        parser.parseString(protectLeafComments(text), function (err, result) {
            if (!result) {
                throw new SyntaxError(`An error occurred while parsing the XML data. Please ensure that the XML document is well-formed and valid according to the specified schema: ${err}`);
            }

            parsedXML = result;
        });

        findNestedPascalCaseElements(parsedXML).forEach((elementPath) => {
            const file = options?.filepath ?? "<input>";
            console.warn(`[prettier-plugin-sf-xml] ${file}: unexpected PascalCase element at ${elementPath} (only the root element is expected to be PascalCase in Salesforce metadata)`);
        });

        return { parsedXML };

    },
    astFormat: "sf-xml-print",
    locStart(node) {
        return node.location!.startOffset;
    },
    locEnd(node) {
        return node.location!.endOffset!;
    }
};

export default parser;
