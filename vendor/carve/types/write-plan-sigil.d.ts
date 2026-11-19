import { type Leaf } from './write-plan-model.js';
export declare const NO_NAME = 0;
export declare const NAME = 1;
export declare const UNKNOWN = 2;
/** NAME where a name with a letter follows the sigil at `at`, NO_NAME where none does, UNKNOWN otherwise. */
export declare function sigilName(leaf: Leaf, at: number): number;
/**
 * C2-I-093, C2-I-094: what a colon of text after a boundary starts: NAME for a symbol, NO_NAME for nothing or
 * an inline extension of text, whose bracket is paired later, UNKNOWN for a name that runs into a node.
 */
export declare function colonName(leaf: Leaf, at: number): number;
