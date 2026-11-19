import { type CommentNode, type ImageNode, type InlineParent, type LinkNode, type Node, type TextNode } from './ast.js';
import { type Writer } from './write-state.js';
/** The content stands in a table cell: a pipe in text takes a backslash (C2-W-098). */
export declare const IN_CELL = 1;
export declare const IN_EMPHASIS = 2;
export declare const IN_STRONG = 4;
/** C2-W-080: a hard break is the bare line ending. */
export declare const BARE_BREAKS = 8;
export declare const IN_BRACKET = 16;
/** C2-W-117: a block written inside the body of a figure group, which a nested figure group cannot be. */
export declare const IN_FIGURE_GROUP = 32;
/** C2-I-089: inside an inline footnote, where a caret pair opens nothing. */
export declare const IN_NOTE = 64;
/** The offsets of `node` that take a backslash: those asked for and those of C2-W-097, C2-W-098. */
export declare function escapeOffsets(w: Writer, node: TextNode, flags: number): number[];
/** The index of the first entry of the ascending list `offsets` that is not below `from`. */
export declare function firstFrom(offsets: readonly number[], from: number): number;
/**
 * The offset in the value of the text `node` behind the `bytes` UTF-8 bytes of its spelling that
 * start at the offset `from`, or -1 where no character of the value ends there.
 */
export declare function spelledEnd(w: Writer, node: TextNode, from: number, bytes: number, flags: number): number;
/**
 * C2-I-023, C2-I-024: a line comment that starts the content of a span or ends before its closer does so only in the
 * braced form, whose opener is a content start and whose closer ends the comment.
 */
export declare function edgeComment(node: InlineParent): boolean;
/** Whether emphasis (bit 1) and strong (bit 2) occur below `node` (C2-W-070). */
export declare function kindsBelow(w: Writer, node: Node): number;
/** C2-W-059: a braced comment, written `{%%}` when its value is empty. */
export declare function bracedComment(value: string): string;
/** C2-W-077: the shortest backtick run that does not occur in `value`, with padding where the ends need it. */
export declare function codeSpan(value: string): string;
/** C2-W-073, C2-W-074: the link tail, or the label of a reference. */
export declare function target(node: LinkNode | ImageNode, href: string | undefined, pipes?: boolean): string;
/** C2-W-075, C2-W-084: the verbatim text of a reference, where the sidecar holds it and the reparse did not refuse it. */
export declare function rawReference(w: Writer, node: LinkNode | ImageNode, flags: number): string | null;
/** C2-W-022, C2-W-117: a line comment; a value that ends with a space or a tab loses it, and the loss is reported. */
export declare function lineCommentText(w: Writer, node: CommentNode, value: string): string;
export declare function writeInline(w: Writer, node: Node, flags: number): string;
/** C2-W-112: the code span `nodes[at]` has the code span behind it glued to it, with no attribute block between. */
export declare function joinsNextCode(nodes: readonly Node[], at: number): boolean;
/** C2-I-102: in a hard-break block a line ending alone at the start of a line is a blank line, so the break keeps its backslash. */
export declare function lineStartBreak(node: Node, lineStart: boolean): string | null;
export declare function writeInlines(w: Writer, nodes: readonly Node[], flags: number): string;
/** The source of the content of a text leaf: no space or tab of text stands at its end (C2-W-022). */
export declare function writeContent(w: Writer, nodes: readonly Node[], flags: number): string;
