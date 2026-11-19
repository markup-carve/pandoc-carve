import { type TableCellNode } from './ast.js';
import { type LayoutTrace } from './ast-inline.js';
import type { Wrap } from './layout.js';
import { type BlockNode } from './tree.js';
/** The rows of one table in source order, with the ranges of the continuation rows of each, read on demand. */
export interface TableRows {
    rows: BlockNode[];
    index: Map<BlockNode, number>;
    continuations: (number[] | undefined)[];
}
export declare function tableRows(table: BlockNode): TableRows;
/** C2-B-175: the start and the end of each continuation row of row `at`. A comment-only line between them is none. */
export declare function continuationRows(src: string, table: TableRows, at: number): number[];
/** The first and the last source offset of the pieces of a cell, between the pipes around them (C2-L-013). */
export declare function cellRange(src: string, table: TableRows, row: number, cell: BlockNode): [number, number];
/** C2-L-020: the wraps of the cell at `path`, whose own row is row `home` of `table`. */
export declare function cellWraps(src: string, trace: LayoutTrace, table: TableRows, home: number, node: TableCellNode, cell: BlockNode, path: string): Wrap[];
