import assert from 'node:assert/strict';
import test from 'node:test';
import { carveAstToPandoc, carveToPandoc, pandocToCarveAst } from '../dist/index.js';
import { diagnostic } from '../dist/diagnostics.js';

const carveDoc = (children) => ({ type: 'document', children });
const pandocDoc = (blocks = [], meta = {}) => ({ 'pandoc-api-version': [1, 23, 1], meta, blocks });
const text = (value) => ({ type: 'text', value });

function expectCode(result, code, direction, cls, fidelity, count = 1) {
  const found = result.diagnostics.filter((item) => item.code === code);
  assert.equal(found.length, count, `expected ${code}; got ${result.diagnostics.map((item) => item.code).join(', ')}`);
  for (const item of found) {
    assert.equal(item.direction, direction);
    assert.equal(item.class, cls);
    assert.equal(item.fidelity, fidelity);
    assert.equal(item.severity, cls === 'degraded' ? 'warning' : 'error');
    assert.ok(result.warnings.includes(item.message));
  }
}

test('an unknown Carve inline produces unknown-carve-inline', () => {
  const result = carveAstToPandoc(carveDoc([{
    type: 'paragraph', children: [{ type: 'future_inline', value: 'x' }],
  }]));
  expectCode(result, 'unknown-carve-inline', 'carve-to-pandoc', 'degraded', 'degraded');
});

test('an unknown Pandoc inline produces unsupported-pandoc-inline', () => {
  const result = pandocToCarveAst(pandocDoc([{
    t: 'Para', c: [{ t: 'FutureInline', c: 'x' }],
  }]));
  expectCode(result, 'unsupported-pandoc-inline', 'pandoc-to-carve', 'unsupported', 'dropped');
});

test('an unknown Pandoc block produces unsupported-pandoc-block', () => {
  const result = pandocToCarveAst(pandocDoc([{ t: 'FutureBlock', c: 'x' }]));
  expectCode(result, 'unsupported-pandoc-block', 'pandoc-to-carve', 'unsupported', 'dropped');
});

test('empty MetaBlocks produces metadata-empty-blocks-skipped', () => {
  const result = pandocToCarveAst(pandocDoc([], { abstract: { t: 'MetaBlocks', c: [] } }));
  expectCode(result, 'metadata-empty-blocks-skipped', 'pandoc-to-carve', 'lossy', 'dropped');
});

test('an unsupported metadata value produces metadata-value-skipped', () => {
  const result = pandocToCarveAst(pandocDoc([], { odd: { t: 'MetaFuture', c: 'x' } }));
  expectCode(result, 'metadata-value-skipped', 'pandoc-to-carve', 'lossy', 'dropped');
  const item = pandocToCarveAst(pandocDoc([], {
    odd: { t: 'MetaList', c: [{ t: 'MetaFuture', c: 'x' }] },
  }));
  expectCode(item, 'metadata-value-skipped', 'pandoc-to-carve', 'lossy', 'dropped', 2);
  assert.ok(item.diagnostics.some((entry) => entry.message.startsWith('meta: an item of')));
});

test('an unknown definition entry produces definition-entry-skipped', () => {
  const result = carveAstToPandoc(carveDoc([{
    type: 'definition_list',
    items: [
      { type: 'definition_term', children: [text('term')] },
      { type: 'future_entry' },
    ],
  }]));
  expectCode(result, 'definition-entry-skipped', 'carve-to-pandoc', 'lossy', 'dropped');
});

test('a list-table with a short caption produces list-table-short-caption-dropped', () => {
  const attr = ['', [], []];
  const align = { t: 'AlignDefault' };
  const bullet = { t: 'BulletList', c: [[{ t: 'Plain', c: [{ t: 'Str', c: 'x' }] }]] };
  const cell = [attr, align, 1, 1, [bullet]];
  const table = { t: 'Table', c: [
    attr,
    [[{ t: 'Str', c: 'Short' }], [{ t: 'Plain', c: [{ t: 'Str', c: 'Full' }] }]],
    [[align, { t: 'ColWidthDefault' }]],
    [attr, []],
    [[attr, 0, [], [[attr, [cell]]]]],
    [attr, []],
  ] };
  const result = pandocToCarveAst(pandocDoc([table]));
  expectCode(result, 'list-table-short-caption-dropped', 'pandoc-to-carve', 'lossy', 'dropped');
});

test('a list-table rowspan across the head produces list-table-rowspan-clipped', () => {
  const result = carveToPandoc('{header-rows=1}\n::: list-table\n- - A\n- - ^\n:::');
  expectCode(result, 'list-table-rowspan-clipped', 'carve-to-pandoc', 'lossy', 'dropped');
});

test('an orphan table rowspan produces table-rowspan-origin-missing', () => {
  const result = carveAstToPandoc(carveDoc([{
    type: 'table', rows: [{
      type: 'table_row', cells: [{ type: 'table_cell', span: 'rowspan', children: [] }],
    }],
  }]));
  expectCode(result, 'table-rowspan-origin-missing', 'carve-to-pandoc', 'degraded', 'degraded');
});

test('the removed cell-flattening rule no longer claims its old code', () => {
  const result = diagnostic('pandoc-to-carve', 'table: block-level cell content "BulletList" flattened to text');
  assert.equal(result.code, 'table-unclassified-loss');
});
