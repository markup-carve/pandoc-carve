import { type DocumentNode } from './ast.js';
import { type LayoutTrace } from './ast-inline.js';
export declare const LAYOUT_VERSION = 2;
/** C2-L-020: where one continuation row broke the content of a cell. */
export interface Wrap {
    line: number;
    path: string;
    offset: number;
    row?: number;
}
/** C2-L-009: the entry of one node. Every fact is optional, and an absent fact means unknown (C2-L-014). */
export interface NodeLayout {
    path: string;
    startByte: number;
    endByte: number;
    bare?: boolean;
    fenced?: boolean;
    hardBreakOpener?: boolean;
    wraps?: Wrap[];
    continuationLines?: number;
    rawRef?: string;
    sourceFormat?: 'pipe' | 'csv' | 'tsv';
    markerRaw?: string;
    markerColumn?: number;
    contentColumn?: number;
    continuationStyle?: 'lazy' | 'indent' | 'marker_line' | 'none';
    blankLinesBefore?: number;
    blankLinesAfter?: number;
    openerRaw?: string;
    closerRaw?: string;
    metadataSeparatorRaw?: string;
    attachment?: 'preceding' | 'none';
}
/** C2-L-007. */
export interface SourceLayout {
    version: 2;
    encoding: 'utf-8';
    source: string;
    lineEndings: 'none' | 'lf' | 'crlf' | 'cr' | 'mixed';
    bom: boolean;
    nodes: NodeLayout[];
}
export declare function createLayoutTrace(): LayoutTrace;
/** The record of `src` for `document`, the tree that was built with `trace`. */
export declare function buildLayout(src: string, document: DocumentNode, trace: LayoutTrace): SourceLayout;
