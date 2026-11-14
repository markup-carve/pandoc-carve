import { type InlineState } from './inline-state.js';
/**
 * True when `src[start, end)`, one line, is one run of text for the inline pass: ASCII characters
 * that are text wherever they stand, with no space or tab at either end (C2-I-002). Such a content
 * needs no pass, and half of the contents of an ordinary document are of this kind.
 */
export declare function isPlainText(src: string, start: number, end: number): boolean;
/**
 * Reads the inline content of the source spans `spans[from..to)` (start and end pairs) and
 * leaves its events in the state. `baseDepth` is the number of open containers around the
 * content (C2-I-118). A line block reads no line comment (C2-B-144).
 */
export declare function scanInline(state: InlineState, src: string, spans: ArrayLike<number>, from: number, to: number, baseDepth: number, lineComments: boolean): void;
