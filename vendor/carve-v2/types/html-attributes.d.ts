import { type Node, type ParagraphNode } from './ast.js';
import { type Findings } from './diagnostics.js';
import { type Settings } from './options.js';
import { type Resolution } from './resolve.js';
/** The state of one render. */
export interface Render {
    settings: Settings;
    resolution: Resolution;
    /** The output: every line with a line break before it, so the first character is cut off at the end. */
    out: string;
    /** The lines written so far. */
    count: number;
    losses: Findings;
    /** C2-H-163: the `rel` value the profile writes on every link, or the empty string. */
    linkRel: string;
    /** Open links around the node that is written (C2-H-081), and open `abbr` spans (C2-H-099). */
    linkDepth: number;
    abbrDepth: number;
    /** The paragraph that takes the backlinks of the note that is written, and their text (C2-H-091). */
    backlinkHost: ParagraphNode | null;
    backlinks: string;
    /** C2-H-172: false where the text nodes are known to hold no bidirectional control. */
    bidi: boolean;
}
/** An attribute name and its value. A null value writes the bare name (C2-H-117). */
export type Pair = readonly [string, string | null];
/** What an element adds to the attributes its node carries. */
export interface TagParts {
    /** C2-H-010: written first, in the order given. A structural name replaces an authored key. */
    structural?: Pair[];
    /** Written with the structural ones, but the values are authored, so they pass the filter of C2-H-161 (C2-H-075). */
    derived?: (readonly [string, string])[];
    /** The id to write in place of the authored one, or null for none. */
    id?: string | null;
    /** C2-H-012: classes before and behind the ones the author wrote. */
    base?: readonly string[];
    last?: readonly string[];
    /** Written behind the authored keys. An authored key of the same name replaces one. */
    generated?: Pair[];
    /** C2-H-015: an `align` key is written as a `text-align` declaration. */
    alignStyle?: boolean;
    /** Declarations that follow the authored `style` (C2-H-057). */
    style?: string;
    /** C2-H-011: the id stands before the structural attributes, or the class does. */
    idFirst?: boolean;
    classFirst?: boolean;
    /** The node writes no authored attributes on this element. */
    bare?: boolean;
    /** A block element, which carries its source line under `sourceLines` (C2-H-016). */
    block?: boolean;
    /** The node of the tree a loss is reported on, where the node given is a copy of it. */
    origin?: Node;
}
/**
 * C2-H-002: the three markup characters and the no-break space. The text keeps its bidirectional
 * controls, so this is for text known to hold none and for the text of a roundtrip carrier (C2-H-172).
 */
export declare function escapeCarrierText(text: string): string;
/**
 * C2-H-002 and C2-H-172: a text node or a code span, escaped and, unless the render knows that the
 * inline content holds none, without its bidirectional controls.
 */
export declare function escapeTextNode(r: Render, text: string): string;
/**
 * C2-H-002 and C2-H-172: text written between tags, escaped and without its bidirectional controls,
 * which are never written there. A short text is read once for both.
 */
export declare function escapeText(text: string): string;
/** C2-H-003: the five characters of an attribute value. A no-break space stays the character. */
export declare function escapeAttribute(text: string): string;
/** C2-H-132: a render loss on `node`, or on the document when it is null. */
export declare function loss(r: Render, node: Node | null, code: string, message: string, severity?: 'error' | 'warning'): void;
/** C2-H-160: a destination the policy denies is written as the empty string, and the denial is reported on `node`. */
export declare function destination(r: Render, url: string, node: Node): string;
/**
 * C2-H-161, C2-H-162: the value of an authored key as it is written, which is empty when it fails a test. Every
 * authored value reaches the output through here: the keys, the classes, the language, `rel` and the derived values.
 */
export declare function keyValue(name: string, value: string): string;
/** C2-H-009: the attributes of one element, each with a leading space. */
export declare function attributes(r: Render, node: Node | null, parts: TagParts): string;
/** C2-H-139: the attribute block of an unresolved reference as text, in the fixed order. */
export declare function attributeBlockText(node: Node): string;
