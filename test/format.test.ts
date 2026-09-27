import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";
import * as xml2js from "xml2js";

import plugin from "../src/plugin";

const ebikesPermissionSet = fs.readFileSync(path.join(__dirname, "./ebikes.permissionset-meta.xml"), "utf-8");

const exampleProfile = fs.readFileSync(path.join(__dirname, "./example.profile-meta.xml"), "utf-8");

const customFieldWithFormula = fs.readFileSync(path.join(__dirname, "./customfield-formula.field-meta.xml"), "utf-8");

function format(content: string) {
    return prettier.format(content, {
      parser: "sf-xml-parse",
      plugins: [plugin as any as string] // hacky but it works
    });
  }

function parseXML(content: string): Promise<any> {
    return new Promise((resolve, reject) => {
        new xml2js.Parser({ trim: true }).parseString(content, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

test("permissionSet", async () => {
    const formatted = await format(ebikesPermissionSet);
    expect(formatted).toMatchSnapshot();
});

test("profile", async () => {
    const formatted = await format(exampleProfile);
    expect(formatted).toMatchSnapshot();
});

describe("CustomField with formula and picklist values", () => {
    test("unconfigured siblings sort alphabetically while configured elements retain custom order", async () => {
        const formatted = await format(customFieldWithFormula);

        const orderedTags = [...formatted.matchAll(/^ {2}<(\w+)>/gm)].map((match) => match[1]);

        expect(orderedTags).toEqual([
            "fullName",
            "label",
            "caseSensitive",
            "description",
            "formula",
            "formulaTreatBlanksAs",
            "type",
            "valueSet"
        ]);
    });

    test("values under nonSortKeys (valueSetDefinition) keep their original order", async () => {
        const formatted = await format(customFieldWithFormula);
        const parsed = await parseXML(formatted);

        const values = parsed.CustomField.valueSet[0].valueSetDefinition[0].value;
        expect(values.map((value: any) => value.fullName[0])).toEqual(["Zulu", "Alpha"]);
    });

    test("formatting is idempotent", async () => {
        const formattedOnce = await format(customFieldWithFormula);
        const formattedTwice = await format(formattedOnce);

        expect(formattedTwice).toBe(formattedOnce);
    });

    test("formula and other text-sensitive content are not changed semantically", async () => {
        const formatted = await format(customFieldWithFormula);

        const originalParsed = await parseXML(customFieldWithFormula);
        const formattedParsed = await parseXML(formatted);

        expect(formattedParsed.CustomField.formula[0]).toBe(originalParsed.CustomField.formula[0]);
        expect(formattedParsed.CustomField.description[0]).toBe(originalParsed.CustomField.description[0]);
    });
});
