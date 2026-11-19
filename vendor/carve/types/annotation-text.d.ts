import { type Node } from './ast.js';
/** The node at the RFC 6901 pointer `path` of `root`, or null. */
export declare function nodeAtPointer(root: Node, path: string): Node | null;
/** C2-A-207: the `value`, `alt` or `source` of the node, then the text of its child slots in the order of node-slots.json. */
export declare function annotationText(node: Node): string;
/** C2-A-207, C2-A-214: whether `offset` is a UTF-8 byte offset of `text` that falls between two characters. */
export declare function isCharacterBoundary(text: string, offset: number): boolean;
