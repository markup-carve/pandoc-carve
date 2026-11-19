import { type DocumentNode } from './ast.js';
import { type Diagnostic } from './diagnostics.js';
import { type WriterFacts } from './write-state.js';
import { type ExtensionDefinition } from './extensions/types.js';
/** One entry of a sidecar, as far as the writer reads it (C2-L-009, C2-L-046). */
export interface LayoutEntry extends WriterFacts {
    path: string;
}
export interface WriteOptions {
    extensions?: readonly ExtensionDefinition[];
    /** The sidecar of the tree (C2-L-004). Only its node entries are read. */
    layout?: {
        nodes: readonly LayoutEntry[];
    };
    /** C2-W-068: pads the cells of each column of a pipe table to one display width. */
    alignTables?: boolean;
    /**
     * C2-W-002: parses each written group of blocks once more and compares it with the tree. A group
     * that does not read back is written again by the repair of C2-W-089. On for `write` and
     * `writeWithDiagnostics` unless it is `false`; `format` writes the tree of its own parse with it off.
     */
    check?: boolean;
}
/** How the writer finds its escapes: by the plan (write-plan.ts), by the repair, or both, comparing them. */
export type WriterPath = 'plan' | 'repair' | 'both';
/** What a write reports about its own path, for the tests and the gates. */
export interface WriterStats {
    planned: number;
    repaired: number;
    /** Groups whose plan and repair wrote different lines, in `both`. */
    differences: string[];
    /** Why each group the plan did not decide was repaired, by reason, and one place of each reason. */
    reasons: Map<string, number>;
    samples: Map<string, string>;
    parses: number;
    /** The characters of each repaired group and the characters its repair parsed. */
    work: [number, number][];
}
export interface WriteOutput {
    source: string;
    /** C2-W-011: what the writer could not write, in the render-loss channel. */
    diagnostics: Diagnostic[];
}
/** C2-W-133, C2-W-134: a source-only writer cannot return a result that needs a loss report. */
export declare class CarveWriteError extends Error {
    readonly diagnostics: readonly Diagnostic[];
    constructor(diagnostics: readonly Diagnostic[]);
}
/** C2-W-133, C2-W-134: losses that a source-only writer cannot return silently. */
export declare function writerHasLoss(diagnostics: readonly Diagnostic[]): boolean;
/** Writes a tree that is known to be valid, by the path `path`, and reports how it wrote it. */
export declare function writeTreeWithStats(document: DocumentNode, options: WriteOptions | undefined, path?: WriterPath, check?: boolean): {
    output: WriteOutput;
    stats: WriterStats;
};
/** Writes a tree that is known to be valid. */
export declare function writeTree(document: DocumentNode, options: WriteOptions | undefined, check?: boolean): WriteOutput;
/** The canonical Carve source of a tree, with what could not be written (C2-W-011). The tree is validated first. */
export declare function writeWithDiagnostics(document: DocumentNode, options?: WriteOptions): WriteOutput;
/** The canonical Carve source of a tree (C2-W-001). */
export declare function write(document: DocumentNode, options?: WriteOptions): string;
