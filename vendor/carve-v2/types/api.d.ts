import { type DocumentNode } from './ast.js';
import { type ParsedTree } from './ast-blocks.js';
import { type SourceLayout } from './layout.js';
import { type Diagnostic, type Findings } from './diagnostics.js';
import { type ParseOptions, type RenderOptions, type Settings } from './options.js';
import { type Resolution } from './resolve.js';
export { type ParsedTree } from './ast-blocks.js';
export interface ParseResult {
    document: DocumentNode;
    /** C2-A-172: the diagnostics record, beside the tree. */
    diagnostics: Diagnostic[];
}
export interface LayoutResult extends ParseResult {
    /** C2-L-001: the source-layout record, beside the tree. */
    layout: SourceLayout;
}
/** The output of the resolve stage: the resolved tree and what a render of it needs besides the tree. */
export interface ResolvedTree {
    readonly document: DocumentNode;
    /** The options of the render the tree was resolved for. */
    readonly settings: Settings;
    readonly resolution: Resolution;
    /** C2-H-130: what the profile took out of the tree, in the render-loss channel. */
    readonly losses: Findings;
    /** C2-H-172: false where the text nodes are known to hold no bidirectional control. */
    readonly bidi: boolean;
}
export interface RenderOutput {
    html: string;
    diagnostics: Diagnostic[];
}
/** C2-H-130: a render under `strictLosses` that lost something returns no output. */
export declare class CarveRenderError extends Error {
    diagnostics: Diagnostic[];
    constructor(diagnostics: Diagnostic[]);
}
/** C2-H-163: an input longer than the profile accepts. It is refused before it is parsed. */
export declare class CarveInputError extends Error {
    constructor(profile: string, limit: number);
}
/** The parse stage: the tree of `src` before resolution (C2-A-106). Positions are on unless `positions` is false. */
export declare function parseTree(src: string, options?: ParseOptions): ParsedTree;
/**
 * The resolve stage: resolves a parsed tree, or a supplied tree after validating it, for a render
 * with `options`. A parsed tree is resolved in place; a supplied tree is copied first where the profile replaces nodes.
 */
export declare function resolveTree(input: ParsedTree | DocumentNode, options?: RenderOptions): ResolvedTree;
/**
 * The render stage: the HTML fragment of a resolved tree, with the options it was resolved for.
 * Under `strictLosses` a render loss throws.
 */
export declare function renderTree(resolved: ResolvedTree): string;
/** The resolved tree of `src` with its diagnostics. Positions are on unless `positions` is false (C2-A-138). */
export declare function parseWithDiagnostics(src: string, options?: ParseOptions): ParseResult;
/** The resolved tree of `src` (spec/0.2/ast.md). The diagnostics are not asked for, so none is given a position. */
export declare function parse(src: string, options?: ParseOptions): DocumentNode;
/**
 * The resolved tree of `src` with its diagnostics and its source-layout record (spec/0.2/source-layout.md).
 * The tree is the one `parse` gives (C2-L-003). Positions are always built, since the record states its ranges in them.
 */
export declare function parseWithLayout(src: string, options?: ParseOptions): LayoutResult;
/**
 * The HTML of Carve source or of a tree (spec/0.2/html.md), with the diagnostics of the run, each
 * with its position (C2-A-173). Under `strictLosses` a render that lost something returns no output.
 */
export declare function renderWithDiagnostics(input: string | DocumentNode, options?: RenderOptions): RenderOutput;
/**
 * The HTML fragment of Carve source or of a tree: the three stages in a row. Under `strictLosses`
 * a render loss throws. The diagnostics are not asked for, so they are given a position only where a loss is thrown.
 */
export declare function render(input: string | DocumentNode, options?: RenderOptions): string;
