import { type DocumentNode } from './ast.js';
import { type ExtensionDefinition } from './extensions/types.js';
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
    INLINE_SLOTS: string[];
    ENUMS: Map<string, readonly string[]>;
    STAGES: string[];
    OPTIONAL_CONTENT: Map<string, Content>;
};
/** C2-A-171: the open blocks and inline levels at a node of type `type` below `blocks` and `inlines`. */
export declare function nodeLevels(type: string, blocks: number, inlines: number): [number, number];
/** C2-A-171: whether the levels are deeper than the parser makes. */
export declare function beyondParserLevels([blocks, inlines]: readonly [number, number]): boolean;
/** C2-X-025: a div name makes a plain div (C2-B-127), a fence name opens a code block, an inline name is C2-I-094's. */
export declare function isClaimableName(form: unknown, name: string, titled: boolean): boolean;
/** C2-A-203, C2-A-214: ranges for an unchanged tree, addressed by node pointer and UTF-8 byte offset of annotation text. */
export interface AnnotationRangeSidecar {
    ranges: {
        id: string;
        start: {
            path: string;
            offset: number;
        };
        end: {
            path: string;
            offset: number;
        };
    }[];
}
/**
 * C2-A-012 to C2-A-019: refuses an envelope whose own fields a reader may not accept: a version it does not
 * read, an unknown required extension, or a field the envelope does not have. The tree inside is checked apart.
 */
export declare function validateEnvelope(envelope: Readonly<Record<string, unknown>>, extensions?: readonly ExtensionDefinition[]): void;
/** Refuses `document` unless it is a tree of contract 2.0. */
export declare function validateTree(document: unknown, envelope?: Readonly<Record<string, unknown>>, source?: string, extensions?: readonly ExtensionDefinition[], annotations?: AnnotationRangeSidecar): asserts document is DocumentNode;
/** C2-A-203: validates a tree together with its annotation-range sidecar. */
export declare function validateTreeWithAnnotations(document: unknown, annotations: AnnotationRangeSidecar, envelope?: Readonly<Record<string, unknown>>, source?: string, extensions?: readonly ExtensionDefinition[]): asserts document is DocumentNode;
