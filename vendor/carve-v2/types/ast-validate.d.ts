import { type DocumentNode } from './ast.js';
/** A tree that a reader refuses. `path` is an RFC 6901 pointer to the node or the field. */
export declare class CarveTreeError extends Error {
    path: string;
    reason: string;
    constructor(path: string, reason: string);
}
export declare const MAX_TREE_DEPTH: number;
/** What the `children` of a node type hold: `blocks`, `inlines`, `none`, or the member types by name. */
export type Content = 'blocks' | 'inlines' | 'none' | readonly string[];
/** The row of one node type in the table of C2-A-050: its children, its required and its optional fields. */
export type Rule = readonly [Content, readonly string[], readonly string[]];
/** The node table and the field kinds, which scripts/generate-ast-nodes.ts writes the node interfaces from. */
export declare const NODE_TABLE: {
    BLOCKS: string[];
    INLINES: string[];
    RULES: Map<string, Rule>;
    STRINGS: string[];
    INTEGERS: string[];
    BOOLEANS: string[];
    TRUE_ONLY: string[];
    INLINE_SLOTS: string[];
    ENUMS: Map<string, readonly string[]>;
    STAGES: string[];
};
/**
 * C2-A-012 to C2-A-019: refuses an envelope whose own fields a reader may not accept: a version it does not
 * read, an unknown required extension, or a field the envelope does not have. The tree inside is checked apart.
 */
export declare function validateEnvelope(envelope: Readonly<Record<string, unknown>>): void;
/** Refuses `document` unless it is a tree of contract 2.0. */
export declare function validateTree(document: unknown): asserts document is DocumentNode;
