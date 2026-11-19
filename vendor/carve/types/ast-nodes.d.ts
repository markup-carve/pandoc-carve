import { type Attrs, type CitationLocator, type ExtensionDeclaration, type IncludeOptions, type Marker, type Metadata, type Position, type Resource, type Task } from './ast.js';
import { type ExtensionSource } from './extensions/types.js';
/** C2-A-027: the fields every node may carry. */
export interface NodeBase {
    attrs?: Attrs;
    data?: Record<string, unknown>;
    pos?: Position;
    segments?: Position[];
    metadata?: Metadata;
    dir?: "ltr" | "rtl" | "auto";
    lang?: string;
}
export interface AbbreviationNode extends NodeBase {
    type: "abbreviation";
    key: string;
    namespace: "abbr";
    expansion?: string;
}
export interface AbbreviationDefNode extends NodeBase {
    type: "abbreviation_def";
    expansion: string;
    key: string;
    namespace: "abbr";
}
export interface AdmonitionNode extends NodeBase {
    type: "admonition";
    children: Block[];
    kind: "note" | "tip" | "warning" | "danger" | "info" | "success" | "example" | "quote";
    title?: Inline[];
    groupLabel?: string;
}
export interface AutolinkNode extends NodeBase {
    type: "autolink";
    href: string;
    text?: string;
}
export interface BlockExtensionNode extends NodeBase {
    type: "block_extension";
    children: Block[];
    name: string;
    version: string;
    fallback: Block[];
    props?: Record<string, unknown>;
    slots?: Record<string, Node[]>;
    payload?: {
        format: string;
        value: unknown;
    }[];
    resourceIds?: string[];
    source?: ExtensionSource;
}
export interface BlockQuoteNode extends NodeBase {
    type: "block_quote";
    children: Block[];
    caption?: CaptionNode;
}
export interface CaptionNode extends NodeBase {
    type: "caption";
    children: Block[];
    short?: Inline[];
}
export interface CaptionNumberNode extends NodeBase {
    type: "caption_number";
    n?: number;
}
export interface CellParagraphNode extends NodeBase {
    type: "cell_paragraph";
    children: Inline[];
}
export interface CitationNode extends NodeBase {
    type: "citation";
    key: string;
    namespace: "citation";
    prefix?: Inline[];
    locator?: CitationLocator;
    suffix?: Inline[];
    mode?: "normal" | "author-in-text" | "suppress-author";
    number?: number;
    useIndex?: boolean;
}
export interface CitationDefinitionNode extends NodeBase {
    type: "citation_definition";
    children: Inline[];
    key: string;
    namespace: "citation";
}
export interface CitationGroupNode extends NodeBase {
    type: "citation_group";
    children: CitationNode[];
    raw: string;
}
export interface CodeNode extends NodeBase {
    type: "code";
    value: string;
}
export interface CodeBlockNode extends NodeBase {
    type: "code_block";
    value: string;
    syntax?: string;
    title?: Inline[];
    groupLabel?: string;
    caption?: CaptionNode;
}
export interface CommentNode extends NodeBase {
    type: "comment";
    form: "block" | "line" | "braced";
    value: string;
}
export interface CriticCommentNode extends NodeBase {
    type: "critic_comment";
    value: string;
}
export interface DefinitionDescriptionNode extends NodeBase {
    type: "definition_description";
    children: Block[];
}
export interface DefinitionListNode extends NodeBase {
    type: "definition_list";
    children: (DefinitionTermNode | DefinitionDescriptionNode | CommentNode)[];
}
export interface DefinitionTermNode extends NodeBase {
    type: "definition_term";
    children: Inline[];
}
export interface DeleteNode extends NodeBase {
    type: "delete";
    children: Inline[];
}
export interface DirectiveNode extends NodeBase {
    type: "directive";
    children: Block[];
    kind: "bibliography" | "footnotes" | "glossary" | "index" | "references" | "toc";
    title?: Inline[];
    groupLabel?: string;
    tocTarget?: "headings" | "figures" | "tables" | "listings";
}
export interface DivNode extends NodeBase {
    type: "div";
    children: Block[];
    title?: Inline[];
    groupLabel?: string;
}
export interface DocumentNode extends NodeBase {
    type: "document";
    children: (Block | FootnoteNode | LinkReferenceDefinitionNode | AbbreviationDefNode | CitationDefinitionNode | FrontmatterNode)[];
    astVersion: string;
    srcByteLength?: number;
    extensions?: ExtensionDeclaration[];
    stages?: ("includeExpansion" | "referenceResolution" | "tableAlignment")[];
    resources?: Resource[];
}
export interface EmphasisNode extends NodeBase {
    type: "emphasis";
    children: Inline[];
}
export interface FigureGroupNode extends NodeBase {
    type: "figure_group";
    children: Block[];
    caption?: CaptionNode;
}
export interface FootnoteNode extends NodeBase {
    type: "footnote";
    children: Block[];
    key: string;
    namespace: "footnote";
}
export interface FootnoteRefNode extends NodeBase {
    type: "footnote_ref";
    key: string;
    namespace: "footnote";
    number?: number;
}
export interface FrontmatterNode extends NodeBase {
    type: "frontmatter";
    format: string;
    value: string;
}
export interface HardBreakNode extends NodeBase {
    type: "hard_break";
}
export interface HeadingNode extends NodeBase {
    type: "heading";
    children: Inline[];
    level: number;
    generatedId?: string;
}
export interface HighlightNode extends NodeBase {
    type: "highlight";
    children: Inline[];
}
export interface ImageNode extends NodeBase {
    type: "image";
    src?: string;
    alt?: string;
    decorative?: boolean;
    tooltip?: string;
    targetKind?: "url" | "wiki" | "doc" | "xref";
    key?: string;
    namespace?: "link";
    resourceId?: string;
    refForm?: "full" | "collapsed" | "shortcut";
    longDescription?: Block[];
}
export interface IncludeNode extends NodeBase {
    type: "include";
    children?: (Block | FootnoteNode | LinkReferenceDefinitionNode | AbbreviationDefNode | CitationDefinitionNode | FrontmatterNode)[];
    path: string;
    section?: string;
    options?: IncludeOptions;
    invalid?: string[];
    file?: string;
    caption?: CaptionNode;
}
export interface InlineExtensionNode extends NodeBase {
    type: "inline_extension";
    children: Inline[];
    name: string;
    props?: Record<string, unknown>;
    slots?: Record<string, Node[]>;
    payload?: {
        format: string;
        value: unknown;
    }[];
    resourceIds?: string[];
    source?: ExtensionSource;
    version?: string;
    fallback?: Inline[];
}
export interface InlineFootnoteNode extends NodeBase {
    type: "inline_footnote";
    children: Inline[];
    number?: number;
}
export interface InsertNode extends NodeBase {
    type: "insert";
    children: Inline[];
}
export interface LineNode extends NodeBase {
    type: "line";
    children: Inline[];
}
export interface LineBlockNode extends NodeBase {
    type: "line_block";
    children: (LineNode | CommentNode)[];
}
export interface LinkNode extends NodeBase {
    type: "link";
    children: Inline[];
    href?: string;
    tooltip?: string;
    targetKind?: "url" | "wiki" | "doc" | "xref";
    key?: string;
    namespace?: "link";
    refForm?: "full" | "collapsed" | "shortcut";
}
export interface LinkReferenceDefinitionNode extends NodeBase {
    type: "link_reference_definition";
    href: string;
    key: string;
    namespace: "link";
    tooltip?: string;
}
export interface ListNode extends NodeBase {
    type: "list";
    children: ListItemNode[];
    marker: Marker;
    spacing: "tight" | "loose";
}
export interface ListItemNode extends NodeBase {
    type: "list_item";
    children: Block[];
    task?: Task;
}
export interface LiteralInlineNode extends NodeBase {
    type: "literal_inline";
    value: string;
}
export interface MathNode extends NodeBase {
    type: "math";
    display: boolean;
    value: string;
    number?: number;
    numberPrefix?: string;
}
export interface MentionNode extends NodeBase {
    type: "mention";
    target: string;
    kind: string;
    label?: string;
}
export interface NonBreakingSpaceNode extends NodeBase {
    type: "non_breaking_space";
}
export interface ParagraphNode extends NodeBase {
    type: "paragraph";
    children: Inline[];
    role?: "image" | "math";
    caption?: CaptionNode;
}
export interface RawBlockNode extends NodeBase {
    type: "raw_block";
    format: string;
    value: string;
}
export interface RawInlineNode extends NodeBase {
    type: "raw_inline";
    format: string;
    value: string;
}
export interface RubyNode extends NodeBase {
    type: "ruby";
    pairs: RubyPairNode[];
}
export interface RubyPairNode extends NodeBase {
    type: "ruby_pair";
    base: Inline[];
    annotation: Inline[];
}
export interface SectionNode extends NodeBase {
    type: "section";
    children: Block[];
    level?: number;
}
export interface SmallCapsNode extends NodeBase {
    type: "small_caps";
    children: Inline[];
}
export interface SmartPunctuationNode extends NodeBase {
    type: "smart_punctuation";
    kind: "ellipsis" | "em_dash" | "en_dash" | "greater_than_or_equal" | "left_double_quote" | "left_right_arrow" | "left_right_double_arrow" | "left_single_quote" | "leftwards_arrow" | "leftwards_double_arrow" | "less_than_or_equal" | "not_equal" | "plus_minus" | "right_double_quote" | "right_single_quote" | "rightwards_arrow" | "rightwards_double_arrow" | "trademark";
    source: string;
    glyph: string;
}
export interface SoftBreakNode extends NodeBase {
    type: "soft_break";
}
export interface SpanNode extends NodeBase {
    type: "span";
    children: Inline[];
}
export interface StrikeNode extends NodeBase {
    type: "strike";
    children: Inline[];
}
export interface StrongNode extends NodeBase {
    type: "strong";
    children: Inline[];
}
export interface SubscriptNode extends NodeBase {
    type: "subscript";
    children: Inline[];
}
export interface SuperscriptNode extends NodeBase {
    type: "superscript";
    children: Inline[];
}
export interface SymbolNode extends NodeBase {
    type: "symbol";
    name: string;
}
export interface TableNode extends NodeBase {
    type: "table";
    children: (TableHeadNode | TableBodyNode | TableFootNode | CommentNode)[];
    columns: TableColumnNode[];
    caption?: CaptionNode;
}
export interface TableBodyNode extends NodeBase {
    type: "table_body";
    children: (TableRowNode | CommentNode)[];
    rowHeadColumns?: number;
}
export interface TableCellNode extends NodeBase {
    type: "table_cell";
    children: (Block | CellParagraphNode)[];
    header: boolean;
    span?: "rowspan" | "colspan";
    colspan?: number;
    rowspan?: number;
    align?: "left" | "right" | "center";
    valign?: "top" | "middle" | "bottom" | "baseline";
    scope?: "row" | "col" | "rowgroup" | "colgroup";
    headerIds?: string[];
}
export interface TableColumnNode extends NodeBase {
    type: "table_column";
    align?: "left" | "right" | "center";
    valign?: "top" | "middle" | "bottom" | "baseline";
    width?: number;
    resolvedAlign?: "left" | "right" | "center";
    resolvedValign?: "top" | "middle" | "bottom" | "baseline";
}
export interface TableFootNode extends NodeBase {
    type: "table_foot";
    children: (TableRowNode | CommentNode)[];
}
export interface TableHeadNode extends NodeBase {
    type: "table_head";
    children: (TableRowNode | CommentNode)[];
}
export interface TableRowNode extends NodeBase {
    type: "table_row";
    children: TableCellNode[];
}
export interface TagNode extends NodeBase {
    type: "tag";
    name: string;
}
export interface TextNode extends NodeBase {
    type: "text";
    value: string;
}
export interface ThematicBreakNode extends NodeBase {
    type: "thematic_break";
}
export interface UnderlineNode extends NodeBase {
    type: "underline";
    children: Inline[];
}
export interface XrefNode extends NodeBase {
    type: "xref";
    key: string;
    namespace: "link" | "footnote" | "citation" | "abbr" | "heading";
    href?: string;
    display?: "number" | "page" | "title" | "full";
}
/** The node types that stand in a list of blocks. */
export type Block = AdmonitionNode | BlockExtensionNode | BlockQuoteNode | CodeBlockNode | CommentNode | DefinitionListNode | DirectiveNode | DivNode | FigureGroupNode | HeadingNode | IncludeNode | LineBlockNode | ListNode | ParagraphNode | RawBlockNode | SectionNode | TableNode | ThematicBreakNode;
/** The node types that stand in a list of inlines. */
export type Inline = AbbreviationNode | AutolinkNode | CaptionNumberNode | CitationGroupNode | CodeNode | CommentNode | CriticCommentNode | DeleteNode | EmphasisNode | FootnoteRefNode | HardBreakNode | HighlightNode | ImageNode | InlineExtensionNode | InlineFootnoteNode | InsertNode | LinkNode | LiteralInlineNode | MathNode | MentionNode | NonBreakingSpaceNode | RawInlineNode | RubyNode | SmallCapsNode | SmartPunctuationNode | SoftBreakNode | SpanNode | StrikeNode | StrongNode | SubscriptNode | SuperscriptNode | SymbolNode | TagNode | TextNode | UnderlineNode | XrefNode;
/** Every node of the tree document, told apart by `type`. */
export type Node = AbbreviationNode | AbbreviationDefNode | AdmonitionNode | AutolinkNode | BlockExtensionNode | BlockQuoteNode | CaptionNode | CaptionNumberNode | CellParagraphNode | CitationNode | CitationDefinitionNode | CitationGroupNode | CodeNode | CodeBlockNode | CommentNode | CriticCommentNode | DefinitionDescriptionNode | DefinitionListNode | DefinitionTermNode | DeleteNode | DirectiveNode | DivNode | DocumentNode | EmphasisNode | FigureGroupNode | FootnoteNode | FootnoteRefNode | FrontmatterNode | HardBreakNode | HeadingNode | HighlightNode | ImageNode | IncludeNode | InlineExtensionNode | InlineFootnoteNode | InsertNode | LineNode | LineBlockNode | LinkNode | LinkReferenceDefinitionNode | ListNode | ListItemNode | LiteralInlineNode | MathNode | MentionNode | NonBreakingSpaceNode | ParagraphNode | RawBlockNode | RawInlineNode | RubyNode | RubyPairNode | SectionNode | SmallCapsNode | SmartPunctuationNode | SoftBreakNode | SpanNode | StrikeNode | StrongNode | SubscriptNode | SuperscriptNode | SymbolNode | TableNode | TableBodyNode | TableCellNode | TableColumnNode | TableFootNode | TableHeadNode | TableRowNode | TagNode | TextNode | ThematicBreakNode | UnderlineNode | XrefNode;
/** The node of each type. */
export interface NodeOfType {
    abbreviation: AbbreviationNode;
    abbreviation_def: AbbreviationDefNode;
    admonition: AdmonitionNode;
    autolink: AutolinkNode;
    block_extension: BlockExtensionNode;
    block_quote: BlockQuoteNode;
    caption: CaptionNode;
    caption_number: CaptionNumberNode;
    cell_paragraph: CellParagraphNode;
    citation: CitationNode;
    citation_definition: CitationDefinitionNode;
    citation_group: CitationGroupNode;
    code: CodeNode;
    code_block: CodeBlockNode;
    comment: CommentNode;
    critic_comment: CriticCommentNode;
    definition_description: DefinitionDescriptionNode;
    definition_list: DefinitionListNode;
    definition_term: DefinitionTermNode;
    delete: DeleteNode;
    directive: DirectiveNode;
    div: DivNode;
    document: DocumentNode;
    emphasis: EmphasisNode;
    figure_group: FigureGroupNode;
    footnote: FootnoteNode;
    footnote_ref: FootnoteRefNode;
    frontmatter: FrontmatterNode;
    hard_break: HardBreakNode;
    heading: HeadingNode;
    highlight: HighlightNode;
    image: ImageNode;
    include: IncludeNode;
    inline_extension: InlineExtensionNode;
    inline_footnote: InlineFootnoteNode;
    insert: InsertNode;
    line: LineNode;
    line_block: LineBlockNode;
    link: LinkNode;
    link_reference_definition: LinkReferenceDefinitionNode;
    list: ListNode;
    list_item: ListItemNode;
    literal_inline: LiteralInlineNode;
    math: MathNode;
    mention: MentionNode;
    non_breaking_space: NonBreakingSpaceNode;
    paragraph: ParagraphNode;
    raw_block: RawBlockNode;
    raw_inline: RawInlineNode;
    ruby: RubyNode;
    ruby_pair: RubyPairNode;
    section: SectionNode;
    small_caps: SmallCapsNode;
    smart_punctuation: SmartPunctuationNode;
    soft_break: SoftBreakNode;
    span: SpanNode;
    strike: StrikeNode;
    strong: StrongNode;
    subscript: SubscriptNode;
    superscript: SuperscriptNode;
    symbol: SymbolNode;
    table: TableNode;
    table_body: TableBodyNode;
    table_cell: TableCellNode;
    table_column: TableColumnNode;
    table_foot: TableFootNode;
    table_head: TableHeadNode;
    table_row: TableRowNode;
    tag: TagNode;
    text: TextNode;
    thematic_break: ThematicBreakNode;
    underline: UnderlineNode;
    xref: XrefNode;
}
/**
 * A function per node type, each of which reads a node of its own type and what the caller passes along.
 * A table is read through a dispatcher of its own, `table[type]?.(node, context)` with `type` and `node`
 * typed by one parameter `T extends keyof NodeOfType`: one shared dispatcher for every table loses speed.
 */
export type NodeHandlers<R, C = void> = {
    [T in keyof NodeOfType]?: (node: NodeOfType[T], context: C) => R;
};
/** The values of each field that takes one of a fixed set, by `type.field` (`*` for any type). */
export declare const FIELD_VALUES: {
    readonly "*.dir": readonly ["ltr", "rtl", "auto"];
    readonly "comment.form": readonly ["block", "line", "braced"];
    readonly "link.refForm": readonly ["full", "collapsed", "shortcut"];
    readonly "image.refForm": readonly ["full", "collapsed", "shortcut"];
    readonly "xref.display": readonly ["number", "page", "title", "full"];
    readonly "paragraph.role": readonly ["image", "math"];
    readonly "citation.mode": readonly ["normal", "author-in-text", "suppress-author"];
    readonly "table_cell.scope": readonly ["row", "col", "rowgroup", "colgroup"];
    readonly "list.spacing": readonly ["tight", "loose"];
    readonly "table_cell.span": readonly ["rowspan", "colspan"];
    readonly "table_cell.align": readonly ["left", "right", "center"];
    readonly "table_column.align": readonly ["left", "right", "center"];
    readonly "table_column.resolvedAlign": readonly ["left", "right", "center"];
    readonly "table_column.resolvedValign": readonly ["top", "middle", "bottom", "baseline"];
    readonly "table_cell.valign": readonly ["top", "middle", "bottom", "baseline"];
    readonly "table_column.valign": readonly ["top", "middle", "bottom", "baseline"];
    readonly "smart_punctuation.kind": readonly ["ellipsis", "em_dash", "en_dash", "greater_than_or_equal", "left_double_quote", "left_right_arrow", "left_right_double_arrow", "left_single_quote", "leftwards_arrow", "leftwards_double_arrow", "less_than_or_equal", "not_equal", "plus_minus", "right_double_quote", "right_single_quote", "rightwards_arrow", "rightwards_double_arrow", "trademark"];
    readonly "link.targetKind": readonly ["url", "wiki", "doc", "xref"];
    readonly "image.targetKind": readonly ["url", "wiki", "doc", "xref"];
    readonly "directive.tocTarget": readonly ["headings", "figures", "tables", "listings"];
    readonly "directive.kind": readonly ["bibliography", "footnotes", "glossary", "index", "references", "toc"];
    readonly "admonition.kind": readonly ["note", "tip", "warning", "danger", "info", "success", "example", "quote"];
    readonly "*.namespace": readonly ["link", "footnote", "citation", "abbr", "heading"];
    readonly "link.namespace": readonly ["link"];
    readonly "image.namespace": readonly ["link"];
    readonly "link_reference_definition.namespace": readonly ["link"];
    readonly "footnote_ref.namespace": readonly ["footnote"];
    readonly "footnote.namespace": readonly ["footnote"];
    readonly "abbreviation.namespace": readonly ["abbr"];
    readonly "abbreviation_def.namespace": readonly ["abbr"];
    readonly "citation.namespace": readonly ["citation"];
    readonly "citation_definition.namespace": readonly ["citation"];
};
/** Whether `value` is one of the values of `field`. */
export declare function isFieldValue<F extends keyof typeof FIELD_VALUES>(field: F, value: string): value is (typeof FIELD_VALUES)[F][number];
