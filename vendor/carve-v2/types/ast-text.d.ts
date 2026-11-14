import { type Block, type Inline } from './ast.js';
/**
 * C2-B-208: the plain text of the label of a caption. It is that of a heading, except that a
 * symbol gives the text the caption writes for it (C2-H-101): its entry in `symbols`, or its source.
 */
export declare function captionLabelText(nodes: readonly Inline[], symbols: Readonly<Record<string, string>>): string;
export declare function plainText(nodes: readonly Inline[]): string;
/** The plain text of the blocks of an item, for the label of its task box: the text of its leaves, joined by spaces. */
export declare function blockText(nodes: readonly Block[]): string;
