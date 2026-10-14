/**
 * Nesting limits checked before a Pandoc document is imported: the reverse
 * direction recurses per node, and the engine's Carve writer slows down steeply
 * on deeply nested loose lists, so either could crash or hang the CLI.
 */

import { MAX_RENDER_DEPTH } from '@markup-carve/carve';
import type { ConversionDiagnostic } from './diagnostics.js';

/** Deepest Pandoc node nesting accepted: the engine's own render cap. */
export const MAX_PANDOC_DEPTH: number = MAX_RENDER_DEPTH;

/** Deepest list nesting accepted. */
export const MAX_LIST_DEPTH = 32;

const LISTS = new Set(['BulletList', 'OrderedList', 'DefinitionList']);

export class PandocImportLimitError extends Error {
    readonly diagnostic: ConversionDiagnostic;

    constructor(kind: 'nodes' | 'lists', depth: number, limit: number) {
        const what = kind === 'lists' ? 'lists nest' : 'nodes nest';
        const message = `pandoc document refused: ${what} ${depth} levels deep, past the import limit of ${limit}`;
        super(message);
        this.name = 'PandocImportLimitError';
        this.diagnostic = {
            code: 'pandoc-nesting-too-deep',
            direction: 'pandoc-to-carve',
            class: 'unsupported',
            severity: 'error',
            fidelity: 'dropped',
            confidence: 'exact',
            message,
            details: { kind, depth, limit },
        };
    }
}

/** Throw {@link PandocImportLimitError} when `doc` nests past a limit. Iterative, so it cannot overflow itself. */
export function checkImportLimits(doc: unknown): void {
    const stack: [unknown, number, number][] = [[doc, 0, 0]];
    while (stack.length) {
        const [value, depth, lists] = stack.pop()!;
        if (Array.isArray(value)) {
            for (const item of value) stack.push([item, depth, lists]);
            continue;
        }
        if (!value || typeof value !== 'object') continue;
        const t = (value as { t?: unknown }).t;
        const isNode = typeof t === 'string';
        const nextDepth = isNode ? depth + 1 : depth;
        const nextLists = isNode && LISTS.has(t) ? lists + 1 : lists;
        if (nextDepth > MAX_PANDOC_DEPTH) throw new PandocImportLimitError('nodes', nextDepth, MAX_PANDOC_DEPTH);
        if (nextLists > MAX_LIST_DEPTH) throw new PandocImportLimitError('lists', nextLists, MAX_LIST_DEPTH);
        for (const child of Object.values(value)) stack.push([child, nextDepth, nextLists]);
    }
}
