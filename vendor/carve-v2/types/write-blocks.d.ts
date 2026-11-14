import { type Node } from './ast.js';
import { type BlockParts } from './write-attributes.js';
import { type Writer } from './write-state.js';
/** C2-W-047: the attributes of a block, as one brace block on the line above it. */
export declare function attributeLine(w: Writer, node: Node, prefix: string, extra?: BlockParts): void;
/** C2-W-017, C2-W-018, C2-W-028, C2-W-059: the blank lines between `before` and the block `node` below it. */
export declare function blankLinesBetween(w: Writer, before: Node, list: Node | null, node: Node, nested: boolean): number;
/**
 * Writes sibling blocks with the blank lines between them. In a tight list the nested list that
 * follows the first paragraph of its item takes no blank line (C2-W-018).
 */
export declare function writeBlocks(w: Writer, nodes: readonly Node[], prefix: string, flags: number, tight: boolean): void;
