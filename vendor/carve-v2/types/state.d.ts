/** C2-B-190: the deepest container stack. The document at index 0 is not counted. */
export declare const MAX_DEPTH = 200;
export declare const NO_LEAF = -1;
export declare const NO_LINE = -1;
export declare const NO_DEPTH = -1;
/** C2-B-001: the open containers of the stack of open blocks, outermost first, with the document at index 0. */
export interface Containers {
    kind: Uint8Array;
    column: Int32Array;
    style: Uint8Array;
    loose: Uint8Array;
    depth: number;
}
/**
 * C2-B-001: the innermost entry of the stack of open blocks, the open leaf with what its opener set:
 * NO_LEAF, a text leaf, an opaque leaf or TABLE, whose rows are read like a leaf's lines.
 */
export interface OpenLeaf {
    kind: number;
    start: number;
    end: number;
    lines: number;
    /** Column of the marker of the open heading (C2-B-154). */
    column: number;
    fenceChar: number;
    fenceLength: number;
    fenceColumn: number;
    tableHeadRows: number;
    tableHeadOpen: boolean;
}
/**
 * C2-B-001: the five facts kept about the lines directly above, beside the stack of open blocks.
 * Whether the line is line 1 of the document (C2-B-161) is not kept: the loop of the pass knows it.
 */
export interface LinesAbove {
    /** C2-B-052, C2-B-062: blank lines since the last line that was not blank. */
    blankCount: number;
    /** C2-B-146: stack depth at which the block that closed directly above takes a caption, or NO_DEPTH. */
    captionDepth: number;
    /** C2-B-090, C2-B-092: stack depth at which attribute lines are pending, or NO_DEPTH. */
    attributesDepth: number;
    /** Source range of the pending attribute lines, for the keys the block pass reads (C2-B-180, C2-B-187). */
    attributesStart: number;
    attributesEnd: number;
    /** C2-B-091: the next enter event of the line takes the pending attribute lines. */
    takeAttributes: boolean;
    /** C2-B-113: first of the blank lines at the end of an open opaque body that no later line has claimed yet. */
    heldBlankLine: number;
}
/**
 * The cursor in the current line. `column` counts from the start of the line (C2-B-005);
 * `origin` is the column after the innermost matched quote mark and `prefixEnd` its offset (C2-B-003).
 */
export interface LineCursor {
    pos: number;
    column: number;
    origin: number;
    prefixEnd: number;
}
export interface BlockState {
    src: string;
    events: Int32Array;
    eventLength: number;
    lineStarts: Int32Array;
    lineCount: number;
    contentEnd: number;
    containers: Containers;
    leaf: OpenLeaf;
    above: LinesAbove;
    cursor: LineCursor;
}
export declare function acquireState(): BlockState;
/** Gives a state back. Its events and line table must not be read after this. */
export declare function releaseState(state: BlockState): void;
export declare function writeEvent(state: BlockState, tag: number, a: number, b: number): void;
export declare function addLine(state: BlockState, start: number): void;
