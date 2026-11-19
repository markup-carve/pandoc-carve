import { type BlockExtensionNode, type Node } from './ast.js';
/** C2-X-023: a core readback of the source form is allowed only for its canonical content. */
export declare function sourceCoreEquivalent(expected: Node, actual: Node | undefined): boolean;
export declare function canonicalExtensionBody(node: BlockExtensionNode): boolean;
