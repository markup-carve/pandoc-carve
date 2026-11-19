import { type Block, type IncludeNode } from './ast.js';
import { type ParseFacts } from './ast-blocks.js';
import { type FileLines, type LineRange } from './include-source.js';
/** A failure of a selection: its cause and the values its message names. */
interface Failure {
    cause: string;
    values?: Readonly<Record<string, string>>;
}
/** C2-N-045: a `csv` or `tsv` code include whose attributes carry the `table` flag. */
export declare function isTableInclude(node: IncludeNode): boolean;
/** C2-N-042 to C2-N-047: the one child of a code include, or the failure of its record selection. */
export declare function codeChildren(node: IncludeNode, text: string, lines: FileLines, range: LineRange, positions: boolean): {
    children: Block[];
    facts: ParseFacts | null;
} | Failure;
export {};
