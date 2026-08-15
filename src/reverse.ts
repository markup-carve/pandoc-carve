/**
 * Pandoc JSON AST -> Carve AST.
 *
 * The inverse of convert.ts: walks a Pandoc document (api 1.23) and builds
 * the AST shape `@markup-carve/carve`'s `parse()` produces, so `renderCarve()`
 * (the `carve fmt` serializer) can turn it into Carve source. Spans that
 * convert.ts emits as classed degradations (mention, tag, symbol, ext-*, ...)
 * are recognized and restored to their native Carve nodes, which makes
 * carve -> pandoc -> carve round-trips clean.
 */

import { parse as parseCarve } from '@markup-carve/carve';
import type { PandocDoc, PandocNode, Attr } from './pandoc.js';
import type { RowGroupBody, RowGroups } from './row-groups.js';

/**
 * The node type THIS engine uses for an editorial comment.
 *
 * carve-js renamed `critic-comment` to `critic_comment`, and the nodes this
 * module builds go straight to that engine's own writer - which accepts only
 * its current spelling and throws on the other. A constant cannot satisfy both,
 * and both are in the wild: the published release wants the hyphen, main wants
 * the underscore.
 *
 * So it is PROBED rather than assumed, the same way carve-lsp probes the column
 * unit. Parse one editorial comment and read back what the engine called it.
 */
let criticCommentType: string | undefined;
function criticCommentNodeType(): string {
    if (criticCommentType) return criticCommentType;
    criticCommentType = 'critic_comment';
    try {
        const probe = parseCarve('{# c #}\n') as { children?: unknown[] };
        const para = (probe.children ?? [])[0] as { children?: Array<{ type?: string }> };
        const found = (para?.children ?? []).find((n) => String(n?.type ?? '').includes('critic'));
        if (found?.type) criticCommentType = found.type;
    } catch {
        // Keep the current spelling: an engine too old to parse the probe is
        // older than either name this cares about.
    }
    return criticCommentType;
}

interface CNode {
    type: string;
    [key: string]: unknown;
}

export interface ReverseResult {
    ast: CNode & { children: CNode[] };
    warnings: string[];
}

interface Ctx {
    warnings: string[];
    footnoteDefs: Record<string, CNode[]>;
    noteCounter: number;
    /** abbr -> expansion, collected so renderCarve gets the `*[abbr]:` defs */
    abbrevDefs: Map<string, string>;
    /** One bibliography diagnostic per document, however many Cites it has. */
    bibliographyWarned: boolean;
    /** Same for `Quoted`: one diagnostic, however many quotations there are. */
    quotedWarned: boolean;
}

function warn(ctx: Ctx, msg: string): void {
    ctx.warnings.push(msg);
}

interface CAttrs {
    id?: string;
    classes?: string[];
    keyValues?: Record<string, string>;
    order?: string[];
}

function fromAttr(a: Attr | undefined): CAttrs | undefined {
    if (!a) return undefined;
    const [id, classes, kvs] = a;
    const attrs: CAttrs = {};
    const order: string[] = [];
    if (id) {
        attrs.id = id;
        order.push('#id');
    }
    if (classes.length) {
        attrs.classes = classes;
        order.push('.class');
    }
    if (kvs.length) {
        attrs.keyValues = Object.fromEntries(kvs);
        order.push('key');
    }
    if (!order.length) return undefined;
    attrs.order = order;
    return attrs;
}

const text = (value: string): CNode => ({ type: 'text', value });

/** Merge adjacent text nodes so renderCarve sees natural runs. */
function mergeText(nodes: CNode[]): CNode[] {
    const out: CNode[] = [];
    for (const n of nodes) {
        const prev = out[out.length - 1];
        if (n.type === 'text' && prev?.type === 'text') {
            prev.value = String(prev.value) + String(n.value);
        } else {
            out.push(n);
        }
    }
    return out;
}

// --- Inlines ---

function inlines(ctx: Ctx, xs: PandocNode[] | undefined): CNode[] {
    if (!xs) return [];
    const out: CNode[] = [];
    for (const x of xs) out.push(...inline(ctx, x));
    return mergeText(out);
}

function wrapped(ctx: Ctx, type: string, xs: PandocNode[]): CNode[] {
    return [{ type, children: inlines(ctx, xs) }];
}

function inline(ctx: Ctx, n: PandocNode): CNode[] {
    const c = n.c as never;
    switch (n.t) {
        case 'Str':
            return [text(String(c))];
        case 'Space':
            return [text(' ')];
        case 'SoftBreak':
            return [{ type: 'soft_break' }];
        case 'LineBreak':
            return [{ type: 'hard_break' }];
        case 'Emph':
            return wrapped(ctx, 'emphasis', c);
        case 'Strong':
            // Strong[Emph[..]] needs no special case: it reverses to a strong
            // wrapping an emphasis, which is exactly how carve represents
            // bold-italic now that it has no node type of its own.
            return wrapped(ctx, 'strong', c);
        case 'Underline':
            return wrapped(ctx, 'underline', c);
        case 'Strikeout':
            return wrapped(ctx, 'strike', c);
        case 'Superscript':
            return wrapped(ctx, 'superscript', c);
        case 'Subscript':
            return wrapped(ctx, 'subscript', c);
        // POLICY: Carve has no small-caps node and is not getting one - the
        // typographic distinction is a presentation choice, which is what the
        // `.smallcaps` span already carries. The degradation is not one-way:
        // `convert.ts` reads that class back as a pandoc `SmallCaps` (pandoc's
        // own markdown reader defines the same convention), so the construct
        // survives Pandoc -> Carve -> Pandoc intact. The warning stays because
        // a consumer reading the Carve document itself sees a class, not a
        // semantic - it says what the Carve side holds, not that the value is
        // lost.
        case 'SmallCaps':
            warn(ctx, 'SmallCaps has no Carve form - degraded to a .smallcaps span');
            return [
                {
                    type: 'span',
                    children: inlines(ctx, c),
                    attrs: { classes: ['smallcaps'], order: ['.class'] },
                },
            ];
        case 'Quoted': {
            // POLICY: literal curly quotes, and the degradation is real - the
            // text re-imports as `Str`, never as `Quoted`, so the quote kind
            // and pandoc's locale-aware quoting are gone once this is written.
            // A `.quoted` span would round-trip, but it would put a class into
            // every quoted phrase of an imported document to preserve a node
            // Carve has no spelling for; the characters are what an author
            // would have typed. Warned once per document, like the
            // bibliography diagnostic: a document quotes many times and the
            // repetition carries no extra information.
            if (!ctx.quotedWarned) {
                ctx.quotedWarned = true;
                warn(
                    ctx,
                    'Quoted degraded to literal curly quote characters - Carve has no quote node, so the quotation does not re-import as Quoted',
                );
            }
            const [kind, xs] = c as [PandocNode, PandocNode[]];
            const [open, close] = kind.t === 'SingleQuote' ? ['‘', '’'] : ['“', '”'];
            return mergeText([text(open), ...inlines(ctx, xs), text(close)]);
        }
        case 'Cite': {
            const [citations, xs] = c as [PCitation[], PandocNode[]];
            return [citeGroup(ctx, citations ?? [], xs ?? [])];
        }
        case 'Code': {
            const [a, s] = c as [Attr, string];
            const node: CNode = { type: 'code', value: s };
            const attrs = fromAttr(a);
            if (attrs) node.attrs = attrs;
            return [node];
        }
        case 'Math': {
            const [style, s] = c as [PandocNode, string];
            return [{ type: 'math', display: style.t === 'DisplayMath', content: s }];
        }
        case 'RawInline': {
            const [format, s] = c as [string, string];
            return [{ type: 'raw_inline', format, content: s }];
        }
        case 'Link':
            return link(ctx, c);
        case 'Image': {
            const [a, alt, [src, title]] = c as [Attr, PandocNode[], [string, string]];
            const node: CNode = { type: 'image', src, alt: stringify(alt) };
            if (title) node.title = title;
            const attrs = fromAttr(a);
            if (attrs) node.attrs = attrs;
            return [node];
        }
        case 'Note': {
            const noteBlocks = c as PandocNode[];
            // The post-split names. carve-js renamed these to
            // `inline_footnote` and `footnote_ref` (markup-carve/carve#405),
            // and 0.1.3 is the release that carries the split, so the engine
            // this produces for now knows them.
            //
            // A producer cannot satisfy both spellings the way a consumer can
            // accept both, because the type string is a single value. That is
            // why this waited for the lockfile to move rather than emitting
            // the new names defensively.
            if (noteBlocks.length === 1 && (noteBlocks[0]!.t === 'Para' || noteBlocks[0]!.t === 'Plain')) {
                return [{ type: 'inline_footnote', inline: inlines(ctx, noteBlocks[0]!.c as PandocNode[]) }];
            }
            const id = `fn${++ctx.noteCounter}`;
            ctx.footnoteDefs[id] = blocks(ctx, noteBlocks);
            return [{ type: 'footnote_ref', id }];
        }
        case 'Span':
            return span(ctx, c);
        default:
            warn(ctx, `inline: pandoc node "${n.t}" has no Carve mapping - dropped`);
            return [];
    }
}

function link(ctx: Ctx, c: never): CNode[] {
    const [a, xs, [href, title]] = c as [Attr, PandocNode[], [string, string]];
    const [, classes] = a;
    if (classes.includes('uri') || classes.includes('email')) {
        return [{ type: 'autolink', href, text: stringify(xs) }];
    }
    if (classes.includes('crossref')) {
        return [{ type: 'heading_ref', target: href.replace(/^#/, '') }];
    }
    const node: CNode = { type: 'link', href, children: inlines(ctx, xs) };
    if (title) node.title = title;
    const attrs = fromAttr(a);
    if (attrs) node.attrs = attrs;
    return [node];
}

/** Restore convert.ts's classed-span degradations to native Carve nodes. */
function span(ctx: Ctx, c: never): CNode[] {
    const [a, xs] = c as [Attr, PandocNode[]];
    const [, classes, kvs] = a;
    const kv = Object.fromEntries(kvs);
    const cls = classes[0];
    switch (cls) {
        case 'mark':
            return wrapped(ctx, 'highlight', xs);
        case 'mention':
            if (kv['data-user']) return [{ type: 'mention', user: kv['data-user'] }];
            break;
        case 'tag':
            if (kv['data-tag']) return [{ type: 'tag', name: kv['data-tag'] }];
            break;
        case 'symbol':
            if (kv['data-symbol']) return [{ type: 'symbol', name: kv['data-symbol'] }];
            break;
        case 'abbr':
            if (kv['title']) {
                const abbr = stringify(xs);
                // renderCarve only re-emits `*[abbr]: expansion` definitions;
                // the inline node alone would serialize as plain text.
                ctx.abbrevDefs.set(abbr, kv['title']);
                return [{ type: 'abbreviation', abbr, expansion: kv['title'] }];
            }
            break;
        case 'insertion':
            return wrapped(ctx, 'insert', xs);
        case 'deletion':
            return wrapped(ctx, 'delete', xs);
        case 'substitution': {
            const parts = xs.filter((x) => x.t === 'Span') as PandocNode[];
            if (parts.length === 2) {
                const [oldC, newC] = parts.map((p) => (p.c as [Attr, PandocNode[]])[1]);
                return [
                    { type: 'substitution', oldText: stringify(oldC!), newText: stringify(newC!) },
                ];
            }
            break;
        }
        case 'comment-annotation':
            return [{ type: criticCommentNodeType(), text: stringify(xs) }];
    }
    if (cls?.startsWith('ext-')) {
        return [{ type: 'inline_extension', name: cls.slice(4), content: inlines(ctx, xs) }];
    }
    const node: CNode = { type: 'span', children: inlines(ctx, xs) };
    const attrs = fromAttr(a);
    if (attrs) node.attrs = attrs;
    return [node];
}

interface CItem {
    key: string;
    suppressAuthor: boolean;
    prefix?: CNode[];
    locator?: CNode[];
}

interface PCitation {
    citationId?: string;
    citationPrefix?: PandocNode[];
    citationSuffix?: PandocNode[];
    citationMode?: { t?: string };
}

/**
 * pandoc `Cite` -> PART 9 §22 `citation_group`.
 *
 * The inverse of `convert.ts`'s `citationGroup`. Two asymmetries:
 *
 *  - **Mode.** Pandoc carries one mode per item; Carve's integral `+` is a
 *    cluster property. A group is integral when any item is `AuthorInText` -
 *    which is exactly the shape the forward direction emits, since an integral
 *    group's suppressed items become `SuppressAuthor` and never
 *    `NormalCitation`. A foreign group that mixes `AuthorInText` with
 *    `NormalCitation` cannot be spelled and is reported.
 *  - **Locator typing.** `locatorLabel`/`locatorValue` are NOT rebuilt here.
 *    They are derived fields: §4.2's label table lives in the engine, and a
 *    second copy in this bridge is the drift this tracker exists to kill. The
 *    locator TEXT round-trips, so parsing the emitted source with the citations
 *    extension re-derives the same pair.
 */
function citeGroup(ctx: Ctx, citations: PCitation[], content: PandocNode[]): CNode {
    const modes = citations.map((cit) => cit.citationMode?.t ?? 'NormalCitation');
    const keys = citations.map((cit) => String(cit.citationId ?? ''));
    // `raw` is required by the schema AND is what `renderCarve` writes out
    // verbatim, so it decides whether the source round-trips byte for byte.
    // Pandoc's own markdown reader stores the source here too, which is why
    // recovering it beats rebuilding it - but only while it still DESCRIBES the
    // records, since a filter may have rewritten them and left the display text
    // behind.
    const recovered = carveShapedSource(content, keys);
    // Pandoc's markdown reader has no integral marker: it reads Carve's `[+@k]`
    // as `NormalCitation` with a `+` prefix. The recovered source is the only
    // place that fact survives, and reading it back is what keeps `mode` from
    // contradicting the `raw` sitting next to it.
    const integral = modes.includes('AuthorInText') || (recovered?.startsWith('[+') ?? false);
    if (integral && modes.includes('NormalCitation') && !recovered?.startsWith('[+')) {
        warn(ctx, 'Cite mixes AuthorInText with NormalCitation - Carve\'s integral marker is a property of the whole group, so the group is emitted as integral');
    }
    if (!ctx.bibliographyWarned) {
        ctx.bibliographyWarned = true;
        warn(ctx, 'Cite mapped to a Carve citation group; bibliography entries live in pandoc metadata, so no `[@key]:` definitions are emitted and an undefined key renders verbatim');
    }

    const items = citations.map((cit) => {
        // A citation item is a plain object, not a node: it has no `type`.
        const item: CItem = {
            key: String(cit.citationId ?? ''),
            suppressAuthor: (cit.citationMode?.t ?? '') === 'SuppressAuthor',
        };
        const prefix = citationPrefixNodes(ctx, cit.citationPrefix);
        if (prefix.length) item.prefix = prefix;
        const locator = locatorNodes(ctx, cit.citationSuffix);
        if (locator.length) item.locator = locator;
        return item;
    });

    const group: CNode = { type: 'citation_group', items };
    group.raw = recovered ?? synthesizeRaw(items, integral);
    if (integral) group.mode = 'integral';
    return group;
}

/**
 * The `+` pandoc's markdown reader leaves in the prefix when it reads Carve's
 * own integral spelling is the group marker, not prose - it is read off the
 * modes instead, so carrying it here would print `[+see +@k]`.
 */
function citationPrefixNodes(ctx: Ctx, prefix: PandocNode[] | undefined): CNode[] {
    if (!prefix?.length) return [];
    const stripped = prefix[0]?.t === 'Str' && String(prefix[0].c) === '+' ? prefix.slice(1) : prefix;
    const nodes = mergeText(inlines(ctx, stripped));
    const first = nodes[0];
    if (first?.type === 'text') {
        const trimmed = String(first.value ?? '').replace(/^\s+/, '');
        if (!trimmed) return nodes.slice(1);
        first.value = trimmed;
    }
    return nodes;
}

/** Drop citeproc's `, ` separator; what remains is Carve's locator run. */
function locatorNodes(ctx: Ctx, suffix: PandocNode[] | undefined): CNode[] {
    if (!suffix?.length) return [];
    const nodes = mergeText(inlines(ctx, suffix));
    const first = nodes[0];
    if (first?.type === 'text') {
        const trimmed = String(first.value ?? '').replace(/^\s*,?\s*/, '');
        if (!trimmed) return nodes.slice(1);
        first.value = trimmed;
    }
    return nodes;
}

/**
 * A Cite's content is Carve source when it is a tail-less bracket holding
 * exactly this Cite's keys, in order - the shape §4.1 claims. Two things fail
 * the test and both must: a rendered "(Smith 2020)" out of a docx is prose
 * about the citation rather than the citation, and content a filter left stale
 * after rewriting the records would otherwise be written back as source and
 * silently restore the old keys on the next parse.
 */
function carveShapedSource(content: PandocNode[], keys: string[]): string | null {
    const raw = stringify(content).trim();
    if (!raw.startsWith('[') || !raw.endsWith(']')) return null;
    return sameKeys(citedKeys(raw), keys) ? raw : null;
}

/** The `@key` run of a Carve citation group; `\@` is literal and not a key. */
function citedKeys(raw: string): string[] {
    const out: string[] = [];
    for (const m of raw.matchAll(/(^|[^\\])@([^\s;,\]]+)/g)) {
        out.push(String(m[2]).replace(/[.,;:]+$/, ''));
    }
    return out;
}

function sameKeys(found: string[], keys: string[]): boolean {
    return found.length === keys.length && found.every((k, i) => k === keys[i]);
}

function synthesizeRaw(items: CItem[], integral: boolean): string {
    const body = items
        .map((item) => {
            const prefix = plainOf(item.prefix);
            const locator = plainOf(item.locator);
            return (
                (prefix ? `${prefix} ` : '')
                + (item.suppressAuthor ? '-' : '')
                + `@${item.key}`
                + (locator ? `, ${locator}` : '')
            );
        })
        .join('; ');
    return `[${integral ? '+' : ''}${body}]`;
}

function plainOf(nodes: CNode[] | undefined): string {
    if (!nodes?.length) return '';
    return nodes.map((n) => (typeof n.value === 'string' ? n.value : plainOf(n.children as CNode[]))).join('');
}

function stringify(xs: PandocNode[]): string {
    let out = '';
    for (const x of xs) {
        if (x.t === 'Str') out += String(x.c);
        else if (x.t === 'Space' || x.t === 'SoftBreak') out += ' ';
        else if (Array.isArray(x.c)) out += stringify(x.c as PandocNode[]);
        else if (Array.isArray((x.c as unknown[])?.[1])) out += stringify((x.c as unknown[])[1] as PandocNode[]);
    }
    return out;
}

// --- Blocks ---

function blocks(ctx: Ctx, xs: PandocNode[] | undefined): CNode[] {
    if (!xs) return [];
    const out: CNode[] = [];
    for (const x of xs) out.push(...block(ctx, x));
    return out;
}

const KNOWN_ADMONITIONS = new Set(['note', 'tip', 'warning', 'danger', 'info', 'caution', 'important']);

function block(ctx: Ctx, n: PandocNode): CNode[] {
    const c = n.c as never;
    switch (n.t) {
        case 'Para':
        case 'Plain':
            return [{ type: 'paragraph', children: inlines(ctx, c) }];
        case 'LineBlock': {
            // Carve HAS a form for this - the `::: |` line block (PART 9 SS23) -
            // and the warning here used to say it did not, while flattening the
            // verse into one paragraph of hard breaks. An EMPTY line is a stanza
            // break, which is a blank line between the paragraphs of the block.
            const lines = c as PandocNode[][];
            const stanzas: CNode[][] = [[]];
            for (const line of lines) {
                if (line.length === 0) {
                    stanzas.push([]);
                    continue;
                }
                const stanza = stanzas[stanzas.length - 1] as CNode[];
                if (stanza.length > 0) stanza.push({ type: 'hard_break' });
                stanza.push(...inlines(ctx, line));
            }
            const children = stanzas
                .filter((stanza) => stanza.length > 0)
                .map((stanza) => ({ type: 'paragraph', children: mergeText(stanza) }));
            // The `line_block` NODE of PART 9 §23, which is what the engine's
            // own parser produces for `::: |`. This used to be the
            // `{.line-block}` div instead: `0.1.2`'s writer threw
            // "renderCarve: unknown block line_block", and the two spellings
            // parse to the same rendering, so the div was the one both could
            // carry. `0.1.3` writes the node, and the floor moved to it.
            return [{ type: 'line_block', children }];
        }
        case 'Header': {
            const [level, a, xs] = c as [number, Attr, PandocNode[]];
            const node: CNode = { type: 'heading', level, children: inlines(ctx, xs) };
            const attrs = fromAttr(a);
            if (attrs) node.attrs = attrs;
            return [node];
        }
        case 'BlockQuote':
            return [{ type: 'block_quote', children: blocks(ctx, c as PandocNode[]) }];
        case 'CodeBlock': {
            const [a, content] = c as [Attr, string];
            const [id, classes, kvs] = a;
            const node: CNode = { type: 'code_block', content };
            if (classes[0]) node.lang = classes[0];
            const kv = Object.fromEntries(kvs);
            if (kv['title']) node.header = kv['title'];
            const rest = fromAttr([id, classes.slice(1), kvs.filter(([k]) => k !== 'title')]);
            if (rest) node.attrs = rest;
            return [node];
        }
        case 'RawBlock': {
            const [format, content] = c as [string, string];
            return [{ type: 'raw_block', format, content }];
        }
        case 'HorizontalRule':
            return [{ type: 'thematic_break' }];
        case 'BulletList':
            return [bulletList(ctx, c)];
        case 'OrderedList':
            return [orderedList(ctx, c)];
        case 'DefinitionList':
            return [definitionList(ctx, c)];
        case 'Table':
            return [table(ctx, c, null)];
        case 'Figure':
            return figure(ctx, c);
        case 'Div':
            return div(ctx, c);
        default:
            warn(ctx, `block: pandoc node "${n.t}" has no Carve mapping - dropped`);
            return [];
    }
}

// --- Lists ---

function listItems(ctx: Ctx, items: PandocNode[][]): { items: CNode[]; tight: boolean } {
    let tight = true;
    const converted = items.map((item) => {
        if (item.some((b) => b.t === 'Para')) tight = false;
        const children = blocks(ctx, item);
        const node: CNode = { type: 'list_item', children };
        stripTaskMarker(node);
        return node;
    });
    return { items: converted, tight };
}

/** Detect the ballot-box prefix convert.ts (and pandoc's gfm reader) emit. */
function stripTaskMarker(item: CNode): void {
    const first = (item.children as CNode[])[0];
    if (first?.type !== 'paragraph') return;
    const children = first.children as CNode[];
    const lead = children[0];
    if (lead?.type !== 'text') return;
    const value = String(lead.value);
    const marker = value.startsWith('☒') ? true : value.startsWith('☐') ? false : null;
    if (marker === null) return;
    item.checked = marker;
    const rest = value.slice(1).replace(/^ /, '');
    if (rest) lead.value = rest;
    else children.shift();
}

function bulletList(ctx: Ctx, c: never): CNode {
    const { items, tight } = listItems(ctx, c as PandocNode[][]);
    return { type: 'list', ordered: false, tight, items };
}

const OL_STYLE: Record<string, string> = {
    LowerAlpha: 'a',
    UpperAlpha: 'A',
    LowerRoman: 'i',
    UpperRoman: 'I',
};

function orderedList(ctx: Ctx, c: never): CNode {
    const [[start, style, delim], rawItems] = c as [
        [number, PandocNode, PandocNode],
        PandocNode[][],
    ];
    const { items, tight } = listItems(ctx, rawItems);
    const node: CNode = { type: 'list', ordered: true, tight, items };
    if (start !== 1) node.start = start;
    const olType = OL_STYLE[style.t];
    if (olType) node.olType = olType;
    // Source-style metadata for AST consumers; renderCarve currently
    // normalizes to `1.` regardless (fmt canonical form).
    if (delim?.t === 'OneParen' || delim?.t === 'TwoParens') node.delim = ')';
    else if (delim?.t === 'Period') node.delim = '.';
    return node;
}

function definitionList(ctx: Ctx, c: never): CNode {
    const rawItems = c as [PandocNode[], PandocNode[][]][];
    const items = rawItems.map(([termInlines, defs]) => {
        // convert.ts joins multiple Carve terms with LineBreak - split them back.
        const terms: CNode[][] = [];
        let current: PandocNode[] = [];
        for (const x of termInlines) {
            if (x.t === 'LineBreak') {
                terms.push(inlines(ctx, current));
                current = [];
            } else {
                current.push(x);
            }
        }
        terms.push(inlines(ctx, current));
        return {
            terms,
            definitions: defs.map((d) => blocks(ctx, d)),
        };
    });
    return { type: 'definition_list', items };
}

// --- Tables ---

const ALIGN_BACK: Record<string, string> = {
    AlignLeft: 'left',
    AlignRight: 'right',
    AlignCenter: 'center',
};

interface RawPandocRow {
    cells: PandocNode[];
}

/**
 * Whether a partition says anything the flat `rows` cannot.
 *
 * A single body with no intermediate header, no row-head columns, no attrs and
 * no foot IS what every consumer derives from the rows themselves, so emitting
 * it would add a field that carries no information. Absent means exactly that
 * structure (PART 12 §15).
 */
function carriesMoreThanFlatRows(groups: RowGroups): boolean {
    if (groups.footRows > 0) return true;
    if (groups.bodies.length > 1) return true;
    return groups.bodies.some(
        (b) => b.headRows > 0 || (b.rowHeadColumns ?? 0) > 0 || b.attrs !== undefined,
    );
}

/**
 * Rebuild Carve's grid model: pandoc puts rowSpan/colSpan on the origin Cell
 * and omits covered positions; Carve lists every position and marks covered
 * ones as continuation cells (`span: "colspan" | "rowspan"`).
 */
function table(
    ctx: Ctx,
    c: never,
    captionOverride: CNode[] | null,
    shortCaptionOverride: CNode[] | null = null,
): CNode {
    const [a, capt, colspecs, thead, tbodies, tfoot] = c as [
        Attr,
        [unknown, PandocNode[]],
        [PandocNode, PandocNode][],
        [Attr, unknown[]],
        [Attr, number, unknown[], unknown[]][],
        [Attr, unknown[]],
    ];

    // POLICY: a ColSpec's alignment is read, its ColWidth is dropped, and the
    // drop is deliberate and silent. Carve's table model has no width slot at
    // any level (nothing named `width` appears in `resources/ast-schema.json`)
    // and PART 9 §16's pipe-table source cannot spell one, so there is nowhere
    // to put the number and no syntax that could reproduce it. No diagnostic,
    // because the width is usually not the author's: pandoc DERIVES a ColWidth
    // for every grid and multiline table from the ASCII column widths, so a
    // warning would fire on the ordinary case and report a value nobody chose.
    const colAligns = colspecs.map((cs) => ALIGN_BACK[cs[0].t] ?? '');
    const nCols = colspecs.length;

    const headRaw = thead[1] as [Attr, unknown[][]][];
    const footRaw = tfoot[1] as [Attr, unknown[][]][];

    // The flat `rows` Carve carries, plus the counts that say where pandoc's
    // sections were. A body's intermediate header rows are header rows too,
    // which is why §15 states the head count instead of deriving it from the
    // leading run.
    const allRaw: [Attr, unknown[][]][] = [...headRaw];
    const isHeaderRow: boolean[] = headRaw.map(() => true);
    const groupBodies: RowGroupBody[] = [];
    for (const body of tbodies) {
        const bodyHead = body[2] as [Attr, unknown[][]][];
        const bodyRows = body[3] as [Attr, unknown[][]][];
        allRaw.push(...bodyHead, ...bodyRows);
        isHeaderRow.push(...bodyHead.map(() => true), ...bodyRows.map(() => false));
        const group: RowGroupBody = { headRows: bodyHead.length, bodyRows: bodyRows.length };
        const rowHeadColumns = body[1];
        if (typeof rowHeadColumns === 'number' && rowHeadColumns > 0) {
            group.rowHeadColumns = rowHeadColumns;
        }
        const bodyAttrs = fromAttr(body[0]);
        if (bodyAttrs) group.attrs = bodyAttrs;
        groupBodies.push(group);
    }
    allRaw.push(...footRaw);
    isHeaderRow.push(...footRaw.map(() => false));

    // Occupancy grid: pending[r][c] = continuation marker owed at that position.
    // Decided BEFORE the grid walk: the pipe path flattens as it goes and warns
    // while doing it, and that warning is wrong for a table that is about to be
    // emitted as a list-table instead.
    const hasBlockCells = allRaw.some((row) =>
        row[1].some((raw) => {
            const cellBlocks = (raw as [Attr, PandocNode, number, number, PandocNode[]])[4];
            return Array.isArray(cellBlocks) && !isInlineShaped(cellBlocks);
        }));

    const pending: ('rowspan' | undefined)[][] = allRaw.map(() => Array<'rowspan' | undefined>(nCols));
    const rows: CNode[] = [];
    // The pandoc blocks that sat at each grid position, kept alongside the
    // inline-flattened cells so the list-table fallback below can convert them
    // as blocks without walking the occupancy grid a second time.
    const cellBlocksAt: (PandocNode[] | undefined)[][] = allRaw.map(() => []);

    for (let r = 0; r < allRaw.length; r++) {
        const isHeader = isHeaderRow[r] === true;
        const cells: CNode[] = [];
        const rawCells = allRaw[r]![1];
        let rawIdx = 0;
        for (let col = 0; col < nCols; col++) {
            if (pending[r]![col]) {
                cells.push({ type: 'table_cell', header: isHeader, children: [], span: 'rowspan' });
                continue;
            }
            const raw = rawCells[rawIdx++] as [Attr, PandocNode, number, number, PandocNode[]] | undefined;
            if (!raw) {
                cells.push({ type: 'table_cell', header: isHeader, children: [] });
                continue;
            }
            const [cellAttr, cellAlign, rowSpan, colSpan, cellBlocks] = raw;
            cellBlocksAt[r]![col] = cellBlocks;
            const cell: CNode = {
                type: 'table_cell',
                header: isHeader,
                children: hasBlockCells ? [] : cellInlines(ctx, cellBlocks),
            };
            const align = ALIGN_BACK[cellAlign.t] ?? (isHeader ? colAligns[col] : '');
            if (align) cell.align = align;
            const cellAttrs = fromAttr(cellAttr);
            if (cellAttrs) cell.attrs = cellAttrs;
            cells.push(cell);
            for (let j = 1; j < colSpan && col + j < nCols; j++) {
                cells.push({ type: 'table_cell', header: isHeader, children: [], span: 'colspan' });
            }
            // A 2D block gets a rowspan continuation at EVERY covered column
            // of the lower rows - that is how Carve's grid expresses it.
            for (let k = 1; k < rowSpan && r + k < allRaw.length; k++) {
                for (let j = 0; j < colSpan && col + j < nCols; j++) {
                    pending[r + k]![col + j] = 'rowspan';
                }
            }
            col += colSpan - 1;
        }
        const rowNode: CNode = { type: 'table_row', cells };
        // Pandoc gives a Row its own Attr and Carve spells it after the closing
        // pipe (`| a | b |{.cls}`), so it is the same slot, not a degradation.
        const rowAttrs = fromAttr(allRaw[r]![0]);
        if (rowAttrs) rowNode.attrs = rowAttrs;
        rows.push(rowNode);
    }

    const captionInlinesFor = (): CNode[] | null =>
        captionOverride ?? captionFromBlocks(ctx, capt[1]);

    if (hasBlockCells) {
        const short = shortCaptionOverride ?? captionFromInlines(ctx, capt[0] as PandocNode[] | null);
        if (short?.length) {
            warn(ctx, 'list-table: the short caption is dropped - the extension has one quoted title and no second slot');
        }
        return listTable(ctx, {
            rows,
            cellBlocksAt,
            headRows: headRaw.length,
            footRows: footRaw.length,
            bodies: groupBodies,
            caption: captionInlinesFor(),
            attrs: fromAttr(a),
            colAligns,
        });
    }

    const node: CNode = { type: 'table', rows };
    // The counts come from the same arrays `rows` was built from, one row
    // pushed per raw row, so §15's sum holds by construction here. It is
    // checked where it can actually fail instead: on a partition that arrived
    // from outside (see readRowGroups).
    const groups: RowGroups = { headRows: headRaw.length, bodies: groupBodies, footRows: footRaw.length };
    if (carriesMoreThanFlatRows(groups)) node.rowGroups = groups;
    const attrs = fromAttr(a);
    if (attrs) node.attrs = attrs;
    const captionInlines = captionInlinesFor();
    if (captionInlines?.length) node.caption = captionInlines;
    const shortCaption = shortCaptionOverride
        ?? captionFromInlines(ctx, capt[0] as PandocNode[] | null);
    if (shortCaption?.length) node.shortCaption = shortCaption;
    return node;
}

/**
 * Whether a cell's blocks fit Carve's pipe-table cell, which holds INLINES.
 *
 * One `Plain`/`Para` fits. Two do not: the joining soft break serializes as a
 * literal newline inside the row, which splits the table at that line. Anything
 * else (a list, a code block, a nested table) has no inline form at all.
 */
function isInlineShaped(cellBlocks: PandocNode[]): boolean {
    if (cellBlocks.length === 0) return true;
    if (cellBlocks.length > 1) return false;
    const only = cellBlocks[0]!.t;
    return only === 'Plain' || only === 'Para';
}

interface ListTableInput {
    rows: CNode[];
    cellBlocksAt: (PandocNode[] | undefined)[][];
    headRows: number;
    footRows: number;
    bodies: RowGroupBody[];
    caption: CNode[] | null;
    attrs: CAttrs | undefined;
    colAligns: string[];
}

/**
 * A pandoc table with block content in a cell, as `::: list-table`.
 *
 * PART 9 §16's pipe-table cell holds inlines, so a docx or LaTeX table with a
 * list or two paragraphs in a cell has no pipe form. Flattening it was not a
 * degradation but a loss: measured on a pandoc grid table, a `BulletList` cell
 * emitted NOTHING (`stringifyBlocks` walks `{t, c}` nodes and a list's `c` is a
 * list of block LISTS), and a two-paragraph cell put a literal newline inside
 * the row, so the two-row table re-parsed as a one-row table plus a paragraph.
 *
 * The list-table extension (extensions.md §5) exists for exactly this shape:
 * cells are list items, so they hold full block content. It is lossless in
 * structure. Three things it cannot spell are reported rather than dropped
 * quietly: per-column alignment (§5.5 leaves it out), a foot, and a body's
 * intermediate header rows.
 */
function listTable(ctx: Ctx, input: ListTableInput): CNode {
    const { rows, cellBlocksAt, headRows, footRows, bodies, caption, attrs, colAligns } = input;
    warn(ctx, 'table: a cell holds block content, which a pipe table cannot spell - emitted as a `::: list-table` (structure preserved)');

    if (colAligns.some((a) => a)) {
        warn(ctx, 'list-table: per-column alignment is dropped - the extension has no alignment marker (extensions.md §5.5)');
    }
    if (footRows > 0) {
        warn(ctx, `list-table: the table's ${footRows} foot row(s) become ordinary body rows - the extension has head rows only`);
    }
    if (bodies.some((b) => b.headRows > 0)) {
        warn(ctx, 'list-table: a body group\'s intermediate header rows become ordinary body rows - `header-rows` counts only the leading run');
    }
    if (bodies.length > 1) {
        warn(ctx, `list-table: the table's ${bodies.length} body groups merge into one - the extension has no body boundary`);
    }
    if (bodies.some((b) => b.attrs)) {
        warn(ctx, 'list-table: a body group\'s attributes are dropped - the extension has no body to hang them on');
    }
    if (new Set(bodies.filter((b) => b.rowHeadColumns).map((b) => b.rowHeadColumns)).size > 1) {
        warn(ctx, 'list-table: the body groups disagree on their row-head column count - `header-cols` is one number for the whole table, and the first is kept');
    }

    const headerCols = bodies.find((b) => b.rowHeadColumns)?.rowHeadColumns ?? 0;

    const rowItems: CNode[] = rows.map((row, r) => {
        const cells = (row.cells as CNode[] | undefined) ?? [];
        const cellItems: CNode[] = cells.map((cell, c) => {
            // A covered position is a lone `^`/`<` item, the same markers the
            // pipe grid uses (§5.1).
            if (cell.span === 'rowspan') return listItem([paragraphOf('^')]);
            if (cell.span === 'colspan') return listItem([paragraphOf('<')]);
            const cellBlocks = cellBlocksAt[r]?.[c];
            const children = cellBlocks?.length ? blocks(ctx, cellBlocks) : [];
            return listItem(children.length ? children : [paragraphOf('')]);
        });
        return listItem([bulletListOf(cellItems)]);
    });

    const node: CNode = {
        type: 'admonition',
        kind: 'list-table',
        children: [bulletListOf(rowItems)],
    };
    if (caption?.length) node.title = caption;

    const keyValues: Record<string, string> = { ...(attrs?.keyValues ?? {}) };
    const order = [...(attrs?.order ?? [])];
    const addKey = (key: string, value: number): void => {
        if (value <= 0) return;
        keyValues[key] = String(value);
        if (!order.includes('key')) order.push('key');
    };
    addKey('header-rows', headRows);
    addKey('header-cols', headerCols);
    const merged: CAttrs = {};
    if (attrs?.id) merged.id = attrs.id;
    if (attrs?.classes?.length) merged.classes = attrs.classes;
    if (Object.keys(keyValues).length) merged.keyValues = keyValues;
    if (Object.keys(merged).length) {
        merged.order = order.length ? order : Object.keys(keyValues).length ? ['key'] : [];
        node.attrs = merged;
    }
    return node;
}

const listItem = (children: CNode[]): CNode => ({ type: 'list_item', children });
const paragraphOf = (value: string): CNode => ({
    type: 'paragraph',
    children: value ? [text(value)] : [],
});
/**
 * A list is tight when no item holds more than one block. fmt reads the flag to
 * decide whether to separate items with a blank line, and a cell holding two
 * paragraphs needs that line or the second paragraph joins the first. A single
 * nested list under an item does not - that is every row of a list-table.
 */
const bulletListOf = (items: CNode[]): CNode => ({
    type: 'list',
    ordered: false,
    tight: items.every((item) => ((item.children as CNode[] | undefined) ?? []).length <= 1),
    items,
    bulletChar: '-',
});

function cellInlines(ctx: Ctx, cellBlocks: PandocNode[]): CNode[] {
    const out: CNode[] = [];
    cellBlocks.forEach((b, i) => {
        if (b.t === 'Plain' || b.t === 'Para') {
            if (i > 0) out.push({ type: 'soft_break' });
            out.push(...inlines(ctx, b.c as PandocNode[]));
        } else {
            warn(ctx, `table: block-level cell content "${b.t}" flattened to text`);
            out.push(text(stringifyBlocks([b])));
        }
    });
    return mergeText(out);
}

function stringifyBlocks(xs: PandocNode[]): string {
    return xs
        .map((b) => (Array.isArray(b.c) ? stringify(b.c as PandocNode[]) : ''))
        .join(' ')
        .trim();
}

function captionFromBlocks(ctx: Ctx, capBlocks: PandocNode[] | undefined): CNode[] | null {
    if (!capBlocks?.length) return null;
    const first = capBlocks[0]!;
    if (first.t === 'Plain' || first.t === 'Para') {
        return inlines(ctx, first.c as PandocNode[]);
    }
    return null;
}

function captionFromInlines(ctx: Ctx, caption: PandocNode[] | null | undefined): CNode[] | null {
    return caption?.length ? inlines(ctx, caption) : null;
}

// --- Figures and divs ---

/**
 * A `figure` node, or the bare host when the figure carries no caption.
 *
 * `figure.caption` is REQUIRED by `resources/ast-schema.json`, and an empty one
 * has no Carve spelling: `renderCarve` writes a lone `^` line for it, and that
 * line re-parses as a lazy continuation - `> q` plus `^` comes back as the
 * two-line paragraph `q\n^` INSIDE the quote, not as a caption. So an
 * uncaptioned figure is emitted as its host, which is a shape Carve source can
 * spell, and the wrapper is reported rather than dropped in silence.
 *
 * Not a corner case: pandoc's own HTML reader emits exactly this for
 * `<figure><img src="a.png"></figure>`. Before the guard, both branches built a
 * `figure` with no `caption` field, which failed schema validation and made
 * `renderCarve` throw `Cannot read properties of undefined (reading 'forEach')`.
 */
function captionedFigure(
    ctx: Ctx,
    target: CNode,
    caption: CNode[] | null,
    shortCaption: CNode[] | null,
    a: Attr,
    host: () => CNode,
): CNode[] {
    const attrs = fromAttr(a);
    if (!caption) {
        warn(ctx, 'figure: an uncaptioned figure has no Carve spelling - the wrapper is dropped and its content kept');
        const bare = host();
        if (attrs) bare.attrs = attrs;
        return [bare];
    }
    const node: CNode = { type: 'figure', target, caption };
    if (shortCaption) node.shortCaption = shortCaption;
    if (attrs) node.attrs = attrs;
    return [node];
}

function figure(ctx: Ctx, c: never): CNode[] {
    const [a, capt, body] = c as [Attr, [unknown, PandocNode[]], PandocNode[]];
    const caption = captionFromBlocks(ctx, capt[1]);
    const shortCaption = captionFromInlines(ctx, capt[0] as PandocNode[] | null);
    const single = body.length === 1 ? body[0]! : undefined;

    if (single?.t === 'Plain' || single?.t === 'Para') {
        const xs = single.c as PandocNode[];
        if (xs.length === 1 && xs[0]!.t === 'Image') {
            const img = inline(ctx, xs[0]!)[0]!;
            // A block image is a paragraph holding the image, which is what
            // `![alt](src)` on its own line parses to.
            return captionedFigure(ctx, img, caption, shortCaption, a, () => ({
                type: 'paragraph',
                children: [img],
            }));
        }
    }
    if (single?.t === 'BlockQuote') {
        const [quote] = block(ctx, single) as [CNode];
        return captionedFigure(ctx, quote, caption, shortCaption, a, () => quote);
    }
    if (single?.t === 'Table') {
        return [table(ctx, single.c as never, caption, shortCaption)];
    }
    warn(ctx, 'figure: general figure content unwrapped (caption kept as a trailing paragraph)');
    const out = blocks(ctx, body);
    if (caption) out.push({ type: 'paragraph', children: caption });
    return out;
}

function div(ctx: Ctx, c: never): CNode[] {
    const [a, body] = c as [Attr, PandocNode[]];
    const [id, classes, rawKvs] = a;

    // Roundtrip mode carries a fenced div's grouping `[label]` as a kv rather
    // than a flattened caption; pull it back out and rebuild the label token.
    // The key's `.` cannot appear in a user-authored Carve attribute (the grammar
    // rejects dotted keys), so this never consumes real user data.
    const labelEntry = rawKvs.find(([k]) => k === 'carve.label');
    const label = labelEntry?.[1];
    const kvs = label !== undefined ? rawKvs.filter(([k]) => k !== 'carve.label') : rawKvs;

    // convert.ts's attr-wrapper marker: restore attrs onto the inner block.
    const marker = kvs.find(([k]) => k === 'carve-block');
    if (marker && body.length === 1) {
        const [child] = block(ctx, body[0]!);
        if (child) {
            const attrs = fromAttr([id, classes, kvs.filter(([k]) => k !== 'carve-block')]);
            if (attrs) child.attrs = attrs;
            return [child];
        }
    }

    let kind: string | undefined;
    let rest: string[] = [];
    if (classes.includes('admonition')) {
        rest = classes.filter((x) => x !== 'admonition');
        kind = rest.shift();
    } else if (classes.length === 1 && KNOWN_ADMONITIONS.has(classes[0]!)) {
        kind = classes[0];
    }

    if (kind) {
        const node: CNode = { type: 'admonition', kind, children: [] };
        let children = body;
        // convert.ts emits the admonition title as a leading Para[Strong[..]].
        const first = body[0];
        if (classes.includes('admonition') && first?.t === 'Para') {
            const xs = first.c as PandocNode[];
            if (xs.length === 1 && xs[0]!.t === 'Strong') {
                node.title = inlines(ctx, xs[0]!.c as PandocNode[]);
                children = body.slice(1);
            }
        }
        node.children = blocks(ctx, children);
        if (label !== undefined) node.label = label;
        const attrs = fromAttr([id, rest, kvs]);
        if (attrs) node.attrs = attrs;
        return [node];
    }

    const node: CNode = { type: 'div', children: blocks(ctx, body) };
    if (label !== undefined) node.label = label;
    const attrs = fromAttr([id, classes, kvs]);
    if (attrs) node.attrs = attrs;
    return [node];
}

// --- Metadata ---

function metaToYaml(ctx: Ctx, meta: Record<string, PandocNode>): string {
    return mappingToYaml(ctx, meta, 0).join('\n');
}

function yamlScalar(s: string): string {
    if (/^[A-Za-z0-9][A-Za-z0-9 ._\/-]*$/.test(s)) return s;
    return JSON.stringify(s);
}

/**
 * A pandoc `Meta` map as YAML, to whatever depth it has.
 *
 * `MetaMap` and a `MetaList` of non-scalars used to hit the `default: return
 * null` arm and be dropped with a warning, so a `bibliography` map or the
 * `author: [ - name:, affiliation: ]` every pandoc template reads did not
 * survive an import at all. A list of plain scalars keeps the flow form
 * (`tags: [a, b]`), which is what frontmatter conventionally looks like.
 */
function mappingToYaml(ctx: Ctx, map: Record<string, PandocNode>, depth: number): string[] {
    const pad = '  '.repeat(depth);
    const out: string[] = [];
    for (const [key, value] of Object.entries(map)) {
        const inline = scalarToYaml(value);
        if (inline !== null) {
            out.push(`${pad}${yamlKey(key)}: ${inline}`);
            continue;
        }
        const nested = nestedToYaml(ctx, value, depth + 1, key);
        if (nested === null) {
            warn(ctx, `meta: key "${key}" (${value.t}) has no YAML form - skipped`);
            continue;
        }
        out.push(`${pad}${yamlKey(key)}:`, ...nested);
    }
    return out;
}

function yamlKey(key: string): string {
    return /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(key) ? key : JSON.stringify(key);
}

/**
 * The one-line form of a value, or null when it needs lines of its own.
 *
 * `MetaBlocks` deliberately returns null here and is reported by the caller
 * rather than serialized. This is decision D5(b) of the conversion tracker
 * (markup-carve/carve#1210): block content inside metadata has no honest YAML
 * string form - flattening `abstract: |` to one scalar throws away the
 * paragraph structure, and writing Carve source into a YAML value makes the
 * frontmatter carry markup that nothing on the reading side parses. The warn is
 * the honest outcome, and it is policy, not an omission.
 */
function scalarToYaml(value: PandocNode): string | null {
    switch (value.t) {
        case 'MetaString':
            return yamlScalar(String(value.c));
        case 'MetaBool':
            return value.c ? 'true' : 'false';
        case 'MetaInlines':
            return yamlScalar(stringify(value.c as PandocNode[]));
        case 'MetaList': {
            const items = (value.c as PandocNode[]).map(scalarToYaml);
            if (items.some((x) => x === null)) return null;
            return `[${items.join(', ')}]`;
        }
        case 'MetaMap':
            // An empty map has no block form - `key:` with nothing under it
            // reads back as an empty value, not an empty map - so it takes the
            // flow spelling. A populated one needs lines of its own.
            return Object.keys(value.c as Record<string, PandocNode>).length ? null : '{}';
        default:
            return null;
    }
}

function nestedToYaml(ctx: Ctx, value: PandocNode, depth: number, key: string): string[] | null {
    if (value.t === 'MetaMap') {
        const lines = mappingToYaml(ctx, value.c as Record<string, PandocNode>, depth);
        return lines.length ? lines : null;
    }
    if (value.t === 'MetaList') return listToYaml(ctx, value.c as PandocNode[], depth, key);
    return null;
}

function listToYaml(ctx: Ctx, items: PandocNode[], depth: number, key: string): string[] | null {
    const pad = '  '.repeat(depth);
    const out: string[] = [];
    for (const item of items) {
        const inline = scalarToYaml(item);
        if (inline !== null) {
            out.push(`${pad}- ${inline}`);
            continue;
        }
        const nested = nestedToYaml(ctx, item, depth + 1, key);
        if (nested === null) {
            warn(ctx, `meta: an item of "${key}" (${item.t}) has no YAML form - skipped`);
            continue;
        }
        // `- ` replaces the first two spaces of the child's own indent, so the
        // keys after it stay aligned under the first one.
        out.push(`${pad}- ${nested[0]!.slice(pad.length + 2)}`, ...nested.slice(1));
    }
    return out.length ? out : null;
}

// --- Entry point ---

export function pandocToCarve(doc: PandocDoc): ReverseResult {
    const ctx: Ctx = {
        warnings: [],
        footnoteDefs: {},
        noteCounter: 0,
        abbrevDefs: new Map(),
        bibliographyWarned: false,
        quotedWarned: false,
    };
    const children = blocks(ctx, doc.blocks);
    if (containsShortCaption(children)) {
        warn(ctx, 'short caption: preserved in the Carve AST; Carve 0.1 source has no spelling for it');
    }
    for (const [abbr, expansion] of [...ctx.abbrevDefs].reverse()) {
        children.unshift({ type: 'abbreviation_def', abbr, expansion });
    }
    const ast: CNode & { children: CNode[] } = { type: 'document', children };
    if (Object.keys(ctx.footnoteDefs).length) ast.footnoteDefs = ctx.footnoteDefs;
    const yaml = metaToYaml(ctx, doc.meta ?? {});
    if (yaml) ast.frontmatter = { format: 'yaml', content: yaml };
    return { ast, warnings: ctx.warnings };
}

function containsShortCaption(value: unknown): boolean {
    if (Array.isArray(value)) return value.some(containsShortCaption);
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.shortCaption) && record.shortCaption.length > 0) return true;
    return Object.values(record).some(containsShortCaption);
}
