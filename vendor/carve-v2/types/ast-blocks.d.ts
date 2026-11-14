import { type DocumentNode, type Node } from './ast.js';
import { type LayoutTrace } from './ast-inline.js';
import { type Findings } from './diagnostics.js';
/** What a parse knows of the tree it built, which resolution reads beside the tree. */
export interface ParseFacts {
    /** C2-I-084: the folded source of the text of a heading of the tree, or undefined for a node that is none. */
    headingSource: (heading: Node) => string | undefined;
    /** The leaves with inline content that holds an id, a reference, a note or a cross-reference. */
    resolvableLeaves: ReadonlySet<Node>;
    /** C2-H-172: whether the inline content of the source holds a bidirectional control. */
    bidi: boolean;
    /** The findings of the parse channel that the tree builder noted, added to `findings` with their messages. */
    addFindings: (findings: Findings) => void;
    /** C2-B-085: the number of source lines of a footnote definition of the tree, or 0 for a node that is none. */
    footnoteLines: (node: Node) => number;
}
/** The output of the parse stage: the tree before resolution (C2-A-106) and what the parse knows of it. */
export interface ParsedTree {
    readonly document: DocumentNode;
    /** Null for a supplied tree, of which nothing is known. */
    readonly facts: ParseFacts | null;
}
/**
 * The public tree of `src` before resolution, built from the events of the block pass and of the
 * inline pass of each content. `abbreviations` replaces the terms the source defines, for a source
 * that is one block of a larger document (C2-W-089). `trace` takes what the source-layout record reads (C2-L-001).
 */
export declare function buildSource(src: string, positions: boolean, abbreviations?: Map<string, string> | null, trace?: LayoutTrace | null): ParsedTree;
