import { type DocumentNode } from './ast.js';
import { type Findings } from './diagnostics.js';
import { type Settings } from './options.js';
import { type Resolution } from './resolve.js';
interface RenderResult {
    html: string;
    losses: Findings;
}
/**
 * The HTML fragment of a resolved tree (C2-H-001). `losses` takes the losses of the render; `bidi` is
 * false where its text nodes are known to hold no bidirectional control (C2-H-172).
 */
export declare function renderDocument(document: DocumentNode, settings: Settings, resolution: Resolution, losses: Findings, bidi: boolean): RenderResult;
export {};
