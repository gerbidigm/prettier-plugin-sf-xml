"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xmlBuilderOptions = exports.xmlParseOptions = exports.defaultSelfClosingElements = exports.defaultCustomSortElements = exports.sorterOptions = void 0;
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
// Nested Flow structures (a decision's rules, a screen's fields, a choice)
// only pin `name` ahead of their siblings — description/label/locationX/
// locationY sort naturally there instead of being pinned.
const flowNestedNameOnlyElements = ["choices", "rules", "fields"];
// Report elements that pin `name` then `label` ahead of their other,
// alphabetically-sorted siblings.
const reportLabelNameElements = ["loops", "recordUpdates"];
const reportLabelNameFieldOrder = ["name", "label"];
// Flow canvas elements that pin only `name` then `label` ahead of their
// other siblings — unlike flowCanvasElements above, these aren't confirmed
// to also pin description/locationX/locationY, so only name/label are
// scoped here.
const flowNameLabelElements = ["recordCreates", "customErrors"];
const flowNameLabelFieldOrder = ["name", "label"];
// xml2js parses a tag's attributes into an object under the "$" key, in
// whatever order they appeared in the source. Salesforce's namespaced root
// elements (xmlns, then xmlns:xsi, then xmlns:xsd, whichever are present)
// need that exact order — alphabetical sorting flips xsi/xsd since "d" <
// "i" — so this pins them the same way any other element's children are
// pinned, with a root attribute selector ("/*/@xmlns").
const xmlAttributeOrder = ["xmlns", "xmlns:xsi", "xmlns:xsd"];
exports.sorterOptions = {
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
    // Selectors (see selector.ts) for elements whose whole subtree keeps its
    // original order. Root selectors like "/Layout" leave an entire metadata
    // type unsorted; "/CustomApplication/tabs" preserves the app's
    // navigation order.
    nonSortKeys: [
        "assignmentRule",
        "columns",
        "/CustomApplication/tabs",
        "/FlexiPage",
        "/GlobalValueSet",
        "groupingsDown",
        "/Layout",
        "lookupFilter",
        "pathAssistantSteps",
        "picklistValues",
        "profileSearchLayouts",
        "quickActionLayout",
        "sections",
        "/StandardValueSet",
        "valueSetDefinition"
    ],
    // Alphabetical order gets these pairs wrong: Salesforce requires the
    // first element of each pair before the second regardless of spelling.
    // Unlike customSortElements, this only fixes the relative order of the
    // pair and doesn't pin either key ahead of unrelated siblings.
    keyOrderOverrides: [
        ["targets", "targetConfigs"]
    ],
    // Selectors for elements that always sort after every other sibling in
    // their container, pinned or not — the opposite end from
    // customSortElements.
    sortLastKeys: [
        "actionOverrides/pageOrSobjectType"
    ],
    // Basic-value arrays where Salesforce expects a specific order instead
    // of alphabetical (e.g. CustomApplication's formFactors: alphabetical
    // would put "Large" before "Small").
    valuePriority: {
        formFactors: ["Small", "Medium", "Large"]
    }
};
// The default priority order for elements that should be pinned ahead of
// their alphabetically-sorted siblings, used when the consumer doesn't
// override `xmlCustomSortElements`. Entries are selectors (see selector.ts):
// a bare element name pins it wherever it appears, and `container/element`
// scopes the pin to elements directly under that container (e.g.
// "actionCalls/description"), since the same field name can need different
// treatment depending on what it's nested under — see flowCanvasElements
// and flowNestedNameOnlyElements above. Outside of Flow, Salesforce's own
// canonical (retrieved) XML only ever pins the identifier element first, so
// anything past `fullName` here is a readability preference, not a
// canonicalization requirement, and can be overridden per-project.
exports.defaultCustomSortElements = [
    ...xmlAttributeOrder.map((attr) => `/*/@${attr}`),
    ...flowCanvasElements.flatMap((element) => flowCanvasFieldOrder.map((field) => `${element}/${field}`)),
    ...flowNestedNameOnlyElements.map((element) => `${element}/name`),
    ...reportLabelNameElements.flatMap((element) => reportLabelNameFieldOrder.map((field) => `${element}/${field}`)),
    ...flowNameLabelElements.flatMap((element) => flowNameLabelFieldOrder.map((field) => `${element}/${field}`)),
    "fullName",
    "locationX",
    "locationY"
];
// Selectors (see selector.ts) for elements that render self-closing
// (`<tag/>`) instead of the default explicit `<tag></tag>` pair when empty,
// e.g. "/Layout//layoutColumns" for one element under one root type, or
// "/Flow//*" to self-close every empty element under that root type — Flow
// metadata is expected to self-close uniformly, unlike other schemas where
// only specific elements are known to prefer it.
exports.defaultSelfClosingElements = ["/Layout//layoutColumns", "/Flow//*", "/CustomMetadata//*", "/Dashboard//*", "/QuickAction//*"];
exports.xmlParseOptions = {
    trim: true
};
exports.xmlBuilderOptions = {
    xmldec: { version: "1.0", encoding: "UTF-8", standalone: null },
    renderOpts: {
        pretty: true,
        allowEmpty: true,
        indent: '    ',
        newline: '\n'
    }
};
