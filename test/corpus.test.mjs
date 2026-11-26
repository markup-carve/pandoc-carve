import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carveToPandoc } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const root = new URL('..', import.meta.url).pathname;
const fixtureNames = [
  'examples/export/article.crv',
  'examples/export/interactive.crv',
  'examples/export/spans.crv',
  'test/fixtures/probes-0.2/figure_group.crv',
];
const fixtures = fixtureNames.filter((name) => existsSync(join(root, name)));
const pandoc = findPandoc();

test('the 0.2 fixture corpus is complete before per-file tests run', () => {
  assert.deepEqual(fixtures, fixtureNames);
});

for (const fixture of fixtures) {
  test(`corpus: ${fixture} converts without throwing`, () => {
    const source = readFileSync(join(root, fixture), 'utf8');
    const { doc } = carveToPandoc(source);
    assert.deepEqual(doc['pandoc-api-version'], [1, 23, 1]);
    assert.ok(Array.isArray(doc.blocks));
    assert.ok(doc.blocks.length > 0);
  });

  test(`corpus: ${fixture} is accepted by Pandoc in four formats`, { skip: !pandoc && 'pandoc not found' }, () => {
    const source = readFileSync(join(root, fixture), 'utf8');
    const { doc } = carveToPandoc(source);
    for (const target of ['native', 'latex', 'typst', 'html']) {
      const out = pandocRender(pandoc, doc, target);
      assert.ok(out.length > 0, `${target} output non-empty`);
    }
  });
}

test('corpus: adversarial snippets never throw during conversion', () => {
  const inputs = [
    '', '\n\n\n', '|', '| a |', '^ caption without target',
    '[^only-def]: orphan', '</#nowhere>', '::: unknown-admonition\nx\n:::',
    '`unclosed', '/unclosed em', '{#attr-without-block}', '- [x]',
    ':: term-no-def', '$`', '![](no-alt.png)', '%%',
    '---\nbroken yaml: [unclosed\n---\nbody', 'a\u0000b', '\ufeffbom',
  ];
  for (const source of inputs) {
    assert.doesNotThrow(() => carveToPandoc(source), `input: ${JSON.stringify(source)}`);
  }
});
