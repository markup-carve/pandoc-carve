/** Offsets up to which a search for the end of a value has already failed, so no opener repeats it. */
export interface AttributeMemo {
    doubleQuoteFailEnd: number;
    singleQuoteFailEnd: number;
    valueFailEnd: number;
}
/** A memo with no failed read yet. Its offsets belong to one source, so a memo is never shared between sources. */
export declare function emptyMemo(): AttributeMemo;
export interface AttributeSink {
    id(name: string): void;
    className(name: string): void;
    lang(tag: string): void;
    key(key: string, value: string): void;
}
/** End of the run of characters of the class `mask` that starts at `pos`. */
export declare function classRunEnd(text: string, pos: number, end: number, mask: number): number;
/** C2-I-028: the offset behind the closing brace of the valid block at `pos`, or NONE. */
export declare function readAttributeBlock(text: string, pos: number, end: number, memo: AttributeMemo, sink: AttributeSink | null): number;
/** C2-I-040: the offset behind the block with no part at `pos`, or NONE. */
export declare function emptyBlockEnd(text: string, pos: number, end: number): number;
/** The text of `[start, end)` with each backslash before ASCII punctuation dropped (C2-I-010). */
export declare function unescape(text: string, start: number, end: number): string;
