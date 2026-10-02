"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sort = void 0;
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
// Looks up whether a child key should sort after every other sibling key,
// pinned or not (e.g. actionOverrides.pageOrSobjectType), preferring a
// container-scoped entry over a bare, unscoped one — mirrors
// getCustomSortPriority's scoping but for the opposite end of the order.
function isSortLast(sortLastKeys, containerKey, childKey) {
    if (containerKey !== undefined && sortLastKeys.includes(`${containerKey}.${childKey}`)) {
        return true;
    }
    return sortLastKeys.includes(childKey);
}
// Looks up whether a child key's subtree should keep its original order,
// preferring a container-scoped entry (e.g. "CustomApplication.tabs") over a
// bare, unscoped one — same scoping as isSortLast, so a key name that only
// needs its order preserved under one metadata type doesn't freeze it
// everywhere else.
function isNonSortKey(nonSortKeys, containerKey, childKey) {
    if (containerKey !== undefined && nonSortKeys.includes(`${containerKey}.${childKey}`)) {
        return true;
    }
    return nonSortKeys.includes(childKey);
}
// Looks up a child key's pin priority, preferring an entry scoped to the
// immediate container key (e.g. "actionCalls.description") over a bare,
// unscoped entry (e.g. "fullName"). Container-scoped entries let the same
// child key name (like "name" or "label") get pinned differently depending
// on which element it appears under — Salesforce's Flow metadata pins
// description/name/label/locationX/locationY on canvas elements like
// actionCalls, but only pins name on nested structures like rules or fields.
function getCustomSortPriority(customSortKeys, containerKey, childKey) {
    if (containerKey !== undefined) {
        const scopedPriority = customSortKeys[`${containerKey}.${childKey}`];
        if (scopedPriority !== undefined) {
            return scopedPriority;
        }
    }
    return customSortKeys[childKey];
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
function sort(object, sorterOptions, key) {
    var _a, _b, _c, _d, _e, _f;
    const relevantKeys = (_a = sorterOptions.relevantKeys) !== null && _a !== void 0 ? _a : {};
    const nonSortKeys = (_b = sorterOptions.nonSortKeys) !== null && _b !== void 0 ? _b : [];
    const customSortKeys = (_c = sorterOptions.customSortElements) !== null && _c !== void 0 ? _c : {};
    const keyOrderOverrides = (_d = sorterOptions.keyOrderOverrides) !== null && _d !== void 0 ? _d : [];
    const sortLastKeys = (_e = sorterOptions.sortLastKeys) !== null && _e !== void 0 ? _e : [];
    const valuePriority = (_f = sorterOptions.valuePriority) !== null && _f !== void 0 ? _f : {};
    if (nonSortKeys.includes(key)) {
        return object;
    }
    switch (getType(object)) {
        case Type.BASIC:
            return object;
        case Type.ARRAY:
            return object.map((item) => sort(item, sorterOptions, key)).sort((a, b) => mySortFunction(a, b, key, relevantKeys, valuePriority));
        case Type.OBJECT: {
            const newObject = {};
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
                // A sort-last key (e.g. actionOverrides.pageOrSobjectType)
                // always sorts after every other sibling, pinned or not —
                // the opposite end from customSortElements, so it's checked
                // before any pin priority can put it back ahead.
                const aSortsLast = isSortLast(sortLastKeys, key, aKey);
                const bSortsLast = isSortLast(sortLastKeys, key, bKey);
                if (aSortsLast !== bSortsLast) {
                    return aSortsLast ? 1 : -1;
                }
                const aPriority = getCustomSortPriority(customSortKeys, key, aKey);
                const bPriority = getCustomSortPriority(customSortKeys, key, bKey);
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
                if (isNonSortKey(nonSortKeys, key, innerKey)) {
                    newObject[innerKey] = object[innerKey];
                    return;
                }
                newObject[innerKey] = sort(object[innerKey], sorterOptions, innerKey);
            });
            return newObject;
        }
        default:
            throw new Error(`Unsupported type: ${typeof object}`);
    }
}
exports.sort = sort;
