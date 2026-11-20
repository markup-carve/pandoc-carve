/** Node-only API: file-backed include expansion. */
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { includeDependencies, parseWithDiagnostics, type Diagnostic, type IncludeDependency } from '@markup-carve/carve';
import { fileSystemResolver } from '@markup-carve/carve/node';
import { carveAstToPandoc } from './convert.js';
import type { PandocDoc } from './pandoc.js';

export interface IncludeConversionOptions {
  /** Absolute containment root; no include reads a file outside it. */
  includeRoot: string;
  /** Absolute path of the source file, inside the root; its includes resolve from its folder. */
  sourcePath?: string;
}

export interface IncludeConversionResult {
  doc: PandocDoc;
  warnings: string[];
  /** The `include-*` entries of the parse diagnostics. */
  includeDiagnostics: Diagnostic[];
  suppressedIncludeDiagnostics: number;
  /** Every include directive in tree order, with the file it read and whether it was read. */
  dependencies: IncludeDependency[];
}

const inside = (root: string, target: string): boolean => {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

/** Convert file-backed Carve source after contained include expansion. */
export function carveToPandocWithIncludes(source: string, include: IncludeConversionOptions): IncludeConversionResult {
  if (!path.isAbsolute(include.includeRoot)) throw new Error('includeRoot must be an absolute path');
  if (include.sourcePath !== undefined && !path.isAbsolute(include.sourcePath)) throw new Error('sourcePath must be an absolute path');
  const root = realpathSync(include.includeRoot);
  let file: string | undefined;
  if (include.sourcePath !== undefined) {
    const sourcePath = path.join(realpathSync(path.dirname(include.sourcePath)), path.basename(include.sourcePath));
    if (!inside(root, sourcePath)) throw new Error('input file must be inside --include-root');
    file = path.relative(root, sourcePath).split(path.sep).join('/');
  }
  const parsed = parseWithDiagnostics(source, { includes: { resolver: fileSystemResolver(root), ...(file === undefined ? {} : { file }) } });
  const converted = carveAstToPandoc(parsed.document);
  return {
    ...converted,
    includeDiagnostics: parsed.diagnostics.filter(entry => entry.code.startsWith('include-')),
    suppressedIncludeDiagnostics: parsed.suppressedDiagnostics,
    dependencies: includeDependencies(parsed.document),
  };
}
