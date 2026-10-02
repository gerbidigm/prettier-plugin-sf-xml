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
            description: 'XPath-style selectors for elements pinned ahead of their alphabetically-sorted siblings, in priority order (e.g. "fullName", "actionCalls/description"). Set to just the identifier element (e.g. ["fullName"]) to match Salesforce\'s own canonical retrieve ordering exactly.'
        },
        xmlSelfClosingElements: {
            since: '0.4.0',
            category: 'Format',
            type: 'string',
            array: true,
            default: [{ value: settings_js_1.defaultSelfClosingElements }],
            description: 'XPath-style selectors for empty elements that should render self-closing ("<tag/>") instead of the default "<tag></tag>", e.g. "layoutColumns" (anywhere), "/Layout//layoutColumns" (under the Layout root), or "/Flow//*" (every element under the Flow root).'
        }
    }
};
module.exports = plugin;
