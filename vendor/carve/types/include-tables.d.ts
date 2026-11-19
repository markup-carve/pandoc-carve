/** C2-N-061: one failure cause, its code, and whether it is tested before, by or after the resolver. */
export interface IncludeCause {
    name: string;
    code: string;
    stage: string;
}
/** C2-N-061: the causes in the order they are tested. */
export declare const INCLUDE_CAUSES: ReadonlyMap<string, IncludeCause>;
/** C2-N-024: the option combinations that keep an include from being expanded. */
export interface IncludeConflict {
    name: string;
    rule: string;
    options: readonly string[];
}
export declare const INCLUDE_CONFLICTS: readonly IncludeConflict[];
export declare const INCLUDE_BYTES = 8388608;
export declare const INCLUDE_DEPTH = 16;
/** The message templates of the include codes, in which `${name}` stands for a value. */
export declare const INCLUDE_MESSAGES: ReadonlyMap<string, string>;
/** C2-B-206: one message for each invalid include option cause, in catalog order. */
export declare const INCLUDE_OPTION_MESSAGES: readonly string[];
