import { type InlineState } from './inline-state.js';
/** Offset in the source of the offset `pos` of the content. Offsets are asked for in rising order. */
export declare function toSource(state: InlineState, pos: number): number;
/** Writes the text `[from, to)` of the content, with its smart punctuation. */
export declare function writeText(state: InlineState, from: number, to: number): void;
/** Sets the typography state as it is at the start of a content, or of the content of a node. */
export declare function startOfContent(state: InlineState): void;
