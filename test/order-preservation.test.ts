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

// The slice of `xml` from the first <tag> to the matching first </tag>, for
// reading values from one element when other elements reuse the same tags.
function section(xml: string, tag: string): string {
    const start = xml.indexOf(`<${tag}>`);
    const end = xml.indexOf(`</${tag}>`, start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return xml.slice(start, end);
}

test("Flow screen fields, section columns, column fields, and visibility conditions keep their display order", async () => {
    const formatted = await format(`${XML_HEADER}<Flow ${NAMESPACE}>
    <screens>
        <name>Details</name>
        <label>Details</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <fields>
            <name>Zeta_Display</name>
            <fieldText>Intro</fieldText>
            <fieldType>DisplayText</fieldType>
        </fields>
        <fields>
            <name>Section_1</name>
            <fieldType>RegionContainer</fieldType>
            <fields>
                <name>Section_1_Column_2</name>
                <fieldType>Region</fieldType>
                <fields>
                    <name>Zeta_Input</name>
                    <dataType>String</dataType>
                    <fieldText>Zeta</fieldText>
                    <fieldType>InputField</fieldType>
                    <isRequired>false</isRequired>
                    <visibilityRule>
                        <conditionLogic>2 OR 1</conditionLogic>
                        <conditions>
                            <leftValueReference>zetaFlag</leftValueReference>
                            <operator>EqualTo</operator>
                            <rightValue>
                                <booleanValue>true</booleanValue>
                            </rightValue>
                        </conditions>
                        <conditions>
                            <leftValueReference>alphaFlag</leftValueReference>
                            <operator>EqualTo</operator>
                            <rightValue>
                                <booleanValue>true</booleanValue>
                            </rightValue>
                        </conditions>
                    </visibilityRule>
                </fields>
                <fields>
                    <name>Alpha_Input</name>
                    <dataType>String</dataType>
                    <fieldText>Alpha</fieldText>
                    <fieldType>InputField</fieldType>
                    <isRequired>false</isRequired>
                </fields>
            </fields>
            <fields>
                <name>Section_1_Column_1</name>
                <fieldType>Region</fieldType>
                <fields>
                    <name>Mid_Input</name>
                    <dataType>String</dataType>
                    <fieldText>Mid</fieldText>
                    <fieldType>InputField</fieldType>
                    <isRequired>false</isRequired>
                </fields>
            </fields>
            <isRequired>false</isRequired>
            <regionContainerType>SectionWithoutHeader</regionContainerType>
        </fields>
        <fields>
            <name>Alpha_Display</name>
            <fieldText>Outro</fieldText>
            <fieldType>DisplayText</fieldType>
        </fields>
    </screens>
</Flow>
`);

    expect(valuesOf(formatted, "name")).toEqual([
        "Details",
        "Zeta_Display",
        "Section_1",
        "Section_1_Column_2",
        "Zeta_Input",
        "Alpha_Input",
        "Section_1_Column_1",
        "Mid_Input",
        "Alpha_Display"
    ]);
    expect(valuesOf(formatted, "leftValueReference")).toEqual(["zetaFlag", "alphaFlag"]);
    // Each field's own children still sort, with name pinned first.
    expect(formatted).toMatch(/<name>Zeta_Display<\/name>\s*<fieldText>Intro<\/fieldText>\s*<fieldType>DisplayText<\/fieldType>/);
    await expectIdempotent(formatted);
});

test("Flow record element and start filters keep the order their filterLogic numbers refer to", async () => {
    const filters = `<filterLogic>2 OR (1 AND 3)</filterLogic>
        <filters>
            <operator>EqualTo</operator>
            <field>Zeta__c</field>
            <value>
                <stringValue>1</stringValue>
            </value>
        </filters>
        <filters>
            <field>Alpha__c</field>
            <operator>EqualTo</operator>
            <value>
                <stringValue>2</stringValue>
            </value>
        </filters>
        <filters>
            <field>Mid__c</field>
            <operator>EqualTo</operator>
            <value>
                <stringValue>3</stringValue>
            </value>
        </filters>`;
    const formatted = await format(`${XML_HEADER}<Flow ${NAMESPACE}>
    <recordDeletes>
        <name>Delete_Acts</name>
        <label>Delete Acts</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        ${filters}
        <object>Advocacy_Act__c</object>
    </recordDeletes>
    <recordLookups>
        <name>Get_Acts</name>
        <label>Get Acts</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        ${filters}
        <object>Advocacy_Act__c</object>
    </recordLookups>
    <recordUpdates>
        <name>Update_Acts</name>
        <label>Update Acts</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        ${filters}
        <object>Advocacy_Act__c</object>
    </recordUpdates>
    <start>
        <locationX>0</locationX>
        <locationY>0</locationY>
        ${filters}
        <object>Advocacy_Act__c</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
</Flow>
`);

    ["recordDeletes", "recordLookups", "recordUpdates", "start"].forEach((element) => {
        expect(valuesOf(section(formatted, element), "field")).toEqual(["Zeta__c", "Alpha__c", "Mid__c"]);
    });
    // Each filter's own children still sort.
    expect(formatted).toMatch(/<filters>\s*<field>Zeta__c<\/field>\s*<operator>EqualTo<\/operator>/);
    await expectIdempotent(formatted);
});

test("Report filter criteriaItems and groupingsAcross keep their order", async () => {
    const formatted = await format(`${XML_HEADER}<Report ${NAMESPACE}>
    <columns>
        <field>Advocacy_Act__c.Name</field>
    </columns>
    <filter>
        <booleanFilter>1 AND (2 OR 3)</booleanFilter>
        <criteriaItems>
            <column>Advocacy_Act__c.Zeta__c</column>
            <operator>equals</operator>
            <value>1</value>
        </criteriaItems>
        <criteriaItems>
            <column>Advocacy_Act__c.Alpha__c</column>
            <operator>equals</operator>
            <value>2</value>
        </criteriaItems>
        <criteriaItems>
            <value>3</value>
            <column>Advocacy_Act__c.Mid__c</column>
            <operator>equals</operator>
        </criteriaItems>
    </filter>
    <format>Matrix</format>
    <groupingsAcross>
        <sortOrder>Asc</sortOrder>
        <dateGranularity>Day</dateGranularity>
        <field>Advocacy_Act__c.Zeta__c</field>
    </groupingsAcross>
    <groupingsAcross>
        <dateGranularity>Day</dateGranularity>
        <field>Advocacy_Act__c.Alpha__c</field>
        <sortOrder>Asc</sortOrder>
    </groupingsAcross>
    <name>Acts Matrix</name>
    <reportType>CustomEntity$Advocacy_Act__c</reportType>
</Report>
`);

    expect(valuesOf(formatted, "column")).toEqual(["Advocacy_Act__c.Zeta__c", "Advocacy_Act__c.Alpha__c", "Advocacy_Act__c.Mid__c"]);
    expect(formatted).toMatch(/<column>Advocacy_Act__c.Mid__c<\/column>\s*<operator>equals<\/operator>\s*<value>3<\/value>/);
    expect(valuesOf(formatted, "field").filter((field) => field !== "Advocacy_Act__c.Name")).toEqual(["Advocacy_Act__c.Zeta__c", "Advocacy_Act__c.Alpha__c"]);
    expect(formatted).toMatch(/<groupingsAcross>\s*<dateGranularity>Day<\/dateGranularity>\s*<field>Advocacy_Act__c.Zeta__c<\/field>\s*<sortOrder>Asc<\/sortOrder>/);
    await expectIdempotent(formatted);
});

test("MatchingRule matchingRuleItems keep the order their booleanFilter numbers refer to", async () => {
    const items = `<booleanFilter>2 OR 1</booleanFilter>
        <label>Act Match</label>
        <matchingRuleItems>
            <fieldName>Zeta__c</fieldName>
            <matchingMethod>Exact</matchingMethod>
        </matchingRuleItems>
        <matchingRuleItems>
            <matchingMethod>Exact</matchingMethod>
            <fieldName>Alpha__c</fieldName>
        </matchingRuleItems>
        <ruleStatus>Inactive</ruleStatus>`;
    const bundled = await format(`${XML_HEADER}<MatchingRules ${NAMESPACE}>
    <matchingRules>
        <fullName>Act_Match</fullName>
        ${items}
    </matchingRules>
</MatchingRules>
`);
    const decomposed = await format(`${XML_HEADER}<MatchingRule ${NAMESPACE}>
    <fullName>Act_Match</fullName>
    ${items}
</MatchingRule>
`);

    [bundled, decomposed].forEach((formatted) => {
        expect(valuesOf(formatted, "fieldName")).toEqual(["Zeta__c", "Alpha__c"]);
        expect(formatted).toMatch(/<fieldName>Alpha__c<\/fieldName>\s*<matchingMethod>Exact<\/matchingMethod>/);
    });
    await expectIdempotent(bundled);
    await expectIdempotent(decomposed);
});

test("sharing criteria and guest rule criteriaItems keep the order their booleanFilter numbers refer to", async () => {
    const rule = (name: string) => `<fullName>${name}</fullName>
        <accessLevel>Read</accessLevel>
        <booleanFilter>2 OR 1</booleanFilter>
        <criteriaItems>
            <field>Zeta__c</field>
            <operation>equals</operation>
            <value>1</value>
        </criteriaItems>
        <criteriaItems>
            <value>2</value>
            <field>Alpha__c</field>
            <operation>equals</operation>
        </criteriaItems>
        <label>${name}</label>`;
    const bundled = await format(`${XML_HEADER}<SharingRules ${NAMESPACE}>
    <sharingCriteriaRules>
        ${rule("Criteria_Share")}
    </sharingCriteriaRules>
    <sharingGuestRules>
        ${rule("Guest_Share")}
    </sharingGuestRules>
</SharingRules>
`);
    const criteria = await format(`${XML_HEADER}<SharingCriteriaRule ${NAMESPACE}>
    ${rule("Criteria_Share")}
</SharingCriteriaRule>
`);
    const guest = await format(`${XML_HEADER}<SharingGuestRule ${NAMESPACE}>
    ${rule("Guest_Share")}
</SharingGuestRule>
`);

    expect(valuesOf(section(bundled, "sharingCriteriaRules"), "field")).toEqual(["Zeta__c", "Alpha__c"]);
    expect(valuesOf(section(bundled, "sharingGuestRules"), "field")).toEqual(["Zeta__c", "Alpha__c"]);
    [criteria, guest].forEach((formatted) => {
        expect(valuesOf(formatted, "field")).toEqual(["Zeta__c", "Alpha__c"]);
        expect(formatted).toMatch(/<field>Alpha__c<\/field>\s*<operation>equals<\/operation>\s*<value>2<\/value>/);
    });
    for (const formatted of [bundled, criteria, guest]) {
        await expectIdempotent(formatted);
    }
});

test("WorkflowRule criteriaItems keep the order their booleanFilter numbers refer to", async () => {
    const rule = `<fullName>Act_Rule</fullName>
        <active>false</active>
        <booleanFilter>(1 AND 2) OR 3</booleanFilter>
        <criteriaItems>
            <field>Advocacy_Act__c.Zeta__c</field>
            <operation>equals</operation>
            <value>1</value>
        </criteriaItems>
        <criteriaItems>
            <operation>equals</operation>
            <field>Advocacy_Act__c.Alpha__c</field>
            <value>2</value>
        </criteriaItems>
        <criteriaItems>
            <field>Advocacy_Act__c.Mid__c</field>
            <operation>equals</operation>
            <value>3</value>
        </criteriaItems>
        <triggerType>onAllChanges</triggerType>`;
    const bundled = await format(`${XML_HEADER}<Workflow ${NAMESPACE}>
    <rules>
        ${rule}
    </rules>
</Workflow>
`);
    const decomposed = await format(`${XML_HEADER}<WorkflowRule ${NAMESPACE}>
    ${rule}
</WorkflowRule>
`);

    [bundled, decomposed].forEach((formatted) => {
        expect(valuesOf(formatted, "field")).toEqual(["Advocacy_Act__c.Zeta__c", "Advocacy_Act__c.Alpha__c", "Advocacy_Act__c.Mid__c"]);
        expect(formatted).toMatch(/<field>Advocacy_Act__c.Alpha__c<\/field>\s*<operation>equals<\/operation>/);
    });
    await expectIdempotent(bundled);
    await expectIdempotent(decomposed);
});
