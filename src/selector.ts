// A small subset of XPath used to select elements (and root attributes) for
// the plugin's sorting and self-closing rules. Patterns are matched against
// an element's absolute path the same way XSLT match patterns are: a bare
// name matches that element anywhere, `parent/child` requires a direct
// parent, `ancestor//child` allows any depth between them, and a leading `/`
// anchors the first step to the root element.
//
// Supported syntax: `/` (child), `//` (descendant), element names, `*` (any
// element), and a final `@name` or `@*` step for attributes. Predicates,
// functions, and other axes aren't supported.
//
//     /Layout//layoutColumns     layoutColumns anywhere under the Layout root
//     /Flow//*                   every element under the Flow root
//     actionCalls/description    description directly under actionCalls
//     /CustomApplication/tabs    tabs directly under the CustomApplication root
//     /*/@xmlns                  the root element's xmlns attribute
//     fullName                   fullName anywhere

type Axis = "child" | "descendant";

type Step = {
    // The separator before this step. For the first step, "child" with an
    // anchored pattern means "is the root element".
    axis: Axis;
    attribute: boolean;
    // An element/attribute name, or "*" to match any.
    name: string;
};

export type Selector = {
    source: string;
    anchored: boolean;
    steps: Step[];
    // Higher wins when several selectors match the same node: more steps,
    // then anchored, then fewer wildcards.
    specificity: number;
};

// A node's path from the root element down, e.g. ["Layout", "layoutSections",
// "layoutColumns"]. An attribute's final segment is prefixed with "@", e.g.
// ["CustomMetadata", "@xmlns"].
export type NodePath = readonly string[];

const NAME_PATTERN = /^[A-Za-z_][\w.:-]*$/;

function parseSelector(source: string): Selector {
    const pattern = source.trim();
    if (pattern === "") {
        throw new Error("prettier-plugin-sf-xml: empty selector");
    }

    const anchored = pattern.startsWith("/");
    const steps: Step[] = [];
    let index = 0;
    let axis: Axis = "descendant";

    while (index < pattern.length) {
        if (pattern.startsWith("//", index)) {
            axis = "descendant";
            index += 2;
        } else if (pattern[index] === "/") {
            axis = "child";
            index += 1;
        } else if (steps.length > 0) {
            throw new Error(`prettier-plugin-sf-xml: invalid selector "${source}"`);
        }

        let end = index;
        while (end < pattern.length && pattern[end] !== "/") end += 1;
        const token = pattern.slice(index, end);
        const attribute = token.startsWith("@");
        const name = attribute ? token.slice(1) : token;

        if (name !== "*" && !NAME_PATTERN.test(name)) {
            throw new Error(`prettier-plugin-sf-xml: invalid selector "${source}" (unsupported step "${token}")`);
        }
        if (steps.length > 0 && steps[steps.length - 1].attribute) {
            throw new Error(`prettier-plugin-sf-xml: invalid selector "${source}" (an attribute step must be last)`);
        }

        steps.push({ axis, attribute, name });
        index = end;
        // Unanchored patterns match their first step at any depth, so the
        // default for the next step is reset only by an explicit separator.
        axis = "child";
    }

    if (!anchored) {
        steps[0].axis = "descendant";
    }

    const wildcards = steps.filter((step) => step.name === "*").length;
    const specificity = steps.length * 100 + (anchored ? 10 : 0) - wildcards;

    return { source, anchored, steps, specificity };
}

function stepMatches(step: Step, segment: string): boolean {
    const isAttribute = segment.startsWith("@");
    if (step.attribute !== isAttribute) {
        return false;
    }
    const name = isAttribute ? segment.slice(1) : segment;
    return step.name === "*" || step.name === name;
}

// Matches right to left, like XSLT pattern matching: the last step must match
// the node itself, then each earlier step must match the parent (child axis)
// or some ancestor (descendant axis).
function matchFrom(steps: Step[], anchored: boolean, stepIndex: number, path: NodePath, pathIndex: number): boolean {
    const step = steps[stepIndex];
    if (!stepMatches(step, path[pathIndex])) {
        return false;
    }

    if (stepIndex === 0) {
        return !(anchored && step.axis === "child") || pathIndex === 0;
    }

    if (step.axis === "child") {
        return pathIndex > 0 && matchFrom(steps, anchored, stepIndex - 1, path, pathIndex - 1);
    }
    for (let ancestor = pathIndex - 1; ancestor >= 0; ancestor -= 1) {
        if (matchFrom(steps, anchored, stepIndex - 1, path, ancestor)) {
            return true;
        }
    }
    return false;
}

function matchesSelector(selector: Selector, path: NodePath): boolean {
    if (path.length === 0) {
        return false;
    }
    return matchFrom(selector.steps, selector.anchored, selector.steps.length - 1, path, path.length - 1);
}

// Returns the index (in list order) of the most specific matching selector,
// with ties going to whichever is listed first, or undefined if none match.
function findBestMatch(selectors: readonly Selector[], path: NodePath): number | undefined {
    let best: number | undefined;
    selectors.forEach((selector, index) => {
        if (matchesSelector(selector, path) && (best === undefined || selector.specificity > selectors[best].specificity)) {
            best = index;
        }
    });
    return best;
}

// Before selectors, patterns used a dot to scope an entry:
// `Root.element`/`Root.*` (any depth under that root metadata type) for
// self-closing elements, and `container.element`/`$.attribute` (direct
// parent only) for custom sort elements. Those still work, translated to
// the equivalent selector, with a one-time deprecation warning per entry.
export type LegacyScope = "root" | "parent";

const warnedLegacyPatterns = new Set<string>();

function translateLegacyPattern(pattern: string, scope: LegacyScope): string {
    if (pattern.includes("/") || pattern.includes("@") || !pattern.includes(".")) {
        return pattern;
    }

    const dot = pattern.indexOf(".");
    const container = pattern.slice(0, dot);
    const element = pattern.slice(dot + 1);
    const translated = container === "$"
        ? `@${element}`
        : scope === "root" ? `/${container}//${element}` : `${container}/${element}`;

    if (!warnedLegacyPatterns.has(pattern)) {
        warnedLegacyPatterns.add(pattern);
        console.warn(`[prettier-plugin-sf-xml] "${pattern}" uses the deprecated dot syntax; use the selector "${translated}" instead.`);
    }
    return translated;
}

const compiledCache = new Map<string, Selector[]>();

// Compiles a list of patterns (selectors, or legacy dot-scoped entries),
// cached by content since the printer recompiles option lists per file.
function compileSelectors(patterns: readonly string[], legacyScope: LegacyScope = "parent"): Selector[] {
    const cacheKey = `${legacyScope}\u0000${patterns.join("\u0000")}`;
    let compiled = compiledCache.get(cacheKey);
    if (compiled === undefined) {
        compiled = patterns.map((pattern) => parseSelector(translateLegacyPattern(pattern, legacyScope)));
        compiledCache.set(cacheKey, compiled);
    }
    return compiled;
}

export {
    compileSelectors,
    findBestMatch,
    matchesSelector,
    parseSelector
};
