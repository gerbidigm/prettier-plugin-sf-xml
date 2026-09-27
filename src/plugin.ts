import type { Plugin } from "./types";

import parser from "./parser.js";
import printer from "./printer.js";
import { defaultCustomSortElements } from "./settings.js";

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
        }
    }
}

export = plugin;
