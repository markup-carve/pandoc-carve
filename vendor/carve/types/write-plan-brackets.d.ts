import { type Leaf } from './write-plan-model.js';
/** C2-I-089, C2-I-055: a bare caret of text opens `^[`, unless a bare `{` of text before it makes `{^` of it. */
export declare function isFootnoteCaret(leaf: Leaf, at: number, escaped: Uint8Array): boolean;
export declare function checkBrackets(leaf: Leaf, escaped: Uint8Array, hasKeys: boolean): void;
