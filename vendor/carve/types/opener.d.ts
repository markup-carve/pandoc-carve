export interface OpenerInfo {
    wordStart: number;
    wordEnd: number;
    titleStart: number;
    titleEnd: number;
    labelStart: number;
    labelEnd: number;
    extra: boolean;
    extraStart: number;
}
/** Whether `word` reads whole as the language word of a fence, or with `raw` as the format of a raw block (C2-B-116, C2-B-117). */
export declare function isFenceWord(word: string, raw: boolean): boolean;
/**
 * Reads the opener line from `pos`, the offset behind the run. The parts stand in order and spaces
 * separate them: what is glued to a part, or follows the parts, is further words (C2-B-122).
 */
export declare function readOpenerInfo(src: string, pos: number): OpenerInfo;
/**
 * The label of the footnote, link or abbreviation definition that starts at `pos`, as the offsets
 * behind its opening bracket and of its closing bracket (C2-B-082 to C2-B-084). Which definition
 * of a label wins is decided at resolution (C2-B-085).
 */
export declare function definitionLabel(src: string, pos: number): [number, number];
/** The word of the opener whose run ends at `pos`: a fence language, a raw format with its `=`, a div name or a sigil. */
export declare function openerWord(src: string, pos: number): string;
/**
 * C2-B-127: the div opener whose run ends at `pos` names `figure` with no title and no label, so it
 * gives a figure group. Further words and an attribute block are neither (C2-B-105, C2-B-122).
 */
export declare function isFigureOpener(src: string, pos: number): boolean;
