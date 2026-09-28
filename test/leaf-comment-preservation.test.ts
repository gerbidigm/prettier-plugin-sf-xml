import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";

import plugin from "../src/plugin";

function format(content: string) {
    return prettier.format(content, {
        parser: "sf-xml-parse",
        plugins: [plugin as any as string]
    });
}

describe("leaf-only comment preservation", () => {
    test("a comment that is an element's entire content survives formatting", async () => {
        const fixture = fs.readFileSync(path.join(__dirname, "./comment-only-fieldtranslation.field-meta.xml"), "utf-8");

        const formatted = await format(fixture);

        expect(formatted).toContain("<label><!-- Logo Use Request --></label>");
        expect(formatted).toContain("<relationshipLabel><!-- Contact Roles --></relationshipLabel>");
    });

    test("survives multiple elements and nested arrays in the same document", async () => {
        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<CustomFieldTranslation xmlns="http://soap.sforce.com/2006/04/metadata">',
            '    <help><!-- Do not change after a record is loaded. --></help>',
            '    <label><!-- Role --></label>',
            '    <name>Role__c</name>',
            '    <picklistValues>',
            '        <masterLabel>Legal</masterLabel>',
            '        <translation><!-- Legal --></translation>',
            '    </picklistValues>',
            '</CustomFieldTranslation>',
            ''
        ].join("\n");

        const formatted = await format(xml);

        expect(formatted).toContain("<help><!-- Do not change after a record is loaded. --></help>");
        expect(formatted).toContain("<label><!-- Role --></label>");
        expect(formatted).toContain("<translation><!-- Legal --></translation>");
    });

    test("formatting is idempotent", async () => {
        const fixture = fs.readFileSync(path.join(__dirname, "./comment-only-fieldtranslation.field-meta.xml"), "utf-8");

        const formattedOnce = await format(fixture);
        const formattedTwice = await format(formattedOnce);

        expect(formattedTwice).toBe(formattedOnce);
    });

    test("does not affect elements that already have real text content", async () => {
        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<Root>',
            '    <label>Not a comment</label>',
            '</Root>',
            ''
        ].join("\n");

        const formatted = await format(xml);

        expect(formatted).toContain("<label>Not a comment</label>");
    });
});
