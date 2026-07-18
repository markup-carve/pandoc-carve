#!/usr/bin/env node
// Regenerate every file under examples/ from its source.
//
//   npm run examples:build
//
// Export sources are examples/export/*.crv; import sources are the non-.crv
// files under examples/import/. Text outputs are written next to the sources.
// Binary writers (docx/pdf/epub) are intentionally NOT produced here - see
// examples/README.md.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  examplesDir,
  findPandoc,
  EXPORT_EXAMPLES,
  IMPORT_EXAMPLES,
  generateExport,
  generateImport,
} from './examples-lib.mjs';

const pandoc = findPandoc();
if (!pandoc) {
  console.warn('pandoc not found - writing only the pandoc-free .json export goldens.');
}

let written = 0;
for (const name of EXPORT_EXAMPLES) {
  for (const { file, content } of generateExport(name, pandoc)) {
    writeFileSync(join(examplesDir, file), content);
    console.log(`wrote examples/${file}`);
    written++;
  }
}

for (const spec of IMPORT_EXAMPLES) {
  const out = generateImport(spec, pandoc);
  if (!out) {
    continue;
  }
  writeFileSync(join(examplesDir, out.file), out.content);
  console.log(`wrote examples/${out.file}`);
  written++;
}

console.log(`\n${written} file(s) written.`);
