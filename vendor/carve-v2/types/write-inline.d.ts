import { type Node, type TextNode } from './ast.js';
import { type Writer } from './write-state.js';
/** The content stands in a table cell: a pipe in text takes a backslash (C2-W-098). */
export declare const IN_CELL = 1;
export declare const IN_EMPHASIS = 2;
export declare const IN_STRONG = 4;
/** C2-W-080: a hard break is the bare line ending. */
export declare const BARE_BREAKS = 8;
/** The index of the first entry of the ascending list `offsets` that is not below `from`. */
export declare function firstFrom(offsets: readonly number[], from: number): number;
/**
 * The offset in the value of the text `node` behind the `bytes` UTF-8 bytes of its spelling that
 * start at the offset `from`, or -1 where no character of the value ends there.
 */
export declare function spelledEnd(w: Writer, node: TextNode, from: number, bytes: number, cell: boolean): number;
/** C2-W-059: a braced comment, written `{%%}` when its value is empty. */
export declare function bracedComment(value: string): string;
/** C2-W-077: the shortest backtick run that does not occur in `value`, with padding where the ends need it. */
export declare function codeSpan(value: string): string;
export declare function writeInlines(w: Writer, nodes: readonly Node[], flags: number): string;
/** The source of the content of a text leaf: no space or tab of text stands at its end (C2-W-022). */
export declare function writeContent(w: Writer, nodes: readonly Node[], flags: number): string;
