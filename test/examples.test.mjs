import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  examplesDir,
  findPandoc,
  EXPORT_EXAMPLES,
  EXPORT_TARGETS,
  IMPORT_EXAMPLES,
  generateExport,
  generateImport,
} from '../scripts/examples-lib.mjs';
import { shortfall } from './helpers.mjs';

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

/*
 * How many goldens each export example HAS, against how many a run without
 * pandoc compares.
 *
 * `examples: export article matches goldens` used to print a plain `ok` on a
 * host with no pandoc, having compared examples/export/article.json and none of
 * the six pandoc-written goldens beside it. Not a skip - a full pass, under a
 * plural name (markup-carve/carve#755). The import tests below skip visibly for
 * the same missing binary, which is why this one went unnoticed.
 *
 * So the pandoc-free golden and the pandoc-gated ones are now separate tests:
 * the second SKIPS where the first passes, and the log says which six files
 * were not compared. Both assert their own count, so a target quietly dropped
 * from EXPORT_TARGETS is a failure rather than a smaller run.
 */
const PANDOC_FREE_TARGETS = EXPORT_TARGETS.filter((t) => !t.needsPandoc).length;
const PANDOC_GATED_TARGETS = EXPORT_TARGETS.filter((t) => t.needsPandoc).length;

/*
 * Both counts above are derived from EXPORT_TARGETS, which is the list they are
 * meant to police - variant 1 on markup-carve/carve#755, a guard reading its own
 * input. Found by mutation, not by review: deleting the `rst` entry moved the
 * expected count down in lockstep with the actual one, examples/export/*.rst
 * stopped being compared, and all three tests stayed green.
 *
 * So the deciding comparison is against the files on disk, which EXPORT_TARGETS
 * cannot edit. A golden nobody claims is a writer that quietly stopped running.
 */
test('every committed export golden is claimed by a target', () => {
  const onDisk = readdirSync(join(examplesDir, 'export'))
    .filter((f) => !f.endsWith('.crv'))
    .sort();
  const claimed = EXPORT_EXAMPLES.flatMap((name) =>
    EXPORT_TARGETS.map((t) => `${name}.${t.ext}`),
  ).sort();
  assert.deepEqual(
    onDisk,
    claimed,
    'examples/export holds a golden no EXPORT_TARGETS entry produces, or names one ' +
      'that is not committed. The first is a writer that stopped being checked while ' +
      'its output stayed on disk looking current.',
  );
});

for (const name of EXPORT_EXAMPLES) {
  test(`examples: export ${name} matches its pandoc-free golden`, () => {
    const generated = [...generateExport(name, null)];
    for (const { file, content } of generated) assertGolden(file, content);
    const thin = shortfall({
      label: 'GOLDENS',
      actual: generated.length,
      atLeast: PANDOC_FREE_TARGETS,
      of: `golden(s) for ${name} that need no pandoc`,
      hint: 'carveToPandocJson writes this one, so it is the coverage every host has.',
    });
    assert.equal(thin, null, thin ?? '');
  });

  test(
    `examples: export ${name} matches its ${PANDOC_GATED_TARGETS} pandoc-written goldens`,
    { skip: !pandoc && 'pandoc not found' },
    () => {
      const generated = [...generateExport(name, pandoc)].filter(
        (entry) => !entry.file.endsWith('.json'),
      );
      for (const { file, content } of generated) assertGolden(file, content);
      const thin = shortfall({
        label: 'GOLDENS',
        actual: generated.length,
        atLeast: PANDOC_GATED_TARGETS,
        of: `pandoc-written golden(s) for ${name}`,
        hint: 'EXPORT_TARGETS names them; a run comparing fewer has stopped ' +
          'checking the writers, not passed them.',
      });
      assert.equal(thin, null, thin ?? '');
    },
  );
}

for (const spec of IMPORT_EXAMPLES) {
  test(`examples: import ${spec.name} matches golden`, { skip: !pandoc && 'pandoc not found' }, () => {
    const out = generateImport(spec, pandoc);
    assertGolden(out.file, out.content);
  });
}
