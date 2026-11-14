import type { BlockNode } from './tree.js';
export interface DelimitedTable {
    rows: string[][];
    headRows: number;
    declared: boolean;
    malformed: boolean;
}
export declare function readDelimitedTable(src: string, node: BlockNode): DelimitedTable;
