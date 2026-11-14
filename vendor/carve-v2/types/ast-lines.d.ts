import { type IncludeNode, type Inline, type LinkReferenceDefinitionNode } from './ast.js';
import { type TreeContext } from './ast-inline.js';
/** The quoted title of a code fence, without its escapes (C2-B-120). */
export declare function openerTitle(src: string, start: number, end: number): string;
/** The inline content of `[start, end)`, one line of the source: the title of a div, an admonition or a directive. */
export declare function captionChildren(ctx: TreeContext, start: number, end: number): Inline[];
/** C2-B-083: the link definition of `key`, with the destination and the optional quoted title behind its colon. */
export declare function linkDefinitionFields(src: string, pos: number, end: number, key: string): LinkReferenceDefinitionNode;
/** C2-A-181: the node of the include directive on the line `[start, end)`, which the block pass found to be one. */
export declare function includeNode(src: string, start: number, end: number): IncludeNode;
