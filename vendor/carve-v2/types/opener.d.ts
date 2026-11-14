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
/** Reads the opener line from `pos`, the offset behind the run. */
export declare function readOpenerInfo(src: string, pos: number): OpenerInfo;
/**
 * The label of the footnote, link or abbreviation definition that starts at `pos`, as the offsets
 * behind its opening bracket and of its closing bracket (C2-B-082 to C2-B-084). Which definition
 * of a label wins is decided at resolution (C2-B-085).
 */
export declare function definitionLabel(src: string, pos: number): [number, number];
