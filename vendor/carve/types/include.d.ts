import { type IncludeNode, type IncludeOptions, type Node } from './ast.js';
/** An invalid option of a directive (C2-B-206). */
export interface IncludeProblem {
    start: number;
    end: number;
    reason: string;
}
/** The parts of an include node (C2-A-181). */
interface IncludeParts {
    path: string;
    section: string | null;
    options: IncludeOptions;
    optionSpelling: Record<string, string>;
    /** C2-A-181: the invalid options as written, in source order. */
    invalid: string[];
    /** C2-B-206: per invalid option, its source range and why it is invalid. */
    problems: IncludeProblem[];
    /** The offset behind the closing braces, where the node ends (C2-A-182). */
    end: number;
}
/** C2-B-205: an identifier, the shape of a region name. */
export declare function isIncludeIdentifier(value: string): boolean;
/** C2-B-205: `N-M`, two decimal numbers without a leading zero, the first at least 1 and not greater than the second. */
export declare function isRange(value: string): boolean;
/** Why an include option is invalid (C2-B-206), as the message of `include-option-invalid` says it. */
export declare const INCLUDE_KEY_UNKNOWN = "has a key that is not an include option";
export declare const INCLUDE_VALUE_MISSING = "needs a value";
export declare const INCLUDE_VALUE_SHAPE = "has a value outside the shape of its key";
export declare const INCLUDE_KEY_REPEATED = "repeats a key that stands earlier in the directive";
/** C2-B-206: why the option `key` with the value `written` (null for none) is invalid, or null when it is valid. */
export declare function optionProblem(key: string, written: string | null, repeated: boolean): string | null;
/** C2-A-181: one decoded option value. */
export declare function decodedOption(key: string, written: string | null): string | string[] | number | true;
/** The include directive on the line `[pos, end)`, or null when the line has another shape (C2-B-201, C2-B-203, C2-B-206). */
export declare function readInclude(src: string, pos: number, end: number): IncludeParts | null;
/**
 * C2-N-072 (open point 3 of the Includes document): whether the own attributes of `node` act. Those of an include are
 * inert: no anchor, no duplicate, no reservation. Only the copy in the child of a code include acts.
 */
export declare function attributesAct(node: Node): boolean;
/**
 * C2-W-058, C2-A-181: the field of `node` that its spelling `source` does not read back: a typed option outside its
 * shape reads as invalid, and an invalid entry can read as valid or as another entry. Null where both read back.
 */
export declare function unreadField(node: IncludeNode, source: string): 'options' | 'invalid' | null;
/** C2-W-058, C2-H-133, C2-H-171: the one spelling of an include directive, which the writer writes and the renderer shows. */
export declare function includeSource(node: IncludeNode, spelling?: Record<string, string>): string;
export {};
