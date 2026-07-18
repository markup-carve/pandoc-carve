import { parse, renderCarve } from '@markup-carve/carve';
import { convert, type ConvertOptions, type ConvertResult } from './convert.js';
import { pandocToCarve as reverse } from './reverse.js';
import type { PandocDoc } from './pandoc.js';

export { PANDOC_API_VERSION, type PandocDoc } from './pandoc.js';
export type { ConvertOptions, ConvertResult } from './convert.js';
export type { ReverseResult } from './reverse.js';

/**
 * Convert Carve source to a Pandoc document (api-version 1.23.1).
 *
 * Returns the document plus a list of degradation warnings for constructs
 * that have no faithful Pandoc equivalent.
 */
export function carveToPandoc(source: string, options?: ConvertOptions): ConvertResult {
    const ast = parse(source) as unknown as Parameters<typeof convert>[0];
    return convert(ast, options);
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
    return { carve: renderCarve(ast as unknown as Parameters<typeof renderCarve>[0]), warnings };
}
