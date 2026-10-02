import { compileSelectors, findBestMatch, matchesSelector, parseSelector } from "../src/selector";

const matches = (pattern: string, path: string[]) => matchesSelector(parseSelector(pattern), path);

describe("selector matching", () => {
    test("bare names match at any depth", () => {
        expect(matches("fullName", ["CustomField", "fullName"])).toBe(true);
        expect(matches("fullName", ["CustomObject", "fields", "fullName"])).toBe(true);
        expect(matches("fullName", ["CustomField", "label"])).toBe(false);
    });

    test("parent/child requires a direct parent", () => {
        expect(matches("actionCalls/description", ["Flow", "actionCalls", "description"])).toBe(true);
        expect(matches("actionCalls/description", ["Flow", "description"])).toBe(false);
        expect(matches("actionCalls/description", ["Flow", "actionCalls", "inputParameters", "description"])).toBe(false);
    });

    test("ancestor//descendant allows any depth", () => {
        expect(matches("/Layout//layoutColumns", ["Layout", "layoutSections", "layoutColumns"])).toBe(true);
        expect(matches("/Layout//layoutColumns", ["Layout", "layoutColumns"])).toBe(true);
        expect(matches("/Layout//layoutColumns", ["FlexiPage", "layoutColumns"])).toBe(false);
    });

    test("a leading / anchors the first step to the root", () => {
        expect(matches("/CustomApplication/tabs", ["CustomApplication", "tabs"])).toBe(true);
        expect(matches("/CustomApplication/tabs", ["Other", "CustomApplication", "tabs"])).toBe(false);
        expect(matches("/Layout", ["Layout"])).toBe(true);
    });

    test("* matches any element but not attributes, and not the anchor itself", () => {
        expect(matches("/Flow//*", ["Flow", "variables", "name"])).toBe(true);
        expect(matches("/Flow//*", ["Flow"])).toBe(false);
        expect(matches("/Flow//*", ["Flow", "@xmlns"])).toBe(false);
    });

    test("@name matches attributes", () => {
        expect(matches("/*/@xmlns", ["CustomMetadata", "@xmlns"])).toBe(true);
        expect(matches("/*/@xmlns", ["CustomMetadata", "values", "@xmlns"])).toBe(false);
        expect(matches("@xmlns", ["CustomMetadata", "values", "@xmlns"])).toBe(true);
        expect(matches("xmlns", ["CustomMetadata", "@xmlns"])).toBe(false);
    });

    test("the most specific match wins, ties go to the first listed", () => {
        const selectors = compileSelectors(["name", "actionCalls/name", "/Flow/actionCalls/name"]);
        expect(findBestMatch(selectors, ["Flow", "actionCalls", "name"])).toBe(2);
        expect(findBestMatch(selectors, ["Flow", "rules", "name"])).toBe(0);
        expect(findBestMatch(selectors, ["Flow", "label"])).toBeUndefined();
    });

    test("unsupported syntax is rejected", () => {
        expect(() => parseSelector("fields[1]")).toThrow(/invalid selector/);
        expect(() => parseSelector("@xmlns/child")).toThrow(/attribute step must be last/);
        expect(() => parseSelector("/")).toThrow(/invalid selector/);
        expect(() => parseSelector("")).toThrow(/empty selector/);
    });
});

describe("legacy dot syntax", () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
        warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    test("root-scoped entries become /Root//element", () => {
        const [selector] = compileSelectors(["OldLayout.layoutColumns"], "root");
        expect(selector.source).toBe("/OldLayout//layoutColumns");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("deprecated dot syntax"));
    });

    test("parent-scoped entries become parent/element, and $.attr becomes @attr", () => {
        const selectors = compileSelectors(["oldCalls.name", "$.oldAttr"], "parent");
        expect(selectors.map((selector) => selector.source)).toEqual(["oldCalls/name", "@oldAttr"]);
    });
});
