/**
 * The Carve AST exchange shape (PART 12), and the way in from a runtime tree.
 *
 * PART 12 section 1 is the reason this file exists: the wire form is what a
 * consumer reads, and "an implementation whose internals differ MAPS on the way
 * out; it does not export its internals". This package is such a consumer, so
 * everything downstream of here - `convert()` and its node-type switches - keys
 * on spec surface only. A tree produced by carve-rs, carve-php or carve-go
 * converts exactly like one produced by carve-js, because none of them is what
 * the converter reads: `spec/resources/ast-schema.json` is.
 *
 * Two shapes differ from the runtime tree carve-js hands out of `parse()`, and
 * both differences are structural rather than cosmetic (PART 12 section 7):
 *
 *  - frontmatter and footnote DEFINITIONS live on the runtime ROOT, as fields.
 *    On the wire they are block nodes in `children`, because a root field
 *    cannot carry the `pos` section 4 requires of every node.
 *  - a definition list's entries are `{terms, definitions}` objects at runtime
 *    and a FLAT sequence of `definition_term` / `definition_description` nodes
 *    on the wire, for the same reason plus a vocabulary one: under the object
 *    form those two names denote nothing.
 *
 * A published engine that exports its own serializer is authoritative and is
 * used when present ({@link toCarveAst}'s `serialize` parameter, wired to the
 * engine in `index.ts`). The mapping below is what runs when the pinned engine
 * predates it - the pinned `^0.1.2` exports no `toAstJson` at all - and it is
 * measured, not assumed: every one of the 610 spec-corpus documents validates
 * against the schema after passing through here (test/spec-corpus.test.mjs).
 */

/** Any node in the exchange tree. Fields are read by name, per the schema. */
export interface CarveAstNode {
    type: string;
    [key: string]: unknown;
}

/** The document root: `type`, `children`, `srcByteLength`, nothing else. */
export interface CarveAstDocument {
    type: 'document';
    children: CarveAstNode[];
    srcByteLength?: number;
}

/** A runtime `Document` as `parse()` returns it. Only the root is described. */
interface RuntimeDocument {
    type?: string;
    children?: unknown;
    srcByteLength?: number;
    frontmatter?: { format?: string; content?: string; pos?: unknown };
    footnoteDefs?: Record<string, unknown>;
    footnoteDefPos?: Record<string, unknown>;
}

/**
 * Fields that hold child nodes, in the order a walk should follow them.
 *
 * Listed rather than discovered, mirroring carve-js's own serializer: a
 * citation group's `items` and a definition list's `items` hold plain objects
 * in the runtime tree, and walking them as nodes would rewrite data that is
 * not one.
 */
const CHILD_FIELDS = [
    'children',
    'items',
    'rows',
    'cells',
    'inline',
    'content',
    'caption',
    'title',
    'target',
] as const;

/** A runtime definition-list entry, before the wire flattens it. */
interface RuntimeDefinitionItem {
    terms?: unknown[];
    definitions?: unknown[];
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Rewrite a subtree onto spec surface.
 *
 * Structurally shared: a branch with nothing to rewrite comes back as the SAME
 * object, so the runtime tree the caller still holds is never copied and never
 * mutated.
 */
function normalize<T>(node: T): T {
    if (Array.isArray(node)) {
        let changed = false;
        const mapped = node.map((child) => {
            const next = normalize(child);
            if (next !== child) changed = true;
            return next;
        });
        return (changed ? mapped : node) as T;
    }
    if (!isObject(node)) return node;

    let out: Record<string, unknown> | undefined;
    const set = (field: string, value: unknown): void => {
        out = { ...(out ?? node), [field]: value };
    };

    // Depth first, so a rewritten parent is built from already-rewritten
    // children rather than walked twice.
    for (const field of CHILD_FIELDS) {
        const value = (out ?? node)[field];
        if (value === undefined || !(typeof value === 'object' && value !== null)) continue;
        if (field === 'items' && (out ?? node)['type'] === 'definition_list') continue;
        const mapped = normalize(value);
        if (mapped !== value) set(field, mapped);
    }

    const current = out ?? node;
    switch (current['type']) {
        case 'definition_list': {
            const items = current['items'];
            if (Array.isArray(items) && items.some((item) => isObject(item) && item['type'] === undefined)) {
                set('items', definitionEntriesToWire(items));
            } else if (Array.isArray(items)) {
                const mapped = normalize(items);
                if (mapped !== items) set('items', mapped);
            }
            break;
        }
        case 'critic-comment':
            // The engine settled the vocabulary on snake_case; the schema
            // declares `critic_comment` and never the hyphen. A consumer that
            // reads the wire has no reason to know the other spelling existed.
            set('type', 'critic_comment');
            break;
        case 'footnote': {
            // The pre-split inline node (carve#405), whose name COLLIDES with
            // the wire `footnote` - which is the DEFINITION block, carrying
            // `label` and `children`. A definition is left alone; anything else
            // named `footnote` is one of the two inline forms, told apart by
            // `inline` exactly as the split encodes it.
            if (typeof current['label'] === 'string' && Array.isArray(current['children'])) break;
            if (Array.isArray(current['inline'])) {
                const { id: _id, ...rest } = out ?? { ...node };
                out = { ...rest, type: 'inline_footnote' };
            } else {
                const { inline: _inline, ...rest } = out ?? { ...node };
                out = { ...rest, type: 'footnote_ref' };
            }
            break;
        }
        case 'heading_ref':
            // PART 12 section 3a keeps the resolved target text OFF the wire:
            // the heading is in the same document, so a consumer reads the text
            // from there rather than from a copy in every reference.
            if (current['resolvedText'] !== undefined) {
                const { resolvedText: _resolvedText, ...rest } = current;
                out = rest;
            }
            break;
        default:
            break;
    }

    return (out ?? node) as T;
}

/**
 * Runtime entries to the flat wire sequence.
 *
 * The grouping is recovered on the way in by the rule the renderers use: a run
 * of descriptions belongs to the run of terms before it.
 *
 * An entry that is ALREADY a wire node passes through. That is not a
 * hypothetical: the decision to convert is made per LIST, so one runtime entry
 * in a list is enough to send every entry through here, and dropping the ones
 * that were already converted would delete authored content silently. Same
 * reasoning for a `terms` value that is not an array - a malformed entry is
 * skipped rather than emitted as a term with no content.
 */
function definitionEntriesToWire(items: unknown[]): CarveAstNode[] {
    const out: CarveAstNode[] = [];
    for (const item of items) {
        if (isObject(item) && typeof item['type'] === 'string') {
            out.push(normalize(item) as CarveAstNode);
            continue;
        }
        const entry = (item ?? {}) as RuntimeDefinitionItem;
        for (const term of entry.terms ?? []) {
            if (!Array.isArray(term)) continue;
            out.push({ type: 'definition_term', children: normalize(term) as unknown[] });
        }
        for (const definition of entry.definitions ?? []) {
            if (!Array.isArray(definition)) continue;
            out.push({ type: 'definition_description', children: normalize(definition) as unknown[] });
        }
    }
    return out;
}

/**
 * A runtime document to the PART 12 exchange shape.
 *
 * `serialize` is the engine's own serializer (`toAstJson`) when the installed
 * engine exports one. It is authoritative for the structural mapping; the
 * normalization pass still runs over its result, and is a no-op on an engine
 * that already speaks the current vocabulary.
 */
export function toCarveAst(
    runtime: unknown,
    serialize?: (doc: unknown) => unknown,
): CarveAstDocument {
    if (serialize) return normalize(serialize(runtime)) as CarveAstDocument;

    const doc = (runtime ?? {}) as RuntimeDocument;
    const children: CarveAstNode[] = [];

    if (doc.frontmatter) {
        const node: CarveAstNode = {
            type: 'frontmatter',
            format: doc.frontmatter.format ?? 'yaml',
            content: doc.frontmatter.content ?? '',
        };
        if (doc.frontmatter.pos !== undefined) node['pos'] = doc.frontmatter.pos;
        children.push(node);
    }

    children.push(...(normalize(doc.children ?? []) as CarveAstNode[]));

    // A definition belongs to the DOCUMENT even when it was authored inside a
    // container (PART 9 section 16), which is exactly how the runtime root
    // already holds it - keyed by label, body lifted out.
    for (const [label, body] of Object.entries(doc.footnoteDefs ?? {})) {
        const node: CarveAstNode = {
            type: 'footnote',
            label,
            children: normalize(body ?? []) as unknown[],
        };
        const pos = doc.footnoteDefPos?.[label];
        if (pos !== undefined) node['pos'] = pos;
        children.push(node);
    }

    const out: CarveAstDocument = { type: 'document', children };
    if (doc.srcByteLength !== undefined) out.srcByteLength = doc.srcByteLength;
    return out;
}

/**
 * Fold a serialized tree onto the CURRENT vocabulary.
 *
 * The one place a spelling an older engine still writes is recognized, so the
 * converter's switches stay on spec surface. A tree already written by a
 * current engine passes through unchanged, and unchanged means the same
 * objects, not copies of them.
 */
export function normalizeCarveAst(doc: CarveAstDocument): CarveAstDocument {
    return normalize(doc);
}

/**
 * Read a serialized AST that arrived as data - a file, stdin, another engine's
 * `--to-json`.
 *
 * Treated as DATA, not as a trusted tree: anything that is not a document root
 * is refused here with a message naming what was found, rather than converting
 * to an empty pandoc document that looks like a successful run.
 *
 * The ROOT is all that is checked. Validating the whole tree against the schema
 * would make a JSON Schema validator a runtime dependency of a converter that
 * does not need one, and would refuse documents this package converts perfectly
 * well - a node type newer than the schema this release shipped against, say.
 * Below the root the existing contract applies instead: an unrecognized node
 * degrades to its text and says so in `warnings`, and nothing is dropped
 * silently. Callers that want conformance checked can validate against
 * `resources/ast-schema.json` themselves; the test suite does exactly that.
 */
export function parseCarveAst(input: CarveAstDocument | string): CarveAstDocument {
    const value: unknown = typeof input === 'string' ? JSON.parse(input) : input;
    if (!isObject(value) || value['type'] !== 'document' || !Array.isArray(value['children'])) {
        const found = isObject(value) ? `type ${JSON.stringify(value['type'])}` : typeof value;
        throw new Error(
            `not a Carve AST document: expected a root node of type "document" with a children array, found ${found}. ` +
                'The expected shape is PART 12 of the Carve spec (resources/ast-schema.json), as written by "carve --to-json".',
        );
    }
    return value as unknown as CarveAstDocument;
}
