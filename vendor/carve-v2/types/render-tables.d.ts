/** C2-H-144: the code points that never reach a slug. */
export declare const SLUG_REMOVED: readonly number[];
/** C2-H-145: the glyphs a slug writes as their ASCII source. */
export declare const SLUG_REVERSED: ReadonlyMap<string, string>;
/** C2-H-159: the ranges of code points that are removed from a destination before its scheme is read. */
export declare const PROBE_REMOVED: readonly (readonly [number, number])[];
/** C2-H-161: the attribute names that are never written, and the prefixes of such names. */
export declare const DROPPED_NAMES: readonly string[];
export declare const DROPPED_PREFIXES: readonly string[];
/** C2-H-161: the attributes that hold a list of URLs, and whether a comma separates its entries besides whitespace. */
export declare const URL_LIST_ATTRIBUTES: ReadonlyMap<string, boolean>;
/** C2-H-162: the texts that blank a `style` value. */
export declare const STYLE_PATTERNS: readonly string[];
/** C2-H-163: what a profile accepts. A list that is null does not restrict, and -1 is no bound. */
export interface ProfileRule {
    deniedBlock: readonly string[] | null;
    deniedInline: readonly string[] | null;
    allowedBlock: readonly string[] | null;
    allowedInline: readonly string[] | null;
    linkRel: string;
    maxNesting: number;
    maxLength: number;
}
export declare const PROFILES: ReadonlyMap<string, ProfileRule>;
/**
 * C2-B-205, C2-B-206: the shape of the value of each include option, and what a line is when the option has no value,
 * a value outside the shape, or stands twice.
 */
export interface IncludeOptionRule {
    value: string;
    withoutValue: string;
    outsideShape: string;
    repeated: string;
}
/** In the order of C2-A-181. */
export declare const INCLUDE_OPTIONS: ReadonlyMap<string, IncludeOptionRule>;
