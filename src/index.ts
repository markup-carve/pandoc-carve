import * as carve from '@markup-carve/carve';
import { normalizeCarveAst, parseCarveAst, toCarveAst, type CarveAstDocument } from './ast-json.js';
import { convert, type ConvertOptions, type ConvertResult } from './convert.js';
import { pandocToCarve as reverse } from './reverse.js';
import type { PandocDoc } from './pandoc.js';

export { PANDOC_API_VERSION, type PandocDoc } from './pandoc.js';
export type { ConvertOptions, ConvertResult } from './convert.js';
export type { ReverseResult } from './reverse.js';
export type { CarveAstDocument, CarveAstNode } from './ast-json.js';

/**
 * The engine's own serializer, when the installed engine has one.
 *
 * PART 12 section 1: an implementation whose internals differ maps on the way
 * out. Where the engine does that itself its mapping is authoritative and is
 * used; the published `^0.1.2` pinned here exports no `toAstJson`, and
 * `toCarveAst` applies the section 7 mapping instead. Feature-detected through
 * a NAMESPACE import on purpose - a named import of an export the installed
 * version does not have fails at link time, before any check could run.
 */
const engineSerializer = (carve as unknown as { toAstJson?: (doc: unknown) => unknown }).toAstJson;

/**
 * Parse Carve source to the serialized AST of PART 12 - the shape
 * `resources/ast-schema.json` pins, and the shape every engine's `--to-json`
 * writes.
 */
export function carveToCarveAst(source: string): CarveAstDocument {
    return toCarveAst(carve.parse(source), engineSerializer);
}

/**
 * Convert Carve source to a Pandoc document (api-version 1.23.1).
 *
 * Returns the document plus a list of degradation warnings for constructs
 * that have no faithful Pandoc equivalent.
 */
export function carveToPandoc(source: string, options?: ConvertOptions): ConvertResult {
    return convert(carveToCarveAst(source), options);
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
    options?: ConvertOptions,
): ConvertResult {
    return convert(normalizeCarveAst(parseCarveAst(ast)), options);
}

/**
 * Convert Carve source to Pandoc JSON, ready for `pandoc -f json -t <target>`.
 * Degradation warnings are discarded; use {@link carveToPandoc} to inspect them.
 */
export function carveToPandocJson(source: string, options?: ConvertOptions): string {
    return JSON.stringify(carveToPandoc(source, options).doc);
}

/**
 * The reverse direction: convert a Pandoc document (as emitted by
 * `pandoc -t json`) to Carve source. Serialization is delegated to
 * `renderCarve` (the `carve fmt` serializer), so the output carries fmt's
 * guarantees. Returns the Carve source plus degradation warnings.
 */
export function pandocToCarve(doc: PandocDoc | string): { carve: string; warnings: string[] } {
    const parsed: PandocDoc = typeof doc === 'string' ? (JSON.parse(doc) as PandocDoc) : doc;
    const { ast, warnings } = reverse(parsed);
    return {
        carve: carve.renderCarve(ast as Parameters<typeof carve.renderCarve>[0]),
        warnings,
    };
}

/**
 * Convert Pandoc to the canonical Carve exchange AST without forcing it through
 * Carve 0.1 source. This preserves structural fields, notably Pandoc's optional
 * short caption, for which the source language intentionally has no spelling.
 */
export function pandocToCarveAst(
    doc: PandocDoc | string,
): { ast: CarveAstDocument; warnings: string[] } {
    const parsed: PandocDoc = typeof doc === 'string' ? (JSON.parse(doc) as PandocDoc) : doc;
    const { ast, warnings } = reverse(parsed);
    return { ast: toCarveAst(ast, engineSerializer), warnings };
}
