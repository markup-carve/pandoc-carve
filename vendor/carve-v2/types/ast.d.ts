import { type Block, type CaptionNode, type DocumentNode, type Inline, type Node, type NodeOfType } from './ast-nodes.js';
export type * from './ast-nodes.js';
export { FIELD_VALUES, isFieldValue } from './ast-nodes.js';
export declare const AST_VERSION = "2.0";
/** C2-A-140, C2-A-141: lines and columns from 1, columns in code points, offsets in UTF-8 bytes, ends exclusive. */
export interface Position {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
    startOffset: number;
    endOffset: number;
    file?: string;
}
/** C2-A-032: the id, the classes and the pairs of keys, each in written order. */
export interface Attrs {
    id?: string;
    classes?: string[];
    keyValues?: [string, string][];
}
/** C2-A-054, C2-A-056. */
export interface Marker {
    kind: 'bullet' | 'ordered';
    char?: string;
    style?: string;
    delimiter?: string;
    start?: number;
}
/** C2-A-060, C2-A-061. */
export interface Task {
    mark: string;
    status: string;
}
export interface RubyPair {
    type: 'rubyPair';
    base: Inline[];
    annotation: Inline[];
}
export interface ExtensionDeclaration {
    name: string;
    required: boolean;
    version?: string;
}
export interface Resource {
    id: string;
    mediaType: string;
    digest: string;
    href?: string;
    size?: number;
}
/** C2-A-012: the envelope a tree travels in at a storage or process boundary. */
export interface Envelope {
    astVersion: string;
    document: DocumentNode;
    vocabulary?: string;
    extensions?: ExtensionDeclaration[];
}
export declare const DEFINITION_TYPES: readonly string[];
/** A node whose children are inline nodes. */
export type InlineParent = Extract<Node, {
    children: Inline[];
}>;
/** The node types with inline content in `children`: those of `InlineParent`. */
export declare const INLINE_PARENTS: readonly InlineParent['type'][];
/** A node whose children are blocks. */
export type BlockParent = Extract<Node, {
    children: Block[];
}>;
/**
 * The slots any node may hold, as a walk over every node type reads them (C2-A-024, C2-A-025). Every
 * node is one, so a walk reads them as plain fields, which costs less than an `in` test per node.
 */
export interface NodeSlots {
    readonly type: string;
    readonly children?: readonly Node[];
    readonly title?: Inline[] | string;
    readonly caption?: CaptionNode;
}
/** The children of `node`, or none: for a node of a type the reader has not narrowed. */
export declare function childNodes(node: NodeSlots): readonly Node[];
/** The inline title of `node`, where it has one (C2-A-024). The title of a link definition is a string and no slot. */
export declare function titleOf(node: NodeSlots): Inline[] | undefined;
/** The caption of `node`, where it has one (C2-A-024). */
export declare function captionOf(node: NodeSlots): CaptionNode | undefined;
/** RFC 6901: `~` and `/` in a key are written as `~0` and `~1` (C2-L-010). */
export declare function pointerKey(key: string): string;
/** RFC 6901: a reference token with `~1` and `~0` read back as `/` and `~`, in that order. */
export declare function pointerToken(token: string): string;
/** Visits one slot of a node: its nodes, and its step in a pointer. A single node, the caption, comes as a list of one. */
export type SlotVisitor = (nodes: readonly Node[], step: string, single: boolean) => void;
/** The order of a walk: that of C2-A-025, or that of the source, in which a title stands before the children. */
export declare const SPEC_ORDER = 0;
export declare const SOURCE_ORDER = 1;
/**
 * C2-A-024, C2-A-025: visits every slot of `node` that holds nodes: `children` first, then `caption`,
 * `short`, `prefix`, `locator` and `suffix`, the `base` and `annotation` of each ruby pair, `title`,
 * `fallback` and each named slot. In source order the title comes first. Strings, URLs, data and
 * payloads are no slots. Every walk over the nodes of a tree goes through this.
 */
export declare function forEachSlot(node: Node, visit: SlotVisitor, order?: number): void;
/** Whether `node` is of type `type`. */
export declare function isNodeOfType<T extends keyof NodeOfType>(node: Node, type: T): node is NodeOfType[T];
/** Whether the children of `node` are inline nodes. */
export declare function isInlineParent(node: Node): node is InlineParent;
/** Whether the children of `node` are blocks. */
export declare function isBlockParent(node: Node): node is BlockParent;
/** A soft or a hard line break. */
export declare function isBreak(node: Node | undefined): boolean;
/** A JSON object: not null and not a list. */
export declare function isRecord(value: unknown): value is Record<string, unknown>;
