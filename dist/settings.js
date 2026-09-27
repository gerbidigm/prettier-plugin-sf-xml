"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xmlBuilderOptions = exports.xmlParseOptions = exports.sorterOptions = void 0;
exports.sorterOptions = {
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
    customSortElements: {
        name: 1,
        fullName: 2,
        label: 3,
        locationX: 4,
        locationY: 5
    }
};
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
