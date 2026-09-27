"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const parser_js_1 = __importDefault(require("./parser.js"));
const printer_js_1 = __importDefault(require("./printer.js"));
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
    }
};
module.exports = plugin;
