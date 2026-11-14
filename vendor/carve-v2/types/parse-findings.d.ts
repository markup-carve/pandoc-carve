import { type Node } from './ast.js';
import { type Findings } from './diagnostics.js';
import type { BlockNode } from './tree.js';
export declare const UNCLOSED = 0;
export declare const TITLE_SYNTAX = 1;
export declare const DELIMITED_MALFORMED = 2;
/** A finding noted while the tree is built: what it is, the public node it is about and the block it came from. */
export interface ParseNote {
    what: number;
    node: Node;
    block: BlockNode;
    /** For TITLE_SYNTAX: where the opener text that is no word, title or label starts; -1 for a raw fence. */
    from: number;
}
/** Adds the findings of `notes`, in document order, to `findings`. */
export declare function addParseFindings(src: string, notes: readonly ParseNote[], findings: Findings): void;
