import { type InlineState } from './inline-state.js';
/** A slash or a star (C2-I-046). A mark before `}` may be a braced closer (C2-I-057). */
export declare function scanBareMark(state: InlineState, pos: number): number;
/** A mark that is no bare delimiter: before `}` it may be a braced closer, and otherwise it is text. */
export declare function scanBracedMark(state: InlineState, pos: number): number;
/** Pairs the delimiters of the content. Tokens that form no node become text. */
export declare function pairDelimiters(state: InlineState): void;
