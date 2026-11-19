import { type HeadingIds } from './options.js';
/** The slug of `text` under a value of `headingIds` other than `off`. Duplicates are not handled here. */
export declare function slugify(text: string, mode: HeadingIds): string;
