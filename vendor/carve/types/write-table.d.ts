import { type TableNode } from './ast.js';
import { type Writer } from './write-state.js';
export declare function writeTable(w: Writer, table: TableNode, prefix: string, flags: number): void;
/** C2-W-122: the same table attribute line before an intervening comment as before the table itself. */
export declare function tableAttribute(w: Writer, table: TableNode): string;
