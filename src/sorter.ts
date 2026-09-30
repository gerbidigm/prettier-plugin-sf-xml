import type { SorterOptions, SorterRelevantKeys, SorterCustomKeys } from "./types";

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

// Looks up whether a child key should sort after every other sibling key,
// pinned or not (e.g. actionOverrides.pageOrSobjectType), preferring a
// container-scoped entry over a bare, unscoped one — mirrors
// getCustomSortPriority's scoping but for the opposite end of the order.
function isSortLast(sortLastKeys: string[], containerKey: string | undefined, childKey: string): boolean {
    if (containerKey !== undefined && sortLastKeys.includes(`${containerKey}.${childKey}`)) {
        return true;
    }
    return sortLastKeys.includes(childKey);
}

// Looks up a child key's pin priority, preferring an entry scoped to the
// immediate container key (e.g. "actionCalls.description") over a bare,
// unscoped entry (e.g. "fullName"). Container-scoped entries let the same
// child key name (like "name" or "label") get pinned differently depending
// on which element it appears under — Salesforce's Flow metadata pins
// description/name/label/locationX/locationY on canvas elements like
// actionCalls, but only pins name on nested structures like rules or fields.
function getCustomSortPriority(customSortKeys: SorterCustomKeys, containerKey: string | undefined, childKey: string): number | undefined {
    if (containerKey !== undefined) {
        const scopedPriority = customSortKeys[`${containerKey}.${childKey}`];
        if (scopedPriority !== undefined) {
            return scopedPriority;
        }
    }
    return customSortKeys[childKey];
}

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

function sort(object: any, sorterOptions: SorterOptions, key?: string): any {
    const relevantKeys: SorterRelevantKeys = sorterOptions.relevantKeys ?? {};
    const nonSortKeys: string[] = sorterOptions.nonSortKeys ?? [];
    const customSortKeys: SorterCustomKeys = sorterOptions.customSortElements ?? {};
    const keyOrderOverrides: [string, string][] = sorterOptions.keyOrderOverrides ?? [];
    const sortLastKeys: string[] = sorterOptions.sortLastKeys ?? [];
    const valuePriority: { [containerKey: string]: string[] } = sorterOptions.valuePriority ?? {};

    if (nonSortKeys.includes(key)) {
        return object;
    }

    switch (getType(object)) {
        case Type.BASIC:
            return object;

        case Type.ARRAY:
            return object.map((item) => sort(item, sorterOptions, key)).sort((a, b) => mySortFunction(a, b, key!, relevantKeys, valuePriority));

        case Type.OBJECT: {
            const newObject: Record<string, any> = {};
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
                newObject[innerKey] = sort(object[innerKey], sorterOptions, innerKey);
            });
            return newObject;
        }

        default:
            throw new Error(`Unsupported type: ${typeof object}`);
    }
}


export {
    sort
}
