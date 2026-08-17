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

import { parse as parseCarve, renderCarve } from '@markup-carve/carve';
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
    ast: CNode;
    warnings: string[];
}

interface Ctx {
    warnings: string[];
    footnoteDefs: Record<string, CNode[]>;
    /**
     * Where this tree is headed, which is the difference between a field the
     * consumer keeps and a field the source writer is about to drop.
     *
     * `pandocToCarveAst` hands the exchange AST on whole, so an interchange-only
     * field like `rowGroups` survives and nothing has to be traded for it.
     * `pandocToCarve` runs the same tree through `renderCarve`, where PART 9
     * §16's pipe table spells a leading run of header rows and nothing else. A
     * shape worth choosing on one path is therefore a REGRESSION on the other,
     * and the one place that bites is row-head columns: on the source path a
     * `::: list-table {header-cols=N}` keeps them, and on the AST path it would
     * throw away the foot and body partition that `rowGroups` was holding fine.
     */
    target: 'source' | 'ast';
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

/**
 * Attrs for two Pandoc nodes that collapse into ONE Carve node: `outer` wins
 * per field (it was the referenceable one), classes union, key/values merge
 * with the outer taking precedence. `order` is recomputed from what survived.
 */
function mergeCAttrs(inner: CAttrs | undefined, outer: CAttrs | undefined): CAttrs | undefined {
    const id = outer?.id ?? inner?.id;
    const classes = [...(inner?.classes ?? []), ...(outer?.classes ?? [])].filter(
        (c, i, all) => all.indexOf(c) === i,
    );
    const keyValues = { ...(inner?.keyValues ?? {}), ...(outer?.keyValues ?? {}) };
    const out: CAttrs = {};
    const order: string[] = [];
    if (id) {
        out.id = id;
        order.push('#id');
    }
    if (classes.length) {
        out.classes = classes;
        order.push('.class');
    }
    if (Object.keys(keyValues).length) {
        out.keyValues = keyValues;
        order.push('key');
    }
    if (!order.length) return undefined;
    out.order = order;
    return out;
}

const text = (value: string): CNode => ({ type: 'text', value });

/** Glyph and authored source of each quote mark, keyed by its resolved kind. */
const QUOTE_MARKS: Record<string, { value: string; glyph: string }> = {
    left_double_quote: { value: '"', glyph: '“' },
    right_double_quote: { value: '"', glyph: '”' },
    left_single_quote: { value: "'", glyph: '‘' },
    right_single_quote: { value: "'", glyph: '’' },
};

/**
 * One resolved quote mark.
 *
 * `value` is what an author typed and what `renderCarve` writes, so the source
 * carries a plain `"`; `glyph` is what the parser resolved it to, so a consumer
 * reading the AST alone still gets the curly character. Both fields are what
 * the engine's own parse of `"` produces, which is what makes the emitted
 * source re-parse to an identical node.
 */
function quoteMark(kind: keyof typeof QUOTE_MARKS | string): CNode {
    const mark = QUOTE_MARKS[kind]!;
    return { type: 'smart_punctuation', kind, value: mark.value, glyph: mark.glyph };
}

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
            // The two QUOTE MARKS, as the nodes Carve's own parser produces for
            // them - not the literal glyphs this used to write.
            //
            // The old form was a genuine one-way loss, and the note explaining
            // it was wrong about why: Carve does have a node here. `"` and `'`
            // resolve to `smart_punctuation` carrying the KIND
            // (`left_double_quote` ... ), which is what `pairQuotes` on the way
            // back reads to rebuild pandoc's wrapping `Quoted`. Writing the
            // glyph instead threw that kind away - a literal `“` in the source
            // is ordinary text to the parser, so the quotation came back as
            // `Str "“alpha”"`.
            //
            // It is also unambiguous, which is what makes it safe: the writer
            // ESCAPES a quote character that is ordinary text (`it\'s`,
            // `\"x\"`), so an unescaped mark in the emitted source is always
            // one the bridge put there.
            const [kind, xs] = c as [PandocNode, PandocNode[]];
            const single = kind.t === 'SingleQuote';
            return [
                quoteMark(single ? 'left_single_quote' : 'left_double_quote'),
                ...inlines(ctx, xs),
                quoteMark(single ? 'right_single_quote' : 'right_double_quote'),
            ];
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
        const node: CNode = { type: 'autolink', href, text: stringify(xs) };
        // `uri`/`email` is the class the forward direction SYNTHESIZES to say
        // what kind of link this is, so it is not the author's and does not
        // come back. Anything else on the Attr is the author's - an autolink
        // takes a trailing attribute like any other inline - and used to be
        // dropped here without a word.
        const rest = fromAttr([a[0], classes.filter((c) => c !== 'uri' && c !== 'email'), a[2]]);
        if (rest) node.attrs = rest;
        return [node];
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

    // Pandoc's `Example` list is `(@)` numbering: ONE counter shared by every
    // example list in the document, and items can be labelled and referenced
    // from prose. PART 12 section 6 admits `a`/`A`/`i`/`I` and decimal, so the
    // list becomes an ordinary decimal one.
    //
    // What survives is the numbers: pandoc has already resolved the counter
    // into `start`, so a second example list arrives with `start: 3` and still
    // prints 3. What does not is the counter itself - editing the first list
    // no longer renumbers the second - and the marker, which becomes `1)`.
    // Pandoc always pairs `Example` with `TwoParens`, so this is the one and
    // only diagnostic for that shape; a `(1)` marker on any other style gets
    // its own below.
    if (style.t === 'Example') {
        warn(
            ctx,
            'ordered list: pandoc\'s example-list numbering `(@)` has no Carve form '
            + '- emitted as a decimal list. The resolved numbers are kept, the '
            + 'document-wide counter is not, so the lists no longer renumber '
            + 'each other',
        );
    } else if (delim?.t === 'TwoParens') {
        // `(1)` has no Carve spelling either - section 6 has `.` and `)` - so
        // the closing paren is kept and the opening one goes. Reported because
        // the marker the author chose is not the marker that comes out.
        warn(
            ctx,
            'ordered list: the `(1)` marker has no Carve form - emitted as `1)`, '
            + 'without the opening parenthesis',
        );
    }
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

    // Carve spells COLUMN alignment on the header cell marker (`|=>Name|`), so
    // a table with no LEADING header row has nowhere to put it - and pandoc's
    // grid tables are allowed to be headerless while still carrying alignment.
    // The alignment is written onto every cell of the column instead, which
    // renders the same and is the only slot left, and the move is reported
    // because the column-level fact becomes a per-cell one.
    //
    // Only pandoc's `TableHead` counts. A body's INTERMEDIATE header row is a
    // `|=` row in the middle of the table, and the engine reads that as a row
    // header (`<th scope="row">`) whose alignment applies to itself alone -
    // measured, not assumed. Counting it here would leave the surrounding body
    // cells unaligned and suppress the diagnostic that says so.
    const hasHeaderRow = headRaw.length > 0;

    // The flat `rows` Carve carries, plus the counts that say where pandoc's
    // sections were. A body's intermediate header rows are header rows too,
    // which is why §15 states the head count instead of deriving it from the
    // leading run.
    const allRaw: [Attr, unknown[][]][] = [...headRaw];
    const isHeaderRow: boolean[] = headRaw.map(() => true);
    // How many LEADING cells of each row are row headers.
    //
    // This is pandoc's `RowHeadColumns`, and the pipe table spells it directly:
    // a body row opening `|= Mercury |` is a row header, `<th scope="row">`,
    // measured on the engine. It used to be treated as unspellable, so such a
    // table left the pipe form for a `::: list-table {header-cols=N}` - more
    // markup, an extension the reader has to enable, and one number for the
    // whole table where the cells can each say it. Marking the cells keeps the
    // readable form and round-trips, because the forward direction derives the
    // count back from exactly this run.
    const rowHeadCols: number[] = headRaw.map(() => 0);
    const groupBodies: RowGroupBody[] = [];
    for (const body of tbodies) {
        const bodyHead = body[2] as [Attr, unknown[][]][];
        const bodyRows = body[3] as [Attr, unknown[][]][];
        allRaw.push(...bodyHead, ...bodyRows);
        isHeaderRow.push(...bodyHead.map(() => true), ...bodyRows.map(() => false));
        const heads = typeof body[1] === 'number' && body[1] > 0 ? body[1] : 0;
        rowHeadCols.push(...bodyHead.map(() => 0), ...bodyRows.map(() => heads));
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
    rowHeadCols.push(...footRaw.map(() => 0));

    // Occupancy grid: pending[r][c] = continuation marker owed at that position.
    // Decided BEFORE the grid walk: the pipe path flattens as it goes and warns
    // while doing it, and that warning is wrong for a table that is about to be
    // emitted as a list-table instead.
    const hasBlockCells = allRaw.some((row) =>
        row[1].some((raw) => {
            const cellBlocks = (raw as [Attr, PandocNode, number, number, PandocNode[]])[4];
            return Array.isArray(cellBlocks) && !isInlineShaped(cellBlocks);
        }));
    // Row-head columns no longer send a table to the list-table form: the pipe
    // table marks those cells directly (see `rowHeadCols` above), which is
    // readable, needs no extension, and round-trips. Block cells remain the one
    // reason to leave, because a Carve `table_cell` holds INLINES and there is
    // no pipe form for a cell holding blocks at all.
    const useListTable = hasBlockCells;

    const pending: ('rowspan' | undefined)[][] = allRaw.map(() => Array<'rowspan' | undefined>(nCols));
    const rows: CNode[] = [];
    // The pandoc blocks that sat at each grid position, kept alongside the
    // inline-flattened cells so the list-table fallback below can convert them
    // as blocks without walking the occupancy grid a second time.
    const cellBlocksAt: (PandocNode[] | undefined)[][] = allRaw.map(() => []);

    for (let r = 0; r < allRaw.length; r++) {
        // A row is header cells throughout when it is a header ROW, and for its
        // leading run when the body declared row-head columns.
        const headTo = isHeaderRow[r] === true ? nCols : (rowHeadCols[r] ?? 0);
        const cells: CNode[] = [];
        const rawCells = allRaw[r]![1];
        let rawIdx = 0;
        for (let col = 0; col < nCols; col++) {
            if (pending[r]![col]) {
                cells.push({ type: 'table_cell', header: col < headTo, children: [], span: 'rowspan' });
                continue;
            }
            const raw = rawCells[rawIdx++] as [Attr, PandocNode, number, number, PandocNode[]] | undefined;
            if (!raw) {
                cells.push({ type: 'table_cell', header: col < headTo, children: [] });
                continue;
            }
            const [cellAttr, cellAlign, rowSpan, colSpan, cellBlocks] = raw;
            cellBlocksAt[r]![col] = cellBlocks;
            const cell: CNode = {
                type: 'table_cell',
                header: col < headTo,
                children: useListTable ? [] : cellInlines(ctx, cellBlocks),
            };
            // The column's alignment is carried by a HEADER ROW's cells, or by
            // every cell when there is no header row. A row-head cell is not a
            // header row, so it does not carry the column - its own marker
            // aligns itself alone, which is what the engine does.
            const align = ALIGN_BACK[cellAlign.t]
                ?? (isHeaderRow[r] === true || !hasHeaderRow ? colAligns[col] : '');
            if (align) cell.align = align;
            const cellAttrs = fromAttr(cellAttr);
            if (cellAttrs) cell.attrs = cellAttrs;
            cells.push(cell);
            for (let j = 1; j < colSpan && col + j < nCols; j++) {
                cells.push({ type: 'table_cell', header: col + j < headTo, children: [], span: 'colspan' });
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

    if (useListTable) {
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
            reason: hasBlockCells ? 'block-cells' : 'row-head-columns',
        });
    }

    if (!hasHeaderRow && colAligns.some((a) => a)) {
        warn(
            ctx,
            'table: column alignment on a table with no header row is written on '
            + 'each cell instead - Carve spells column alignment on the header '
            + 'marker (`|=> Name |`), and there is no header to carry it',
        );
    }

    const node: CNode = { type: 'table', rows };
    // The counts come from the same arrays `rows` was built from, one row
    // pushed per raw row, so §15's sum holds by construction here. It is
    // checked where it can actually fail instead: on a partition that arrived
    // from outside (see readRowGroups).
    const groups: RowGroups = { headRows: headRaw.length, bodies: groupBodies, footRows: footRaw.length };
    if (carriesMoreThanFlatRows(groups)) {
        node.rowGroups = groups;
        reportUnspellableGroups(ctx, groups);
    }
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
 * What a `rowGroups` partition says that the PIPE form cannot say back.
 *
 * The partition itself is not a degradation - it reaches the exchange AST
 * intact, and `pandocToCarveAst` hands it on whole. The loss happens one step
 * later, in the source writer: PART 9 §16's pipe table spells a leading run of
 * header rows and nothing else, so a foot, a second body group, a body's own
 * intermediate header rows, its row-head columns and its attributes all come
 * out as ordinary body rows. PART 12 §15 says so in as many words and asks for
 * exactly this - "a canonical Carve writer loses it ... conversion APIs with
 * diagnostics should report that loss".
 *
 * The wording follows the `shortCaption` precedent: it names where the value
 * DOES survive, because on the `pandocToCarveAst` path nothing is lost at all
 * and a bare "dropped" would be false there. The list-table path reports the
 * same facts in its own vocabulary; this is the pipe path's half of it, which
 * was silent.
 */
function reportUnspellableGroups(ctx: Ctx, groups: RowGroups): void {
    const lost: string[] = [];
    if (groups.footRows > 0) lost.push(`a foot of ${groups.footRows} row(s)`);
    if (groups.bodies.length > 1) lost.push(`${groups.bodies.length} body groups`);
    if (groups.bodies.some((b) => b.headRows > 0)) lost.push("a body's intermediate header rows");
    if (groups.bodies.some((b) => (b.rowHeadColumns ?? 0) > 0)) lost.push('row-head columns');
    if (groups.bodies.some((b) => b.attrs !== undefined)) lost.push("a body group's attributes");
    if (!lost.length) return;
    warn(
        ctx,
        `table: ${lost.join(', ')} - preserved in the Carve AST as \`rowGroups\`, `
        + 'but a pipe table spells only a leading run of header rows, so the '
        + 'emitted source flattens them into body rows',
    );
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
    /** Why the pipe form was left, which is what the opening diagnostic says. */
    reason: 'block-cells' | 'row-head-columns';
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
    const { rows, cellBlocksAt, headRows, footRows, bodies, caption, attrs, colAligns, reason } = input;
    warn(
        ctx,
        reason === 'block-cells'
            ? 'table: a cell holds block content, which a pipe table cannot spell - emitted as a `::: list-table` (structure preserved)'
            : 'table: row-head columns, which a pipe table cannot spell - emitted as a `::: list-table` with `header-cols` (structure preserved)',
    );

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
    // A body with NO row-head columns disagrees with one that has them, and it
    // is the common way they disagree - so the zeros count here. Leaving them
    // out made the one case that CHANGES the markup the one case that said
    // nothing: `header-cols` applies to every row, so the bodies that had none
    // come back with row headers they never had.
    if (new Set(bodies.map((b) => b.rowHeadColumns ?? 0)).size > 1) {
        warn(ctx, 'list-table: the body groups disagree on their row-head column count - `header-cols` is one number for the whole table, so the first non-zero count is applied to every row, and the rows that had none gain row headers');
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
 * The pandoc blocks a `figure` can wrap, which is `figure.target`'s own list in
 * `resources/ast-schema.json`: an image, a quote, a table, a code block, a
 * paragraph (a display-math figure is the paragraph case). Anything else has no
 * `figure` to become and is unwrapped below.
 *
 * This used to be PANEL_HOSTS and was consulted only for a §4c panel, because
 * outside a group a captioned quote was rerouted to a quote carrying an
 * attribution and every other single-block Figure fell to the unwrap. With
 * §4a withdrawn (carve#1213) a captioned host is a `figure` wherever it sits,
 * so the list is not panel-specific and there is no `asPanel` reading left.
 */
const FIGURE_HOSTS = new Set(['Plain', 'Para', 'BlockQuote', 'Table', 'CodeBlock']);

function figure(ctx: Ctx, c: never): CNode[] {
    const [a, capt, body] = c as [Attr, [unknown, PandocNode[]], PandocNode[]];
    const caption = captionFromBlocks(ctx, capt[1]);
    const shortCaption = captionFromInlines(ctx, capt[0] as PandocNode[] | null);
    const single = body.length === 1 ? body[0]! : undefined;

    if (single?.t === 'Plain' || single?.t === 'Para') {
        const xs = single.c as PandocNode[];
        if (xs.length === 1 && xs[0]!.t === 'Image') {
            const [img] = inline(ctx, xs[0]!);
            const node: CNode = { type: 'figure', target: img };
            if (caption) node.caption = caption;
            if (shortCaption) node.shortCaption = shortCaption;
            const attrs = fromAttr(a);
            if (attrs) node.attrs = attrs;
            return [node];
        }
    }
    if (single?.t === 'Table') {
        // The wrapper and the Table collapse into ONE Carve node, so their
        // attrs merge rather than the inner one silently winning: pandoc's
        // readers put the label on the Figure, not on the Table it wraps, and
        // dropping it took the id a `</#id>` resolves against with it. The
        // outer id wins, classes union, key/values merge with the outer taking
        // precedence.
        //
        // A table is the only host that collapses this way, because it is the
        // only one Carve gives a caption of its own. Every other host keeps
        // both nodes - the wrapper stays a `figure` and the host's own attrs
        // ride on the target - which is what the Div arm below sorts out.
        //
        // It matters most for a §4c table PANEL, whose id is what resolves as
        // the group's number plus a letter.
        const node = table(ctx, single.c as never, caption, shortCaption);
        const outer = fromAttr(a);
        if (outer) node.attrs = mergeCAttrs(node.attrs as CAttrs | undefined, outer);
        return [node];
    }
    // A HOST THAT CARRIES ITS OWN ATTRIBUTES ARRIVES INSIDE A DIV. Pandoc's
    // BlockQuote, Para and CodeBlock have no Attr slot, so `block()` in the
    // forward direction wraps an attributed one in a Div. A `div` is not a
    // legal `figure.target` - `resources/ast-schema.json` lists an image, a
    // quote, a table, a code block and a paragraph - so a Figure holding one
    // is that wrapper rather than an authored container, and the attributes
    // belong on the target. Roundtrip mode marks the wrapper with
    // `carve-block`; plain mode cannot, which is why the schema's own target
    // list is what decides here.
    let host = single;
    let hostAttrs: CAttrs | undefined;
    if (single?.t === 'Div') {
        const [divAttr, divBody] = single.c as [Attr, PandocNode[]];
        const only = divBody.length === 1 ? divBody[0]! : undefined;
        if (only && FIGURE_HOSTS.has(only.t)) {
            host = only;
            hostAttrs = fromAttr([
                divAttr[0],
                divAttr[1],
                divAttr[2].filter(([k]) => k !== 'carve-block'),
            ]);
        }
    }
    if (host && FIGURE_HOSTS.has(host.t)) {
        // A single-host `Figure` is an ordinary `figure` around that host -
        // the generic captioned wrapper of PART 9 §4b, which is what the
        // forward direction emits for a captioned quote, code listing or
        // display-math block alike. A group PANEL is the same shape and used
        // to be the only way in here.
        const [target] = block(ctx, host) as [CNode | undefined];
        if (target) {
            if (hostAttrs) {
                target.attrs = mergeCAttrs(target.attrs as CAttrs | undefined, hostAttrs);
            }
            const node: CNode = { type: 'figure', target };
            if (caption) node.caption = caption;
            if (shortCaption) node.shortCaption = shortCaption;
            const attrs = fromAttr(a);
            if (attrs) node.attrs = attrs;
            return [node];
        }
    }
    if (body.some((b) => b.t === 'Figure' || b.t === 'Table')) {
        // A Figure whose blocks are themselves Figures (or Tables) is pandoc's
        // SUBFIGURE shape, and PART 9 §4c has the node for it: a `figure_group`
        // whose direct `figure`/`table` children are the panels, with any other
        // block preserved in place between them. Before this arm it fell to the
        // unwrap below, which dropped the grouping entirely and turned the
        // group caption into a trailing paragraph.
        //
        // The single-block Figures above keep their existing mapping on
        // purpose - a lone captioned image or table is one figure, not a group
        // of one, and the reader has no way to tell a subfigure-shaped document
        // from that.
        const children = body.flatMap((b) =>
            b.t === 'Figure' ? figure(ctx, b.c as never) : block(ctx, b),
        );
        const node: CNode = { type: 'figure_group', children };
        if (caption) node.caption = caption;
        if (shortCaption) {
            // PART 12 §16: "NO `shortCaption`, NO legends, NO label fields" on
            // the group - whether it ever reaches there is carve#1118's design
            // space, and inventing the field here would put a property on the
            // wire that the schema rejects on ingest (§11).
            warn(
                ctx,
                'figure group: short caption dropped (a composite figure has no navigation-caption slot)',
            );
        }
        const attrs = fromAttr(a);
        if (attrs) node.attrs = attrs;
        return [node];
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
        if (value.t === 'MetaBlocks') {
            const body = blockScalarBody(ctx, value.c as PandocNode[], depth + 1);
            if (body === null) {
                warn(ctx, `meta: key "${key}" (MetaBlocks) is empty - skipped`);
                continue;
            }
            out.push(`${pad}${yamlKey(key)}: |`, ...body);
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
 * Block content in metadata as the lines UNDER a `key: |`.
 *
 * A YAML literal block scalar keeps every line and every blank line between
 * them, so the paragraph structure the value has is the paragraph structure it
 * arrives with - which is the objection that used to make this a skip. The
 * other half of that objection, that the markup inside "nothing on the reading
 * side parses", is answered by `parseMeta` reading the scalar back through the
 * same parser. Pandoc's markdown writer emits exactly this form for the same
 * value, and its reader turns exactly this form back into `MetaBlocks`.
 *
 * Written with the ENGINE's own serializer, so the value carries whatever
 * `carve fmt` guarantees and is not a second, ad-hoc Carve writer.
 */
function blockScalarBody(ctx: Ctx, pandocBlocks: PandocNode[], depth: number): string[] | null {
    const children = blocks(ctx, pandocBlocks ?? []);
    if (!children.length) return null;
    const source = renderCarve(
        { type: 'document', children } as unknown as Parameters<typeof renderCarve>[0],
    );
    const pad = '  '.repeat(depth);
    const body = source.replace(/\n+$/, '').split('\n');
    if (!body.length) return null;
    // A blank line inside the scalar stays EMPTY rather than padded: trailing
    // whitespace on an otherwise blank line is what a stricter YAML reader
    // complains about, and the indentation is set by the non-blank lines.
    return body.map((line) => (line === '' ? '' : pad + line));
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

export function pandocToCarve(doc: PandocDoc, target: 'source' | 'ast' = 'source'): ReverseResult {
    const ctx: Ctx = {
        warnings: [],
        footnoteDefs: {},
        target,
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
    const ast: CNode = { type: 'document', children };
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
