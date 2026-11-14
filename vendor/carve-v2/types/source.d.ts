/** Index of the line that holds `offset`. The line ending belongs to its line. */
export declare function lineAt(lineStarts: Int32Array, lineCount: number, offset: number): number;
/** The offset of the line feed behind `pos`, or the end of the source. */
export declare function lineFeedAt(src: string, pos: number): number;
/** Offset of the end of line `line`, before its line ending. */
export declare function lineEndAt(src: string, lineStarts: Int32Array, lineCount: number, line: number): number;
/** Column after the character `code` that starts at `column` (C2-B-004). */
export declare function advanceColumn(column: number, code: number): number;
/** Column of `offset`, counted from the start of its line (C2-B-005). */
export declare function columnAt(src: string, lineStarts: Int32Array, lineCount: number, offset: number): number;
export declare function isSpaceOrTab(code: number): boolean;
/** `text` without the whitespace at its end: spaces, tabs and line feeds, and no other Unicode space. */
export declare function trimEndWhitespace(text: string): string;
/** `text` without the spaces and tabs at its ends. Unlike `String.prototype.trim` it keeps a no-break space and other Unicode spaces. */
export declare function trimSpaces(text: string): string;
