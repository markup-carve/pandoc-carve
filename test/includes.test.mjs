import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

test('string-only conversion keeps a 0.2 include directive unresolved', () => {
  const source = '{{ child.crv }}\n';
  const node = parse(source).children[0];
  assert.equal(node.type, 'include');
  assert.equal(node.path, 'child.crv');
  const result = carveToPandoc(source);
  assert.match(result.warnings.join('\n'), /include: unresolved/u);
  assert.match(JSON.stringify(result.doc), /child\.crv/u);
  assert.equal(pandocToCarve(result.doc).carve, source);
});
