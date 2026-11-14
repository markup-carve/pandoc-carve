import { type DocumentNode, type Node } from './ast.js';
/** C2-A-173: one entry of the diagnostics record. */
export interface Diagnostic {
    code: string;
    severity: 'error' | 'warning' | 'hint';
    channel: 'parse' | 'render-loss' | 'lint';
    message: string;
    /** The node the entry is about, as an RFC 6901 pointer into the tree. The empty pointer is the document. */
    path?: string;
    /** The range of that node in UTF-8 bytes of the source, where the tree carries positions. */
    range?: {
        startOffset: number;
        endOffset: number;
    };
}
/** Entries, each with the node it is about, or null for the document. The positions are filled in once, at the end. */
export interface Findings {
    entries: Diagnostic[];
    nodes: (Node | null)[];
}
export declare function addFinding(findings: Findings, node: Node | null, entry: Diagnostic): void;
/**
 * C2-A-173: gives every entry its position: the pointer of its node, and the byte range of that
 * node where it has one. An entry about the document, or about a node that is not in the tree,
 * points at the document. The tree is walked once, and only when there is an entry.
 */
export declare function locateFindings(document: DocumentNode, findings: Findings): Diagnostic[];
