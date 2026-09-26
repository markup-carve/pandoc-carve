import * as carve from '@markup-carve/carve';
import { normalizeCarveAst, parseCarveAst, toCarveAst, type CarveAstDocument } from './ast-json.js';
import { convert, type ConvertOptions, type ConvertResult } from './convert.js';
import { parseExtensions, type ParseOptions } from './parse-options.js';
import { pandocToCarve as reverse } from './reverse.js';
import type { PandocDoc } from './pandoc.js';
import type { ConversionDiagnostic } from './diagnostics.js';
import { migrationReport, type MigrationReport } from './diagnostics.js';

export { PANDOC_API_VERSION, type PandocDoc } from './pandoc.js';
export type { ConvertOptions, ConvertResult } from './convert.js';
export type { ParseOptions } from './parse-options.js';
export type { ReverseResult } from './reverse.js';
export type { ConversionDiagnostic, DiagnosticClass, DiagnosticDirection, DiagnosticSeverity, MigrationConfidence, MigrationFidelity, MigrationReport } from './diagnostics.js';
export type { CarveAstDocument, CarveAstNode } from './ast-json.js';

/**
 * The engine's own serializer, when the installed engine has one.
 *
 * PART 12 section 1: an implementation whose internals differ maps on the way
 * out. Where the engine does that itself its mapping is authoritative and is
 * used; the current git pin exports `toAstJson`, while any published release
 * up to `0.1.3` does not, and there `toCarveAst` applies the section 7
 * mapping instead. Feature-detected through
 * a NAMESPACE import on purpose - a named import of an export the installed
 * version does not have fails at link time, before any check could run.
 */
const engineSerializer = (carve as unknown as { toAstJson?: (doc: unknown) => unknown }).toAstJson;

let rendererReadsInlineSubstitutions: boolean | undefined;
let rendererKnowsDirectives: boolean | undefined;

function engineRenderTree(ast: unknown): unknown {
    rendererReadsInlineSubstitutions ??= (() => {
        const parsed = carve.parse('{~/old/~>/new/~}');
        const probe = (engineSerializer ? engineSerializer(parsed) : parsed) as Record<string, unknown>;
        const children = Array.isArray(probe['children']) ? probe['children'] : [];
        const paragraph = children[0] as Record<string, unknown> | undefined;
        const substitution = Array.isArray(paragraph?.['children'])
            ? paragraph['children'].find((node) => node?.type === 'substitution')
            : undefined;
        return Array.isArray(substitution?.['old']) && Array.isArray(substitution?.['new']);
    })();
    rendererKnowsDirectives ??= (() => {
        try {
            carve.renderCarve({
                type: 'document',
                children: [{ type: 'directive', kind: 'toc', children: [] }],
            } as unknown as Parameters<typeof carve.renderCarve>[0]);
            return true;
        } catch {
            return false;
        }
    })();
    const withSubstitutions = rendererReadsInlineSubstitutions ? ast : legacySubstitutions(ast);
    return rendererKnowsDirectives ? withSubstitutions : legacyDirectives(withSubstitutions);
}

/**
 * A renderer that predates the `admonition` split (carve#2195) still spells the
 * six generated-content kinds `admonition`, and throws on `directive`. The
 * source it writes is identical either way - `::: toc` - so this view exists
 * only at that legacy API boundary; the returned and converted ASTs keep the
 * split node.
 */
function legacyDirectives(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(legacyDirectives);
    if (typeof value !== 'object' || value === null) return value;
    const node = value as Record<string, unknown>;
    const mapped = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, legacyDirectives(child)]));
    return node['type'] === 'directive' ? { ...mapped, type: 'admonition' } : mapped;
}

function legacySubstitutions(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(legacySubstitutions);
    if (typeof value !== 'object' || value === null) return value;
    const node = value as Record<string, unknown>;
    if (node['type'] === 'substitution') {
        const { old, new: replacement, ...rest } = node;
        const legacyRest = Object.fromEntries(
            Object.entries(rest).map(([key, child]) => [key, legacySubstitutions(child)]),
        );
        return {
            ...legacyRest,
            // The published renderer cannot express inline structure in these
            // fields. This lossy view exists only at that legacy API boundary;
            // the returned and converted ASTs retain the arrays.
            oldText: inlineText(old),
            newText: inlineText(replacement),
        };
    }
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, legacySubstitutions(child)]));
}

function inlineText(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value.map((node) => {
        if (typeof node !== 'object' || node === null) return '';
        const inline = node as Record<string, unknown>;
        if (inline['type'] === 'non_breaking_space') return '\u00a0';
        if (inline['type'] === 'text') return String(inline['value'] ?? '');
        if (inline['type'] === 'soft_break' || inline['type'] === 'hard_break') return '\n';
        return inlineText(inline['children']);
    }).join('');
}

const parserHasSpaceNodes = JSON.stringify(carve.parse('a\\ b')).includes('"non_breaking_space"');

function upgradeParserSpaces(value: unknown, literalMarker: string | undefined, source: string[] = []): unknown {
    if (typeof value === 'string') {
        const restored = value.replace(/\ue000/g, '\u00a0');
        return literalMarker ? restored.split(literalMarker).join('\ue000') : restored;
    }
    if (Array.isArray(value)) {
        return value.flatMap((child) => {
            if (child && child.type === 'text' && typeof child.value === 'string' && child.value.includes('\ue000')) {
                const { pos, value: text, type: _type, ...attributes } = child;
                const tokens: { value: string; start: number; end: number }[] = [];
                const codepoints = [...text];
                if (pos) {
                    for (let i = pos.startOffset; i < pos.endOffset; i++) {
                        const start = i;
                        let value = source[i];
                        if (value === '\\' && source[i + 1] === ' ') { value = '\ue000'; i++; }
                        else if (value === ' ' && codepoints[tokens.length] === '\ue000') value = '\ue000';
                        else if (value === '\\' && /[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/.test(source[i + 1] ?? '')) value = source[++i];
                        tokens.push({ value: value ?? '', start, end: i + 1 });
                    }
                }
                // Reassembled legacy runs can lack an exact span. Publish a
                // position only when the source replay proves every boundary.
                const exact = tokens.map(t => t.value).join('') === text;
                let cursor = 0;
                return text.split(/(\ue000)/).filter(Boolean).map((part: string) => {
                    const length = [...part].length;
                    const node: Record<string, unknown> = { ...upgradeParserSpaces(attributes, literalMarker, source) as object,
                        type: part === '\ue000' ? 'non_breaking_space' : 'text' };
                    if (part !== '\ue000') node.value = upgradeParserSpaces(part, literalMarker, source);
                    if (exact && pos.startLine === pos.endLine) {
                        const start = tokens[cursor]!.start;
                        const end = tokens[cursor + length - 1]!.end;
                        node.pos = { ...pos, startOffset: start, endOffset: end,
                            startColumn: pos.startColumn + start - pos.startOffset,
                            endColumn: pos.startColumn + end - pos.startOffset };
                    }
                    cursor += length;
                    return node;
                });
            }
            return [upgradeParserSpaces(child, literalMarker, source)];
        });
    }
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, upgradeParserSpaces(child, literalMarker, source)]));
}

/**
 * Parse Carve source to the serialized AST of PART 12 - the shape
 * `resources/ast-schema.json` pins, and the shape every engine's `--to-json`
 * writes.
 */
export function carveToCarveAst(source: string, options?: ParseOptions): CarveAstDocument {
    if (parserHasSpaceNodes) {
        return toCarveAst(carve.parse(source, { extensions: parseExtensions(options) }), engineSerializer);
    }
    let marker: string | undefined;
    for (let cp = 0xf8ff; source.includes('\ue000') && cp >= 0xe020; cp--) {
        const candidate = String.fromCharCode(cp);
        if (!source.includes(candidate)) { marker = candidate; break; }
    }
    if (!marker && source.includes('\ue000')) throw new Error('Legacy parser has no free character for literal Unicode protection');
    const protectedSource = marker ? source.replace(/\ue000/g, marker) : source;
    const ast = toCarveAst(carve.parse(protectedSource, { extensions: parseExtensions(options) }), engineSerializer);
    return upgradeParserSpaces(ast, marker, [...protectedSource.replace(/\r\n?/g, '\n').replace(/\0/g, '\ufffd')]) as CarveAstDocument;
}

/**
 * Convert Carve source to a Pandoc document (api-version 1.23.1).
 *
 * Returns the document plus a list of degradation warnings for constructs
 * that have no faithful Pandoc equivalent.
 */
export function carveToPandoc(
    source: string,
    options?: ConvertOptions & ParseOptions,
): ConvertResult {
    return convert(carveToCarveAst(source, options), withParser(options));
}

/**
 * The convert options with this module's parser lent to them.
 *
 * `convert` reads a serialized AST from any engine and holds no engine of its
 * own, but metadata block content (`abstract: |`) is Carve SOURCE inside a
 * YAML string and has to be parsed. This is the only place that owns both, so
 * it is the place that hands the parser over. An explicit `parseBlocks` wins,
 * so a caller can supply another engine's.
 */
function withParser(options?: ConvertOptions & ParseOptions): ConvertOptions {
    return {
        ...options,
        parseBlocks: options?.parseBlocks
            ?? ((source: string) => carveToCarveAst(source, options).children ?? []),
    };
}

/**
 * Convert an already-serialized Carve AST - PART 12, from ANY engine, however
 * it arrived: a `carve --to-json` file, a pipe, an editor's own tree.
 *
 * Takes the document as an object or as JSON text. It runs the same conversion
 * {@link carveToPandoc} does, because the exchange format is what the converter
 * reads in both cases - no implementation's internals are involved.
 */
export function carveAstToPandoc(
    ast: CarveAstDocument | string,
    options?: ConvertOptions & ParseOptions,
): ConvertResult {
    const parsed = normalizeCarveAst(parseCarveAst(ast));
    const normalized = options?.legacySpaceSentinels ? upgradeParserSpaces(parsed, undefined) as CarveAstDocument : parsed;
    return convert(normalized, withParser(options));
}

/**
 * Convert Carve source to Pandoc JSON, ready for `pandoc -f json -t <target>`.
 * Degradation warnings are discarded; use {@link carveToPandoc} to inspect them.
 */
export function carveToPandocJson(
    source: string,
    options?: ConvertOptions & ParseOptions,
): string {
    return JSON.stringify(carveToPandoc(source, options).doc);
}

/**
 * The reverse direction: convert a Pandoc document (as emitted by
 * `pandoc -t json`) to Carve source. Serialization is delegated to
 * `renderCarve` (the `carve fmt` serializer), so the output carries fmt's
 * guarantees. Returns the Carve source plus degradation warnings.
 */
export function pandocToCarve(doc: PandocDoc | string): { carve: string; warnings: string[]; diagnostics: ConversionDiagnostic[]; report: MigrationReport } {
    const parsed: PandocDoc = typeof doc === 'string' ? (JSON.parse(doc) as PandocDoc) : doc;
    const { ast, warnings, diagnostics } = reverse(parsed);
    return {
        carve: carve.renderCarve(engineRenderTree(ast) as Parameters<typeof carve.renderCarve>[0]),
        warnings,
        diagnostics,
        report: migrationReport(diagnostics),
    };
}

/**
 * Convert Pandoc to the canonical Carve exchange AST without forcing it through
 * Carve 0.1 source. This preserves structural fields, notably Pandoc's optional
 * short caption, for which the source language intentionally has no spelling.
 */
export function pandocToCarveAst(
    doc: PandocDoc | string,
): { ast: CarveAstDocument; warnings: string[]; diagnostics: ConversionDiagnostic[]; report: MigrationReport } {
    const parsed: PandocDoc = typeof doc === 'string' ? (JSON.parse(doc) as PandocDoc) : doc;
    const { ast, warnings, diagnostics } = reverse(parsed, 'ast');
    return { ast: toCarveAst(ast, engineSerializer), warnings, diagnostics, report: migrationReport(diagnostics) };
}
