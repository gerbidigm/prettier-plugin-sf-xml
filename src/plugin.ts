import type { Plugin } from "./types";

import parser from "./parser.js";
import printer from "./printer.js";
import { defaultCustomSortElements, defaultSelfClosingElements } from "./settings.js";

const plugin: Plugin = {
    languages: [
        {
            extensions: ['xml'],
            name: 'Salesforce XML Metadata',
            parsers: ['sf-xml-parse']
        }
    ],
    parsers: {
        'sf-xml-parse': parser
    },
    printers: {
        'sf-xml-print': printer
    },
    options: {
        xmlCustomSortElements: {
            since: '0.4.0',
            category: 'Format',
            type: 'string',
            array: true,
            default: [{ value: defaultCustomSortElements }],
            description: 'XPath-style selectors for elements pinned ahead of their alphabetically-sorted siblings, in priority order (e.g. "fullName", "actionCalls/description"). Set to just the identifier element (e.g. ["fullName"]) to match Salesforce\'s own canonical retrieve ordering exactly.'
        },
        xmlSelfClosingElements: {
            since: '0.4.0',
            category: 'Format',
            type: 'string',
            array: true,
            default: [{ value: defaultSelfClosingElements }],
            description: 'XPath-style selectors for empty elements that should render self-closing ("<tag/>") instead of the default "<tag></tag>", e.g. "layoutColumns" (anywhere), "/Layout//layoutColumns" (under the Layout root), or "/Flow//*" (every element under the Flow root).'
        }
    }
}

export = plugin;
