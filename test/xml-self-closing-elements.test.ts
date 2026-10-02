import * as prettier from "prettier";
import plugin from "../src/plugin";

const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Layout xmlns="http://soap.sforce.com/2006/04/metadata">',
    '    <layoutColumns></layoutColumns>',
    '    <otherThing></otherThing>',
    '</Layout>',
    ''
].join("\n");

function format(options: Record<string, unknown> = {}) {
    return prettier.format(xml, { parser: "sf-xml-parse", plugins: [plugin as any as string], ...options });
}

test("default: only the plugin's known self-closing elements self-close", async () => {
    const out = await format();
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing></otherThing>");
});

test("bare name opts an element into self-closing under any root", async () => {
    const out = await format({ xmlSelfClosingElements: ["layoutColumns"] });
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing></otherThing>");
});

test("/Root//tag opts an element into self-closing only under that root", async () => {
    const out = await format({ xmlSelfClosingElements: ["/Layout//layoutColumns"] });
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing></otherThing>");

    const outOtherRoot = await format({ xmlSelfClosingElements: ["/OtherRoot//layoutColumns"] });
    expect(outOtherRoot).toContain("<layoutColumns></layoutColumns>");
});

test("/Root//* self-closes every empty element under that root, by default for Flow", async () => {
    const out = await format({ xmlSelfClosingElements: ["/Layout//*"] });
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing/>");

    const flowXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Flow xmlns="http://soap.sforce.com/2006/04/metadata">',
        '    <interviewLabel></interviewLabel>',
        '    <processType></processType>',
        '</Flow>',
        ''
    ].join("\n");
    const flowOut = await prettier.format(flowXml, { parser: "sf-xml-parse", plugins: [plugin as any as string] });
    expect(flowOut).toContain("<interviewLabel/>");
    expect(flowOut).toContain("<processType/>");
});

test("CustomMetadata and Dashboard self-close every empty element by default, like Flow", async () => {
    const customMetadataXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata">',
        '    <label>Test</label>',
        '    <protected></protected>',
        '</CustomMetadata>',
        ''
    ].join("\n");
    const customMetadataOut = await prettier.format(customMetadataXml, { parser: "sf-xml-parse", plugins: [plugin as any as string] });
    expect(customMetadataOut).toContain("<protected/>");

    const dashboardXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Dashboard xmlns="http://soap.sforce.com/2006/04/metadata">',
        '    <title>Test</title>',
        '    <runningUser></runningUser>',
        '</Dashboard>',
        ''
    ].join("\n");
    const dashboardOut = await prettier.format(dashboardXml, { parser: "sf-xml-parse", plugins: [plugin as any as string] });
    expect(dashboardOut).toContain("<runningUser/>");
});

test("selectors match an element's full path, not just its name", async () => {
    const nestedXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Layout xmlns="http://soap.sforce.com/2006/04/metadata">',
        '    <layoutSections>',
        '        <layoutColumns></layoutColumns>',
        '    </layoutSections>',
        '    <layoutColumns></layoutColumns>',
        '</Layout>',
        ''
    ].join("\n");
    const out = await prettier.format(nestedXml, {
        parser: "sf-xml-parse",
        plugins: [plugin as any as string],
        xmlSelfClosingElements: ["layoutSections/layoutColumns"]
    } as any);
    expect(out).toContain("    <layoutColumns/>\n  </layoutSections>");
    expect(out).toContain("  <layoutColumns></layoutColumns>\n</Layout>");
});

test("legacy Root.tag entries still work, with a deprecation warning", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const out = await format({ xmlSelfClosingElements: ["Layout.otherThing"] });
    expect(out).toContain("<otherThing/>");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"/Layout//otherThing"'));
    warn.mockRestore();
});

test("warns about PascalCase elements below the root", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const pascalXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Layout xmlns="http://soap.sforce.com/2006/04/metadata">',
        '    <layoutSections><Nested>x</Nested></layoutSections>',
        '    <layoutSections><Nested>y</Nested></layoutSections>',
        '</Layout>',
        ''
    ].join("\n");
    await prettier.format(pascalXml, { parser: "sf-xml-parse", plugins: [plugin as any as string], filepath: "Foo.layout-meta.xml" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Foo.layout-meta.xml: unexpected PascalCase element at /Layout/layoutSections/Nested"));
    warn.mockRestore();
});
