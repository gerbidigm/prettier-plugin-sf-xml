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

test("default: self-closes everything", async () => {
    const out = await format();
    expect(out).toContain("<layoutColumns/>");
    expect(out).toContain("<otherThing/>");
});

test("bare name exception applies under any root", async () => {
    const out = await format({ xmlNonSelfClosingElements: ["layoutColumns"] });
    expect(out).toContain("<layoutColumns></layoutColumns>");
    expect(out).toContain("<otherThing/>");
});

test("Root.tag exception only applies under that root", async () => {
    const out = await format({ xmlNonSelfClosingElements: ["Layout.layoutColumns"] });
    expect(out).toContain("<layoutColumns></layoutColumns>");
    expect(out).toContain("<otherThing/>");

    const outOtherRoot = await format({ xmlNonSelfClosingElements: ["OtherRoot.layoutColumns"] });
    expect(outOtherRoot).toContain("<layoutColumns/>");
});
