import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

const examples = JSON.parse(readFileSync(new URL('../vendor/carve-v2/examples.json', import.meta.url), 'utf8'));

test('every emitted 0.2 table loss warning has an explicit classification', () => {
  const warnings = [];
  for (const example of examples.filter(({ flags }) => !flags?.length)) {
    const forward = carveToPandoc(example.input);
    const reverse = pandocToCarve(forward.doc);
    for (const warning of [...forward.warnings, ...reverse.warnings]) {
      if (/table|cell|row|column/iu.test(warning)) warnings.push(warning);
    }
  }
  assert.ok(warnings.length >= 3, 'the table warning gate saw no losses');
  for (const warning of warnings) {
    assert.match(warning, /^(?:field-unspellable|structure-unspellable): /u);
    assert.doesNotMatch(warning, /unclassified|unknown/iu);
  }
});
