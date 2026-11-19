import { type IncludeOptions } from './ast.js';
/** C2-N-007: the error causes a resolver returns. */
export type IncludeError = 'not_found' | 'outside_root' | 'unreadable' | 'non_text';
/** C2-N-007: what a resolver receives for one directive. `from` is absent for a top-level document that has no id. */
export interface IncludeRequest {
    path: string;
    section?: string;
    options: IncludeOptions;
    from?: string;
}
/** C2-N-007: the whole text of the target and its id, or one error cause. Bytes are decoded as UTF-8 (C2-N-011). */
export type IncludeAnswer = {
    text: string | Uint8Array;
    id: string;
} | {
    error: IncludeError;
};
export type IncludeResolver = (request: IncludeRequest) => IncludeAnswer;
/** The value of the `includes` option: a resolver alone, or a resolver with the document id and lowered limits. */
export interface IncludeConfig {
    resolver: IncludeResolver;
    /** C2-N-066: the id of the top-level document, which a cycle can return to. */
    file?: string;
    depth?: number;
    bytes?: number;
    maxDiagnostics?: number;
}
export interface IncludeSettings {
    resolver: IncludeResolver;
    file: string | undefined;
    depth: number;
    bytes: number;
    maxDiagnostics: number;
}
/** C2-N-003: reads the option; `refuse` makes the error of a value it cannot take. */
export declare function includeSettings(value: unknown, refuse: (reason: string) => Error): IncludeSettings | null;
