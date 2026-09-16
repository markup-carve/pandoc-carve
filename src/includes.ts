import * as carve from '@markup-carve/carve';
import { fileSystemResolver } from '@markup-carve/carve/node';
import path from 'node:path';
import { toCarveAst } from './ast-json.js';
import { carveAstToPandoc } from './index.js';
import { parseExtensions, type ParseOptions } from './parse-options.js';
import type { ConvertOptions, ConvertResult } from './convert.js';

export interface IncludeConversionOptions {
    includeRoot: string;
    sourcePath?: string;
}

export interface IncludeConversionResult extends ConvertResult {
    includeWarnings: carve.IncludeWarning[];
    dependencies: carve.IncludeDependency[];
}

/** Convert file-backed Carve source after contained include expansion. */
export function carveToPandocWithIncludes(
    source: string,
    include: IncludeConversionOptions,
    options?: ConvertOptions & ParseOptions,
): IncludeConversionResult {
    if (!path.isAbsolute(include.includeRoot)) {
        throw new Error('includeRoot must be an absolute path');
    }
    if (include.sourcePath && !path.isAbsolute(include.sourcePath)) {
        throw new Error('sourcePath must be an absolute path');
    }
    if (include.sourcePath) {
        const relative = path.relative(include.includeRoot, include.sourcePath);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            throw new Error('input file must be inside --include-root');
        }
    }
    const extensions = parseExtensions(options);
    const expanded = carve.expandIncludes(carve.parse(source, { extensions, positions: true }), source, {
        resolve: fileSystemResolver(include.includeRoot),
        ...(include.sourcePath ? { sourcePath: include.sourcePath } : {}),
        extensions,
    });
    const serializer = carve.toAstJson as unknown as (doc: unknown) => unknown;
    const converted = carveAstToPandoc(toCarveAst(expanded.doc, serializer), options);
    return {
        ...converted,
        includeWarnings: expanded.warnings,
        dependencies: expanded.dependencies,
    };
}
