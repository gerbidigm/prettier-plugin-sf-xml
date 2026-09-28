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

test("default: nothing self-closes", async () => {
    const out = await format();
    expect(out).toContain("<layoutColumns></layoutColumns>");
    expect(out).toContain("<otherThing></otherThing>");
});

test("bare name opts an element into self-closing under any root", async () => {
    const out = await format({ xmlSelfClosingElements: ["layoutColumns"] });
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing></otherThing>");
});

test("Root.tag opts an element into self-closing only under that root", async () => {
    const out = await format({ xmlSelfClosingElements: ["Layout.layoutColumns"] });
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing></otherThing>");

    const outOtherRoot = await format({ xmlSelfClosingElements: ["OtherRoot.layoutColumns"] });
    expect(outOtherRoot).toContain("<layoutColumns></layoutColumns>");
});

test("Root.* self-closes every empty element under that root, by default for Flow", async () => {
    const out = await format({ xmlSelfClosingElements: ["Layout.*"] });
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
