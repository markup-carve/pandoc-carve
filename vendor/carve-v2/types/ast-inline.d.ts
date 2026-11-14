import { type Inline, type Node } from './ast.js';
import { type Attributes } from './ast-attributes.js';
import { type InlineState } from './inline-state.js';
import { type ParseNote } from './parse-findings.js';
import type { BlockNode } from './tree.js';
/**
 * One open inline node while its events are read. `value` is the text of a node without children
 * and the alt source of an image. `key` is the folded label of a reference (C2-I-079), and `aux` of a
 * reference is the offset behind its label.
 */
export interface InlineFrame {
    kind: number;
    start: number;
    end: number;
    flags: number;
    aux: number;
    children: Inline[] | null;
    value: string;
    /** Set once a span of the source has gone into `value`; each further span joins it behind a line feed. */
    spanned: boolean;
    destination: string | null;
    title: string | null;
    key: string | null;
    attributes: Attributes | null;
}
/** What the source-layout record reads beside the tree (C2-L-001). Filled only on request. */
export interface LayoutTrace {
    blocks: Map<Node, BlockNode>;
    inlines: Map<Node, InlineFrame>;
    /** C2-L-020: per text node of a cell, pairs of the offset in its value and the source offset at which a fragment starts. */
    breaks: Map<Node, number[]>;
}
/** What a tree build needs besides the nodes: the source, and whether positions are wanted. */
export interface TreeContext {
    src: string;
    positions: boolean;
    /** The state the inline pass of each content runs in. */
    inline: InlineState;
    /** C2-I-118: the number of open containers around the block being built. */
    depth: number;
    /** C2-I-098: the expansion of each defined term. The first definition of a term wins (C2-B-085). */
    abbreviations: Map<string, string>;
    /** The offset of the own markup of each block that took attribute lines (C2-A-148). */
    markup: Map<Node, number>;
    /** The source lines of the text of each heading, as a start and an end per line (C2-I-084). */
    headingSpans: Map<Node, number[]>;
    /**
     * Set when an inline node is built that resolution reads: one with an id, a reference, a note or
     * a cross-reference. A leaf asks it after its content is built.
     */
    resolvable: boolean;
    /** The leaves whose inline content holds such a node. Resolution walks into no other leaf. */
    resolvableLeaves: Set<Node>;
    trace: LayoutTrace | null;
    /** The findings of the parse channel, noted with their nodes while the tree is built (parse-findings.ts). */
    notes: ParseNote[];
    /** The source range of each footnote definition, which a duplicate reports the lines of (C2-B-085). */
    footnoteBlocks: Map<Node, BlockNode>;
}
export declare const FLOW_PLAIN = 0;
export declare const FLOW_HARD_BREAKS = 1;
export declare const FLOW_CELL = 2;
/** The content was joined from pieces of several lines, so its nodes have no position (C2-A-158). */
export declare const FLOW_UNPLACED = 4;
/**
 * Records the source range of a node. The six integers of C2-A-140 are filled in by
 * `finishPositions`, which reads the two string offsets stored here.
 */
export declare function place<N extends Node>(ctx: TreeContext, node: N, start: number, end: number): N;
/** C2-A-032, C2-A-037: the attribute blocks of a node as `attrs` and `lang`. */
export declare function setAttributes(node: Node, attributes: Attributes | null): void;
/** C2-A-074: the text of a comment without the one space behind its opener and, for the braced form, before its closer. */
export declare function commentValue(text: string, braced: boolean): string;
/** Adds text to `list`: adjacent runs are one text node (C2-A-040). A joined node has no position (C2-A-158). */
export declare function addText(ctx: TreeContext, list: Inline[], value: string, start: number, end: number): void;
/** The source of `[start, end)` without the prefixes of the lines it crosses: its parts inside `spans`, joined by line feeds. */
export declare function contentSource(src: string, spans: number[], start: number, end: number): string;
/**
 * C2-I-001: the public nodes of the content `spans[from..to)`. `lineComments` is false where `%%`
 * is text (C2-B-130, C2-B-144).
 */
export declare function contentNodes(ctx: TreeContext, spans: number[], from: number, to: number, lineComments: boolean, flow: number): Inline[];
/**
 * The inline content of a leaf whose lines are `spans`. `ctx.resolvable` tells afterwards whether
 * it holds a node that resolution reads; `noteLeaf` notes the leaf then.
 */
export declare function leafInlines(ctx: TreeContext, spans: number[], flow: number): Inline[];
/** C2-B-130, C2-B-144: line `at` of a line block is a content of its own, and `%%` is text in it. */
export declare function lineInlines(ctx: TreeContext, spans: number[], at: number): Inline[];
/** Notes `leaf` when the content just built for it holds a node that resolution reads. */
export declare function noteLeaf<N extends Node>(ctx: TreeContext, leaf: N): N;
