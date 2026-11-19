import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';

const cell = (value, header = false) => ({ type: 'table_cell', header, children: [{ type: 'cell_paragraph', children: [{ type: 'text', value }] }] });
const row = (value, header = false) => ({ type: 'table_row', children: [cell(value, header)] });
const doc = (empty = false) => ({ type: 'document', astVersion: '2.0', children: [{ type: 'table', columns: [{ type: 'table_column' }], children: [
  { type: 'table_head', attrs: { id: 'h', classes: ['section'], keyValues: [['data-label', 'a&b']] }, children: empty ? [] : [row('H', true)] },
  { type: 'table_body', attrs: { id: 'b' }, children: empty ? [] : [row('B')] },
  { type: 'table_foot', attrs: { id: 'f' }, children: empty ? [] : [row('F')] },
] }] });

for (const empty of [false, true]) {
  test(`section attributes survive Pandoc round trips (empty=${empty})`, () => {
    const input = doc(empty);
    const pandoc = carveAstToPandoc(input).doc;
    assert.deepEqual(pandoc.blocks[0].c[3][0], ['h', ['section'], [['data-label', 'a&b']]]);
    assert.deepEqual(pandoc.blocks[0].c[4][0][0], ['b', [], []]);
    assert.deepEqual(pandoc.blocks[0].c[5][0], ['f', [], []]);
    const groups = pandocToCarveAst(pandoc).ast.children[0].children;
    assert.deepEqual(groups.map((group) => group.type), ['table_head', 'table_body', 'table_foot']);
    assert.deepEqual(groups.map((group) => group.attrs), input.children[0].children.map((group) => group.attrs));
    assert.deepEqual(groups.map((group) => group.children.length), empty ? [0, 0, 0] : [1, 1, 1]);
    const warnings = pandocToCarve(pandoc).warnings;
    if (empty) {
      // The 0.2 writer has no spelling for a table whose head, body and foot are all empty; it reports the whole table.
      assert.ok(warnings.some((w) => w.startsWith('structure-unspellable') && w.includes('table node')), warnings.join(' | '));
      return;
    }
    assert.ok(warnings.some((w) => w.includes('table_head') && w.includes('attrs')), warnings.join(' | '));
    assert.ok(warnings.some((w) => w.includes('table_foot') && w.includes('attrs')), warnings.join(' | '));
  });
}

test('block cells keep section attributes in the AST and report source loss', () => {
  const pandoc = carveAstToPandoc(doc()).doc;
  pandoc.blocks[0].c[4][0][3][0][1][0][4] = [
    { t: 'Para', c: [{ t: 'Str', c: 'one' }] },
    { t: 'Para', c: [{ t: 'Str', c: 'two' }] },
  ];
  const { ast, warnings } = pandocToCarveAst(pandoc);
  const groups = ast.children[0].children;
  assert.equal(groups[0].attrs.id, 'h');
  assert.equal(groups[1].children[0].children[0].children.length, 2);
  assert.deepEqual(carveAstToPandoc(ast).doc.blocks[0].c[3][0], pandoc.blocks[0].c[3][0]);
  assert.deepEqual(warnings, []);
  const sourceWarnings = pandocToCarve(pandoc).warnings;
  assert.ok(sourceWarnings.some((w) => w.includes('table_cell') && w.includes('structure-unspellable')), sourceWarnings.join(' | '));
});
