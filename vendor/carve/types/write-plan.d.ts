import { type Node, type TextNode } from './ast.js';
import { OPEN } from './write-plan-model.js';
import { type LeafPlace } from './write-plan-lines.js';
import { type Writer } from './write-state.js';
/** What one planned write of a group collects. */
export interface Plan {
    undecided: string | null;
    /** Where the plan lost its decision: the leaf around the unit, for the report of the gates. */
    detail: string;
    /** The text nodes that a planned leaf holds. */
    covered: Set<TextNode>;
    /** The escapes the plan places, by text node, in ascending order. */
    escapes: Map<TextNode, number[]>;
    /** C2-W-069: the bare emphasis and strong that the next write gives their braced form. */
    respell: Node[];
    /** Where each list of nodes of the group stands, for the rules of its line starts. */
    places: Map<readonly Node[], LeafPlace>;
    leaves: number;
    /** C2-W-016: the nodes whose value no spelling keeps, which the write reports. */
    lost: Node[];
}
export declare function createPlan(): Plan;
/** How the caller of a leaf ends it: as `writeContent`, as `writeInlines`, or as a line of a line block. */
export declare const AS_CONTENT = 0;
export declare const AS_INLINES = 1;
export declare const AS_LINE = 2;
/** Where the first unit of a leaf stands: at the start of a content line, or behind a mark on its line. */
export declare const LINE_START = 1;
export declare const AFTER_MARK = 0;
export declare const IN_TITLE = 2;
/** Records where every list of nodes below `nodes` stands, and the blocks whose spelling the plan does not check. */
export declare function notePlaces(plan: Plan, nodes: readonly Node[], first: boolean): void;
/**
 * The hook of every inline leaf: `content` is what the writer wrote for `nodes`. While a group is
 * planned, the leaf is modelled, compared with `content` and analysed. Returns `content`.
 */
export declare function planLeaf(w: Writer, nodes: readonly Node[], flags: number, content: string, end: number, start: number): string;
/** A leaf the planner does not model: the group it stands in is undecided. */
export declare function unplanned(w: Writer, why: string): void;
export { OPEN };
