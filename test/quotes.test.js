const prettier = require("prettier");
const plugin = require("../dist/plugin.js");

test("escapes double quotes in text without changing markup", async () => {
  const formatted = await prettier.format(
    '<Root label="a &quot;b&quot;"><Body>Use "quoted" text &amp; &lt;</Body><allInternalUsers></allInternalUsers></Root>',
    { parser: "sf-xml-parse", plugins: [plugin] },
  );

  expect(formatted).toContain('<Root label="a &quot;b&quot;">');
  expect(formatted).toContain(
    "<Body>Use &quot;quoted&quot; text &amp; &lt;</Body>",
  );
  expect(formatted).toContain("<allInternalUsers></allInternalUsers>");
});
