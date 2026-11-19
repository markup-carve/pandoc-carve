/** C2-N-034: line `i` is `[starts[i], ends[i])` without its line ending; `nexts[i]` is where the line after it starts. */
export interface FileLines {
    starts: number[];
    ends: number[];
    nexts: number[];
}
/**
 * C2-B-010, C2-N-034: a line ends at LF, a CR before that LF is not part of it, a final line ending begins no further
 * line, and a leading U+FEFF is not content, so an empty file and one that holds only U+FEFF have no lines.
 */
export declare function fileLines(text: string): FileLines;
/** A range of lines by index, `from` included and `to` excluded. */
export interface LineRange {
    from: number;
    to: number;
}
/** C2-B-205: the two numbers of a range option that the parse already found in shape. */
export declare function rangeBounds(value: string): [number, number];
/** C2-N-035: the lines of `@lines:N-M`, clipped at the last line, or null when the range starts past it. */
export declare function lineRange(value: string, count: number): LineRange | null;
interface Marker {
    kind: number;
    name: string;
}
/** C2-N-038 to C2-N-040: the region marker on the line, a malformed marker, or none. */
export declare function readMarker(line: string, code: boolean): Marker;
/** C2-B-137, C2-B-217: whether the source line `[start, end)` is a well-formed region marker line of a Carve file. */
export declare function isRegionMarkerLine(src: string, start: number, end: number): boolean;
/** True when line `index` is a well-formed region marker of a code include (C2-N-046). */
export declare function isMarkerLine(text: string, lines: FileLines, index: number): boolean;
/** Why a region selects nothing, as the message of `include-region-invalid` says it. */
export declare const REGION_MALFORMED = "has a malformed or unmatched marker in the file";
export declare const REGION_MISSING = "is not opened in the file";
/**
 * C2-N-037, C2-N-041: the lines strictly between the markers of the region `name`, or the reason there are none.
 * C2-N-046: a line of a table include that `quoted` marks stands inside a quoted field and is no marker.
 */
export declare function regionRange(text: string, lines: FileLines, name: string, code: boolean, quoted?: (index: number) => boolean): LineRange | string;
/** C2-N-043: the payload of a code include: one line feed after each selected line; a lone CR stays content (C2-B-010). */
export declare function payloadOf(text: string, lines: FileLines, range: LineRange, skip: (index: number) => boolean): string;
/** What a line of a table include is (C2-N-046): the start of a record, a line inside a quoted field, or a marker. */
export declare const RECORD_START = 0;
export declare const RECORD_QUOTED = 1;
export declare const RECORD_MARKER = 2;
/** C2-N-046: the kind of each line of a `csv` or `tsv` file; a marker is recognized only outside a quoted field. */
export declare function recordKinds(text: string, lines: FileLines, tsv: boolean): number[];
/** A selected region: its text and its 1-based lines in the file, or why the directive refuses it. */
export type RegionResult = {
    ok: true;
    text: string;
    start: number;
    end: number;
} | {
    ok: false;
    reason: string;
};
/**
 * C2-N-037 to C2-N-043: region `name` of `text` as an include directive selects it. A code include gets its payload,
 * one line feed after each line, and a Carve include gets the lines as they stand. `start` and `end` are the first and
 * last selected line; an empty region has `end` one less than `start`. Where the directive would report
 * `region_invalid`, `reason` is its reason.
 */
export declare function includeRegion(text: string, name: string, code: boolean): RegionResult;
export {};
