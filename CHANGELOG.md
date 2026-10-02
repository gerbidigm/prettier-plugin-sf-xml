# Change Log

## Unreleased

- `xmlCustomSortElements` and `xmlSelfClosingElements` take XPath-style selectors (`/Layout//layoutColumns`, `actionCalls/description`, `/*/@xmlns`), matched against each element's full path. The earlier dot syntax (`Layout.layoutColumns`, `actionCalls.description`, `$.xmlns`) still works with a deprecation warning
- Preserve `CustomApplication` tab order (`/CustomApplication/tabs`), which is the app's navigation order
- Warn when a PascalCase element appears below the root element, since Salesforce metadata only uses PascalCase for root elements

- Fix: preserve comments that are an element's entire content (e.g. Salesforce translation-file placeholders like `<label><!-- Some Label --></label>`), which xml2js was silently dropping

- Empty elements render as `<tag></tag>` by default (unchanged)
- Add `xmlSelfClosingElements` option to opt specific elements into self-closing (`<tag/>`), either globally (`"tagName"`) or scoped to one root metadata type (`"Root.tagName"`)
- `xmlCustomSortElements` entries can now be scoped to a container key (`"Container.element"`), so the same field name can pin differently depending on what it's nested under
- Add default Flow ordering: canvas elements (`actionCalls`, `assignments`, `decisions`, `dynamicChoiceSets`, `recordLookups`, `screens`, `variables`) pin `description`/`name`/`label`/`locationX`/`locationY`; nested `rules`/`fields` pin only `name`; same-type siblings sort by `name`

## [0.3.0](https://github.com/DanielCalle/prettier-plugin-sf-xml/releases/tag/v0.1.0) - 2023-03-19

- Add the use of the standard Prettier options tabWidth and useTab

## [0.1.0](https://github.com/DanielCalle/prettier-plugin-sf-xml/releases/tag/v0.1.0) - 2023-03-19

- First prettier plugin version
