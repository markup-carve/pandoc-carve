import { type Node } from './ast.js';
import { type Writer } from './write-state.js';
/** A unit of a text node. */
export declare const TEXT = 0;
/** A backslash that the writer places before the next unit of a text node. */
export declare const ESCAPE = 1;
/** A mark of a node of the tree: the opener or the closer of its syntax. */
export declare const OPEN = 2;
export declare const CLOSE = 3;
/** The body of a node written whole: a code span, a symbol, an attribute block, a link tail. */
export declare const ATOM = 4;
export interface Leaf {
    codes: number[];
    kinds: number[];
    /** The text node of a text unit, and the node of a mark or an atom. */
    owners: Node[];
    /** The offset in the value of a text unit, else -1. */
    offsets: number[];
    /** Why the leaf has no decision, or null. */
    undecided: string | null;
    /** C2-W-069: the bare emphasis and strong that take their braced form. */
    respell: Node[];
    /** The unit being decided, and the unit at which the leaf lost its decision, for the report of the gates. */
    cursor: number;
    where: number;
    /** C2-I-005: the units inside an attribute block of text, which the reader takes whole; null where there is none. */
    opaque: Uint8Array | null;
    /** The end of the last cross-reference scan that found no `>`. */
    angleFailEnd: number;
    /** The end of the last attribute block scan that found no `}` on its line. */
    braceFailEnd: number;
    /** The leaf is the content of a table cell. */
    inCell: boolean;
    /** The leaf is the quoted title of a div opener, which is no line of content (C2-B-119). */
    inTitle: boolean;
    /** The leaf is a line of a line block, where `%%` is text (C2-B-135). */
    inLine: boolean;
    /** The last backtick written by an atom, or -1. */
    lastAtomTick: number;
    /** Per unit, how a backtick of text is written (TICK_BARE, TICK_ESCAPED, TICK_UNDECIDED), once a backtick asked. */
    ticks: Uint8Array | null;
    /** Per ASCII mark, the last `}` behind it, once a brace asked for them. */
    closes: Int32Array | null;
    /** Per ASCII mark, the first `{` before it, once a hyphen run asked for them. */
    opens: Int32Array | null;
    /** The unit of the last `]` of the leaf, of any kind, or -1. */
    lastBracket: number;
    /** C2-I-094: the opening bracket of each inline extension of text, with its colon. */
    extensions: Map<number, number>;
    /** Whether a delimiter character of text came before the unit in the scan. */
    textMark: boolean;
    /** Whether a character of text that can open a construct came before the unit in the scan. */
    textOpener: boolean;
    /** Whether a line comment in this leaf can need a closer check. */
    hasLineComment: boolean;
    /** The number of marks of the tree open at the unit in the scan. */
    openDepth: number;
    openBrackets: number;
    openBraces: number;
    /** C2-W-016: the nodes whose value holds a CR at a line end, which no spelling keeps. */
    lostValues: Node[];
    /** C2-I-089: per unit, whether it stands inside an inline footnote, once a caret asked. */
    notes: Uint8Array | null;
}
export declare function createLeaf(): Leaf;
/** C2-I-089: whether the unit `at` stands inside the marks of an inline footnote of the tree. */
export declare function inNote(leaf: Leaf, at: number): boolean;
export declare function undecide(leaf: Leaf, why: string): void;
/** The units of `nodes`, as `writeInlines` writes them. */
export declare function modelInlines(w: Writer, leaf: Leaf, nodes: readonly Node[], flags: number): void;
/** `writeContent`: no space or tab of text at the end, and no line ending of a final hard break (C2-W-022). */
export declare function modelContent(w: Writer, leaf: Leaf, nodes: readonly Node[], flags: number): void;
export declare function trimLast(leaf: Leaf): void;
/** The leaf as one string. */
export declare function leafText(leaf: Leaf): string;
