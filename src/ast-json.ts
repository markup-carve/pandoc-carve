/**
 * The Carve AST exchange shape (PART 12), and the way in from a runtime tree.
 *
 * The public API exchanges contract 2.0 trees. `ast2-input.ts` maps those
 * trees to the bridge's private conversion view before Pandoc conversion.
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
 * The installed engine's `toAstJson` is authoritative when available. The
 * fallback mapper below is retained for older engines.
 */
import * as carve from '@markup-carve/carve';
import { CORE_NODE_TYPES } from './core-node-types.js';

/** Any node in the exchange tree. Fields are read by name, per the schema. */
export interface CarveAstNode {
    type: string;
    [key: string]: unknown;
}

/** The document root required by contract 2.0. */
export interface CarveAstDocument {
    type: 'document';
    astVersion: '2.0';
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
    'blocks',
    'items',
    'rows',
    'cells',
    'inline',
    'content',
    'caption',
    'shortCaption',
    'title',
    'target',
    'old',
    'new',
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
/**
 * The six kinds a `:::` container places rather than presents. They are
 * `directive` nodes, not admonitions (carve#2195, carve#2225): a table of
 * contents is not a callout. Releases up to 0.1.7 spell them `admonition`,
 * and the schema refuses that `kind` there.
 */
const DIRECTIVE_KINDS = new Set(['bibliography', 'footnotes', 'glossary', 'index', 'references', 'toc']);

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
        case 'substitution': {
            if (!Array.isArray(current['old']) && typeof current['oldText'] === 'string') {
                set('old', [{ type: 'text', value: current['oldText'] }]);
            }
            if (!Array.isArray(current['new']) && typeof current['newText'] === 'string') {
                set('new', [{ type: 'text', value: current['newText'] }]);
            }
            if (current['oldText'] !== undefined || current['newText'] !== undefined) {
                const { oldText: _oldText, newText: _newText, ...rest } = out ?? { ...node };
                out = rest;
            }
            break;
        }
        case 'footnote': {
            // The pre-split inline node (carve#405), whose name COLLIDES with
            // the wire `footnote` - which is the DEFINITION block, carrying
            // `label` and `children`. A definition is left alone; anything else
            // named `footnote` is one of the two inline forms, told apart by
            // `inline` exactly as the split encodes it.
            if ((typeof current['label'] === 'string' || typeof current['key'] === 'string')
                && Array.isArray(current['children'])) break;
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

    // A reference's label is spelled `label` on the wire, like the `footnote`
    // definition it matches (carve#2213). Releases up to 0.1.7 serialize `id`,
    // which the schema refuses - it sanctions decoding the old property onto
    // the field (PART 12 section 11), which is what this does. Remove it once
    // no supported release emits `id`. After the switch, because the pre-split
    // fold above reaches `footnote_ref` by changing `type` rather than matching it.
    const settled = out ?? node;
    if (settled['type'] === 'admonition' && DIRECTIVE_KINDS.has(String(settled['kind']))) {
        out = { ...settled, type: 'directive' };
    }
    if (settled['type'] === 'footnote_ref' && typeof settled['id'] === 'string') {
        const { id, ...rest } = settled;
        out = { ...rest, label: id };
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
    if (serialize) return normalize(serialize(prepareRuntime(runtime))) as CarveAstDocument;

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

    const out: CarveAstDocument = { type: 'document', astVersion: '2.0', children };
    if (doc.srcByteLength !== undefined) out.srcByteLength = doc.srcByteLength;
    return out;
}

function prepareRuntime(value: unknown): unknown {
    if (Array.isArray(value)) {
        const mapped = value.map(prepareRuntime);
        return mapped.some((child, i) => child !== value[i]) ? mapped : value;
    }
    if (!isObject(value)) return value;
    let node: Record<string, unknown> = value;
    for (const [key, child] of Object.entries(value)) {
        const mapped = prepareRuntime(child);
        if (mapped !== child) node = { ...node, [key]: mapped };
    }
    if (node['type'] === 'comment' && typeof node['form'] === 'string') {
        node = { ...node };
        node['block'] = node['form'] === 'block';
        node['delimited'] = node['form'] === 'braced';
        node['content'] = node['value'] ?? node['content'];
        delete node['form'];
        delete node['value'];
    }
    return node;
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
 * Below the root only node types are checked: a type the 2.0 schema does not
 * define is refused, as carve#3598 rules for every reader. Fields are not
 * validated, so a JSON Schema validator stays out of the runtime; callers that
 * want full conformance validate against `resources/ast-schema.json`, as the
 * test suite does. A known node in the wrong slot still degrades to its text
 * and says so in `warnings`.
 */
export function parseCarveAst(input: CarveAstDocument | string): CarveAstDocument {
    let value: unknown = typeof input === 'string' ? JSON.parse(input) : input;
    // An engine still on contract 1.2 writes no 2.0 root; migrate it. Pandoc reads no positions, so the
    // migration runs without the source and its dropped-position losses do not matter here.
    if (isObject(value) && value['type'] === 'document' && value['astVersion'] !== '2.0') {
        try { value = carve.migrateAstJson(value as Parameters<typeof carve.migrateAstJson>[0]).tree; } catch { /* reported below */ }
    }
    if (!isObject(value) || value['type'] !== 'document' || value['astVersion'] !== '2.0' || !Array.isArray(value['children'])) {
        const found = isObject(value) ? `type ${JSON.stringify(value['type'])}` : typeof value;
        throw new Error(
            `not a Carve AST document: expected a 2.0 root node of type "document" with a children array, found ${found}. ` +
                'The expected shape is PART 12 of the Carve spec (resources/ast-schema.json), as written by "carve --to-json".',
        );
    }
    refuseUnknownNodeTypes(value['children'], '/children');
    return value as unknown as CarveAstDocument;
}

// Opaque or record-valued slots: a `type` key below them is data, not a node.
const NON_NODE_KEYS = new Set(['attrs', 'data', 'metadata', 'pos', 'segments', 'extensions', 'resources']);

/** Ruling on carve#3598: every reader, bridges included, refuses a core node type it does not know. */
function refuseUnknownNodeTypes(value: unknown, path: string): void {
    if (Array.isArray(value)) {
        value.forEach((child, i) => refuseUnknownNodeTypes(child, `${path}/${i}`));
        return;
    }
    if (!isObject(value)) return;
    const type = value['type'];
    if (typeof type === 'string' && !CORE_NODE_TYPES.has(type)) {
        throw new Error(`not a Carve AST 2.0 document: unknown node type ${JSON.stringify(type)} at ${path}`);
    }
    for (const [key, child] of Object.entries(value)) {
        if (!NON_NODE_KEYS.has(key)) refuseUnknownNodeTypes(child, `${path}/${key}`);
    }
}
