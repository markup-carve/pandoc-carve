import { type Node } from './ast.js';
import type { NodeLayout } from './layout.js';
import { type BlockNode } from './tree.js';
export type Facts = Omit<NodeLayout, 'path' | 'startByte' | 'endByte'>;
/** Adds to `facts` what the block `origin` of the node `node` states about its own spelling. */
export declare function measureBlock(src: string, node: Node, origin: BlockNode, quotes: number, facts: Facts): void;
