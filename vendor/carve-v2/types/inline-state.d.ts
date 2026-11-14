export declare const TOKEN_WIDTH = 7;
export declare const TOKEN_START = 1;
export declare const TOKEN_END = 2;
export declare const TOKEN_A = 3;
export declare const TOKEN_B = 4;
export declare const TOKEN_C = 5;
export declare const TOKEN_D = 6;
/** A token that turned out to be text: a failed opener, a closer with no partner. */
export declare const TOKEN_TEXT = 0;
/** A bracket opener. A: its form. B: the token of its closer, or NONE. C: the kind of its node, or 0. */
export declare const TOKEN_OPEN = 1;
/** A closing bracket. A: the token of its opener. */
export declare const TOKEN_CLOSE = 2;
/** A link tail. A, B: the destination. C: the start of the quoted title, or NONE. */
export declare const TOKEN_TAIL = 3;
/** A bare delimiter. A: its mark. B: the token of its partner, or NONE. C: what it can do. */
export declare const TOKEN_DELIMITER = 4;
export declare const TOKEN_BRACED_OPEN = 5;
/** A mark before a closing brace. C: what the mark can do as a bare delimiter (C2-I-057). */
export declare const TOKEN_BRACED_CLOSE = 6;
/** Text that is printed as written (C2-I-035). */
export declare const TOKEN_LITERAL = 7;
export declare const NONE = -1;
export declare const OPEN_PLAIN = 0;
export declare const OPEN_IMAGE = 1;
export declare const OPEN_FOOTNOTE = 2;
export declare const OPEN_EXTENSION = 3;
export declare const CAN_OPEN = 1;
export declare const CAN_CLOSE = 2;
export declare const BETWEEN_WORDS = 4;
export interface InlineState {
    src: string;
    /** The content: its lines joined by one line feed (C2-I-003), without trailing spaces and tabs. */
    text: string;
    end: number;
    lineText: Int32Array;
    lineSource: Int32Array;
    lineCount: number;
    /** C2-B-144: a line block reads `%%` as text. */
    lineComments: boolean;
    /** C2-H-172: whether the text the scan has read so far holds a bidirectional control. */
    bidi: boolean;
    /** Open containers of the block pass around this content (C2-I-118). */
    baseDepth: number;
    tokens: Int32Array;
    tokenLength: number;
    /** End of the last token, so that a break or a comment takes only spaces that are still text. */
    tokenEnd: number;
    events: Int32Array;
    eventLength: number;
    brackets: Int32Array;
    bracketDepth: number;
    commentCloserMissing: boolean;
    editorialCloserMissing: boolean;
    labelCloserMissing: boolean;
    xrefFailEnd: number;
    doubleQuoteFailEnd: number;
    singleQuoteFailEnd: number;
    valueFailEnd: number;
    tailStart: number;
    tailEnd: number;
    tailTitleFailed: boolean;
    tailDepth: Int32Array;
    tailLowest: Int32Array;
    tailDestinationEnd: number;
    tailTitleStart: number;
    stackToken: Int32Array;
    stackClass: Int8Array;
    stackBelow: Int32Array;
    stackSlash: Int32Array;
    stackStar: Int32Array;
    stackLength: number;
    stackLive: number;
    classTop: Int32Array;
    stackFloor: number;
    lastSlash: number;
    lastStar: number;
    line: number;
    breakFrom: number;
    nextBreak: number;
    previous: number;
    singleQuoteOpen: boolean;
    footnoteQuotes: Uint8Array;
    footnoteDepth: number;
    /** Start of the text that is not written yet, and the kind of the last smart node. */
    textRun: number;
    smartKind: number;
}
export declare function acquireInlineState(): InlineState;
/** Gives a state back. Its events must not be read after this. */
export declare function releaseInlineState(state: InlineState): void;
/** Appends a token and returns its offset in the token array. */
export declare function pushToken(state: InlineState, kind: number, start: number, end: number, a: number, b: number, c: number, d: number): number;
export declare function writeInlineEvent(state: InlineState, tag: number, a: number, b: number): void;
/** Sets the content of a pass: the source spans `spans[from..to)`, as start and end pairs. */
export declare function setContent(state: InlineState, src: string, spans: ArrayLike<number>, from: number, to: number): void;
