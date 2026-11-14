export declare function skipSpaces(src: string, pos: number, end: number): number;
/** Length of the run of `code` at `pos`. */
export declare function runLength(src: string, pos: number, end: number, code: number): number;
/** C2-B-031: `>` followed by a space or by the end of the line. */
export declare function isQuoteMark(src: string, pos: number, end: number): boolean;
/** Offset after the glued brace blocks at `pos`; `pos` itself when there are none (C2-B-093). */
export declare function braceBlocksEnd(src: string, pos: number, end: number): number;
/** C2-B-090: one or more glued brace blocks, each a valid attribute block, alone on the line. */
export declare function isAttributeLine(src: string, pos: number, end: number): boolean;
/** C2-B-156, C2-B-201, C2-B-206: an include directive alone on its line. */
export declare function isIncludeLine(src: string, pos: number, end: number): boolean;
/** Offset after the space of the bullet marker at `pos`, or -1. Brace blocks may abut the marker (C2-B-034, C2-B-101). */
export declare function bulletMarkerEnd(src: string, pos: number, end: number): number;
/** Value of the roman letter `code` in either case, or 0. */
export declare function romanLetterValue(code: number): number;
/**
 * Offset of the delimiter of the ordered marker at `pos`, or -1 (C2-B-036). Before it stand one
 * to nine digits, one letter, two or more roman letters of one case, or nothing before a dot.
 */
export declare function orderedDelimiter(src: string, pos: number, end: number): number;
/** Offset after the spaces of the ordered marker whose delimiter is at `delimiter`, or -1. */
export declare function orderedMarkerEnd(src: string, pos: number, delimiter: number, end: number): number;
/** C2-B-015: the list marker at `pos` is a bullet or an ordered marker with the value 1, so it may open a list in a paragraph. */
export declare function opensListInParagraph(src: string, pos: number, end: number): boolean;
/** True when a list marker with content stands at `pos`. */
export declare function isListMarker(src: string, pos: number, end: number): boolean;
/** Value of the digits between `pos` and `end`. */
export declare function decimalValue(src: string, pos: number, end: number): number;
/** Value of the roman numeral between `pos` and `end`. */
export declare function romanValue(src: string, pos: number, end: number): number;
/** Offset after the space of the task box at `pos`, or -1 (C2-B-046). */
export declare function taskBoxEnd(src: string, pos: number, end: number): number;
/** Offset after the space of the term mark `::` at `pos`, or -1 (C2-B-067). */
export declare function termMarkEnd(src: string, pos: number, end: number): number;
/** Offset after the space of the description mark `:` at `pos`, or -1 (C2-B-067). */
export declare function descriptionMarkEnd(src: string, pos: number, end: number): number;
/** True when a term mark or a description mark with content stands at `pos`. */
export declare function isDescriptionListMark(src: string, pos: number, end: number): boolean;
/** Heading level of the `=` or `#` run at `pos`, or 0 (C2-B-151, C2-B-152). */
export declare function headingLevel(src: string, pos: number, end: number): number;
/** Length of the backtick run at `pos` when it opens a code fence, or 0. A tilde run is text (C2-B-108). */
export declare function fenceOpenerLength(src: string, pos: number, end: number): number;
/** Length of the run of `code` at `pos` when it has three or more characters, or 0 (C2-B-108). */
export declare function fenceRunLength(src: string, pos: number, end: number, code: number): number;
/** C2-B-014: a line that opens or closes a code fence, a div or a comment block. */
export declare function isFenceLine(src: string, pos: number, end: number): boolean;
/**
 * Length of the colon run at `pos` when it is a div line, or 0. The run is bare, or a space stands
 * behind it: a name or a sigil glued to the run makes the line text (C2-B-119, C2-B-196).
 */
export declare function divRunLength(src: string, pos: number, end: number): number;
/** C2-B-109, C2-B-110: a bare run of `code`, at least `minLength` long. */
export declare function isBareRun(src: string, pos: number, end: number, code: number, minLength: number): boolean;
/** The sigil of a div opener whose colon run ends at `pos`, or 0 for a name or nothing (C2-B-123, C2-B-124). */
export declare function divSigil(src: string, pos: number, end: number): number;
/** True when the colon run that ends at `pos` is followed by `figure` and nothing else (C2-B-127). */
export declare function isFigureName(src: string, pos: number, end: number): boolean;
/** C2-B-159: three or more stars and nothing else. */
export declare function isThematicBreak(src: string, pos: number, end: number): boolean;
/** True when a line comment starts at `pos`. Three percent signs open a comment block instead (C2-B-108). */
export declare function isLineComment(src: string, pos: number, end: number): boolean;
/** Offset of the content of the caption line at `pos`, or -1 (C2-B-146). */
export declare function captionContentStart(src: string, pos: number, end: number): number;
/** Offset after the space of the footnote definition marker `[^label]:` at `pos`, or -1 (C2-B-082). */
export declare function footnoteMarkerEnd(src: string, pos: number, end: number): number;
/**
 * C2-B-083: the end of the destination of a link definition whose tail starts at `p`, or -1. The tail is that of
 * an inline link (C2-I-067, C2-I-068) with a destination of at least one character: a run without whitespace, then
 * optionally exactly one space and a title in double or single quotes, then only spaces.
 */
export declare function definitionDestinationEnd(src: string, p: number, end: number): number;
export declare function isLinkDefinition(src: string, pos: number, end: number): boolean;
/** Offset after the quoted string at `pos`, or -1. */
export declare function quotedEnd(src: string, pos: number, end: number, quote?: number): number;
/** C2-B-084: `*[label]:` with a label of ASCII letters and digits, a space and an expansion that is not empty. */
export declare function isAbbreviation(src: string, pos: number, end: number): boolean;
/** True when a definition of any of the three kinds stands at `pos` (C2-B-016). */
export declare function isDefinition(src: string, pos: number, end: number): boolean;
/** C2-B-197: exactly one image form, `![alt](destination)` or `![alt][label]`, with optional glued brace blocks. */
export declare function isImageOnly(src: string, pos: number, end: number): boolean;
/** C2-B-198: exactly one display math span, `$$` glued to a code span, with optional glued brace blocks. */
export declare function isDisplayMathOnly(src: string, pos: number, end: number): boolean;
/**
 * C2-B-161, C2-B-164: exactly `---`, then a format name of lowercase letters, digits and hyphens,
 * glued or after one space, or nothing, and trailing spaces.
 */
export declare function isFrontmatterOpener(src: string, pos: number, end: number): boolean;
/** C2-B-162: exactly `---` plus trailing spaces and tabs. */
export declare function isFrontmatterCloser(src: string, pos: number, end: number): boolean;
/** True when the info string of the fence whose run ends at `pos` is `=` and a format name (C2-B-116). */
export declare function isRawInfo(src: string, pos: number, end: number): boolean;
/** True when the word at `pos` is `word` and ends there. */
export declare function isWord(src: string, pos: number, end: number, word: string): boolean;
/**
 * The value of the key `key` on the attribute lines between `pos` and `end`, or null when no block
 * there holds it. The last one written counts (C2-A-035), and a bare key has the empty value.
 */
export declare function attributeKeyValue(src: string, pos: number, end: number, key: string): string | null;
/** C2-B-210: the count that `value` spells: one or more digits, or 1 for the empty value. -1 for any other value and for null. */
export declare function countValue(value: string | null): number;
/**
 * The pipes that separate cells between `pos` and `end`, in order (C2-B-169). A pipe is no
 * separator when it is escaped or stands between a backtick run and its matching closing run.
 */
export declare function separatorPipes(src: string, pos: number, end: number): number[];
/** Offset of the brace block of the row attribute behind the closing pipe at `pipe`, or -1 (C2-B-167). */
export declare function rowAttributeStart(src: string, pipe: number, end: number): number;
/**
 * Offset of the closing pipe of the table row at `pos`, or -1 (C2-B-166). The row starts with a
 * pipe and ends with another; a row attribute and a line comment may follow the last pipe (C2-B-167).
 */
export declare function rowClosingPipe(src: string, pos: number, end: number): number;
/** Offset of the closing pipe of the continuation row at `pos`, or -1 (C2-B-175, C2-B-177). */
export declare function continuationClosingPipe(src: string, pos: number, end: number): number;
/** Offset of the first bare `#` of a caption's text, the caption number mark, or -1 (C2-B-150). */
export declare function captionNumberMark(src: string, pos: number, end: number): number;
/** Offset after the last character between `pos` and `end` that is not a space or a tab. */
export declare function trimEnd(src: string, pos: number, end: number): number;
