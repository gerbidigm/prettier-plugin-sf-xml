<h1 align="center">Prettier for Salesforce Metadata XML</h1>

`prettier-plugin-sf-xml` is a [prettier](https://prettier.io/) plugin for Salesforce Metadata XML.

This plugin uses a modified version of the [swagup-com/sf-xml-formatter](https://github.com/swagup-com/sf-xml-formatter) xml file sorting algorithm with new features to adapt to the original Salesforce files such as respecting the tag order and add custom indentation through the prettier tabWidth and useTab options.

## Getting started

To run `prettier` with the Salesforce Metadata XML plugin, you're going to need [`node`](https://nodejs.org/en/download/).

If you're using the `npm` CLI, then add the plugin by:

```bash
npm install --save-dev prettier prettier-plugin-sf-xml
```

Or if you're using `yarn`, then add the plugin by:

```bash
yarn add --dev prettier prettier-plugin-sf-xml
```

The `prettier` executable is now installed and ready for use:

```bash
./node_modules/.bin/prettier --write '**/*.xml'
```

## Options

### `xmlCustomSortElements`

Element names that are pinned ahead of their alphabetically-sorted siblings, in priority order. Entries are either a bare element name (pinned wherever it appears) or `Container.element` to scope the pin to elements nested directly under a specific container key, since the same field name can need different treatment depending on what it's nested under.

Defaults to pinning `fullName`/`locationX`/`locationY` generally, plus Flow-specific container scoping: canvas elements (`actionCalls`, `assignments`, `decisions`, `dynamicChoiceSets`, `recordLookups`, `screens`, `variables`) pin `description`, `name`, `label`, `locationX`, `locationY` (whichever are present, in that order) ahead of their other fields, while nested structures (`rules`, `fields`) pin only `name`. This matches how Salesforce's own Flow Builder serializes those elements; sibling elements of the same type (e.g. multiple `screens`) also sort by their `name` as a result.

Salesforce's own canonical (retrieved) metadata XML only ever pins the identifier element (`fullName`) first for most other metadata types — everything else sorts alphabetically. If you round-trip files through an org and want your local formatting to match that exactly, narrow this option in your prettier config:

```json
{
  "xmlCustomSortElements": ["fullName"]
}
```

### `xmlSelfClosingElements`

Empty elements render as `<tag></tag>` by default. Some Salesforce metadata schemas are known to expect specific elements to be self-closing, so this option lists elements that should instead render as `<tag/>`. Defaults to `[]`.

Entries are either a bare element name (applies under any root metadata type) or `Root.element` to scope it to one root type:

```json
{
  "xmlSelfClosingElements": ["Layout.layoutColumns"]
}
```
