import { type Node } from './ast.js';
/** Whether the code unit at `at` of `text` is the second half of a surrogate pair, so no character starts there. */
export declare function isSecondHalf(text: string, at: number): boolean;
/**
 * Bytes in UTF-8 of the code unit at `at` of `text`. A surrogate pair is four bytes, counted as two per half;
 * an unpaired surrogate is encoded as U+FFFD, three bytes, as UTF-8 encoders do.
 */
export declare function unitBytes(text: string, at: number): number;
/** The number of UTF-8 bytes of `src` (C2-A-010). */
export declare function utf8Length(src: string): number;
/**
 * The string offset of the UTF-8 byte offset `byte` of `src`, for a caller that holds a position
 * of the tree and an editor that counts in string offsets. An offset inside a character gives
 * the offset of that character, never the second half of a surrogate pair.
 */
export declare function stringOffsetOfByte(src: string, byte: number): number;
/** Replaces the string offsets the tree builder stored in every `pos` by the six integers of C2-A-140. */
export declare function finishPositions(root: Node, src: string): void;
