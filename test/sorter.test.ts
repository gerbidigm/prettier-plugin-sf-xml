import { sort } from "../src/sorter";
import type { SorterOptions } from "../src/types";

const baseOptions: SorterOptions = {
    nonSortKeys: ["nonSorted"],
    customSortElements: {
        name: 1,
        fullName: 2,
        label: 3
    }
};

test("unconfigured siblings sort alphabetically", () => {
    const input = {
        description: ["A description"],
        caseSensitive: ["false"]
    };

    const result = sort(input, baseOptions, "CustomField");

    expect(Object.keys(result)).toEqual(["caseSensitive", "description"]);
});

test("configured elements retain their custom order regardless of input order", () => {
    const input = {
        label: ["Test Field"],
        description: ["A description"],
        fullName: ["Test__c"],
        name: ["Test"]
    };

    const result = sort(input, baseOptions, "CustomField");

    expect(Object.keys(result)).toEqual(["name", "fullName", "label", "description"]);
});

test("elements under nonSortKeys keep their original order", () => {
    const input = {
        nonSorted: [
            { fullName: ["Zulu"], default: ["false"] },
            { fullName: ["Alpha"], default: ["true"] }
        ]
    };

    const result = sort(input, baseOptions, "Parent");

    expect(result.nonSorted).toBe(input.nonSorted);
    expect(result.nonSorted.map((item: any) => item.fullName[0])).toEqual(["Zulu", "Alpha"]);
});

test("repeated child arrays still sort by their relevant key", () => {
    const options: SorterOptions = {
        ...baseOptions,
        relevantKeys: {
            fieldPermissions: ["field"]
        }
    };
    const input = {
        fieldPermissions: [
            { field: ["Case.Zeta"] },
            { field: ["Case.Alpha"] }
        ]
    };

    const result = sort(input, options, "Parent");

    expect(result.fieldPermissions.map((item: any) => item.field[0])).toEqual(["Case.Alpha", "Case.Zeta"]);
});
