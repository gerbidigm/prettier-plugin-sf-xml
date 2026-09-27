"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sort = sort;
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
    else if (typeof value !== 'object') {
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
            relevantKeys = relevantKeys !== null && relevantKeys !== void 0 ? relevantKeys : Reflect.ownKeys(value);
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
const mySortFunction = (a, b, key, relevantKeys) => {
    const aIdentifier = getIdentifier(key, a, relevantKeys);
    const bIdentifier = getIdentifier(key, b, relevantKeys);
    return aIdentifier.localeCompare(bIdentifier);
};
function sort(object, sorterOptions, key) {
    var _a, _b, _c;
    const relevantKeys = (_a = sorterOptions.relevantKeys) !== null && _a !== void 0 ? _a : [];
    const nonSortKeys = (_b = sorterOptions.nonSortKeys) !== null && _b !== void 0 ? _b : [];
    const customSortKeys = (_c = sorterOptions.nonSortKeys) !== null && _c !== void 0 ? _c : [];
    if (nonSortKeys.includes(key)) {
        return object;
    }
    switch (getType(object)) {
        case Type.BASIC:
            return object;
        case Type.ARRAY:
            return object.map((item) => sort(item, sorterOptions, key)).sort((a, b) => mySortFunction(a, b, key, relevantKeys));
        case Type.OBJECT:
            const newObject = {};
            const sortedKeys = Reflect.ownKeys(object).sort((a, b) => {
                var _a, _b;
                let aKey = a.toString();
                let bKey = b.toString();
                return (_b = (_a = customSortKeys[aKey]) !== null && _a !== void 0 ? _a : aKey < customSortKeys[bKey]) !== null && _b !== void 0 ? _b : bKey;
            });
            sortedKeys.forEach((innerKey) => {
                newObject[innerKey.toString()] = sort(object[innerKey.toString()], sorterOptions, innerKey.toString());
            });
            return newObject;
        default:
            throw new Error(`Unsupported type: ${typeof object}`);
    }
}
