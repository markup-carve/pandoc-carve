// Shared generation logic for the examples/ folder.
//
// Both `npm run examples:build` (scripts/build-examples.mjs) and the golden
// test (test/examples.test.mjs) import from here, so the files written to disk
// and the files asserted against are produced by the exact same code path.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carveToPandoc, carveToPandocJson, pandocToCarve } from '../dist/index.js';
import { findPandoc } from '../test/helpers.mjs';

export { findPandoc };

const here = dirname(fileURLToPath(import.meta.url));
export const examplesDir = join(here, '..', 'examples');

// Pandoc writer name -> output file extension for the export examples.
// `json` needs no pandoc (carveToPandocJson); the rest are pandoc-gated.
export const EXPORT_TARGETS = [
  { target: 'json', ext: 'json', needsPandoc: false },
  { target: 'native', ext: 'native', needsPandoc: true },
  { target: 'latex', ext: 'tex', needsPandoc: true },
  { target: 'typst', ext: 'typ', needsPandoc: true },
  { target: 'rst', ext: 'rst', needsPandoc: true },
];

// One .crv source under examples/export/ each.
export const EXPORT_EXAMPLES = ['article', 'interactive'];

// Pandoc reader name + source file under examples/import/; output is <name>.crv.
export const IMPORT_EXAMPLES = [
  { name: 'paper', from: 'latex', src: 'paper.tex' },
  { name: 'notes', from: 'rst', src: 'notes.rst' },
];

// The .json golden is the pandoc-free guard: it comes straight from
// carveToPandocJson, so it is verified even where no pandoc is installed. It is
// kept compact (machine-readable, one line) to stay small - read the .native
// golden for the human-readable AST and its diffs.

/** pandoc -f json -t <target> over a Pandoc doc object; returns stdout. */
function pandocFromJson(pandoc, doc, target) {
  const result = spawnSync(pandoc, ['-f', 'json', '-t', target], {
    input: JSON.stringify(doc),
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pandoc -t ${target} failed: ${result.stderr}`);
  }
  return result.stdout;
}

/** pandoc -f <from> -t json over a source string; returns the JSON string. */
function pandocToJson(pandoc, source, from) {
  const result = spawnSync(pandoc, ['-f', from, '-t', 'json'], {
    input: source,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pandoc -f ${from} failed: ${result.stderr}`);
  }
  return result.stdout;
}

/**
 * Generate every output for one export example.
 * Returns [{ file, content }]. Pandoc-gated targets are skipped when
 * `pandoc` is null (only the pandoc-free .json golden is produced).
 */
export function generateExport(name, pandoc) {
  const source = readFileSync(join(examplesDir, 'export', `${name}.crv`), 'utf8');
  const { doc } = carveToPandoc(source);
  const outputs = [];
  for (const { target, ext, needsPandoc } of EXPORT_TARGETS) {
    if (needsPandoc && !pandoc) {
      continue;
    }
    const content =
      target === 'json' ? carveToPandocJson(source) + '\n' : pandocFromJson(pandoc, doc, target);
    outputs.push({ file: join('export', `${name}.${ext}`), content });
  }
  return outputs;
}

/**
 * Generate the .crv output for one import example. Needs pandoc to read the
 * source format; returns null when pandoc is unavailable.
 */
export function generateImport(spec, pandoc) {
  if (!pandoc) {
    return null;
  }
  const source = readFileSync(join(examplesDir, 'import', spec.src), 'utf8');
  const json = pandocToJson(pandoc, source, spec.from);
  const { carve } = pandocToCarve(json);
  const content = carve.endsWith('\n') ? carve : carve + '\n';
  return { file: join('import', `${spec.name}.crv`), content };
}
