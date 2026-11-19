import type { BlockNode } from './tree.js';
export interface DelimitedTable {
    rows: string[][];
    headRows: number;
    declared: boolean;
    malformed: boolean;
    malformedSourceAt: number;
}
export declare function readDelimitedTable(src: string, node: BlockNode): DelimitedTable;
