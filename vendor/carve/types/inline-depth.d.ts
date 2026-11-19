import { type InlineState } from './inline-state.js';
/** Whether an opener read now is text: 200 entries are open. */
export declare function atDepthCap(state: InlineState): boolean;
export declare function enterBracket(state: InlineState): void;
/** C2-I-006, C2-I-007: a construct removes the entries inside it; a pair that forms none bounds nothing. */
export declare function leaveBracket(state: InlineState, formed: boolean): void;
/** A bare delimiter `token` (C2-I-051, C2-I-053). At the cap one that would open is text. */
export declare function countBare(state: InlineState, token: number): void;
/** C2-I-024: the token of the innermost braced opener open above the innermost open bracket, or NONE. */
export declare function innermostBracedOpener(state: InlineState): number;
export declare function countBracedOpen(state: InlineState, token: number): void;
/** C2-I-057, C2-I-061: a braced closer `token`. With no opener of its mark it is read as a bare delimiter. */
export declare function countBracedClose(state: InlineState, token: number): void;
