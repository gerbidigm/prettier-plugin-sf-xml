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

describe("root element attribute ordering", () => {
    test("pins xmlns, xmlns:xsi, xmlns:xsd in that order regardless of source order", async () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
<CustomMetadata xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Test</label>
</CustomMetadata>
`;
        const formatted = await format(input);

        expectInOrder(formatted, [
            'xmlns="http://soap.sforce.com/2006/04/metadata"',
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
            'xmlns:xsd="http://www.w3.org/2001/XMLSchema"'
        ]);
    });
});
