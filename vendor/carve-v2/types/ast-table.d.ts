import { type CommentNode, type TableNode } from './ast.js';
import { type TreeContext } from './ast-inline.js';
import type { BlockNode } from './tree.js';
type CommentBuilder = (ctx: TreeContext, node: BlockNode) => CommentNode;
/** A pipe table. `comment` builds the node of a comment-only line between two rows. */
export declare function tableNode(ctx: TreeContext, node: BlockNode, comment: CommentBuilder): TableNode;
/** C2-B-180: a `csv` or `tsv` fence that the `table` attribute marks. Its cells are plain text with no position (C2-A-158). */
export declare function delimitedTableNode(ctx: TreeContext, node: BlockNode): TableNode;
export {};
