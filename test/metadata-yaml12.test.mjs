import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToCarveAst } from '../dist/index.js';

test('YAML 1.2 aliases stay verbatim in 0.2 frontmatter', () => {
  const value = 'root: yes\nnested:\n  flag: off\nflow: [on, n, false, TRUE]\n';
  const ast = carveToCarveAst(`---yaml\n${value}---\n`);
  assert.equal(ast.children[0].type, 'frontmatter');
  assert.equal(ast.children[0].value, value);
});

test.skip('YAML 1.2 aliases remain strings at every Pandoc metadata depth [F-001: no general Pandoc Meta slot in the 0.2 tree]', () => {});
