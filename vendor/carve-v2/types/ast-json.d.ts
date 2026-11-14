import { type DocumentNode, type Node } from './ast.js';
/** The bare tree as JSON, every field included (C2-A-165). */
export declare function encodeTree(document: Node): string;
/** C2-A-012, C2-A-013: the tree inside its envelope, for a storage or process boundary. */
export declare function encodeEnvelope(document: DocumentNode): string;
/**
 * Reads a bare tree or an envelope from JSON. C2-A-167, C2-A-170: a text that is no JSON, or no
 * tree of contract 2.0, is refused here with a `CarveTreeError`, not with the error of the JSON library.
 */
export declare function decodeTree(json: string): DocumentNode;
/** C2-A-161: whether two trees are the same document. */
export declare function treesEqual(a: Node, b: Node): boolean;
