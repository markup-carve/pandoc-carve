import { parse } from '@markup-carve/carve';
import { convert, type ConvertResult } from './convert.js';

export { PANDOC_API_VERSION, type PandocDoc } from './pandoc.js';
export type { ConvertResult } from './convert.js';

/**
 * Convert Carve source to a Pandoc document (api-version 1.23.1).
 *
 * Returns the document plus a list of degradation warnings for constructs
 * that have no faithful Pandoc equivalent.
 */
export function carveToPandoc(source: string): ConvertResult {
    const ast = parse(source) as unknown as Parameters<typeof convert>[0];
    return convert(ast);
}

/**
 * Convert Carve source to Pandoc JSON, ready for `pandoc -f json -t <target>`.
 * Degradation warnings are discarded; use {@link carveToPandoc} to inspect them.
 */
export function carveToPandocJson(source: string): string {
    return JSON.stringify(carveToPandoc(source).doc);
}
