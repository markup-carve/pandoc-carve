import { type Options } from './options.js';
import { type Diagnostic } from './diagnostics.js';
/** The options of the formatter (C2-H-137): `alignTables` (C2-W-068). */
export type FormatOptions = Pick<Options, 'alignTables'>;
export interface FormatOutput {
    source: string;
    /** The diagnostics of the parse, and what the writer could not write (C2-W-103). */
    diagnostics: Diagnostic[];
}
/** The canonical form of `source`, with the diagnostics of the parse and of the writer. */
export declare function formatWithDiagnostics(source: string, options?: FormatOptions): FormatOutput;
/** The canonical form of `source` (spec/0.2/writer.md). C2-W-002: it parses to the tree of `source`. */
export declare function format(source: string, options?: FormatOptions): string;
