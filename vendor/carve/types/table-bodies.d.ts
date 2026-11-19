import { type Attributes } from './ast-attributes.js';
export declare const BODY_KEYS: readonly ["body-rows", "body-header-rows", "body-header-cols"];
export interface BodyPartition {
    /** The data rows of each body. */
    data: number[];
    /** The rows of header cells that lead each body. */
    header: number[];
    /** The `rowHeadColumns` of each body, or null for an empty entry. */
    columns: (number | null)[];
}
/** The partition of the `between` rows between the head and the foot, or null where the keys have no effect. */
export declare function bodyPartition(attributes: Attributes | null, between: number): BodyPartition | null;
/** The row index, counted from the first row below the head, at which each body starts. */
export declare function bodyStarts(partition: BodyPartition): number[];
