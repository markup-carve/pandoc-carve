/** The offset of the first character of the line that holds `pos`. */
export declare function lineStartOf(src: string, pos: number): number;
/** The offset behind the last character of the line that holds `pos`, before its line ending. */
export declare function lineEndOf(src: string, pos: number): number;
/** Where a line stands behind its quote marks: the offset, the column from the start of the line and the column that counts as 0. */
interface Prefix {
    pos: number;
    column: number;
    origin: number;
    marks: number;
}
/** C2-B-003: reads at most `quotes` quote marks from `start`, each with its one space. */
export declare function readPrefix(src: string, start: number, end: number, quotes: number): Prefix;
/** C2-B-003 to C2-B-005: the zero-based column of `offset` inside `quotes` open quotes. Tab stops count from the start of the line. */
export declare function columnOf(src: string, offset: number, quotes: number): number;
/** C2-L-026: the blank lines directly above the line of `start`, down to the first line of the container that starts at `floor`. */
export declare function blankLinesBefore(src: string, start: number, floor: number, quotes: number): number;
/**
 * C2-L-026: the blank lines directly below the line of `end`. They stop at `limit`, the end of the
 * container, unless the container is `open`: a quote ends at its last content, and the blank
 * lines that carry its mark are still inside it.
 */
export declare function blankLinesAfter(src: string, end: number, limit: number, quotes: number, open: boolean): number;
/**
 * C2-L-053: the end of the last line behind `end` that carries exactly `quotes` quote marks and
 * nothing else, or `end`. Such lines belong inside the quote and do not count after it.
 */
export declare function markedBlankEnd(src: string, end: number, quotes: number): number;
/** C2-L-012: the UTF-8 byte offset of every string offset of `src`. */
export declare function byteOffsets(src: string): (offset: number) => number;
export {};
