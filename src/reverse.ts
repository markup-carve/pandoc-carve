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
    noteCounter: number;
    /** abbr -> expansion, collected so renderCarve gets the `*[abbr]:` defs */
    abbrevDefs: Map<string, string>;
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
            const [kind, xs] = c as [PandocNode, PandocNode[]];
            const [open, close] = kind.t === 'SingleQuote' ? ['‘', '’'] : ['“', '”'];
            return mergeText([text(open), ...inlines(ctx, xs), text(close)]);
        }
        case 'Cite': {
            // Carve citations are a Tier-2 extension the default parser does
            // not produce, so keep the reader-preserved source text (fmt will
            // escape it to stay literal); rebuild from records when absent.
            warn(ctx, 'Cite degraded to literal citation text (Carve citations are an extension)');
            const [citations, xs] = c as [
                { citationId: string; citationMode: { t: string } }[],
                PandocNode[],
            ];
            if (xs?.length) return inlines(ctx, xs);
            const body = citations.map((cit) => `@${cit.citationId}`).join('; ');
            return [text(`[${body}]`)];
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
            // The DIV form, not the `line_block` node: this package pins a
            // published engine whose writer knows `{.line-block}` and throws on
            // `line_block` ("renderCarve: unknown block"). Both parse to the same
            // rendering, and the node form can replace this once the pin moves.
            return [{
                type: 'div',
                attrs: { classes: ['line-block'], order: ['.class'] },
                children,
            }];
        }
        case 'Header': {
            const [level, a, xs] = c as [number, Attr, PandocNode[]];
            const node: CNode = { type: 'heading', level, children: inlines(ctx, xs) };
            const attrs = fromAttr(a);
            if (attrs) node.attrs = attrs;
            return [node];
        }
        case 'BlockQuote': {
            const body = c as PandocNode[];
            const attribution = attributionFromBlocks(ctx, body);
            if (attribution) {
                return [
                    {
                        type: 'block_quote',
                        children: blocks(ctx, body.slice(0, -1)),
                        attribution,
                    },
                ];
            }
            return [{ type: 'block_quote', children: blocks(ctx, body) }];
        }
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

    const colAligns = colspecs.map((cs) => ALIGN_BACK[cs[0].t] ?? '');
    const nCols = colspecs.length;

    const headRaw = thead[1] as [Attr, unknown[][]][];
    const bodyRaw: [Attr, unknown[][]][] = [];
    for (const body of tbodies) {
        bodyRaw.push(...(body[2] as [Attr, unknown[][]][]));
        bodyRaw.push(...(body[3] as [Attr, unknown[][]][]));
    }
    bodyRaw.push(...(tfoot[1] as [Attr, unknown[][]][]));

    const allRaw = [...headRaw, ...bodyRaw];
    const headCount = headRaw.length;

    // Occupancy grid: pending[r][c] = continuation marker owed at that position.
    const pending: ('rowspan' | undefined)[][] = allRaw.map(() => Array<'rowspan' | undefined>(nCols));
    const rows: CNode[] = [];

    for (let r = 0; r < allRaw.length; r++) {
        const isHeader = r < headCount;
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
            const [, cellAlign, rowSpan, colSpan, cellBlocks] = raw;
            const cell: CNode = {
                type: 'table_cell',
                header: isHeader,
                children: cellInlines(ctx, cellBlocks),
            };
            const align = ALIGN_BACK[cellAlign.t] ?? (isHeader ? colAligns[col] : '');
            if (align) cell.align = align;
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
        rows.push({ type: 'table_row', cells });
    }

    const node: CNode = { type: 'table', rows };
    const attrs = fromAttr(a);
    if (attrs) node.attrs = attrs;
    const captionInlines = captionOverride ?? captionFromBlocks(ctx, capt[1]);
    if (captionInlines?.length) node.caption = captionInlines;
    const shortCaption = shortCaptionOverride
        ?? captionFromInlines(ctx, capt[0] as PandocNode[] | null);
    if (shortCaption?.length) node.shortCaption = shortCaption;
    return node;
}

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

/**
 * A quote's attribution, when the last block is a `Para`/`Plain` holding
 * exactly one Span whose whole Attr is the single class `attribution` - the
 * shape convert.ts emits for PART 9 §4a. A Span that ALSO carries an id, more
 * classes or key/values is someone's content and stays where it is; a foreign
 * document using the bare idiom reads back as the attribution it claims to be.
 */
function attributionFromBlocks(ctx: Ctx, body: PandocNode[]): CNode[] | null {
    const last = body[body.length - 1];
    if (!last || (last.t !== 'Para' && last.t !== 'Plain')) return null;
    const xs = last.c as PandocNode[];
    if (xs.length !== 1 || xs[0]!.t !== 'Span') return null;
    const [[id, classes, kvs], inner] = xs[0]!.c as [Attr, PandocNode[]];
    if (id !== '' || kvs.length !== 0 || classes.length !== 1 || classes[0] !== 'attribution') {
        return null;
    }
    return inlines(ctx, inner);
}

// --- Figures and divs ---

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
    if (single?.t === 'BlockQuote') {
        // PART 9 §4a: a captioned quote is a quote carrying an attribution,
        // not a figure. This branch also upgrades this bridge's own pre-§4a
        // output, which wrapped the quote in a Figure.
        const [bq] = block(ctx, single) as [CNode];
        if (caption) {
            if (Array.isArray(bq.attribution)) {
                // Both an inner attribution Span and an outer Figure caption:
                // the caption is the outer author's statement, the inner one
                // stays visible as an ordinary trailing paragraph.
                (bq.children as CNode[]).push({
                    type: 'paragraph',
                    children: bq.attribution as CNode[],
                });
            }
            bq.attribution = caption;
        }
        if (shortCaption) {
            warn(ctx, 'quote attribution: short caption dropped (a quote has no navigation-caption slot)');
        }
        const attrs = fromAttr(a);
        if (attrs) bq.attrs = attrs;
        return [bq];
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
    const lines: string[] = [];
    for (const [key, value] of Object.entries(meta)) {
        const rendered = metaValueToYaml(value);
        if (rendered === null) {
            warn(ctx, `meta: key "${key}" (${value.t}) not representable in flat frontmatter - skipped`);
            continue;
        }
        lines.push(`${key}: ${rendered}`);
    }
    return lines.join('\n');
}

function yamlScalar(s: string): string {
    if (/^[A-Za-z0-9][A-Za-z0-9 ._\/-]*$/.test(s)) return s;
    return JSON.stringify(s);
}

function metaValueToYaml(value: PandocNode): string | null {
    switch (value.t) {
        case 'MetaString':
            return yamlScalar(String(value.c));
        case 'MetaBool':
            return value.c ? 'true' : 'false';
        case 'MetaInlines':
            return yamlScalar(stringify(value.c as PandocNode[]));
        case 'MetaList': {
            const items = (value.c as PandocNode[]).map(metaValueToYaml);
            if (items.some((x) => x === null)) return null;
            return `[${items.join(', ')}]`;
        }
        default:
            return null;
    }
}

// --- Entry point ---

export function pandocToCarve(doc: PandocDoc): ReverseResult {
    const ctx: Ctx = { warnings: [], footnoteDefs: {}, noteCounter: 0, abbrevDefs: new Map() };
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
