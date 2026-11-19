import { type Attrs, type Inline } from './ast.js';
import { type Render } from './html-attributes.js';
export declare function inlineHtml(r: Render, nodes: readonly Inline[]): string;
/**
 * C2-H-141: the attributes of a link definition merge into a reference that resolves through it; the reference wins.
 * C2-H-020 merges those of a block image's paragraph the same way.
 */
export declare function mergedAttrs(own: Attrs, from: Attrs): Attrs;
