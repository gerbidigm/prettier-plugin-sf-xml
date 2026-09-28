"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const parser_js_1 = __importDefault(require("./parser.js"));
const printer_js_1 = __importDefault(require("./printer.js"));
const settings_js_1 = require("./settings.js");
const plugin = {
    languages: [
        {
            extensions: ['xml'],
            name: 'Salesforce XML Metadata',
            parsers: ['sf-xml-parse']
        }
    ],
    parsers: {
        'sf-xml-parse': parser_js_1.default
    },
    printers: {
        'sf-xml-print': printer_js_1.default
    },
    options: {
        xmlCustomSortElements: {
            since: '0.4.0',
            category: 'Format',
            type: 'string',
            array: true,
            default: [{ value: settings_js_1.defaultCustomSortElements }],
            description: 'Element names that are pinned ahead of their alphabetically-sorted siblings, in priority order. Set to just the identifier element (e.g. ["fullName"]) to match Salesforce\'s own canonical retrieve ordering exactly.'
        },
        xmlNonSelfClosingElements: {
            since: '0.4.0',
            category: 'Format',
            type: 'string',
            array: true,
            default: [{ value: settings_js_1.defaultNonSelfClosingElements }],
            description: 'Empty elements that should render as "<tag></tag>" instead of the default self-closing "<tag/>". Entries are either a bare element name (applies under any root metadata type) or "Root.element" to scope the exception to one root type, e.g. "Layout.layoutColumns".'
        }
    }
};
module.exports = plugin;
