import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const examples = JSON.parse(readFileSync(new URL('../vendor/carve/examples.json', import.meta.url), 'utf8'));

test('the 0.2 example census counts each declared pair once and retains fenced source', () => {
  // Derived from the vendored engine corpus: data/conformance/examples.json render examples at the pinned commit.
  assert.equal(examples.length, 505);
  assert.equal(new Set(examples.map(({ file, number }) => `${file}#${number}`)).size, 505);
  const fence = examples.find(({ file, number }) => file === 'syntax-blocks.md' && number === 5);
  assert.equal(fence.input, '- a\n```\n- b\n```');
  assert.equal(examples.filter(({ file }) => file === 'syntax-blocks.md').length, 288);
});
