import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

const examples = JSON.parse(readFileSync(new URL('../vendor/carve/examples.json', import.meta.url), 'utf8'));

test('every emitted 0.2 table loss warning has an explicit classification', () => {
  const warnings = [];
  for (const example of examples.filter(({ flags }) => !flags?.length)) {
    const forward = carveToPandoc(example.input);
    const reverse = pandocToCarve(forward.doc);
    for (const warning of [...forward.warnings, ...reverse.warnings]) {
      if (/table|cell|row|column/iu.test(warning)) warnings.push(warning);
    }
  }
  // The 0.2 corpus at the pinned engine round trips its tables without loss (C2-B-230, C2-W-136 spell the
  // body partition), so a Pandoc table with block cells and body attributes keeps the gate exercised.
  const para = (text) => ({ t: 'Para', c: [{ t: 'Str', c: text }] });
  const cell = (blocks) => [['', [], []], { t: 'AlignDefault' }, 1, 1, blocks];
  const probe = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Table', c: [
    ['', [], []], [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]], [['head', [], []], [[['', [], []], [cell([para('H')])]]]],
    [[['body', ['g'], []], 0, [], [[['', [], []], [cell([para('a'), para('b')])]]]]], [['', [], []], []],
  ] }] };
  for (const warning of pandocToCarve(probe).warnings) if (/table|cell|row|column/iu.test(warning)) warnings.push(warning);
  assert.ok(warnings.length >= 3, 'the table warning gate saw no losses');
  for (const warning of warnings) {
    assert.match(warning, /^(?:field-unspellable|structure-unspellable): /u);
    assert.doesNotMatch(warning, /unclassified|unknown/iu);
  }
});
