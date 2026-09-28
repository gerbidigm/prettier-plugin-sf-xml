import type { SorterOptions, XMLParseOptions, XMLBuilderOptions } from "./types";

export const sorterOptions: SorterOptions = {
    relevantKeys: {
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
// override `xmlCustomSortElements`. Salesforce's own canonical (retrieved)
// XML only ever pins the identifier element first, so anything past
// `fullName`/`name` here is a readability preference, not a canonicalization
// requirement, and can be overridden per-project.
export const defaultCustomSortElements: string[] = [
    "fullName",
    "locationX",
    "locationY"
];

// Elements that render as an explicit `<tag></tag>` pair instead of the
// default self-closing `<tag/>` when empty. Entries are either a bare
// element name (applies under any root metadata type) or `Root.element`
// to scope the exception to a specific root type (e.g. "Layout.layoutColumns"),
// for cases where a given metadata schema is quirky about self-closing tags.
export const defaultNonSelfClosingElements: string[] = [];

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
