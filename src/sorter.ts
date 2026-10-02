import type { SorterOptions, SorterRelevantKeys } from "./types";
import { compileSelectors, findBestMatch } from "./selector.js";
import type { NodePath, Selector } from "./selector.js";

enum Type {
    BASIC = 'basic',
    OBJECT = 'object',
    ARRAY = 'array',
}

function getType(value: any): Type {
    if (Array.isArray(value)) {
        return Type.ARRAY;
    } else if (value === null || typeof value !== 'object') {
        return Type.BASIC;
    } else {
        return Type.OBJECT;
    }
}

function getIdentifier(key: string, value: any, relevantKeys: SorterRelevantKeys): string {
    switch (getType(value)) {
        case Type.BASIC:
            return `${key}:${getIdentifierFromBasicType(value)}`;

        case Type.ARRAY:
            return `${key}:${getIdentifierFromArray(key, value, relevantKeys)}`;

        case Type.OBJECT:
            relevantKeys = relevantKeys ?? Object.keys(value);
            return `${key}:${getIdentifierFromObject(key, value, relevantKeys)}`;

        default:
            throw new Error(`Unsupported type: ${typeof value}`);
    }
}

function getIdentifierFromBasicType(value: any): string {
    let identifier = '';
    if (value !== undefined) {
        identifier = value.toString();
    }

    return identifier;
}

function getIdentifierFromArray(key: string, value: any[], relevantKeys: SorterRelevantKeys): string {
    return value.map((item) => getIdentifier(key, item, relevantKeys)).join();
}

const getIdentifierFromObject = (key: string, value: Record<string, any>, relevantKeys: SorterRelevantKeys): string => {
    const myRelevantKeys = relevantKeys[key] ?? Object.keys(value);

    return myRelevantKeys.map((item) => getIdentifier(item, value[item], relevantKeys)).join('|');
}

function compareStrings(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

// Looks up a value's priority in a container-scoped ordered list (e.g.
// formFactors: ["Small", "Medium", "Large"]), for basic-type array items that
// need a specific order Salesforce expects instead of alphabetical (Small
// would otherwise sort after Large).
function getValuePriority(valuePriority: { [containerKey: string]: string[] }, containerKey: string | undefined, value: any): number | undefined {
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

function childPath(path: NodePath, containerKey: string | undefined, childKey: string): NodePath {
    if (containerKey === ATTRIBUTES_KEY) {
        return [...path.slice(0, -1), `@${childKey}`];
    }
    return [...path, childKey];
}

function isSelectable(key: string | undefined): boolean {
    return key !== undefined && key !== ATTRIBUTES_KEY && key !== TEXT_KEY;
}

type CompiledSorterOptions = {
    relevantKeys: SorterRelevantKeys;
    nonSortKeys: Selector[];
    customSortElements: Selector[];
    keyOrderOverrides: [string, string][];
    sortLastKeys: Selector[];
    valuePriority: { [containerKey: string]: string[] };
};

const mySortFunction = (a: any, b: any, key: string, relevantKeys: SorterRelevantKeys, valuePriority: { [containerKey: string]: string[] }): number => {
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

    const aIdentifier: string = getIdentifier(key, a, relevantKeys);
    const bIdentifier: string = getIdentifier(key, b, relevantKeys);

    return compareStrings(aIdentifier, bIdentifier);
}

function sortNode(object: any, options: CompiledSorterOptions, key: string | undefined, path: NodePath): any {
    const { relevantKeys, keyOrderOverrides, valuePriority } = options;

    switch (getType(object)) {
        case Type.BASIC:
            return object;

        case Type.ARRAY:
            return object.map((item) => sortNode(item, options, key, path)).sort((a, b) => mySortFunction(a, b, key!, relevantKeys, valuePriority));

        case Type.OBJECT: {
            const newObject: Record<string, any> = {};
            const paths = new Map<string, NodePath>();
            const pathOf = (innerKey: string): NodePath => {
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
            const sortsLast = (innerKey: string): boolean =>
                isSelectable(innerKey) && findBestMatch(options.sortLastKeys, pathOf(innerKey)) !== undefined;
            const pinPriority = (innerKey: string): number | undefined =>
                isSelectable(innerKey) ? findBestMatch(options.customSortElements, pathOf(innerKey)) : undefined;

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
                if (isSelectable(innerKey) && findBestMatch(options.nonSortKeys, pathOf(innerKey)) !== undefined) {
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
function sort(object: any, sorterOptions: SorterOptions, key?: string): any {
    const options: CompiledSorterOptions = {
        relevantKeys: sorterOptions.relevantKeys ?? {},
        nonSortKeys: compileSelectors(sorterOptions.nonSortKeys ?? []),
        customSortElements: compileSelectors(sorterOptions.customSortElements ?? []),
        keyOrderOverrides: sorterOptions.keyOrderOverrides ?? [],
        sortLastKeys: compileSelectors(sorterOptions.sortLastKeys ?? []),
        valuePriority: sorterOptions.valuePriority ?? {}
    };
    const path: NodePath = key === undefined ? [] : [key];

    if (key !== undefined && findBestMatch(options.nonSortKeys, path) !== undefined) {
        return object;
    }
    return sortNode(object, options, key, path);
}


export {
    sort
}
