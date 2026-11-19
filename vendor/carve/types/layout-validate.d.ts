import { type SourceLayout } from './layout.js';
/** A record that a reader refuses. `path` is an RFC 6901 pointer to the field inside the record. */
export declare class CarveLayoutError extends Error {
    path: string;
    reason: string;
    constructor(path: string, reason: string);
}
/** C2-L-011: below 0 when the node at `a` comes before the node at `b` in a walk, a node before the nodes inside it. */
export declare function compareDocumentOrder(a: string, b: string): number;
/** Returns `value` as a record, or throws a `CarveLayoutError` for a record the document refuses. */
export declare function validateLayout(value: unknown): SourceLayout;
