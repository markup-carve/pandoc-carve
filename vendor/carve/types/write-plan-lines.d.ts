import { type Leaf } from './write-plan-model.js';
/** Where the leaf stands, as far as its line starts depend on it. */
export interface LeafPlace {
    /** The leaf is the content of a paragraph or a line, whose first unit starts a content line. */
    paragraph: boolean;
    /** Inside an item, a description or a footnote body: a list marker opens on every line. */
    inItem: boolean;
    inQuote: boolean;
    inDescriptionList: boolean;
    /** Inside any container: a definition does not open there (C2-B-081). */
    nested: boolean;
    /** The leaf is the content of a list item, which has a task box or not (C2-B-046), or null. */
    item: 'plain' | 'task' | null;
    /** The type of the block before the paragraph, or null. */
    before: string | null;
    /** The leaf starts the document: its first line is line 1. */
    documentStart: boolean;
    /** The leaf is a line of a line block, which recognizes only prefixes and the closer (C2-B-123). */
    line: boolean;
    /** The leaf is a term, whose later lines continue like paragraph text (C2-B-069). */
    term: boolean;
    /** The leaf stands below the block cap, where the opener of a container is text (C2-B-190). */
    capped: boolean;
}
export declare const NO_ESCAPE = -1;
export declare const UNDECIDED = -2;
/**
 * The escape the line that starts at `at` needs, NO_ESCAPE, or UNDECIDED. `first` says that the line is the first
 * line of a paragraph. The unit that takes the backslash must be text.
 */
export declare function lineEscape(leaf: Leaf, at: number, first: boolean, place: LeafPlace): number;
