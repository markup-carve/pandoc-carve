/**
 * One field layout for every block. A container has `children`, a leaf has `spans` (start, end pairs).
 * `attributes` holds the spans of the attribute lines the block took.
 */
export interface BlockNode {
    kind: number;
    start: number;
    end: number;
    aux: number;
    flags: number;
    exitFlags: number;
    /** The head rows of a table, the columns a cell spans. */
    facts: number;
    /** The footer rows of a table, the rows a cell spans. */
    rowFacts: number;
    children: BlockNode[] | null;
    /** The content of a leaf; for a table row, the text between the pipes of each span mark it merged (C2-A-149). */
    spans: number[] | null;
    attributes: number[] | null;
    /** C2-B-024: the indexes in `spans` of the lazy comment-only lines of a line block. */
    lazyComments?: number[];
}
/** Builds the block tree from the first `length` ints of an event array. */
export declare function buildTree(events: Int32Array, length: number, src?: string): BlockNode;
