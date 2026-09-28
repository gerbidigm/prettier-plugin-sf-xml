import type { SorterOptions, XMLParseOptions, XMLBuilderOptions } from "./types";

// Flow canvas elements pin description/name/label/locationX/locationY (in
// that order, whichever are present) ahead of their other, alphabetically-
// sorted properties, and sibling elements of the same type sort by their
// `name` specifically (not by the full pinned-field identifier — otherwise
// a present `description` would outrank `name` as the sort key). This is
// confirmed for these container keys; other Flow canvas element types
// (waits, subflows, loops, etc.) likely follow the same convention but
// haven't been verified yet, so add them here as they come up.
const flowCanvasElements = ["actionCalls", "assignments", "decisions", "dynamicChoiceSets", "recordLookups", "screens", "variables"];
const flowCanvasFieldOrder = ["description", "name", "label", "locationX", "locationY"];

// Nested Flow structures (a decision's rules, a screen's fields) only pin
// `name` ahead of their siblings — description/label/locationX/locationY
// sort naturally there instead of being pinned.
const flowNestedNameOnlyElements = ["rules", "fields"];

// Report elements that pin `label` then `name` ahead of their other,
// alphabetically-sorted siblings.
const reportLabelNameElements = ["loops", "recordUpdates"];
const reportLabelNameFieldOrder = ["label", "name"];

export const sorterOptions: SorterOptions = {
    relevantKeys: {
        ...Object.fromEntries(flowCanvasElements.map((element) => [element, ["name"]])),
        action: ["name"],
        actionOverrides: ["actionName"],
        alerts: ["fullName"],
        applicationVisibilities: ["application"],
        appMenuItems: ["name"],
        approver: ["name"],
        appSettings: ["connectedAppName"],
        categoryGroupVisibilities: ["dataCategoryGroup"],
        classAccesses: ["apexClass"],
        componentInstanceProperties: ["name"],
        customMetadataTypeAccesses: ["name"],
        customSettingAccesses: ["name"],
        duplicateRuleMatchRules: ["matchingRule"],
        entitiesAndFields: ["entityName", "fieldName"],
        fieldPermissions: ["field"],
        fieldUpdates: ["fullName"],
        filters: ["field"],
        layoutAssignments: ["layout"],
        managedContentNodeTypes: ["nodeName"],
        mappingFields: ["inputField"],
        matchingRuleItems: ["fieldName"],
        matchingRules: ["fullName"],
        notificationTypeSettings: ["notificationType"],
        objectMapping: ["outputObject"],
        objectPermissions: ["object"],
        pageAccesses: ["apexPage"],
        quickActions: ["name"],
        recipients: ["recipient"],
        recordTypeVisibilities: ["tab"],
        tabVisibilities: ["name"],
        userPermissions: ["name"],
        values: ["field"],
        version: ["number"],
        rules: ["fullName"]
    },
    nonSortKeys: [
        "assignmentRule",
        "columns",
        "FlexiPage",
        "GlobalValueSet",
        "groupingsDown",
        "Layout",
        "lookupFilter",
        "pathAssistantSteps",
        "picklistValues",
        "profileSearchLayouts",
        "quickActionLayout",
        "sections",
        "StandardValueSet",
        "valueSetDefinition"
    ],
    // Alphabetical order gets these pairs wrong: Salesforce requires the
    // first element of each pair before the second regardless of spelling.
    // Unlike customSortElements, this only fixes the relative order of the
    // pair and doesn't pin either key ahead of unrelated siblings.
    keyOrderOverrides: [
        ["targets", "targetConfigs"]
    ]
}

// The default priority order for elements that should be pinned ahead of
// their alphabetically-sorted siblings, used when the consumer doesn't
// override `xmlCustomSortElements`. Entries are either a bare element name
// (pinned wherever it appears) or `Container.element` to scope the pin to
// elements nested directly under a specific container key (e.g.
// "actionCalls.description"), since the same field name can need different
// treatment depending on what it's nested under — see flowCanvasElements
// and flowNestedNameOnlyElements above. Outside of Flow, Salesforce's own
// canonical (retrieved) XML only ever pins the identifier element first, so
// anything past `fullName` here is a readability preference, not a
// canonicalization requirement, and can be overridden per-project.
export const defaultCustomSortElements: string[] = [
    ...flowCanvasElements.flatMap((element) => flowCanvasFieldOrder.map((field) => `${element}.${field}`)),
    ...flowNestedNameOnlyElements.map((element) => `${element}.name`),
    ...reportLabelNameElements.flatMap((element) => reportLabelNameFieldOrder.map((field) => `${element}.${field}`)),
    "fullName",
    "locationX",
    "locationY"
];

// Elements that render self-closing (`<tag/>`) instead of the default
// explicit `<tag></tag>` pair when empty. Entries are either a bare element
// name (applies under any root metadata type) or `Root.element` to scope it
// to a specific root type (e.g. "Layout.layoutColumns"), for cases where a
// given metadata schema is known to prefer the self-closing form.
export const defaultSelfClosingElements: string[] = [];

export const xmlParseOptions: XMLParseOptions = {
    trim: true
};

export const xmlBuilderOptions: XMLBuilderOptions = {
    xmldec: { version: "1.0", encoding: "UTF-8", standalone: null },
    renderOpts: {
        pretty: true,
        allowEmpty: true,
        indent: '    ',
        newline: '\n'
    }
};
