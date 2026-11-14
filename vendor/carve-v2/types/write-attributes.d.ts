import { type Node } from './ast.js';
/** C2-I-030: a name is one or more ASCII letters, digits, `_` and `-`. */
export declare function isName(text: string): boolean;
/**
 * `value` in double quotes (C2-I-033): a quote takes a backslash, and so does a backslash that
 * would otherwise be read as an escape, which is one before ASCII punctuation or the closing quote.
 */
export declare function quoted(value: string): string;
export interface BlockParts {
    /** What stands before the id: the alignment mark of a cell (C2-W-062). */
    mark?: string;
    /** Keys that the tree holds in other fields, written before the keys of `attrs`. */
    keys?: readonly (readonly [string, string])[];
    /** Classes that the opener of the block stands for and that are not written (C2-W-039, C2-W-081). */
    skipClasses?: readonly number[];
}
/** C2-W-048: the brace block of `node`, or the empty string when it has nothing to write. */
export declare function braceBlock(node: Node, extra?: BlockParts): string;
