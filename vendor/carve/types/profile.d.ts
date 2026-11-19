import { type DocumentNode, type Inline, type Node } from './ast.js';
import { type Findings } from './diagnostics.js';
import { type ProfileRule } from './render-tables.js';
import { type Resolution } from './resolve.js';
/** What a profile did to a tree for one render. */
export interface ProfileRun {
    /** The footnote references and inline footnotes that the degraded forms took out. */
    readonly gone: ReadonlySet<Node>;
    /** C2-H-177: the targets of the headings that the profile degraded. */
    readonly goneTargets: ReadonlySet<string>;
    /** Puts every list the profile changed back as it was. */
    restore(): void;
}
/** The block-level text of `nodes`; `texts` gives the link texts of the cross-references where the caller has them. */
export declare function inlinesText(nodes: readonly Inline[], texts?: ReadonlyMap<Node, string>): string;
/** C2-H-163: the deny list of the axis, then its allow list, then the nesting bound. */
/** C2-H-163: whether the profile `rule` admits nodes of `type`, the bound of nesting aside. */
export declare function admitsType(rule: ProfileRule, type: string, block: boolean): boolean;
/**
 * C2-H-129: replaces every node of `document` that is outside the profile by its degraded form,
 * in place, and reports each one. The children of the document stand at depth 0, as in 0.1. The
 * render calls `restore` when it has written the tree (C2-H-121).
 */
export declare function applyProfile(document: DocumentNode, name: string, rule: ProfileRule, findings: Findings, texts: ReadonlyMap<Node, string>): ProfileRun;
/**
 * The resolution as the render sees it under a profile: a note keeps its number, and only the
 * references that the degraded forms left write a backlink. A note with none writes nothing.
 */
export declare function liveResolution(resolution: Resolution, gone: ReadonlySet<Node>, goneTargets: ReadonlySet<string>): Resolution;
