import { type Inline } from './ast.js';
import { type TreeContext } from './ast-inline.js';
/** Replaces, in place, the defined terms in the text of one content by abbreviation nodes. */
export declare function applyAbbreviations(ctx: TreeContext, nodes: Inline[]): void;
