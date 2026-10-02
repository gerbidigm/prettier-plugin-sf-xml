"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sort = void 0;
const selector_js_1 = require("./selector.js");
var Type;
(function (Type) {
    Type["BASIC"] = "basic";
    Type["OBJECT"] = "object";
    Type["ARRAY"] = "array";
})(Type || (Type = {}));
function getType(value) {
    if (Array.isArray(value)) {
        return Type.ARRAY;
    }
    else if (value === null || typeof value !== 'object') {
        return Type.BASIC;
    }
    else {
        return Type.OBJECT;
    }
}
function getIdentifier(key, value, relevantKeys) {
    switch (getType(value)) {
        case Type.BASIC:
            return `${key}:${getIdentifierFromBasicType(value)}`;
        case Type.ARRAY:
            return `${key}:${getIdentifierFromArray(key, value, relevantKeys)}`;
        case Type.OBJECT:
            relevantKeys = relevantKeys !== null && relevantKeys !== void 0 ? relevantKeys : Object.keys(value);
            return `${key}:${getIdentifierFromObject(key, value, relevantKeys)}`;
        default:
            throw new Error(`Unsupported type: ${typeof value}`);
    }
}
function getIdentifierFromBasicType(value) {
    let identifier = '';
    if (value !== undefined) {
        identifier = value.toString();
    }
    return identifier;
}
function getIdentifierFromArray(key, value, relevantKeys) {
    return value.map((item) => getIdentifier(key, item, relevantKeys)).join();
}
const getIdentifierFromObject = (key, value, relevantKeys) => {
    var _a;
    const myRelevantKeys = (_a = relevantKeys[key]) !== null && _a !== void 0 ? _a : Object.keys(value);
    return myRelevantKeys.map((item) => getIdentifier(item, value[item], relevantKeys)).join('|');
};
function compareStrings(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
// Looks up a value's priority in a container-scoped ordered list (e.g.
// formFactors: ["Small", "Medium", "Large"]), for basic-type array items that
// need a specific order Salesforce expects instead of alphabetical (Small
// would otherwise sort after Large).
function getValuePriority(valuePriority, containerKey, value) {
    if (containerKey === undefined) {
        return undefined;
    }
    const priorityList = valuePriority[containerKey];
    if (priorityList === undefined) {
        return undefined;
    }
    const index = priorityList.indexOf(String(value));
    return index === -1 ? undefined : index;
}
// xml2js keeps an element's attributes under "$" and its text under "_"
// (when it also has attributes); neither is an element, so selectors only
// see them as an attribute path segment ("@name") or not at all.
const ATTRIBUTES_KEY = "$";
const TEXT_KEY = "_";
function childPath(path, containerKey, childKey) {
    if (containerKey === ATTRIBUTES_KEY) {
        return [...path.slice(0, -1), `@${childKey}`];
    }
    return [...path, childKey];
}
function isSelectable(key) {
    return key !== undefined && key !== ATTRIBUTES_KEY && key !== TEXT_KEY;
}
const mySortFunction = (a, b, key, relevantKeys, valuePriority) => {
    if (getType(a) === Type.BASIC && getType(b) === Type.BASIC) {
        const aPriority = getValuePriority(valuePriority, key, a);
        const bPriority = getValuePriority(valuePriority, key, b);
        if (aPriority !== undefined && bPriority !== undefined) {
            return aPriority - bPriority;
        }
        if (aPriority !== undefined) {
            return -1;
        }
        if (bPriority !== undefined) {
            return 1;
        }
    }
    const aIdentifier = getIdentifier(key, a, relevantKeys);
    const bIdentifier = getIdentifier(key, b, relevantKeys);
    return compareStrings(aIdentifier, bIdentifier);
};
function sortNode(object, options, key, path) {
    const { relevantKeys, keyOrderOverrides, valuePriority } = options;
    switch (getType(object)) {
        case Type.BASIC:
            return object;
        case Type.ARRAY:
            return object.map((item) => sortNode(item, options, key, path)).sort((a, b) => mySortFunction(a, b, key, relevantKeys, valuePriority));
        case Type.OBJECT: {
            const newObject = {};
            const paths = new Map();
            const pathOf = (innerKey) => {
                let innerPath = paths.get(innerKey);
                if (innerPath === undefined) {
                    innerPath = childPath(path, key, innerKey);
                    paths.set(innerKey, innerPath);
                }
                return innerPath;
            };
            // A sort-last key (e.g. actionOverrides/pageOrSobjectType)
            // always sorts after every other sibling, pinned or not — the
            // opposite end from customSortElements. Pinned keys sort by the
            // position of the most specific selector that matches them.
            const sortsLast = (innerKey) => isSelectable(innerKey) && (0, selector_js_1.findBestMatch)(options.sortLastKeys, pathOf(innerKey)) !== undefined;
            const pinPriority = (innerKey) => isSelectable(innerKey) ? (0, selector_js_1.findBestMatch)(options.customSortElements, pathOf(innerKey)) : undefined;
            const sortedKeys = Object.keys(object).sort((aKey, bKey) => {
                // A key-order override expresses a relative-order requirement
                // between two specific sibling keys (e.g. Salesforce requires
                // `targets` before `targetConfigs` in a LightningComponentBundle)
                // that alphabetical order gets wrong. Unlike customSortElements,
                // this doesn't pin either key ahead of unrelated siblings.
                for (const [first, second] of keyOrderOverrides) {
                    if (aKey === first && bKey === second) {
                        return -1;
                    }
                    if (aKey === second && bKey === first) {
                        return 1;
                    }
                }
                const aSortsLast = sortsLast(aKey);
                const bSortsLast = sortsLast(bKey);
                if (aSortsLast !== bSortsLast) {
                    return aSortsLast ? 1 : -1;
                }
                const aPriority = pinPriority(aKey);
                const bPriority = pinPriority(bKey);
                if (aPriority !== undefined && bPriority !== undefined) {
                    return aPriority - bPriority;
                }
                if (aPriority !== undefined) {
                    return -1;
                }
                if (bPriority !== undefined) {
                    return 1;
                }
                return compareStrings(aKey, bKey);
            });
            sortedKeys.forEach((innerKey) => {
                // A non-sort key's whole subtree keeps its original order.
                if (isSelectable(innerKey) && (0, selector_js_1.findBestMatch)(options.nonSortKeys, pathOf(innerKey)) !== undefined) {
                    newObject[innerKey] = object[innerKey];
                    return;
                }
                newObject[innerKey] = sortNode(object[innerKey], options, innerKey, pathOf(innerKey));
            });
            return newObject;
        }
        default:
            throw new Error(`Unsupported type: ${typeof object}`);
    }
}
// Sorts a parsed xml2js document. `key` names the element `object` is the
// content of, for sorting a fragment (e.g. sort(content, options, "Flow"));
// omit it when sorting a whole document, whose single top-level key is the
// root element.
function sort(object, sorterOptions, key) {
    var _a, _b, _c, _d, _e, _f;
    const options = {
        relevantKeys: (_a = sorterOptions.relevantKeys) !== null && _a !== void 0 ? _a : {},
        nonSortKeys: (0, selector_js_1.compileSelectors)((_b = sorterOptions.nonSortKeys) !== null && _b !== void 0 ? _b : []),
        customSortElements: (0, selector_js_1.compileSelectors)((_c = sorterOptions.customSortElements) !== null && _c !== void 0 ? _c : []),
        keyOrderOverrides: (_d = sorterOptions.keyOrderOverrides) !== null && _d !== void 0 ? _d : [],
        sortLastKeys: (0, selector_js_1.compileSelectors)((_e = sorterOptions.sortLastKeys) !== null && _e !== void 0 ? _e : []),
        valuePriority: (_f = sorterOptions.valuePriority) !== null && _f !== void 0 ? _f : {}
    };
    const path = key === undefined ? [] : [key];
    if (key !== undefined && (0, selector_js_1.findBestMatch)(options.nonSortKeys, path) !== undefined) {
        return object;
    }
    return sortNode(object, options, key, path);
}
exports.sort = sort;
