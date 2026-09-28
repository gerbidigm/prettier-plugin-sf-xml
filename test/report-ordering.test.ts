import * as prettier from "prettier";

import plugin from "../src/plugin";

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

describe("Report element ordering", () => {
    const reportXML = `<?xml version="1.0" encoding="UTF-8"?>
<Report xmlns="http://soap.sforce.com/2006/04/metadata">
    <loops>
        <fullName>MyLoop</fullName>
        <label>My Loop</label>
        <name>MyLoop</name>
        <apiName>Account</apiName>
    </loops>
    <recordUpdates>
        <fullName>MyUpdate</fullName>
        <label>My Update</label>
        <name>MyUpdate</name>
        <apiName>Account</apiName>
    </recordUpdates>
</Report>
`;

    test("loops pins name and label ahead of its other fields", async () => {
        const formatted = await format(reportXML);

        expectInOrder(formatted, [
            "<name>MyLoop</name>",
            "<label>My Loop</label>",
            "<fullName>MyLoop</fullName>",
            "<apiName>Account</apiName>"
        ]);
    });

    test("recordUpdates pins name and label ahead of its other fields", async () => {
        const formatted = await format(reportXML);

        expectInOrder(formatted, [
            "<name>MyUpdate</name>",
            "<label>My Update</label>",
            "<fullName>MyUpdate</fullName>",
            "<apiName>Account</apiName>"
        ]);
    });
});
