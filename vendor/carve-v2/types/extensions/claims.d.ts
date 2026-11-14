import { type Attrs, type DivNode } from '../ast.js';
import { type ParsedTree } from '../ast-blocks.js';
import { type ExtensionDefinition, type ExtensionSource } from './types.js';
export declare function divSource(node: DivNode, name: string): ExtensionSource;
export declare function remainingAttrs(attrs: Attrs): Attrs | undefined;
/** C2-X-005: a separate pass claims core nodes after the core parse. */
export declare function applyExtensions(parsed: ParsedTree, definitions: readonly ExtensionDefinition[]): ParsedTree;
