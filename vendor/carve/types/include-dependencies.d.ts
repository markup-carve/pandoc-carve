import { type DocumentNode } from './ast.js';
/**
 * One include node: its path as written, the id of its including file (absent for the top level), its file if read, and
 * when asked for and the tree has positions, the UTF-8 byte range of the directive in its including file.
 */
export interface IncludeDependency {
    path: string;
    from?: string;
    file?: string;
    read: boolean;
    range?: {
        startOffset: number;
        endOffset: number;
    };
}
/** The options of `includeDependencies`. */
export interface IncludeDependencyOptions {
    /** Adds `range`, the directive site, to each dependency whose node has a position. */
    ranges?: boolean;
}
/** C2-N-083: the include nodes of `document` in tree order, each with its including file (C2-N-053). */
export declare function includeDependencies(document: DocumentNode, options?: IncludeDependencyOptions): IncludeDependency[];
