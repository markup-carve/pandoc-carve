export type DiagnosticDirection = 'carve-to-pandoc' | 'pandoc-to-carve';
export type DiagnosticClass = 'lossy' | 'degraded' | 'normalized' | 'unsupported';
export type DiagnosticSeverity = 'info' | 'warning' | 'error';
export type MigrationFidelity = 'preserved' | 'normalized' | 'degraded' | 'dropped';
export type MigrationConfidence = 'exact' | 'inferred' | 'fallback';

export interface ConversionDiagnostic {
    /** Stable, machine-readable identifier. */
    code: string;
    direction: DiagnosticDirection;
    class: DiagnosticClass;
    severity: DiagnosticSeverity;
    fidelity: MigrationFidelity;
    confidence: MigrationConfidence;
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
    class: DiagnosticClass;
}

// Ordered from specific to general. Codes are API: add rules, never rename them.
const RULES: Rule[] = [
    { test: /^section:/, code: 'structure-unspellable', class: 'degraded' },
    { test: /^table: rowGroups\.(?:headAttrs|footAttrs|bodies\[\d+\]\.attrs) is dropped/, code: 'field-unspellable', class: 'lossy' },
    { test: /^comment:/, code: 'comment-dropped', class: 'lossy' },
    { test: /^inline: unknown node type/, code: 'unknown-carve-inline', class: 'degraded' },
    { test: /^block: unknown node type/, code: 'unknown-carve-block', class: 'degraded' },
    { test: /^inline: pandoc node/, code: 'unsupported-pandoc-inline', class: 'unsupported' },
    { test: /^block: pandoc node/, code: 'unsupported-pandoc-block', class: 'unsupported' },
    { test: /^citation: .*typed locator/, code: 'citation-locator-flattened', class: 'normalized' },
    { test: /^citation: .*suppresses its author/, code: 'citation-mode-normalized', class: 'normalized' },
    { test: /^Cite mixes /, code: 'citation-mode-normalized', class: 'normalized' },
    { test: /^Cite mapped /, code: 'citation-bibliography-not-emitted', class: 'degraded' },
    { test: /^SmallCaps /, code: 'smallcaps-degraded', class: 'degraded' },
    { test: /^short caption:/, code: 'short-caption-source-unavailable', class: 'unsupported' },
    { test: /^figure group: short caption/, code: 'figure-group-short-caption-dropped', class: 'lossy' },
    { test: /^frontmatter: format/, code: 'frontmatter-format-unsupported', class: 'unsupported' },
    { test: /^frontmatter: block content/, code: 'frontmatter-block-content-dropped', class: 'lossy' },
    { test: /^frontmatter: line/, code: 'frontmatter-line-skipped', class: 'lossy' },
    { test: /^frontmatter: value/, code: 'frontmatter-value-skipped', class: 'lossy' },
    { test: /^meta: .*empty/, code: 'metadata-empty-blocks-skipped', class: 'lossy' },
    { test: /^meta:/, code: 'metadata-value-skipped', class: 'lossy' },
    { test: /^definition list: looseness/, code: 'definition-list-looseness-widened', class: 'normalized' },
    { test: /^definition list:/, code: 'definition-entry-skipped', class: 'lossy' },
    { test: /^ordered list:/, code: 'ordered-list-marker-normalized', class: 'normalized' },
    { test: /^list: an empty item/, code: 'empty-list-item-spelled', class: 'normalized' },
    { test: /^task state:/, code: 'task-state-dropped', class: 'lossy' },
    { test: /^math: attributes/, code: 'math-attributes-dropped', class: 'lossy' },
    { test: /^symbol:/, code: 'symbol-unresolved', class: 'degraded' },
    { test: /^url: a denied scheme/, code: 'unsafe-url-scheme', class: 'lossy' },
    { test: /^attribute: unsafe name/, code: 'unsafe-attribute-name', class: 'lossy' },
    { test: /^attribute: unsafe value/, code: 'unsafe-attribute-value', class: 'lossy' },
    { test: /^extension: ruby/, code: 'ruby-flattened', class: 'degraded' },
    { test: /^extension: block extension/, code: 'block-extension-fallback-rendered', class: 'degraded' },
    { test: /^extension:/, code: 'inline-extension-degraded', class: 'degraded' },
    { test: /^(?:link|image|footnote): missing definition/, code: 'reference-unresolved', class: 'degraded' },
    { test: /^crossref:/, code: 'crossref-unresolved', class: 'degraded' },
    { test: /^list-table: structure/, code: 'list-table-structure-degraded', class: 'degraded' },
    { test: /^list-table: the short caption/, code: 'list-table-short-caption-dropped', class: 'lossy' },
    { test: /^list-table: a body group's attributes/, code: 'list-table-body-attributes-dropped', class: 'lossy' },
    { test: /^list-table: the table's .* body groups/, code: 'list-table-body-groups-merged', class: 'normalized' },
    { test: /^list-table: the body groups disagree/, code: 'list-table-row-heads-normalized', class: 'normalized' },
    { test: /^list-table: rowspan/, code: 'list-table-rowspan-clipped', class: 'lossy' },
    { test: /^table: a row header outside/, code: 'table-row-head-outside-leading-run', class: 'lossy' },
    { test: /^table: attributes on/, code: 'table-continuation-attributes-dropped', class: 'lossy' },
    { test: /^table: colspan continuation/, code: 'table-colspan-origin-missing', class: 'degraded' },
    { test: /^table: rowspan crossing/, code: 'table-rowspan-clipped', class: 'lossy' },
    { test: /^table: rowspan continuation/, code: 'table-rowspan-origin-missing', class: 'degraded' },
    { test: /^table: .*padded with empty cells/, code: 'table-groups-normalized', class: 'normalized' },
    { test: /^table: a cell holds block content/, code: 'table-groups-normalized', class: 'normalized' },
    { test: /^table: .*converted with the implicit head\/body split/, code: 'table-row-groups-invalid', class: 'degraded' },
    { test: /^table: .*preserved in the Carve AST as `rowGroups`/, code: 'table-groups-flattened', class: 'degraded' },
    { test: /^table: a foot row's row header is dropped/, code: 'table-foot-row-header-dropped', class: 'lossy' },
    { test: /^table: the body rows disagree on how many leading cells/, code: 'table-row-heads-degraded', class: 'degraded' },
    { test: /^table: the rows of a declared body group disagree/, code: 'table-row-heads-degraded', class: 'degraded' },
    { test: /^table:/, code: 'table-unclassified-loss', class: 'unsupported' },
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
        class: rule.class,
        severity: rule.class === 'normalized' ? 'info' : rule.class === 'degraded' ? 'warning' : 'error',
        fidelity: rule.class === 'normalized'
            ? 'normalized'
            : rule.class === 'degraded'
                ? 'degraded'
                : 'dropped',
        confidence: 'inferred',
        message,
        ...(Object.keys(inferred).length ? { details: inferred } : {}),
        ...(sourceLocation !== undefined ? { sourceLocation } : {}),
    };
}

export interface MigrationReport {
    schemaVersion: 2;
    sourceFormat: string;
    diagnostics: ConversionDiagnostic[];
}

export function migrationReport(diagnostics: ConversionDiagnostic[], sourceFormat = 'pandoc-json'): MigrationReport {
    return { schemaVersion: 2, sourceFormat, diagnostics };
}

function inferDetails(message: string): Record<string, unknown> {
    const details: Record<string, unknown> = {};
    const field = /table: (rowGroups\.(?:headAttrs|footAttrs|bodies\[\d+\]\.attrs)) is dropped/.exec(message)?.[1];
    if (field) details.field = field;
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
    return diagnostics.some((item) => item.fidelity === 'degraded' || item.fidelity === 'dropped');
}
