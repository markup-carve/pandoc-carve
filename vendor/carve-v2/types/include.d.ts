import { type IncludeNode } from './ast.js';
/** The parts of an include node (C2-A-181). */
interface IncludeParts {
    path: string;
    section: string | null;
    options: [string, string][];
    /** The offset behind the closing braces, where the node ends (C2-A-182). */
    end: number;
}
/**
 * The include directive on the line `[pos, end)`, or null when the line is none: it has another
 * shape (C2-B-201), or it holds what C2-B-206 reads as a paragraph.
 */
export declare function readInclude(src: string, pos: number, end: number): IncludeParts | null;
/** C2-W-058, C2-H-133, C2-H-171: the one spelling of an include directive, which the writer writes and the renderer shows. */
export declare function includeSource(node: IncludeNode): string;
export {};
