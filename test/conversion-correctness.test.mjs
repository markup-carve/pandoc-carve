import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

for (const [name, source, spanIndex] of [
  ['colspan', '|= A |= B |\n| value | < |\n| c | d |\n', 3],
  ['rowspan', '|= A |= B |\n| value | b |\n| ^ | d |\n', 2],
]) {
  test(`${name} round-trips through Pandoc JSON without loss`, () => {
    const first = carveToPandoc(source);
    const table = first.doc.blocks[0];
    assert.equal(table.t, 'Table');
    assert.equal(table.c[4][0][3][0][1][0][spanIndex], 2);
    assert.deepEqual(first.warnings, []);
    const back = pandocToCarve(first.doc);
    assert.deepEqual(back.warnings, []);
    assert.deepEqual(carveToPandoc(back.carve).doc, first.doc);
  });
}

const pandoc = findPandoc();
for (const version of [2, 3]) {
  test(`EPUB ${version} import follows spine order through the CLI and re-export`, {
    skip: !pandoc && 'pandoc is not installed',
  }, () => {
    // ZIP entries and manifest list A before Z; the spine lists Z before A.
    const fixture = fileURLToPath(new URL(`./fixtures/epub/spine-order-v${version}.epub`, import.meta.url));
    const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
    const result = spawnSync(process.execPath, [cli, fixture, '-f', 'epub'], {
      encoding: 'utf8', env: { ...process.env, PANDOC: pandoc },
    });
    assert.equal(result.status, 0, result.stderr);
    const doc = carveToPandoc(result.stdout).doc;
    const headings = doc.blocks.filter(b => b.t === 'Header');
    assert.deepEqual(headings.map(b => b.c[2]), [
      [{ t: 'Str', c: 'ZULU_MARKER' }],
      [{ t: 'Str', c: 'ALPHA_MARKER' }],
    ]);
    const body = JSON.stringify(doc.blocks);
    assert.equal(body.split('ZULU_MARKER_BODY').length - 1, 1);
    assert.equal(body.split('ALPHA_MARKER_BODY').length - 1, 1);
    assert.ok(body.indexOf('ZULU_MARKER_BODY') < body.indexOf('ALPHA_MARKER_BODY'));
  });
}
