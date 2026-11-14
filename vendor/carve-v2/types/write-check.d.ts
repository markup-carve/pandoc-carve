import { type DocumentNode, type Node, type TextNode } from './ast.js';
import { type Writer } from './write-state.js';
/** The tree of `src`, one block of a larger document whose abbreviations are `abbreviations`. */
export declare function parseChunk(src: string, abbreviations: Map<string, string>): DocumentNode;
/** One comparison of written blocks with their parse: what it asks the next write to change. */
export interface Check {
    w: Writer;
    escapes: [TextNode, number][];
    /** Escapes of an earlier round that did not help and are taken back (C2-W-088). */
    retracted: [TextNode, number][];
    /** The escapes among `escapes` that a node which did not form asked for, which the test of C2-W-088 decides. */
    trials: [TextNode, number][];
    /** The escapes asked for and the escapes taken back, by text node, for the test whether an offset is escaped. */
    marks: Map<TextNode, Map<number, boolean>>;
    forms: Node[];
    respelled: Set<Node>;
    /** A block read back as another block, so the blocks behind it were not compared one by one. */
    misaligned: boolean;
    /** What no change repairs. It is reported when a round asks for no change. */
    losses: [Node, string | null][];
    /** The flags the content under comparison was written with: in a table cell, inside emphasis, inside strong. */
    flags: number;
    /** C2-A-093: the counts of a cell are a resolution result in a table that has span marks. */
    spanMarks: boolean;
    /** The node whose inline content is under comparison. */
    owner: Node | null;
    /** The escapes among `escapes` that open a run of escapes in one round (`extendChains`), with the construct each one stops. */
    chains: [TextNode, number, Node][];
    /** The written group the parse under comparison was made of, or null in a probe of part of it. */
    source: string | null;
}
export declare function createCheck(w: Writer): Check;
/** Extends the escapes of `chains` that this round places by the escapes the procedure would place behind each, one per parse. */
export declare function extendChains(c: Check): void;
/**
 * After a block read back as another block, the blocks behind it are not compared one by one.
 * This finds the other lines of the group that opened a block, by the lines at which the parse
 * `parsed` has one, so that one round escapes all of them (C2-W-092). `offset` is the line of
 * the parse at which the group starts.
 */
export declare function escapeOpeners(c: Check, parsed: DocumentNode, offset: number): void;
/** Compares the blocks `es` of `owner`, as they were written, with their parse `as`. */
export declare function compareBlocks(c: Check, es: readonly Node[], as: readonly Node[], owner: Node): void;
