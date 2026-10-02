import { sort } from "../src/sorter";
import { sorterOptions } from "../src/settings";
import type { SorterOptions } from "../src/types";

const baseOptions: SorterOptions = {
    nonSortKeys: ["nonSorted"],
    customSortElements: ["name", "fullName", "label"]
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

test("container-scoped nonSortKeys only preserve order under that container", () => {
    const options: SorterOptions = {
        nonSortKeys: ["/CustomApplication/tabs"]
    };
    const input = {
        CustomApplication: {
            tabs: ["Zulu__c", "standard-Account", "Alpha__c"]
        },
        Other: {
            tabs: ["Zulu__c", "standard-Account", "Alpha__c"]
        }
    };

    const result = sort(input, options);

    expect(result.CustomApplication.tabs).toEqual(["Zulu__c", "standard-Account", "Alpha__c"]);
    expect(result.Other.tabs).toEqual(["Alpha__c", "Zulu__c", "standard-Account"]);
});

test("default settings preserve CustomApplication tab order", () => {
    const input = {
        CustomApplication: {
            tabs: ["standard-home", "Zulu__c", "Alpha__c"]
        }
    };

    const result = sort(input, sorterOptions);

    expect(result.CustomApplication.tabs).toEqual(["standard-home", "Zulu__c", "Alpha__c"]);
});

test("container-scoped customSortElements beat bare ones and only apply under that container", () => {
    const options: SorterOptions = {
        customSortElements: ["fullName", "actionCalls/label", "actionCalls/name"]
    };
    const input = {
        Flow: {
            actionCalls: [{ name: ["A"], fullName: ["F"], label: ["L"], actionName: ["X"] }],
            other: [{ name: ["A"], fullName: ["F"], label: ["L"], actionName: ["X"] }]
        }
    };

    const result = sort(input, options);

    expect(Object.keys(result.Flow.actionCalls[0])).toEqual(["fullName", "label", "name", "actionName"]);
    expect(Object.keys(result.Flow.other[0])).toEqual(["fullName", "actionName", "label", "name"]);
});

test("root selectors in nonSortKeys leave a whole metadata type unsorted", () => {
    const input = {
        Layout: { zulu: ["1"], alpha: ["2"] }
    };

    const result = sort(input, { nonSortKeys: ["/Layout"] });

    expect(Object.keys(result.Layout)).toEqual(["zulu", "alpha"]);
});

test("root attribute selectors pin attributes on the root element only", () => {
    const input = {
        CustomMetadata: {
            $: { "xmlns:xsi": "i", "xmlns": "n" },
            child: [{ $: { "xmlns:xsi": "i", "xmlns": "n" } }]
        }
    };

    const result = sort(input, { customSortElements: ["/*/@xmlns"] });

    expect(Object.keys(result.CustomMetadata.$)).toEqual(["xmlns", "xmlns:xsi"]);
    expect(Object.keys(result.CustomMetadata.child[0].$)).toEqual(["xmlns", "xmlns:xsi"].sort());
});

test("legacy dot-scoped customSortElements still work, with a deprecation warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const input = {
        actionCalls: [{ name: ["A"], actionName: ["X"] }]
    };

    const result = sort(input, { customSortElements: ["legacyCalls.name", "actionCalls.name"] }, "Flow");

    expect(Object.keys(result.actionCalls[0])).toEqual(["name", "actionName"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"actionCalls/name"'));
    warn.mockRestore();
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

test("CustomObjectTranslation quickActions sort by name, not by label text", () => {
    const input = {
        quickActions: [
            { label: ["Zulu Label"], name: ["Apple_Action"] },
            { label: ["Alpha Label"], name: ["Zebra_Action"] }
        ]
    };

    const result = sort(input, sorterOptions, "CustomObjectTranslation");

    expect(result.quickActions.map((item: any) => item.name[0])).toEqual(["Apple_Action", "Zebra_Action"]);
});

test("keyOrderOverrides forces targets before targetConfigs despite alphabetical order", () => {
    const options: SorterOptions = {
        keyOrderOverrides: [["targets", "targetConfigs"]]
    };
    const input = {
        targetConfigs: ["config"],
        apiVersion: ["58.0"],
        targets: ["target"]
    };

    const result = sort(input, options, "LightningComponentBundle");

    expect(Object.keys(result)).toEqual(["apiVersion", "targets", "targetConfigs"]);
});

test("CustomApplication formFactors sort Small before Large, not alphabetically", () => {
    const input = {
        formFactors: ["Large", "Small"]
    };

    const result = sort(input, sorterOptions, "CustomApplication");

    expect(result.formFactors).toEqual(["Small", "Large"]);
});

test("valuePriority leaves unlisted values sorting alphabetically after listed ones", () => {
    const options: SorterOptions = {
        valuePriority: {
            formFactors: ["Small", "Medium", "Large"]
        }
    };
    const input = {
        formFactors: ["Zulu", "Large", "Alpha", "Small"]
    };

    const result = sort(input, options, "CustomApplication");

    expect(result.formFactors).toEqual(["Small", "Large", "Alpha", "Zulu"]);
});

test("CustomApplication actionOverrides.pageOrSobjectType sorts after every other sibling", () => {
    const input = {
        actionOverrides: [{
            type: ["Default"],
            actionName: ["View"],
            pageOrSobjectType: ["Account"]
        }]
    };

    const result = sort(input, sorterOptions, "CustomApplication");

    expect(Object.keys(result.actionOverrides[0])).toEqual(["actionName", "type", "pageOrSobjectType"]);
});

test("underscore-containing names sort by plain codepoint order, not locale collation", () => {
    const options: SorterOptions = {
        relevantKeys: {
            fieldPermissions: ["field"]
        }
    };
    const input = {
        fieldPermissions: [
            { field: ["Logo_Use_Request__c.External_Key__c"] },
            { field: ["Logo_Use_Request_Contact_Role__c.External_Key__c"] }
        ]
    };

    const result = sort(input, options, "Parent");

    expect(result.fieldPermissions.map((item: any) => item.field[0])).toEqual([
        "Logo_Use_Request_Contact_Role__c.External_Key__c",
        "Logo_Use_Request__c.External_Key__c"
    ]);
});
