import { type ListNode, type Node } from './ast.js';
import { type Writer } from './write-state.js';
interface ListMarkers {
    /** The marker of each item, without the space behind it. */
    markers: string[];
    /** C2-B-045: the start value that no first marker can carry, for the attribute line. */
    start: string | null;
}
/** The markers of the items of `node`, and the start value for its attribute line. */
export declare function listMarkers(w: Writer, node: ListNode): ListMarkers;
/** C2-B-049, C2-B-053: whether the list `b` directly after the list `a` would continue it. */
export declare function sameListKind(a: Node, b: Node): boolean;
export {};
