import { type DocumentNode, type FootnoteNode, type InlineFootnoteNode, type LinkReferenceDefinitionNode, type Node, type TableCellNode, type TableNode } from './ast.js';
import { type ParseFacts } from './ast-blocks.js';
import { type Diagnostic, type Findings } from './diagnostics.js';
import { type HeadingIds } from './options.js';
export { type Diagnostic } from './diagnostics.js';
/** One numbered footnote: a definition that a reference uses, or an inline footnote. */
export interface Note {
    number: number;
    id: string;
    definition: FootnoteNode | null;
    inline: InlineFootnoteNode | null;
    /** The ids of its references in the order of the document, for the backlinks (C2-H-091). */
    refIds: string[];
}
export interface Resolution {
    definitions: Map<string, LinkReferenceDefinitionNode>;
    /** C2-N-054: the definition a reference in an included file resolved to, where it is not the document's own. */
    definitionOf: Map<Node, LinkReferenceDefinitionNode>;
    notes: Note[];
    noteOf: Map<Node, Note>;
    refIds: Map<Node, string>;
    /** The generated text of each resolved cross-reference (C2-H-096). */
    xrefText: Map<Node, string>;
    /** C2-H-156: the generated id of the title of each admonition and of the directive that places the notes. */
    labelIds: Map<Node, string>;
    /** The findings of resolution, each with its node. `diagnostics` is the list of its entries. */
    findings: Findings;
    diagnostics: Diagnostic[];
    /** C2-H-177: for a render under a profile, the `#id` targets of the degraded headings. */
    goneTargets?: ReadonlySet<string>;
    /** C2-H-062: the line of the own markup of each captioned block of a parse that took attribute lines. */
    markupLines: Map<Node, number>;
}
/** C2-H-155: true when the attribute line names the node itself, so the renderer generates no name and no id. */
export declare function hasAuthoredName(node: Node): boolean;
type Renderers = Readonly<Record<string, {
    version: string;
}>>;
export interface Admitted {
    block: boolean;
    inline: boolean;
}
/**
 * C2-B-213: the mark each column takes from the head, on one axis: that of the last head cell
 * that starts in the column and has one. A cell that spans several columns marks only the first.
 */
export declare function headMarks<F extends 'align' | 'valign'>(table: TableNode, field: F): TableCellNode[F][];
/**
 * Resolves `document` in place. `facts` is what the parse knows of a tree it built from source;
 * without it a heading matches by its plain text alone (C2-I-084), and every node is walked.
 * `symbols` is the table of a render, which the key of a caption sequence reads (C2-B-208).
 */
export declare function resolve(document: DocumentNode, mode: HeadingIds, facts: ParseFacts | null, symbols?: Readonly<Record<string, string>>, renderers?: Renderers, admitted?: Admitted): Resolution;
/** C2-N-027: the id of each heading of a file as its own parse gives it, before it meets the ids of another file. */
export declare function headingIdsAlone(document: DocumentNode, mode: HeadingIds): Map<Node, string>;
