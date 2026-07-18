/**
 * Carve AST -> Pandoc JSON AST.
 *
 * Walks the AST produced by `@markup-carve/carve`'s `parse()` and emits a
 * Pandoc document (api-version 1.23.1). Anything that cannot be mapped
 * faithfully degrades to a classed Span/Div and reports a warning - nothing
 * degrades silently.
 */

import * as P from './pandoc.js';

// The Carve AST is plain data; we type the parts we read.
interface CNode {
    type: string;
    [key: string]: unknown;
}

interface CAttrs {
    id?: string;
    classes?: string[];
    keyValues?: Record<string, string>;
}

export interface ConvertResult {
    doc: P.PandocDoc;
    warnings: string[];
}

export interface ConvertOptions {
    /**
     * Stamp attr-wrapper Divs with a `carve-block` key-value marker so the
     * reverse direction can restore the attrs onto the inner block. Off by
     * default: the marker would otherwise leak into pandoc writer output
     * (e.g. `carve-block="paragraph"` on an HTML div).
     */
    roundtrip?: boolean;
}

interface Ctx {
    warnings: string[];
    footnoteDefs: Record<string, CNode[]>;
    /** heading id (explicit or slugged) -> heading inline children */
    headings: Map<string, CNode[]>;
    /** true while emitting blocks of a tight list item */
    tight: boolean;
    roundtrip: boolean;
}

function warn(ctx: Ctx, msg: string): void {
    ctx.warnings.push(msg);
}

function toAttr(attrs: unknown): P.Attr {
    const a = (attrs ?? {}) as CAttrs;
    const kvs = Object.entries(a.keyValues ?? {});
    return P.attr(a.id, a.classes, kvs);
}

/** Carve's heading slug: case-preserving, GitHub-style. */
function slugify(text: string): string {
    return text
        .trim()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s+/g, '-');
}

function plainText(nodes: CNode[]): string {
    let out = '';
    for (const n of nodes) {
        if (typeof n.value === 'string') out += n.value;
        else if (Array.isArray(n.children)) out += plainText(n.children as CNode[]);
    }
    return out;
}

/** Split text into Str/Space the way pandoc readers do. */
function textInlines(value: string): P.Inline[] {
    const out: P.Inline[] = [];
    const parts = value.split(/( +)/);
    for (const part of parts) {
        if (part === '') continue;
        if (/^ +$/.test(part)) out.push(P.Space);
        else out.push(P.Str(part));
    }
    return out;
}

// --- Inlines ---

function inlines(ctx: Ctx, nodes: CNode[] | undefined): P.Inline[] {
    if (!nodes) return [];
    const out: P.Inline[] = [];
    for (const n of nodes) out.push(...inline(ctx, n));
    return out;
}

function kids(ctx: Ctx, n: CNode): P.Inline[] {
    return inlines(ctx, n.children as CNode[] | undefined);
}

function inline(ctx: Ctx, n: CNode): P.Inline[] {
    switch (n.type) {
        case 'text':
            return textInlines(String(n.value ?? ''));
        case 'soft-break':
            return [P.SoftBreak];
        case 'hard-break':
            return [P.LineBreak];
        case 'italic':
            return [P.Emph(kids(ctx, n))];
        case 'strong':
            return [P.Strong(kids(ctx, n))];
        case 'bold-italic':
            return [P.Strong([P.Emph(kids(ctx, n))])];
        case 'underline':
            return [P.Underline(kids(ctx, n))];
        case 'strike':
            return [P.Strikeout(kids(ctx, n))];
        case 'highlight':
            return [P.Span(P.attr(undefined, ['mark']), kids(ctx, n))];
        case 'sub':
            return [P.Subscript(kids(ctx, n))];
        case 'super':
            return [P.Superscript(kids(ctx, n))];
        case 'code':
            return [P.Code(toAttr(n.attrs), String(n.value ?? ''))];
        case 'link':
            return [
                P.Link(toAttr(n.attrs), kids(ctx, n), [
                    String(n.href ?? ''),
                    String(n.title ?? ''),
                ]),
            ];
        case 'autolink': {
            const href = String(n.href ?? '');
            const cls = href.startsWith('mailto:') ? 'email' : 'uri';
            return [P.Link(P.attr(undefined, [cls]), [P.Str(String(n.text ?? href))], [href, ''])];
        }
        case 'image':
            return [
                P.Image(toAttr(n.attrs), textInlines(String(n.alt ?? '')), [
                    String(n.src ?? ''),
                    String(n.title ?? ''),
                ]),
            ];
        case 'crossref': {
            const target = String(n.target ?? '');
            const found =
                ctx.headings.get(target) ??
                ctx.headings.get(target.toLowerCase()) ??
                findCaseInsensitive(ctx.headings, target);
            if (found) {
                return [P.Link(P.attr(undefined, ['crossref']), inlines(ctx, found), [`#${target}`, ''])];
            }
            warn(ctx, `crossref: unresolved target "${target}" - emitting target text`);
            return [P.Link(P.attr(undefined, ['crossref', 'unresolved']), [P.Str(target)], [`#${target}`, ''])];
        }
        case 'footnote': {
            if (Array.isArray(n.inline)) {
                return [P.Note([P.Para(inlines(ctx, n.inline as CNode[]))])];
            }
            const id = String(n.id ?? '');
            const def = ctx.footnoteDefs[id];
            if (!def) {
                warn(ctx, `footnote: missing definition for [^${id}]`);
                return [P.Superscript([P.Str(id)])];
            }
            return [P.Note(blocks(ctx, def))];
        }
        case 'math':
            return [
                n.display
                    ? P.MathDisplay(String(n.content ?? ''))
                    : P.MathInline(String(n.content ?? '')),
            ];
        case 'raw-inline':
            return [P.RawInline(String(n.format ?? ''), String(n.content ?? ''))];
        case 'mention': {
            const user = String(n.user ?? '');
            return [P.Span(P.attr(undefined, ['mention'], [['data-user', user]]), [P.Str(`@${user}`)])];
        }
        case 'tag': {
            const name = String(n.name ?? '');
            return [P.Span(P.attr(undefined, ['tag'], [['data-tag', name]]), [P.Str(`#${name}`)])];
        }
        case 'symbol': {
            const name = String(n.name ?? '');
            warn(ctx, `symbol: :${name}: has no renderer map here - emitting literal source form`);
            return [P.Span(P.attr(undefined, ['symbol'], [['data-symbol', name]]), [P.Str(`:${name}:`)])];
        }
        case 'abbreviation': {
            const abbr = String(n.abbr ?? '');
            const expansion = String(n.expansion ?? '');
            return [P.Span(P.attr(undefined, ['abbr'], [['title', expansion]]), [P.Str(abbr)])];
        }
        case 'extension': {
            const name = String(n.name ?? '');
            const content = Array.isArray(n.content)
                ? inlines(ctx, n.content as CNode[])
                : textInlines(String(n.content ?? ''));
            warn(ctx, `extension: :${name}[..] degraded to a Span with class "ext-${name}"`);
            return [P.Span(P.attr(undefined, [`ext-${name}`]), content)];
        }
        case 'span':
            return [P.Span(toAttr(n.attrs), kids(ctx, n))];
        case 'critic-insert':
            return [P.Span(P.attr(undefined, ['insertion']), kids(ctx, n))];
        case 'critic-delete':
            return [P.Span(P.attr(undefined, ['deletion']), kids(ctx, n))];
        case 'critic-substitute': {
            const oldText = textInlines(String(n.oldText ?? ''));
            const newText = textInlines(String(n.newText ?? ''));
            return [
                P.Span(P.attr(undefined, ['substitution']), [
                    P.Span(P.attr(undefined, ['deletion']), oldText),
                    P.Str('→'),
                    P.Span(P.attr(undefined, ['insertion']), newText),
                ]),
            ];
        }
        case 'critic-comment':
            return [P.Span(P.attr(undefined, ['comment-annotation']), textInlines(String(n.text ?? '')))];
        case 'comment':
            return [];
        default:
            warn(ctx, `inline: unknown node type "${n.type}" degraded to its text content`);
            return textInlines(plainText([n]));
    }
}

function findCaseInsensitive(map: Map<string, CNode[]>, target: string): CNode[] | undefined {
    const lower = target.toLowerCase();
    for (const [k, v] of map) {
        if (k.toLowerCase() === lower) return v;
    }
    return undefined;
}

// --- Blocks ---

function blocks(ctx: Ctx, nodes: CNode[] | undefined): P.Block[] {
    if (!nodes) return [];
    const out: P.Block[] = [];
    for (const n of nodes) out.push(...block(ctx, n));
    return out;
}

/** Block types whose Pandoc form carries the Attr itself. */
const ATTR_CARRYING = new Set(['heading', 'code-block', 'table', 'figure', 'div', 'admonition']);

function block(ctx: Ctx, n: CNode): P.Block[] {
    const result = blockInner(ctx, n);
    // A block-attribute line can attach attrs to ANY block. Pandoc's Para,
    // BlockQuote, lists etc. have no Attr slot - preserve via a Div wrapper.
    const a = n.attrs as CAttrs | undefined;
    if (
        !ATTR_CARRYING.has(n.type) &&
        a &&
        (a.id || a.classes?.length || Object.keys(a.keyValues ?? {}).length)
    ) {
        // In roundtrip mode the carve-block marker lets the reverse direction
        // restore the attrs onto the inner block instead of keeping a wrapper.
        const [id, classes, kvs] = toAttr(a);
        const marked: [string, string][] = ctx.roundtrip
            ? [...kvs, ['carve-block', n.type]]
            : kvs;
        return [P.Div([id, classes, marked], result)];
    }
    return result;
}

function blockInner(ctx: Ctx, n: CNode): P.Block[] {
    switch (n.type) {
        case 'paragraph': {
            const xs = kids(ctx, n);
            return [ctx.tight ? P.Plain(xs) : P.Para(xs)];
        }
        case 'heading':
            return [P.Header(Number(n.level ?? 1), toAttr(n.attrs), kids(ctx, n))];
        case 'blockquote':
            return [P.BlockQuote(untight(ctx, () => blocks(ctx, n.children as CNode[])))];
        case 'code-block': {
            const lang = n.lang ? [String(n.lang)] : [];
            const a = (n.attrs ?? {}) as CAttrs;
            const kvs = Object.entries(a.keyValues ?? {});
            return [
                P.CodeBlock(P.attr(a.id, [...lang, ...(a.classes ?? [])], kvs), String(n.content ?? '')),
            ];
        }
        case 'raw-block':
            return [P.RawBlock(String(n.format ?? ''), String(n.content ?? ''))];
        case 'thematic-break':
            return [P.HorizontalRule];
        case 'list':
            return [list(ctx, n)];
        case 'definition-list':
            return [definitionList(ctx, n)];
        case 'table':
            return [table(ctx, n, null)];
        case 'figure':
            return figure(ctx, n);
        case 'admonition': {
            const kind = String(n.kind ?? 'note');
            const title = Array.isArray(n.title)
                ? [P.Para([P.Strong(inlines(ctx, n.title as CNode[]))])]
                : [];
            const body = untight(ctx, () => blocks(ctx, n.children as CNode[]));
            const [id, classes, kvs] = toAttr(n.attrs);
            return [P.Div([id, ['admonition', kind, ...classes], kvs], [...title, ...body])];
        }
        case 'div':
            return [P.Div(toAttr(n.attrs), untight(ctx, () => blocks(ctx, n.children as CNode[])))];
        case 'comment':
        case 'abbreviation-def':
            return [];
        default: {
            // An inline node at block level (defensive) or an unknown block.
            warn(ctx, `block: unknown node type "${n.type}" degraded to a paragraph of its text`);
            return [P.Para(textInlines(plainText([n])))];
        }
    }
}

function untight<T>(ctx: Ctx, fn: () => T): T {
    const prev = ctx.tight;
    ctx.tight = false;
    const result = fn();
    ctx.tight = prev;
    return result;
}

// --- Lists ---

const OL_TYPE: Record<string, P.ListNumberStyle> = {
    a: 'LowerAlpha',
    A: 'UpperAlpha',
    i: 'LowerRoman',
    I: 'UpperRoman',
};

function list(ctx: Ctx, n: CNode): P.Block {
    const tight = Boolean(n.tight);
    const items = (n.items as CNode[] | undefined) ?? [];
    const converted: P.Block[][] = items.map((item) => {
        const prev = ctx.tight;
        ctx.tight = tight;
        let itemBlocks = blocks(ctx, item.children as CNode[]);
        ctx.tight = prev;
        if (typeof item.checked === 'boolean') {
            itemBlocks = prefixTaskMarker(itemBlocks, item.checked);
        }
        return itemBlocks;
    });
    if (n.ordered) {
        const style = OL_TYPE[String(n.olType ?? '')] ?? 'Decimal';
        return P.OrderedList(Number(n.start ?? 1), style, converted);
    }
    return P.BulletList(converted);
}

/** GFM-style task markers: pandoc renders `- [x]` as a leading ballot-box Str. */
function prefixTaskMarker(itemBlocks: P.Block[], checked: boolean): P.Block[] {
    const marker = [P.Str(checked ? '☒' : '☐'), P.Space];
    const first = itemBlocks[0];
    if (first && (first.t === 'Plain' || first.t === 'Para')) {
        return [
            { t: first.t, c: [...marker, ...(first.c as P.Inline[])] },
            ...itemBlocks.slice(1),
        ];
    }
    return [P.Plain(marker), ...itemBlocks];
}

function definitionList(ctx: Ctx, n: CNode): P.Block {
    const items = (n.items as { terms?: CNode[][]; definitions?: CNode[][][] }[] | undefined) ?? [];
    const converted: [P.Inline[], P.Block[][]][] = items.map((item) => {
        const termLists = (item.terms ?? []).map((t) => inlines(ctx, t as unknown as CNode[]));
        // Pandoc has one term per item; multiple Carve terms join with LineBreak.
        const term = termLists.length
            ? termLists.reduce((acc, t) => (acc.length ? [...acc, P.LineBreak, ...t] : t), [] as P.Inline[])
            : [];
        const defs = (item.definitions ?? []).map((d) =>
            untight(ctx, () => blocks(ctx, d as unknown as CNode[])),
        );
        return [term, defs];
    });
    return P.DefinitionList(converted);
}

// --- Tables (span inversion) ---

interface CCell {
    header?: boolean;
    align?: string;
    span?: 'colspan' | 'rowspan';
    children?: CNode[];
}

const ALIGN: Record<string, P.Alignment> = {
    left: 'AlignLeft',
    right: 'AlignRight',
    center: 'AlignCenter',
};

/**
 * Convert a Carve table.
 *
 * Carve marks *continuation* cells (`span: "colspan" | "rowspan"` on the cell
 * that is covered); pandoc puts rowSpan/colSpan counts on the origin Cell and
 * omits covered positions. We walk the grid, resolve each continuation to its
 * origin transitively, bump the origin's span, and emit only origin cells.
 */
function table(ctx: Ctx, n: CNode, caption: P.Inline[] | null): P.Block {
    if (!caption && Array.isArray(n.caption)) {
        caption = inlines(ctx, n.caption as CNode[]);
    }
    const rows = ((n.rows as CNode[] | undefined) ?? []).map(
        (r) => (r.cells as CCell[] | undefined) ?? [],
    );

    // Split leading all-header rows into the table head.
    let headCount = 0;
    while (headCount < rows.length && rows[headCount]!.length > 0 && rows[headCount]!.every((c) => c.header)) {
        headCount++;
    }

    // Column alignments come from the first row's cells.
    const firstRow = rows[0] ?? [];
    const colAligns: P.Alignment[] = firstRow.map((c) => ALIGN[c.align ?? ''] ?? 'AlignDefault');

    // origin[r][c] -> the PCell that covers grid position (r, c).
    const origin: (P.PCell | undefined)[][] = rows.map(() => []);
    const emitted: (P.PCell | null)[][] = rows.map((row) => row.map(() => null));

    for (let r = 0; r < rows.length; r++) {
        const row = rows[r]!;
        for (let c = 0; c < row.length; c++) {
            const cc = row[c]!;
            if (cc.span === 'colspan') {
                const org = origin[r]![c - 1];
                if (org) {
                    org.colSpan++;
                    origin[r]![c] = org;
                    continue;
                }
                warn(ctx, `table: colspan continuation at row ${r + 1}, col ${c + 1} has no origin - emitting empty cell`);
            } else if (cc.span === 'rowspan') {
                const org = r > 0 ? origin[r - 1]![c] : undefined;
                if (org) {
                    const originInHead = findCellRow(emitted, org) < headCount;
                    const contInBody = r >= headCount;
                    if (originInHead && contInBody) {
                        warn(ctx, `table: rowspan crossing the header/body boundary at row ${r + 1}, col ${c + 1} - clipped to an empty body cell (pandoc cannot represent it)`);
                    } else {
                        org.rowSpan++;
                        origin[r]![c] = org;
                        continue;
                    }
                } else {
                    warn(ctx, `table: rowspan continuation at row ${r + 1}, col ${c + 1} has no origin - emitting empty cell`);
                }
            }
            const cellBlocks = cc.children?.length
                ? [P.Plain(untight(ctx, () => inlines(ctx, cc.children)))]
                : [];
            const pc = P.cell(cellBlocks, ALIGN[cc.align ?? ''] ?? 'AlignDefault');
            origin[r]![c] = pc;
            emitted[r]![c] = pc;
        }
    }

    const toRows = (from: number, to: number): P.PCell[][] => {
        const out: P.PCell[][] = [];
        for (let r = from; r < to; r++) {
            out.push(emitted[r]!.filter((x): x is P.PCell => x !== null));
        }
        return out;
    };

    return P.Table(
        toAttr(n.attrs),
        caption,
        colAligns,
        toRows(0, headCount),
        toRows(headCount, rows.length),
    );
}

function findCellRow(emitted: (P.PCell | null)[][], target: P.PCell): number {
    for (let r = 0; r < emitted.length; r++) {
        if (emitted[r]!.includes(target)) return r;
    }
    return -1;
}

// --- Figures ---

function figure(ctx: Ctx, n: CNode): P.Block[] {
    const target = n.target as CNode | undefined;
    const caption = Array.isArray(n.caption) ? inlines(ctx, n.caption as CNode[]) : null;
    if (!target) return [];
    if (target.type === 'table') {
        // Pandoc tables carry a native caption; no Figure wrapper needed.
        return [table(ctx, target, caption)];
    }
    if (target.type === 'image') {
        const img = inline(ctx, target);
        return [P.Figure(toAttr(n.attrs), caption, [P.Plain(img)])];
    }
    // blockquote (attribution captions) and anything else
    return [P.Figure(toAttr(n.attrs), caption, untight(ctx, () => block(ctx, target)))];
}

// --- Metadata (frontmatter) ---

/**
 * Minimal YAML subset for typical frontmatter: flat `key: value` pairs with
 * plain scalars, quoted strings, and `[a, b]` flow lists. Anything else is
 * kept as a raw MetaString with a warning.
 */
function parseMeta(ctx: Ctx, frontmatter: unknown): Record<string, P.MetaValue> {
    const meta: Record<string, P.MetaValue> = {};
    const fm = frontmatter as { format?: string; content?: string } | undefined;
    if (!fm?.content) return meta;
    if (fm.format && fm.format !== 'yaml') {
        warn(ctx, `frontmatter: format "${fm.format}" not supported - skipped`);
        return meta;
    }
    for (const line of fm.content.split('\n')) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
        if (!m) {
            warn(ctx, `frontmatter: line not understood, skipped: ${line.trim()}`);
            continue;
        }
        const key = m[1]!;
        const raw = m[2]!.trim();
        meta[key] = metaValue(key, raw);
    }
    return meta;
}

function metaValue(key: string, raw: string): P.MetaValue {
    const unquote = (s: string): string => {
        const t = s.trim();
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            return t.slice(1, -1);
        }
        return t;
    };
    if (raw.startsWith('[') && raw.endsWith(']')) {
        const items = raw
            .slice(1, -1)
            .split(',')
            .map(unquote)
            .filter((s) => s !== '');
        return P.MetaList(items.map((s) => P.MetaInlines(textInlines(s))));
    }
    const value = unquote(raw);
    // Lists where pandoc conventionally expects lists, inlines elsewhere.
    if (key === 'author' || key === 'authors') {
        return P.MetaList([P.MetaInlines(textInlines(value))]);
    }
    return P.MetaInlines(textInlines(value));
}

// --- Entry point ---

export function convert(ast: CNode, options: ConvertOptions = {}): ConvertResult {
    const ctx: Ctx = {
        warnings: [],
        footnoteDefs: (ast.footnoteDefs as Record<string, CNode[]> | undefined) ?? {},
        headings: new Map(),
        tight: false,
        roundtrip: options.roundtrip ?? false,
    };

    // Pass 1: collect heading ids (explicit, plus computed slugs) for crossrefs.
    collectHeadings(ctx, (ast.children as CNode[] | undefined) ?? []);

    const meta = parseMeta(ctx, ast.frontmatter);
    const body = blocks(ctx, (ast.children as CNode[] | undefined) ?? []);

    return {
        doc: {
            'pandoc-api-version': [...P.PANDOC_API_VERSION],
            meta,
            blocks: body,
        },
        warnings: ctx.warnings,
    };
}

function collectHeadings(ctx: Ctx, nodes: CNode[]): void {
    for (const n of nodes) {
        if (n.type === 'heading') {
            const children = (n.children as CNode[] | undefined) ?? [];
            const a = (n.attrs ?? {}) as CAttrs;
            const id = a.id ?? slugify(plainText(children));
            if (id && !ctx.headings.has(id)) ctx.headings.set(id, children);
        }
        for (const key of ['children', 'items', 'target'] as const) {
            const v = n[key];
            if (Array.isArray(v)) collectHeadings(ctx, v as CNode[]);
            else if (v && typeof v === 'object') collectHeadings(ctx, [v as CNode]);
        }
    }
}
