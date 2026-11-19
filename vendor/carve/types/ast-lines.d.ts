import { type IncludeNode, type LinkReferenceDefinitionNode } from './ast.js';
import { type Attributes } from './ast-attributes.js';
/** The quoted title of a code fence, without its escapes (C2-B-120). */
export declare function openerTitle(src: string, start: number, end: number): string;
/** C2-B-083: the link definition of `key`, with the destination and the optional quoted title behind its colon. */
export declare function linkDefinitionFields(src: string, pos: number, end: number, key: string, attributes: Attributes): LinkReferenceDefinitionNode;
/** C2-A-181: the node of the include directive on the line `[start, end)`, which the block pass found to be one. */
export declare function includeNode(src: string, start: number, end: number): IncludeNode;
