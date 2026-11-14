import { type DocumentNode } from './ast.js';
import { type Diagnostic } from './diagnostics.js';
import { type WriterFacts } from './write-state.js';
/** One entry of a sidecar, as far as the writer reads it (C2-L-009, C2-L-046). */
export interface LayoutEntry extends WriterFacts {
    path: string;
}
export interface WriteOptions {
    /** The sidecar of the tree (C2-L-004). Only its node entries are read. */
    layout?: {
        nodes: readonly LayoutEntry[];
    };
    /** C2-W-068: pads the cells of each column of a pipe table to one display width. */
    alignTables?: boolean;
}
export interface WriteOutput {
    source: string;
    /** C2-W-011: what the writer could not write, in the render-loss channel. */
    diagnostics: Diagnostic[];
}
/** Writes a tree that is known to be valid. */
export declare function writeTree(document: DocumentNode, options: WriteOptions | undefined): WriteOutput;
/** The canonical Carve source of a tree, with what could not be written (C2-W-011). The tree is validated first. */
export declare function writeWithDiagnostics(document: DocumentNode, options?: WriteOptions): WriteOutput;
/** The canonical Carve source of a tree (C2-W-001). */
export declare function write(document: DocumentNode, options?: WriteOptions): string;
