import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

test('0.2 table body boundaries are section nodes in the tree', () => {
  const table = carveToCarveAst('|= Name |= Value |\n| a | 1 |\n| b | 2 |\n').children[0];
  assert.deepEqual(table.children.map((node) => node.type), ['table_head', 'table_body']);
  assert.equal(table.children[1].children.length, 2);
  const pandoc = carveToPandoc('|= Name |= Value |\n| a | 1 |\n| b | 2 |\n').doc.blocks[0];
  assert.equal(pandoc.c[4].length, 1);
  assert.equal(pandoc.c[4][0][3].length, 2);
});

test('0.1 positional body keys remain ordinary 0.2 table attributes', () => {
  const source = '{body-rows=1,1 body-header-rows=0,0 body-header-cols=1,0}\n| a | 1 |\n| b | 2 |\n';
  const table = carveToCarveAst(source).children[0];
  assert.equal(table.children.filter((node) => node.type === 'table_body').length, 1);
  assert.deepEqual(table.attrs.keyValues, [
    ['body-rows', '1,1'], ['body-header-rows', '0,0'], ['body-header-cols', '1,0'],
  ]);
  assert.deepEqual(pandocToCarveAst(carveToPandoc(source).doc).ast.children[0].attrs.keyValues, table.attrs.keyValues);
});
