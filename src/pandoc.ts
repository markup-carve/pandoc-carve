/**
 * Minimal Pandoc JSON AST types and constructors.
 *
 * Shapes follow pandoc-types 1.23 (pandoc 3.x): every node is `{t, c?}`,
 * verified against `pandoc -t json` output of pandoc 3.5.
 */

export const PANDOC_API_VERSION = [1, 23, 1] as const;

export type Attr = [string, string[], [string, string][]];

export interface PandocNode {
    t: string;
    c?: unknown;
}

export type Inline = PandocNode;
export type Block = PandocNode;

export type MetaValue = PandocNode;

export interface PandocDoc {
    'pandoc-api-version': number[];
    meta: Record<string, MetaValue>;
    blocks: Block[];
}

export const emptyAttr: Attr = ['', [], []];

export function attr(id?: string, classes?: string[], kvs?: [string, string][]): Attr {
    return [id ?? '', classes ?? [], kvs ?? []];
}

function node(t: string, c?: unknown): PandocNode {
    return c === undefined ? { t } : { t, c };
}

// --- Inline constructors ---

export const Str = (s: string): Inline => node('Str', s);
export const Space: Inline = node('Space');
export const SoftBreak: Inline = node('SoftBreak');
export const LineBreak: Inline = node('LineBreak');
export const Emph = (xs: Inline[]): Inline => node('Emph', xs);
export const Strong = (xs: Inline[]): Inline => node('Strong', xs);
export const Underline = (xs: Inline[]): Inline => node('Underline', xs);
export const Strikeout = (xs: Inline[]): Inline => node('Strikeout', xs);
export const Superscript = (xs: Inline[]): Inline => node('Superscript', xs);
export const Subscript = (xs: Inline[]): Inline => node('Subscript', xs);
export const SmallCaps = (xs: Inline[]): Inline => node('SmallCaps', xs);
export const Code = (a: Attr, s: string): Inline => node('Code', [a, s]);
export const Link = (a: Attr, xs: Inline[], target: [string, string]): Inline =>
    node('Link', [a, xs, target]);
export const Image = (a: Attr, alt: Inline[], target: [string, string]): Inline =>
    node('Image', [a, alt, target]);
export const Span = (a: Attr, xs: Inline[]): Inline => node('Span', [a, xs]);
export const RawInline = (format: string, s: string): Inline => node('RawInline', [format, s]);
export const Note = (blocks: Block[]): Inline => node('Note', blocks);

export type QuoteType = 'DoubleQuote' | 'SingleQuote';
/**
 * A quotation as pandoc models it: the quote WRAPS its content, and the marks
 * themselves are not in the tree. That is the shape difference the bridge has
 * to bridge - Carve's parser resolves each mark to its own
 * `smart_punctuation` node, so the pair has to be found before it can be a
 * `Quoted`, and taken apart again on the way back.
 */
export const Quoted = (kind: QuoteType, xs: Inline[]): Inline =>
    node('Quoted', [node(kind), xs]);

/**
 * pandoc-types `CitationMode`. There is no locator field anywhere in
 * `Citation`: citeproc reads the locator out of `citationSuffix`, which is why
 * pandoc's own markdown reader writes `, p. 33` there.
 */
export type CitationMode = 'AuthorInText' | 'SuppressAuthor' | 'NormalCitation';

export interface Citation {
    citationId: string;
    citationPrefix: Inline[];
    citationSuffix: Inline[];
    citationMode: { t: CitationMode };
    /**
     * The note number in force where the citation stands - reader bookkeeping,
     * which every reader regenerates. It is not zero on the way in: pandoc's
     * markdown reader counts notes closed so far and stamps that plus one, so a
     * citation in running text before any note carries 1, not 0. Callers pass
     * the count; see the `noteCount` field of the converter's context.
     */
    citationNoteNum: number;
    citationHash: number;
}

export function citation(
    id: string,
    mode: CitationMode,
    prefix: Inline[] = [],
    suffix: Inline[] = [],
    noteNum = 1,
): Citation {
    return {
        citationId: id,
        citationPrefix: prefix,
        citationSuffix: suffix,
        citationMode: node(mode) as { t: CitationMode },
        citationNoteNum: noteNum,
        citationHash: 0,
    };
}

export const Cite = (citations: Citation[], xs: Inline[]): Inline =>
    node('Cite', [citations, xs]);
export const MathInline = (s: string): Inline => node('Math', [node('InlineMath'), s]);
export const MathDisplay = (s: string): Inline => node('Math', [node('DisplayMath'), s]);

// --- Block constructors ---

export const Para = (xs: Inline[]): Block => node('Para', xs);
export const Plain = (xs: Inline[]): Block => node('Plain', xs);
export const Header = (level: number, a: Attr, xs: Inline[]): Block =>
    node('Header', [level, a, xs]);
export const BlockQuote = (blocks: Block[]): Block => node('BlockQuote', blocks);
export const CodeBlock = (a: Attr, s: string): Block => node('CodeBlock', [a, s]);
export const RawBlock = (format: string, s: string): Block => node('RawBlock', [format, s]);
export const HorizontalRule: Block = node('HorizontalRule');
export const Div = (a: Attr, blocks: Block[]): Block => node('Div', [a, blocks]);
export const LineBlock = (lines: Inline[][]): Block => node('LineBlock', lines);
export const BulletList = (items: Block[][]): Block => node('BulletList', items);

export type ListNumberStyle =
    | 'DefaultStyle'
    | 'Decimal'
    | 'LowerAlpha'
    | 'UpperAlpha'
    | 'LowerRoman'
    | 'UpperRoman';

export type ListNumberDelim = 'DefaultDelim' | 'Period' | 'OneParen' | 'TwoParens';

export const OrderedList = (
    start: number,
    style: ListNumberStyle,
    items: Block[][],
    delim: ListNumberDelim = 'DefaultDelim',
): Block => node('OrderedList', [[start, node(style), node(delim)], items]);

export const DefinitionList = (items: [Inline[], Block[][]][]): Block =>
    node('DefinitionList', items);

export const Figure = (
    a: Attr,
    caption: Inline[] | null,
    blocks: Block[],
    shortCaption: Inline[] | null = null,
): Block => node('Figure', [a, [shortCaption, caption ? [Plain(caption)] : []], blocks]);

// --- Table ---

export type Alignment = 'AlignLeft' | 'AlignRight' | 'AlignCenter' | 'AlignDefault';

export interface PCell {
    attr: Attr;
    align: Alignment;
    rowSpan: number;
    colSpan: number;
    blocks: Block[];
}

export const cell = (
    blocks: Block[],
    align: Alignment = 'AlignDefault',
    a: Attr = emptyAttr,
): PCell => ({
    attr: a,
    align,
    rowSpan: 1,
    colSpan: 1,
    blocks,
});

/**
 * One pandoc `Row`: an `Attr` and its cells. Pandoc gives a row its own
 * attribute slot, and Carve's `table_row.attrs` is the same thing, so the row
 * is a record rather than a bare cell list.
 */
export interface PRow {
    attr?: Attr;
    cells: PCell[];
}

export const row = (cells: PCell[], a?: Attr): PRow => (a ? { attr: a, cells } : { cells });

function renderCell(c: PCell): unknown {
    return [c.attr, node(c.align), c.rowSpan, c.colSpan, c.blocks];
}

function renderRow(r: PRow): unknown {
    return [r.attr ?? emptyAttr, r.cells.map(renderCell)];
}

/**
 * One pandoc `TableBody`: `Attr`, `RowHeadColumns`, its own intermediate
 * header rows, and its body rows.
 *
 * A table has a LIST of these. Collapsing them to one loses where a body
 * begins, which is the only place pandoc records an intermediate header or a
 * row-head column count.
 */
export interface TableBody {
    attr?: Attr;
    rowHeadColumns?: number;
    headRows?: PRow[];
    bodyRows: PRow[];
}

function renderBody(b: TableBody): unknown {
    return [
        b.attr ?? emptyAttr,
        b.rowHeadColumns ?? 0,
        (b.headRows ?? []).map(renderRow),
        b.bodyRows.map(renderRow),
    ];
}

export function Table(
    a: Attr,
    caption: Inline[] | null,
    colAligns: Alignment[],
    headRows: PRow[],
    bodies: TableBody[],
    footRows: PRow[] = [],
    shortCaption: Inline[] | null = null,
    colWidths: Array<number | null> = [],
): Block {
    // The export side of the same ColWidth policy `reverse.ts`'s `table()`
    // states: carry explicit Carve widths as `ColWidth`; leave an unspecified
    // column at `ColWidthDefault` so pandoc's writers can size it themselves.
    const colspecs = colAligns.map((al, i) => [node(al), colWidths[i] == null ? node('ColWidthDefault') : node('ColWidth', colWidths[i])]);
    return node('Table', [
        a,
        [shortCaption, caption ? [Plain(caption)] : []],
        colspecs,
        [emptyAttr, headRows.map(renderRow)],
        bodies.map(renderBody),
        [emptyAttr, footRows.map(renderRow)],
    ]);
}

// --- Meta constructors ---

export const MetaString = (s: string): MetaValue => node('MetaString', s);
export const MetaInlines = (xs: Inline[]): MetaValue => node('MetaInlines', xs);
export const MetaList = (xs: MetaValue[]): MetaValue => node('MetaList', xs);
export const MetaMap = (m: Record<string, MetaValue>): MetaValue => node('MetaMap', m);
export const MetaBool = (b: boolean): MetaValue => node('MetaBool', b);
/**
 * Block content in metadata - `abstract`, and any other key a template renders
 * as more than a phrase. Pandoc's own markdown reader produces this for a YAML
 * LITERAL BLOCK SCALAR (`abstract: |`) and only for that, whatever the key is
 * called, which is the rule the bridge follows in both directions.
 */
export const MetaBlocks = (blocks: Block[]): MetaValue => node('MetaBlocks', blocks);
