import { type Node } from './ast.js';
import { type Leaf } from './write-plan-model.js';
/** C2-W-078: the smart punctuation atoms of the leaf read back as themselves. */
export declare function checkSmart(leaf: Leaf, at: number, node: Node): void;
