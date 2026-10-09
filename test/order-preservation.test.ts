import * as prettier from "prettier";

import plugin from "../src/plugin";

// Round-trip tests for repeated elements whose order Salesforce treats as
// meaningful (see preserveOrderKeys in src/settings.ts): formatting must keep
// their deliberate, non-alphabetical order and be idempotent.

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NAMESPACE = 'xmlns="http://soap.sforce.com/2006/04/metadata"';

function format(content: string) {
    return prettier.format(content, {
        parser: "sf-xml-parse",
        plugins: [plugin as any as string]
    });
}

function valuesOf(xml: string, tag: string): string[] {
    return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((match) => match[1]);
}

async function expectIdempotent(formatted: string) {
    expect(await format(formatted)).toBe(formatted);
}

describe("CustomObject searchLayouts", () => {
    const objectXML = `${XML_HEADER}<CustomObject ${NAMESPACE}>
    <searchLayouts>
        <searchResultsAdditionalFields>Status__c</searchResultsAdditionalFields>
        <searchResultsAdditionalFields>Account__c</searchResultsAdditionalFields>
        <lookupDialogsAdditionalFields>Type__c</lookupDialogsAdditionalFields>
        <lookupDialogsAdditionalFields>Account__c</lookupDialogsAdditionalFields>
        <customTabListAdditionalFields>NAME</customTabListAdditionalFields>
        <customTabListAdditionalFields>Status__c</customTabListAdditionalFields>
        <customTabListAdditionalFields>Account__c</customTabListAdditionalFields>
        <customTabListAdditionalFields>Date__c</customTabListAdditionalFields>
        <excludedStandardButtons>New</excludedStandardButtons>
        <excludedStandardButtons>ChangeOwner</excludedStandardButtons>
        <listViewButtons>Zeta_Button</listViewButtons>
        <listViewButtons>Alpha_Button</listViewButtons>
        <lookupFilterFields>Status__c</lookupFilterFields>
        <lookupFilterFields>Account__c</lookupFilterFields>
        <lookupPhoneDialogsAdditionalFields>Phone__c</lookupPhoneDialogsAdditionalFields>
        <lookupPhoneDialogsAdditionalFields>Account__c</lookupPhoneDialogsAdditionalFields>
        <massQuickActions>Zeta_Action</massQuickActions>
        <massQuickActions>Alpha_Action</massQuickActions>
        <searchFilterFields>Status__c</searchFilterFields>
        <searchFilterFields>Account__c</searchFilterFields>
        <searchResultsCustomButtons>Zeta_Button</searchResultsCustomButtons>
        <searchResultsCustomButtons>Alpha_Button</searchResultsCustomButtons>
    </searchLayouts>
    <label>Advocacy Act</label>
</CustomObject>
`;

    test("ordered lists keep their source order", async () => {
        const formatted = await format(objectXML);

        expect(valuesOf(formatted, "customTabListAdditionalFields")).toEqual(["NAME", "Status__c", "Account__c", "Date__c"]);
        expect(valuesOf(formatted, "searchResultsAdditionalFields")).toEqual(["Status__c", "Account__c"]);
        expect(valuesOf(formatted, "lookupDialogsAdditionalFields")).toEqual(["Type__c", "Account__c"]);
        expect(valuesOf(formatted, "lookupPhoneDialogsAdditionalFields")).toEqual(["Phone__c", "Account__c"]);
        expect(valuesOf(formatted, "lookupFilterFields")).toEqual(["Status__c", "Account__c"]);
        expect(valuesOf(formatted, "searchFilterFields")).toEqual(["Status__c", "Account__c"]);
        expect(valuesOf(formatted, "listViewButtons")).toEqual(["Zeta_Button", "Alpha_Button"]);
        expect(valuesOf(formatted, "searchResultsCustomButtons")).toEqual(["Zeta_Button", "Alpha_Button"]);
        expect(valuesOf(formatted, "massQuickActions")).toEqual(["Zeta_Action", "Alpha_Action"]);
    });

    test("excludedStandardButtons is a set and still sorts", async () => {
        const formatted = await format(objectXML);

        expect(valuesOf(formatted, "excludedStandardButtons")).toEqual(["ChangeOwner", "New"]);
    });

    test("searchLayouts child element groups still sort alphabetically", async () => {
        const formatted = await format(objectXML);
        const searchLayouts = formatted.slice(formatted.indexOf("<searchLayouts>"), formatted.indexOf("</searchLayouts>"));
        const groups = [...new Set([...searchLayouts.matchAll(/<(\w+)>[^<]*<\/\1>/g)].map((match) => match[1]))];

        expect(groups).toHaveLength(10);
        expect(groups).toEqual([...groups].sort());
    });

    test("formatting is idempotent", async () => {
        await expectIdempotent(await format(objectXML));
    });
});

test("CompactLayout fields keep their priority order", async () => {
    const formatted = await format(`${XML_HEADER}<CompactLayout ${NAMESPACE}>
    <fullName>Act_Compact</fullName>
    <fields>Name</fields>
    <fields>Status__c</fields>
    <fields>Account__c</fields>
    <label>Act Compact</label>
</CompactLayout>
`);

    expect(valuesOf(formatted, "fields")).toEqual(["Name", "Status__c", "Account__c"]);
    await expectIdempotent(formatted);
});

test("FieldSet displayedFields keep their display order, with each entry's children sorted", async () => {
    const formatted = await format(`${XML_HEADER}<FieldSet ${NAMESPACE}>
    <fullName>Act_Fields</fullName>
    <description>Fields</description>
    <displayedFields>
        <isRequired>false</isRequired>
        <field>Zeta__c</field>
        <isFieldManaged>false</isFieldManaged>
    </displayedFields>
    <displayedFields>
        <field>Alpha__c</field>
        <isFieldManaged>false</isFieldManaged>
        <isRequired>false</isRequired>
    </displayedFields>
    <label>Act Fields</label>
</FieldSet>
`);

    expect(valuesOf(formatted, "field")).toEqual(["Zeta__c", "Alpha__c"]);
    expect(formatted).toMatch(/<field>Zeta__c<\/field>\s*<isFieldManaged>false<\/isFieldManaged>\s*<isRequired>false<\/isRequired>/);
    await expectIdempotent(formatted);
});

test("ListView filters keep the order their booleanFilter numbers refer to", async () => {
    const formatted = await format(`${XML_HEADER}<ListView ${NAMESPACE}>
    <fullName>Open_Acts</fullName>
    <booleanFilter>1 OR (2 AND 3)</booleanFilter>
    <columns>NAME</columns>
    <filterScope>Everything</filterScope>
    <filters>
        <field>Zeta__c</field>
        <operation>equals</operation>
        <value>1</value>
    </filters>
    <filters>
        <field>Alpha__c</field>
        <operation>equals</operation>
        <value>2</value>
    </filters>
    <filters>
        <field>Mid__c</field>
        <operation>equals</operation>
        <value>3</value>
    </filters>
    <label>Open Acts</label>
</ListView>
`);

    expect(valuesOf(formatted, "field")).toEqual(["Zeta__c", "Alpha__c", "Mid__c"]);
    await expectIdempotent(formatted);
});

test("Flow decision rules, rule conditions, and choiceReferences keep their order", async () => {
    const formatted = await format(`${XML_HEADER}<Flow ${NAMESPACE}>
    <decisions>
        <name>Route</name>
        <label>Route</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <defaultConnectorLabel>Default</defaultConnectorLabel>
        <rules>
            <name>Zeta_Rule</name>
            <conditionLogic>1 OR (2 AND 3)</conditionLogic>
            <conditions>
                <leftValueReference>zeta</leftValueReference>
                <operator>EqualTo</operator>
            </conditions>
            <conditions>
                <leftValueReference>alpha</leftValueReference>
                <operator>EqualTo</operator>
            </conditions>
            <conditions>
                <leftValueReference>mid</leftValueReference>
                <operator>EqualTo</operator>
            </conditions>
            <label>Zeta</label>
        </rules>
        <rules>
            <name>Alpha_Rule</name>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>other</leftValueReference>
                <operator>EqualTo</operator>
            </conditions>
            <label>Alpha</label>
        </rules>
    </decisions>
    <screens>
        <name>Pick</name>
        <label>Pick</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <fields>
            <name>Choice_Field</name>
            <choiceReferences>Zeta_Choice</choiceReferences>
            <choiceReferences>Alpha_Choice</choiceReferences>
            <fieldType>RadioButtons</fieldType>
        </fields>
    </screens>
</Flow>
`);

    expect(valuesOf(formatted, "name").filter((name) => name.endsWith("_Rule"))).toEqual(["Zeta_Rule", "Alpha_Rule"]);
    expect(valuesOf(formatted, "leftValueReference")).toEqual(["zeta", "alpha", "mid", "other"]);
    expect(valuesOf(formatted, "choiceReferences")).toEqual(["Zeta_Choice", "Alpha_Choice"]);
    await expectIdempotent(formatted);
});
