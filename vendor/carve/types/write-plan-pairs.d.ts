import { type Leaf } from './write-plan-model.js';
/** C2-I-047, C2-I-048. */
export declare function flanking(leaf: Leaf, at: number): number;
/** C2-W-093: every pair the reader forms is a node of the tree, and the marks of every delimited node pair. */
export declare function checkPairs(leaf: Leaf, escaped: Uint8Array): void;
