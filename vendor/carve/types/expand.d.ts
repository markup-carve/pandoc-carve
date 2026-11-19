import { type IncludeNode, type Node } from './ast.js';
import { type OuterScope, type ParseFacts, type ParsedTree } from './ast-blocks.js';
import { type Findings } from './diagnostics.js';
import { type IncludeSettings } from './include-settings.js';
import { type HeadingIds } from './options.js';
/** Parses the text of one file with the parse options of the top-level document (C2-N-015). */
/** Parses the text of a file; `positions` asks for positions where the expansion would not keep them. */
export type FileParse = (text: string, outer: OuterScope, positions?: boolean, frontmatterOpens?: boolean) => ParsedTree;
/** The result of a selection: the children, the parse facts they come with, and the includes among them. */
export interface Selected {
    children: NonNullable<IncludeNode['children']>;
    facts: ParseFacts | null;
    includes: readonly IncludeNode[];
    scope: OuterScope;
}
/** The message of an include code, with the values its template names. */
export declare function includeMessage(code: string, values: Readonly<Record<string, string>>): string;
/** C2-N-003: without a resolver every include stays unexpanded and is reported. */
export declare function reportNoResolver(includes: readonly IncludeNode[], findings: Findings): void;
/** C2-N-019: every positioned node of a file carries the id of that file. */
export declare function stampFile(nodes: readonly Node[], file: string): void;
/** What the expansion leaves for the resolution: the facts of every file, and the findings of the expansion. */
export interface Expanded {
    facts: readonly ParseFacts[];
    findings: Findings;
}
/**
 * C2-N-006: expands the includes of a parsed top-level document in place, in tree order. The document lists
 * `includeExpansion` in its stages, and every failure is reported in `findings`.
 */
export declare function expandTree(parsed: ParsedTree, settings: IncludeSettings, parse: FileParse, headingIds: HeadingIds, positions: boolean): Expanded;
