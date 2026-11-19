import { type DocumentNode, type Node, type ParagraphNode, type TextNode } from './ast.js';
import { type Findings } from './diagnostics.js';
import { type ExtensionDefinition } from './extensions/types.js';
import { type Plan } from './write-plan.js';
/** The facts of the sidecar that the writer reads (C2-L-046), by node. */
export interface WriterFacts {
    bare?: boolean;
    fenced?: boolean;
    hardBreakOpener?: boolean;
    continuationLines?: number;
    wraps?: readonly {
        line: number;
        path: string;
        offset: number;
        row?: number;
    }[];
    rawRef?: string;
    optionSpelling?: Record<string, string>;
    sourceFormat?: string;
    headerRows?: number;
}
/** One node that did not read back, and how far the writer is in the ways to make it form. */
export interface Attempt {
    step: number;
    escapes: [TextNode, number][];
}
export interface Writer {
    extensions: readonly ExtensionDefinition[];
    /** The lines of the blocks being written, without their line endings. */
    lines: string[];
    /** What the next line starts with instead of its prefix: the markers of the items it opens (C2-W-027). */
    lead: string | null;
    /** C2-W-044: a bare-dot item marker is waiting on this line. */
    bareDotLead: boolean;
    /** C2-W-088: the offsets in the value of a text node that take a backslash, in ascending order. */
    escapes: Map<TextNode, number[]>;
    /** The spelling of a node that has more than one: 0 is the first choice of its clause. */
    forms: Map<Node, number>;
    /** Where each paragraph of the group being written starts: its line in `lines` and its column, as one number. */
    starts: Map<ParagraphNode, number>;
    /** What the reparse has tried for a node that did not form: the step it is at, and the escapes of that step. */
    attempts: Map<Node, Attempt>;
    facts: Map<Node, WriterFacts> | null;
    /** C2-L-020: the offsets in the value of a text node at which the fragment of a continuation row starts. */
    wrapPoints: Map<TextNode, number[]> | null;
    /** C2-L-021: the nodes of a cell whose start is the start of the fragment of a continuation row. */
    wrapStarts: Set<Node> | null;
    alignTables: boolean;
    /** C2-W-005: the output starts with one blank line, because its first block reads differently on line 1 (C2-B-161). */
    blankFirst: boolean;
    /** C2-W-011: what could not be written, one entry per node. */
    losses: Findings;
    lost: Set<Node>;
    /** C2-W-136: the keys of `attrs` of a node that were reported and not written; the reparse check does not ask for them. */
    lostKeys: Map<Node, string[]>;
    /** The longest colon run among the fenced containers below a node (C2-W-039). */
    colonRuns: Map<Node, number>;
    /** Whether emphasis (1) and strong (2) occur below a node (C2-W-070). */
    kindsBelow: Map<Node, number>;
    /** C2-I-098: the expansion of each term the document defines. */
    abbreviations: Map<string, string>;
    /** Definition keys of the whole document, used while reparsing one written block. */
    linkKeys: ReadonlySet<string>;
    /** The parse of the group of blocks as it was last written (C2-W-089). */
    parsed: DocumentNode | null;
    prewrittenAttributes: Node | null;
    /** The plan of the group being written, while the writer plans it (write-plan.ts). */
    plan: Plan | null;
    /** The parses the writer made, for the test that the planned path makes none. */
    parses: number;
    /** C2-W-088: the result of each probe of the repair by the state it reads (write-check.ts), and an id of each node it read. */
    probes: Map<string, ProbeResult>;
    nodeIds: Map<Node, number>;
    /** The text nodes that stand in for markup in a probe, one per node they stand beside, so that a probe keeps their identity. */
    standIns: Map<Node, Map<string, TextNode>>;
    /** Whether a content line written alone opens a block, by its text (write-check.ts). */
    lineOpens: Map<string, boolean>;
    /** C2-W-133: the characters every parse of the writer read, probes included, which share this record, and its limit. */
    work: {
        chars: number;
        limit: number;
    };
}
/** What one probe of the repair found: its result and the escapes it asked of the comparison, in order. */
export interface ProbeResult {
    found: boolean | null;
    taken: [TextNode, number][];
}
export declare function createWriter(facts: Map<Node, WriterFacts> | null, alignTables: boolean, extensions?: readonly ExtensionDefinition[]): Writer;
/** The columns a line can have in a place of `Writer.starts`. */
export declare const PLACE_COLUMNS = 8192;
/** Notes where the paragraph `node` starts, for the test of its lines after a parse (C2-W-092). */
export declare function notePlace(w: Writer, node: ParagraphNode, prefix: string): void;
/** `text` without the spaces and tabs at its end. */
export declare function trimEnd(text: string): string;
/** Writes one line behind the pending lead or `prefix`. C2-W-021: an empty line has no spaces of its prefix either. */
export declare function emit(w: Writer, prefix: string, text: string): void;
/** Writes the lines of `text`: the first behind the lead or `prefix`, the others behind `prefix` and `indent`. */
export declare function emitLines(w: Writer, prefix: string, indent: string, text: string): void;
/** C2-W-011, C2-W-117: records that `node`, or its field `field`, could not be written. One entry per node. */
/** C2-W-136: the key at `index` of the `attrs` of `node` has no spelling beside the field that writes the same key. */
export declare function loseKey(w: Writer, node: Node, index: number, key: string): void;
export declare function lose(w: Writer, node: Node, field: string | null): void;
