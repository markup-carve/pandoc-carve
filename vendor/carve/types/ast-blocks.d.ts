import { type DocumentNode, type IncludeNode, type Inline, type Node } from './ast.js';
import { type LayoutTrace } from './ast-inline.js';
import { type Findings } from './diagnostics.js';
/** What a parse knows of the tree it built, which resolution reads beside the tree. */
export interface ParseFacts {
    sourceNames: ReadonlyMap<Node, string> | null;
    /** The leaves with inline content that holds an id, a reference, a note or a cross-reference. */
    resolvableLeaves: ReadonlySet<Node>;
    /** C2-H-172: whether the inline content of the source holds a bidirectional control. */
    bidi: boolean;
    /** The findings of the parse channel that the tree builder noted, added to `findings` with their messages. */
    addFindings: (findings: Findings) => void;
    /** C2-B-085: the number of source lines of a footnote definition of the tree, or 0 for a node that is none. */
    footnoteLines: (node: Node) => number;
    /** C2-H-062: the line of the own markup of a block that took attribute lines, behind them (C2-A-148). */
    markupLine: (node: Node) => number | undefined;
    /** The include nodes of the tree in tree order (C2-N-018). */
    includes: readonly IncludeNode[];
    /** C2-N-023, C2-N-054: the terms and the link keys the source was read with, which a file it includes reads too. */
    scope: OuterScope;
}
/** C2-N-023, C2-N-054: what an included file reads of the files around it: their terms and their link keys. */
export interface OuterScope {
    abbreviations: ReadonlyMap<string, string>;
    linkKeys: ReadonlySet<string> | null;
}
/** The output of the parse stage: the tree before resolution (C2-A-106) and what the parse knows of it. */
export interface ParsedTree {
    readonly document: DocumentNode;
    /** Null for a supplied tree, of which nothing is known. */
    readonly facts: ParseFacts | null;
    /** C2-H-201: the source the tree was parsed from, or its byte length, which a parse without positions does not record. */
    readonly source?: string | number;
}
/**
 * C2-I-084: `text` read as inline content of its own, in which no reference resolves, as the heading lookup reads a
 * stored key. An opener left unclosed is text (C2-I-119).
 */
export declare function inlineContent(text: string): Inline[];
/**
 * The public tree of `src` before resolution, built from the events of the block pass and of the
 * inline pass of each content. `abbreviations` replaces the terms the source defines, for a source
 * that is one block of a larger document (C2-W-089). `trace` takes what the source-layout record reads (C2-A-003).
 */
export declare function buildSource(src: string, positions: boolean, abbreviations?: Map<string, string> | null, trace?: LayoutTrace | null, collectSourceNames?: boolean, linkKeys?: ReadonlySet<string> | null, outer?: OuterScope | null, frontmatterOpens?: boolean): ParsedTree;
