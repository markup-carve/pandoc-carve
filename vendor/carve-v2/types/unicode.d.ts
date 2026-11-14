/** The start and the end of a content, which count as whitespace. */
export declare const NO_CHARACTER = -1;
export declare function isAsciiLetter(code: number): boolean;
export declare function isAsciiDigit(code: number): boolean;
export declare function isAsciiAlphanumeric(code: number): boolean;
/** An ASCII letter or digit, `_` or `-`: a character of a name such as a tag or a key. */
export declare function isAsciiNameCharacter(code: number): boolean;
/** A Unicode letter or number (general category L or N). */
export declare function isWordCharacter(code: number): boolean;
/** A Unicode letter (general category L). */
export declare function isLetter(code: number): boolean;
/** A space, a tab, a line break, or the edge of the content. */
export declare function isWhitespace(code: number): boolean;
export declare const NO_BREAK_SPACE = 160;
/** Whitespace for a test of the character before or after a position: a no-break space counts too. */
export declare function isBoundarySpace(code: number): boolean;
/** C2-I-050: a combining mark, a variation selector or a zero-width joiner. */
export declare function isJoining(code: number): boolean;
/** C2-I-122: a character outside ASCII that a URL may hold: no whitespace, no control and no format character. */
export declare function isUrlCharacter(code: number): boolean;
export declare function isAsciiPunctuation(code: number): boolean;
/** The code point that starts at `pos`, or NO_CHARACTER at `end`. */
export declare function codePointAt(text: string, pos: number, end: number): number;
/** The code point that ends at `pos`, or NO_CHARACTER at the start. */
export declare function codePointBefore(text: string, pos: number): number;
/** C2-H-172: the bidirectional embeddings, overrides and isolates lie in this range. */
export declare const BIDI_FIRST = 8234;
export declare const BIDI_LAST = 8297;
/** C2-H-172: U+202A to U+202E and U+2066 to U+2069. */
export declare function isBidiControl(code: number): boolean;
/** C2-H-172: true when `text[start, end)` holds a bidirectional control. */
export declare function holdsBidiControl(text: string, start: number, end: number): boolean;
