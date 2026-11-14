import { type DocumentNode } from './ast.js';
import { type Findings } from './diagnostics.js';
import { type ProfileRule } from './render-tables.js';
/**
 * C2-H-129: replaces every node of `document` that is outside the profile by its degraded form,
 * in place, and reports each one. The children of the document stand at depth 0, as in 0.1.
 */
export declare function applyProfile(document: DocumentNode, name: string, rule: ProfileRule, findings: Findings): void;
