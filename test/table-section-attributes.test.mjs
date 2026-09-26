import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';

const attrs = { order: ['#id', '.class', 'key'], id: 'h', classes: ['section'], keyValues: { 'data-label': 'a&b' } };
const row = (value) => ({ type: 'table_row', cells: [{ type: 'table_cell', header: false, children: [{ type: 'text', value }] }] });
const doc = (empty = false) => ({ type: 'document', children: [{ type: 'table', rows: empty ? [] : [row('H'), row('B'), row('F')], rowGroups: {
  headRows: empty ? 0 : 1, headAttrs: attrs, footRows: empty ? 0 : 1, footAttrs: { id: 'f', order: ['#id'] },
  bodies: empty ? [] : [{ headRows: 0, bodyRows: 1, attrs: { id: 'b', order: ['#id'] } }],
} }] });

for (const empty of [false, true]) {
  test(`section attributes survive Pandoc round trips (empty=${empty})`, () => {
    const input = doc(empty);
    const pandoc = carveAstToPandoc(input).doc;
    assert.deepEqual(pandoc.blocks[0].c[3][0], ['h', ['section'], [['data-label', 'a&b']]]);
    assert.deepEqual(pandoc.blocks[0].c[5][0], ['f', [], []]);
    const result = pandocToCarveAst(pandoc);
    assert.deepEqual(result.ast.children[0].rowGroups, input.children[0].rowGroups);
    const source = pandocToCarve(pandoc);
    assert.match(JSON.stringify(source.warnings), /rowGroups.headAttrs/);
    assert.match(JSON.stringify(source.warnings), /rowGroups.footAttrs/);
  });
}

test('block cells keep section attributes on the AST target and report source loss', () => {
  const pandoc = carveAstToPandoc(doc()).doc;
  const cell = pandoc.blocks[0].c[4][0][3][0][1][0];
  cell[4] = [{ t: 'Para', c: [{ t: 'Str', c: 'one' }] }, { t: 'Para', c: [{ t: 'Str', c: 'two' }] }];
  const back = pandocToCarveAst(pandoc);
  assert.equal(back.ast.children[0].type, 'table');
  assert.equal(back.ast.children[0].rowGroups.headAttrs.id, 'h');
  assert.equal(back.ast.children[0].rows[1].cells[0].blocks.length, 2);
  assert.deepEqual(carveAstToPandoc(back.ast).doc.blocks[0].c[3][0], pandoc.blocks[0].c[3][0]);
  assert.equal(back.warnings.length, 0);
  const source = pandocToCarve(pandoc);
  assert.match(source.carve, /list-table/);
  assert.match(JSON.stringify(source.diagnostics), /rowGroups.headAttrs/);
});
