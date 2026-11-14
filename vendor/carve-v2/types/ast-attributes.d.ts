import { type AttributeSink } from './attributes.js';
/** The merged attribute blocks of a host, in the fixed order of C2-I-041. */
export interface Attributes {
    id: string | null;
    classes: string[];
    lang: string | null;
    keyValues: [string, string][];
    /** The place of each key in `keyValues` by its lower-case name, built when a key is merged and dropped when one is taken. */
    keyIndex?: Map<string, number>;
}
/**
 * C2-I-079: every run of spaces, tabs and line breaks is one space, and the ends are trimmed of
 * those. A no-break space and every other character are kept as they stand.
 */
export declare function foldLabel(source: string): string;
/** C2-I-039, C2-I-042: adds the parts of one block to `attributes`. */
export declare function attributeSink(attributes: Attributes): AttributeSink;
export declare function emptyAttributes(): Attributes;
/** C2-B-093: adds the glued blocks that start at `pos` to `attributes` and returns the offset behind them. */
export declare function readGluedBlocks(src: string, pos: number, end: number, attributes: Attributes): number;
/** C2-B-102: the attribute lines of a block, merged in the order written. `spans` holds a start and an end per line. */
export declare function readAttributeLines(src: string, spans: number[] | null): Attributes | null;
/** Removes the key `name` from `attributes` and returns its value, or null when it is not there. */
export declare function takeKey(attributes: Attributes | null, name: string): string | null;
