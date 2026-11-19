import { type Attrs, type DivNode, type DocumentNode } from '../ast.js';
import { type ParsedTree } from '../ast-blocks.js';
import { type ExtensionDefinition, type ExtensionSource } from './types.js';
export declare function divSource(node: DivNode, name: string): ExtensionSource;
export declare function remainingAttrs(attrs: Attrs): Attrs | undefined;
/**
 * C2-A-017, C2-N-016: the root declares each qualified extension that a node of the tree names, a name once, the
 * nodes of expanded includes counted too.
 */
export declare function declareExtensions(document: DocumentNode, definitions: readonly ExtensionDefinition[]): void;
/** C2-X-005: a separate pass claims core nodes after the core parse. */
export declare function applyExtensions(parsed: ParsedTree, definitions: readonly ExtensionDefinition[]): ParsedTree;
