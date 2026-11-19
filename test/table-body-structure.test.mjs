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

// C2-B-230: body-rows, body-header-rows and body-header-cols are table keys in 0.2 and give one table_body each.
test('body partition keys give one body per entry and survive Pandoc', () => {
  const source = '{body-rows=1,1 body-header-rows=0,0 body-header-cols=1,0}\n| a | 1 |\n| b | 2 |\n';
  const table = carveToCarveAst(source).children[0];
  assert.deepEqual(table.children.map((node) => [node.type, node.rowHeadColumns]), [['table_body', 1], ['table_body', 0]]);
  assert.equal(table.attrs, undefined);
  const back = pandocToCarveAst(carveToPandoc(source).doc).ast.children[0];
  assert.deepEqual(back.children.map((node) => [node.type, node.rowHeadColumns]), [['table_body', 1], ['table_body', 0]]);
});
