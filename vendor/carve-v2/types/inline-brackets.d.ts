import { type InlineState } from './inline-state.js';
/** Pushes a bracket opener that spans `[start, end)`. C2-I-118: past the cap it is text. */
export declare function openBracket(state: InlineState, start: number, end: number, form: number): number;
export declare function scanBracketOpen(state: InlineState, pos: number): number;
/** C2-I-089: `^[` opens an inline footnote. */
export declare function scanFootnoteOpen(state: InlineState, pos: number): number;
/** C2-I-074: `![` opens what may become an image. */
export declare function scanImageOpen(state: InlineState, pos: number): number;
/** C2-I-006: a closing bracket pairs with the nearest open one. With none it is text. */
export declare function scanBracketClose(state: InlineState, pos: number): number;
/** C2-I-119: at the end of the content every bracket that is still open is text. */
export declare function failOpenBrackets(state: InlineState): void;
