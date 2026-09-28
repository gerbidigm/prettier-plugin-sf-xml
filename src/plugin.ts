import type { Plugin } from "./types";

import parser from "./parser.js";
import printer from "./printer.js";
import { defaultCustomSortElements, defaultNonSelfClosingElements } from "./settings.js";

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
            description: 'Element names that are pinned ahead of their alphabetically-sorted siblings, in priority order. Set to just the identifier element (e.g. ["fullName"]) to match Salesforce\'s own canonical retrieve ordering exactly.'
        },
        xmlNonSelfClosingElements: {
            since: '0.4.0',
            category: 'Format',
            type: 'string',
            array: true,
            default: [{ value: defaultNonSelfClosingElements }],
            description: 'Empty elements that should render as "<tag></tag>" instead of the default self-closing "<tag/>". Entries are either a bare element name (applies under any root metadata type) or "Root.element" to scope the exception to one root type, e.g. "Layout.layoutColumns".'
        }
    }
}

export = plugin;
