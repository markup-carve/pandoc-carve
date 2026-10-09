import { test } from 'node:test';
import assert from 'node:assert/strict';
import { declaredPairsIn } from './helpers.mjs';

test('a compare block declares one pair per carve fence, and fence content is not markup', () => {
  const page = [
    '::: compare',
    '',
    '```carve',
    'a',
    '```',
    '',
    '```html',
    '<p>a</p>',
    '```',
    '',
    '```carve',
    'b',
    '```',
    '',
    '```html',
    '<p>b</p>',
    '```',
    '',
    '````carve',
    '```carve',
    'c',
    '```',
    '````',
    '',
    '````html',
    '<pre><code class="language-carve">c</code></pre>',
    '````',
    '',
    ':::',
    '',
    '````text',
    '::: compare',
    '```carve',
    'not a pair',
    '```',
    ':::',
    '````',
    '',
  ].join('\n');
  assert.equal(declaredPairsIn(page), 3);
});
