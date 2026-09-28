import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";

import plugin from "../src/plugin";

const flowXML = fs.readFileSync(path.join(__dirname, "./license-preset-resolver.flow-meta.xml"), "utf-8");

function format(content: string) {
    return prettier.format(content, {
        parser: "sf-xml-parse",
        plugins: [plugin as any as string]
    });
}

function expectInOrder(haystack: string, needles: string[]) {
    let searchFrom = 0;
    needles.forEach((needle) => {
        const index = haystack.indexOf(needle, searchFrom);
        expect(index).toBeGreaterThanOrEqual(searchFrom);
        searchFrom = index + needle.length;
    });
}

describe("Flow canvas element ordering", () => {
    test("actionCalls pins description, name, label, locationX, locationY ahead of other fields", async () => {
        const formatted = await format(flowXML);

        expectInOrder(formatted, [
            "<description>Resolves the selected active preset",
            "<name>Resolve_License_Preset</name>",
            "<label>Resolve License Preset</label>",
            "<locationX>320</locationX>",
            "<locationY>360</locationY>",
            "<actionName>LicensePresetResolver</actionName>"
        ]);
    });

    test("decisions.rules pins only name, letting label sort naturally", async () => {
        const formatted = await format(flowXML);

        expectInOrder(formatted, [
            "<name>Found_Active_Preset</name>",
            "<conditionLogic>and</conditionLogic>",
            "<conditions>",
            "<connector>",
            "<label>Active preset found</label>"
        ]);
    });

    test("screens.fields pins only name, letting fieldText/fieldType sort naturally", async () => {
        const formatted = await format(flowXML);

        expectInOrder(formatted, [
            "<name>Selected_Preset_Key</name>",
            "<choiceReferences>Active_License_Presets</choiceReferences>",
            "<dataType>String</dataType>",
            "<fieldText>Select an active license preset</fieldText>"
        ]);
    });

    test("screens sort by their pinned name", async () => {
        const formatted = await format(flowXML);

        expectInOrder(formatted, [
            "<name>No_Active_Presets</name>",
            "<name>Resolution_Error</name>",
            "<name>Resolution_Fault</name>",
            "<name>Resolution_Success</name>",
            "<name>Select_License_Preset</name>"
        ]);
    });

    test("variables pin description and name ahead of other fields, and sort by name", async () => {
        const formatted = await format(flowXML);

        expectInOrder(formatted, [
            "<description>Technical fault detail retained",
            "<name>faultDetail</name>",
            "<dataType>String</dataType>"
        ]);

        expectInOrder(formatted, [
            "<name>faultDetail</name>",
            "<name>recordId</name>"
        ]);
    });

    test("choices pin only name ahead of other fields", async () => {
        const choicesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <choices>
        <choiceText>Yes</choiceText>
        <dataType>Boolean</dataType>
        <name>Yes_Choice</name>
    </choices>
</Flow>
`;
        const formatted = await format(choicesXML);

        expectInOrder(formatted, [
            "<name>Yes_Choice</name>",
            "<choiceText>Yes</choiceText>",
            "<dataType>Boolean</dataType>"
        ]);
    });

    test("recordCreates pins name then label ahead of locationX/locationY and other fields", async () => {
        const recordCreatesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <recordCreates>
        <locationX>176</locationX>
        <locationY>431</locationY>
        <label>Create Record</label>
        <name>Create_Record</name>
        <object>Account</object>
    </recordCreates>
</Flow>
`;
        const formatted = await format(recordCreatesXML);

        expectInOrder(formatted, [
            "<name>Create_Record</name>",
            "<label>Create Record</label>",
            "<locationX>176</locationX>",
            "<locationY>431</locationY>",
            "<object>Account</object>"
        ]);
    });

    test("customErrors pins name then label ahead of locationX/locationY and other fields", async () => {
        const customErrorsXML = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <customErrors>
        <locationX>176</locationX>
        <locationY>431</locationY>
        <label>Custom Error</label>
        <name>Custom_Error</name>
        <customErrorMessages>
            <errorMessage>Bad</errorMessage>
        </customErrorMessages>
    </customErrors>
</Flow>
`;
        const formatted = await format(customErrorsXML);

        expectInOrder(formatted, [
            "<name>Custom_Error</name>",
            "<label>Custom Error</label>",
            "<locationX>176</locationX>",
            "<locationY>431</locationY>",
            "<customErrorMessages>"
        ]);
    });

    test("Flow self-closes empty elements everywhere, including dynamicChoiceSets children", async () => {
        const dynamicChoiceSetsXML = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <dynamicChoiceSets>
        <name>My_Choice_Set</name>
        <collectionReference></collectionReference>
        <displayField>Name</displayField>
        <outputAssignments></outputAssignments>
    </dynamicChoiceSets>
</Flow>
`;
        const formatted = await format(dynamicChoiceSetsXML);

        expect(formatted).toContain("<collectionReference/>");
        expect(formatted).toContain("<outputAssignments/>");
        expect(formatted).not.toContain("</collectionReference>");
        expect(formatted).not.toContain("</outputAssignments>");
    });
});
