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
export const Code = (a: Attr, s: string): Inline => node('Code', [a, s]);
export const Link = (a: Attr, xs: Inline[], target: [string, string]): Inline =>
    node('Link', [a, xs, target]);
export const Image = (a: Attr, alt: Inline[], target: [string, string]): Inline =>
    node('Image', [a, alt, target]);
export const Span = (a: Attr, xs: Inline[]): Inline => node('Span', [a, xs]);
export const RawInline = (format: string, s: string): Inline => node('RawInline', [format, s]);
export const Note = (blocks: Block[]): Inline => node('Note', blocks);
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
export const BulletList = (items: Block[][]): Block => node('BulletList', items);

export type ListNumberStyle =
    | 'DefaultStyle'
    | 'Decimal'
    | 'LowerAlpha'
    | 'UpperAlpha'
    | 'LowerRoman'
    | 'UpperRoman';

export const OrderedList = (start: number, style: ListNumberStyle, items: Block[][]): Block =>
    node('OrderedList', [[start, node(style), node('DefaultDelim')], items]);

export const DefinitionList = (items: [Inline[], Block[][]][]): Block =>
    node('DefinitionList', items);

export const Figure = (a: Attr, caption: Inline[] | null, blocks: Block[]): Block =>
    node('Figure', [a, [null, caption ? [Plain(caption)] : []], blocks]);

// --- Table ---

export type Alignment = 'AlignLeft' | 'AlignRight' | 'AlignCenter' | 'AlignDefault';

export interface PCell {
    attr: Attr;
    align: Alignment;
    rowSpan: number;
    colSpan: number;
    blocks: Block[];
}

export const cell = (blocks: Block[], align: Alignment = 'AlignDefault'): PCell => ({
    attr: emptyAttr,
    align,
    rowSpan: 1,
    colSpan: 1,
    blocks,
});

function renderCell(c: PCell): unknown {
    return [c.attr, node(c.align), c.rowSpan, c.colSpan, c.blocks];
}

function renderRow(cells: PCell[]): unknown {
    return [emptyAttr, cells.map(renderCell)];
}

export function Table(
    a: Attr,
    caption: Inline[] | null,
    colAligns: Alignment[],
    headRows: PCell[][],
    bodyRows: PCell[][],
): Block {
    const colspecs = colAligns.map((al) => [node(al), node('ColWidthDefault')]);
    return node('Table', [
        a,
        [null, caption ? [Plain(caption)] : []],
        colspecs,
        [emptyAttr, headRows.map(renderRow)],
        [[emptyAttr, 0, [], bodyRows.map(renderRow)]],
        [emptyAttr, []],
    ]);
}

// --- Meta constructors ---

export const MetaString = (s: string): MetaValue => node('MetaString', s);
export const MetaInlines = (xs: Inline[]): MetaValue => node('MetaInlines', xs);
export const MetaList = (xs: MetaValue[]): MetaValue => node('MetaList', xs);
