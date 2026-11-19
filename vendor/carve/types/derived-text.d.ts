import { type DocumentNode, type Node } from './ast.js';
import { type Render } from './html-attributes.js';
export declare const DERIVED_TEXT_BYTES = 1000000;
export declare const DERIVED_TEXT_FACTOR = 8;
/** The budget of one render; a supplied tree without `srcByteLength` has the fixed one. */
export declare function derivedTextBudget(document: DocumentNode, source: string | number | undefined): number;
/**
 * Draws `text` on the budget of the render and returns true, or returns false where it does not fit what remains; the
 * first node that does not fit is reported, once per render.
 */
export declare function drawDerivedText(r: Render, node: Node, text: string, knownCost?: number): boolean;
