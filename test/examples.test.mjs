import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  examplesDir,
  findPandoc,
  EXPORT_EXAMPLES,
  IMPORT_EXAMPLES,
  generateExport,
  generateImport,
} from '../scripts/examples-lib.mjs';

// Golden test: the committed files under examples/ must match a fresh
// regeneration. If a converter change shifts output, this reddens instead of
// letting the examples silently rot. Pandoc-gated outputs are only checked
// when a pandoc executable is available.
const pandoc = findPandoc();

function assertGolden(file, content) {
  const onDisk = readFileSync(join(examplesDir, file), 'utf8');
  assert.equal(
    content,
    onDisk,
    `examples/${file} is stale - run \`npm run examples:build\` and commit the result.`,
  );
}

for (const name of EXPORT_EXAMPLES) {
  test(`examples: export ${name} matches goldens`, () => {
    for (const { file, content } of generateExport(name, pandoc)) {
      assertGolden(file, content);
    }
  });
}

for (const spec of IMPORT_EXAMPLES) {
  test(`examples: import ${spec.name} matches golden`, { skip: !pandoc && 'pandoc not found' }, () => {
    const out = generateImport(spec, pandoc);
    assertGolden(out.file, out.content);
  });
}
