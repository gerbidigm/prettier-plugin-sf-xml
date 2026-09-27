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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const xml2js = __importStar(require("xml2js"));
const settings_js_1 = require("./settings.js");
const sorter_js_1 = require("./sorter.js");
const getTab = function (tabWidth, useTabs) {
    let tab = "";
    for (let i = 0; i < tabWidth; i++) {
        if (useTabs) {
            tab += "\t";
        }
        else {
            tab += " ";
        }
    }
    return tab;
};
const escapeTextQuotes = (xml) => {
    let output = "";
    let index = 0;
    while (index < xml.length) {
        if (xml.startsWith("<!--", index)) {
            const end = xml.indexOf("-->", index + 4);
            const next = end < 0 ? xml.length : end + 3;
            output += xml.slice(index, next);
            index = next;
        }
        else if (xml.startsWith("<![CDATA[", index)) {
            const end = xml.indexOf("]]>", index + 9);
            const next = end < 0 ? xml.length : end + 3;
            output += xml.slice(index, next);
            index = next;
        }
        else if (xml.startsWith("<?", index)) {
            const end = xml.indexOf("?>", index + 2);
            const next = end < 0 ? xml.length : end + 2;
            output += xml.slice(index, next);
            index = next;
        }
        else if (xml[index] === "<") {
            let quote = null;
            let bracketDepth = 0;
            let end = index + 1;
            for (; end < xml.length; end += 1) {
                const char = xml[end];
                if (quote) {
                    if (char === quote)
                        quote = null;
                }
                else if (char === '"' || char === "'") {
                    quote = char;
                }
                else if (char === "[") {
                    bracketDepth += 1;
                }
                else if (char === "]") {
                    bracketDepth = Math.max(0, bracketDepth - 1);
                }
                else if (char === ">" && bracketDepth === 0) {
                    end += 1;
                    break;
                }
            }
            output += xml.slice(index, end);
            index = end;
        }
        else {
            output += xml[index] === '"' ? "&quot;" : xml[index];
            index += 1;
        }
    }
    return output;
};
const printer = {
    print(path, opts, print) {
        settings_js_1.xmlBuilderOptions.renderOpts.indent = getTab(opts.tabWidth, opts.useTabs);
        let builder = new xml2js.Builder(settings_js_1.xmlBuilderOptions);
        let sortedJsonObj = (0, sorter_js_1.sort)(path.getValue().parsedXML, settings_js_1.sorterOptions, null);
        let sortedXML = builder.buildObject(sortedJsonObj);
        // add new line at the end of the file if not exist
        if (!sortedXML.endsWith("\n")) {
            sortedXML += "\n";
        }
        return escapeTextQuotes(sortedXML);
    }
};
exports.default = printer;
