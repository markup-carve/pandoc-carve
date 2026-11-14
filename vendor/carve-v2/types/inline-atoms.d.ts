import { type InlineState } from './inline-state.js';
/**
 * The character before `pos`. C2-I-026: a braced comment counts as nothing for its neighbors,
 * so the comments that end at `pos` are skipped.
 */
export declare function characterBefore(state: InlineState, pos: number): number;
/** The character at `pos`, behind the braced comments that start there (C2-I-026). */
export declare function characterAfter(state: InlineState, pos: number): number;
/** C2-I-010 to C2-I-012, C2-I-102. */
export declare function scanBackslash(state: InlineState, pos: number): number;
/** C2-I-103: a soft break, with the spaces and tabs before it. */
export declare function scanLineBreak(state: InlineState, pos: number): number;
export declare function scanBacktick(state: InlineState, pos: number): number;
/** C2-I-018: the literal-text span. The image opener is read by the bracket scanner. */
export declare function scanLiteralSpan(state: InlineState, pos: number): number;
/** C2-I-019: inline and display math. A dollar sign with no backtick run behind it is text. */
export declare function scanDollar(state: InlineState, pos: number): number;
export declare function scanLess(state: InlineState, pos: number): number;
/** C2-I-023: `%%` at the start of a line or after whitespace, to the end of its line. */
export declare function scanPercent(state: InlineState, pos: number): number;
/** C2-I-043: the forms at an opening brace, in their order. */
export declare function scanBrace(state: InlineState, pos: number): number;
export declare function scanAtSign(state: InlineState, pos: number): number;
export declare function scanHash(state: InlineState, pos: number): number;
type BracketOpener = (state: InlineState, start: number, end: number, form: number) => number;
/** C2-I-093, C2-I-094: a symbol, or the opener of an inline extension, which `open` pushes. */
export declare function scanColon(state: InlineState, pos: number, open: BracketOpener): number;
export {};
