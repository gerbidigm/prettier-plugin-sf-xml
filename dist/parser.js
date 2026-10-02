"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const xml2js = __importStar(require("xml2js"));
const settings_js_1 = require("./settings.js");
const commentPreservation_js_1 = require("./commentPreservation.js");
// Salesforce metadata names its root element in PascalCase (CustomObject,
// Flow, Layout) and every element beneath it in camelCase. Root selectors
// like "/Layout" rely on that, so a PascalCase element below the root is
// worth flagging: it's either not Salesforce metadata or a shape the
// plugin's rules haven't accounted for. Each distinct path is reported once
// per file.
const findNestedPascalCaseElements = (parsedXML) => {
    const found = new Set();
    const walk = (value, path) => {
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
const parser = {
    parse(text, _parsers, options) {
        const parser = new xml2js.Parser(settings_js_1.xmlParseOptions);
        let parsedXML;
        parser.parseString((0, commentPreservation_js_1.protectLeafComments)(text), function (err, result) {
            if (!result) {
                throw new SyntaxError(`An error occurred while parsing the XML data. Please ensure that the XML document is well-formed and valid according to the specified schema: ${err}`);
            }
            parsedXML = result;
        });
        findNestedPascalCaseElements(parsedXML).forEach((elementPath) => {
            var _a;
            const file = (_a = options === null || options === void 0 ? void 0 : options.filepath) !== null && _a !== void 0 ? _a : "<input>";
            console.warn(`[prettier-plugin-sf-xml] ${file}: unexpected PascalCase element at ${elementPath} (only the root element is expected to be PascalCase in Salesforce metadata)`);
        });
        return { parsedXML };
    },
    astFormat: "sf-xml-print",
    locStart(node) {
        return node.location.startOffset;
    },
    locEnd(node) {
        return node.location.endOffset;
    }
};
exports.default = parser;
