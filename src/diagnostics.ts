export type DiagnosticDirection = 'carve-to-pandoc' | 'pandoc-to-carve';
export type DiagnosticSeverity = 'lossy' | 'degraded' | 'normalized' | 'unsupported';

export interface ConversionDiagnostic {
    /** Stable, machine-readable identifier. */
    code: string;
    direction: DiagnosticDirection;
    severity: DiagnosticSeverity;
    message: string;
    /** Construct-specific values useful to migration tooling. */
    details?: Record<string, unknown>;
    /** Reserved for a source range or AST path when an engine supplies one. */
    path?: Array<string | number>;
    /** Producer-supplied source range, when present on the exchange AST node. */
    sourceLocation?: unknown;
}

interface Rule {
    test: RegExp;
    code: string;
    severity: DiagnosticSeverity;
}

// Ordered from specific to general. Codes are API: add rules, never rename them.
const RULES: Rule[] = [
    { test: /^comment:/, code: 'comment-dropped', severity: 'lossy' },
    { test: /^inline: unknown node type/, code: 'unknown-carve-inline', severity: 'degraded' },
    { test: /^block: unknown node type/, code: 'unknown-carve-block', severity: 'degraded' },
    { test: /^inline: pandoc node/, code: 'unsupported-pandoc-inline', severity: 'unsupported' },
    { test: /^block: pandoc node/, code: 'unsupported-pandoc-block', severity: 'unsupported' },
    { test: /^citation: .*typed locator/, code: 'citation-locator-flattened', severity: 'normalized' },
    { test: /^citation: .*suppresses its author/, code: 'citation-mode-normalized', severity: 'normalized' },
    { test: /^Cite mixes /, code: 'citation-mode-normalized', severity: 'normalized' },
    { test: /^Cite mapped /, code: 'citation-bibliography-not-emitted', severity: 'degraded' },
    { test: /^SmallCaps /, code: 'smallcaps-degraded', severity: 'degraded' },
    { test: /^short caption:/, code: 'short-caption-source-unavailable', severity: 'unsupported' },
    { test: /^figure:/, code: 'figure-unwrapped', severity: 'degraded' },
    { test: /^figure group: short caption/, code: 'figure-group-short-caption-dropped', severity: 'lossy' },
    { test: /^frontmatter: format/, code: 'frontmatter-format-unsupported', severity: 'unsupported' },
    { test: /^frontmatter: line/, code: 'frontmatter-line-skipped', severity: 'lossy' },
    { test: /^frontmatter: value/, code: 'frontmatter-value-skipped', severity: 'lossy' },
    { test: /^meta: .*empty/, code: 'metadata-empty-blocks-skipped', severity: 'lossy' },
    { test: /^meta:/, code: 'metadata-value-skipped', severity: 'lossy' },
    { test: /^definition list:/, code: 'definition-entry-skipped', severity: 'lossy' },
    { test: /^ordered list:/, code: 'ordered-list-marker-normalized', severity: 'normalized' },
    { test: /^symbol:/, code: 'symbol-unresolved', severity: 'degraded' },
    { test: /^extension:/, code: 'inline-extension-degraded', severity: 'degraded' },
    { test: /missing definition/, code: 'reference-unresolved', severity: 'degraded' },
    { test: /^crossref:/, code: 'crossref-unresolved', severity: 'degraded' },
    { test: /^list-table: structure/, code: 'list-table-structure-degraded', severity: 'degraded' },
    { test: /^list-table: the short caption/, code: 'list-table-short-caption-dropped', severity: 'lossy' },
    { test: /^list-table: a body group's attributes/, code: 'list-table-body-attributes-dropped', severity: 'lossy' },
    { test: /^list-table: the table's .* body groups/, code: 'list-table-body-groups-merged', severity: 'normalized' },
    { test: /^list-table: the body groups disagree/, code: 'list-table-row-heads-normalized', severity: 'normalized' },
    { test: /^list-table: rowspan/, code: 'list-table-rowspan-clipped', severity: 'lossy' },
    { test: /^table: block-level/, code: 'table-cell-blocks-flattened', severity: 'lossy' },
    { test: /^table: attributes on/, code: 'table-continuation-attributes-dropped', severity: 'lossy' },
    { test: /^table: colspan continuation/, code: 'table-colspan-origin-missing', severity: 'degraded' },
    { test: /^table: rowspan crossing/, code: 'table-rowspan-clipped', severity: 'lossy' },
    { test: /^table: rowspan continuation/, code: 'table-rowspan-origin-missing', severity: 'degraded' },
    { test: /^table:/, code: 'table-groups-normalized', severity: 'normalized' },
];

export function diagnostic(
    direction: DiagnosticDirection,
    message: string,
    details?: Record<string, unknown>,
    sourceLocation?: unknown,
): ConversionDiagnostic {
    const rule = RULES.find((candidate) => candidate.test.test(message));
    if (!rule) throw new Error(`conversion warning has no diagnostic code: ${message}`);
    const inferred = details ?? inferDetails(message);
    return {
        code: rule.code,
        direction,
        severity: rule.severity,
        message,
        ...(Object.keys(inferred).length ? { details: inferred } : {}),
        ...(sourceLocation !== undefined ? { sourceLocation } : {}),
    };
}

function inferDetails(message: string): Record<string, unknown> {
    const details: Record<string, unknown> = {};
    const nodeType = /node(?: type)? "([^"]+)"/.exec(message)?.[1];
    const row = /\brow (\d+)/.exec(message)?.[1];
    const column = /\bcol (\d+)/.exec(message)?.[1];
    const reference = /missing definition for (\[\^?[^\]]+\])/.exec(message)?.[1];
    const format = /format "([^"]+)"/.exec(message)?.[1];
    if (nodeType) details.nodeType = nodeType;
    if (row) details.row = Number(row);
    if (column) details.column = Number(column);
    if (reference) details.reference = reference;
    if (format) details.format = format;
    return details;
}

export function hasLoss(diagnostics: ConversionDiagnostic[]): boolean {
    return diagnostics.some((item) => item.severity === 'lossy' || item.severity === 'unsupported');
}
