import assert from 'node:assert/strict';
import test from 'node:test';
import { carveAstToPandoc, carveToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';
import { diagnostic } from '../dist/diagnostics.js';
import { carveToHtml } from '@markup-carve/carve';

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

test('a blank-only code payload produces field-unspellable', () => {
  const result = carveAstToPandoc(carveDoc([{ type: 'code_block', content: '\n' }]));
  expectCode(result, 'field-unspellable', 'carve-to-pandoc', 'lossy', 'dropped');
  assert.equal(result.doc.blocks[0].c[1], '', 'the payload reaches pandoc empty');
  const kept = carveAstToPandoc(carveDoc([{ type: 'code_block', content: 'a\n\n' }]));
  assert.equal(kept.diagnostics.length, 0, 'a payload with content keeps its blank line');
  assert.equal(kept.doc.blocks[0].c[1], 'a\n');
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
  const result = pandocToCarve(pandocDoc([table]));
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

test('a note referenced inside a note is lifted to follow it, with nested-note-lifted', () => {
  const result = carveToPandoc('A[^a].\n\n[^a]: see [^b]\n\n[^b]: two\n');
  expectCode(result, 'nested-note-lifted', 'carve-to-pandoc', 'degraded', 'degraded');
  const para = result.doc.blocks[0].c;
  assert.deepEqual(para.map((x) => x.t), ['Str', 'Note', 'Note', 'Str']);
  assert.ok(!JSON.stringify(para[1].c).includes('"Note"'), 'the outer note holds no note');
  assert.deepEqual(para[2].c, [{ t: 'Para', c: [{ t: 'Str', c: 'two' }] }]);
});

test('a note that references itself converts, with nested-note-cycle-dropped', () => {
  const result = carveToPandoc('A[^a].\n\n[^a]: see [^a]\n');
  expectCode(result, 'nested-note-cycle-dropped', 'carve-to-pandoc', 'lossy', 'dropped');
  assert.deepEqual(result.doc.blocks[0].c.map((x) => x.t), ['Str', 'Note', 'Str']);
});

test('pandoc -> carve: a note holding a note is written as a definition, not ^[ ^[ ]]', () => {
  const inner = { t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'two' }] }] };
  const outer = { t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'see' }, { t: 'Space' }, inner] }] };
  const { carve } = pandocToCarve(pandocDoc([{ t: 'Para', c: [{ t: 'Str', c: 'One' }, outer] }]));
  assert.doesNotMatch(carve, /\^\[[^\]]*\^\[/);
  const html = carveToHtml(carve);
  assert.match(html, /<li id="fn2">\s*<p>two/);
});

test('attributes on a node with no pandoc Attr slot produce inline-attributes-dropped', () => {
  for (const source of ['*x*{.real}\n', 'a[^n]{.k} b\n\n[^n]: x\n', 'a^[x]{.k} b\n', '{++a++}{.a}\n']) {
    expectCode(carveToPandoc(source), 'inline-attributes-dropped', 'carve-to-pandoc', 'lossy', 'dropped');
  }
  assert.deepEqual(carveToPandoc('[x]{.kept}\n').diagnostics, [], 'a span has the slot');
});

test('a footnote referenced twice produces note-reference-duplicated', () => {
  const result = carveToPandoc('See[^m] and again[^m].\n\n[^m]: One note.\n');
  expectCode(result, 'note-reference-duplicated', 'carve-to-pandoc', 'degraded', 'degraded');
});

test('an empty link or image title produces empty-title-dropped', () => {
  expectCode(carveToPandoc('[x](u "")\n'), 'empty-title-dropped', 'carve-to-pandoc', 'lossy', 'dropped');
  expectCode(carveToPandoc('![x](u.png "")\n'), 'empty-title-dropped', 'carve-to-pandoc', 'lossy', 'dropped');
  assert.deepEqual(carveToPandoc('[x](u)\n').diagnostics, []);
});

test('a class on a code block without a language produces code-block-class-read-as-language', () => {
  const fence = '```';
  const result = carveToPandoc(`{.c}\n${fence}\nx\n${fence}\n`);
  expectCode(result, 'code-block-class-read-as-language', 'carve-to-pandoc', 'degraded', 'degraded');
  assert.deepEqual(carveToPandoc(`{.c}\n${fence}js\nx\n${fence}\n`).diagnostics, []);
});

test('a line-block hard break that leaves an empty line produces line-block-hard-break-dropped', () => {
  expectCode(carveToPandoc('::: |\na\\\n:::\n'), 'line-block-hard-break-dropped', 'carve-to-pandoc', 'lossy', 'dropped');
  assert.deepEqual(carveToPandoc('::: |\na\nb\n\nc\n:::\n').diagnostics, [], 'a stanza break is not one');
});

test('vertical alignment produces table-vertical-alignment-dropped', () => {
  const result = carveToPandoc('{valigns="top,middle"}\n| A | B |\n');
  expectCode(result, 'table-vertical-alignment-dropped', 'carve-to-pandoc', 'lossy', 'dropped');
  assert.deepEqual(carveToPandoc('{aligns="right,"}\n| A | B |\n').diagnostics, []);
});

test('a tight two-paragraph item inside a definition produces list-item-framing-lost', () => {
  const plain = (x) => ({ t: 'Plain', c: [{ t: 'Str', c: x }] });
  const list = { t: 'BulletList', c: [[plain('a'), plain('more')]] };
  const result = pandocToCarve(pandocDoc([{ t: 'DefinitionList', c: [[[{ t: 'Str', c: 't' }], [[list]]]] }]));
  expectCode(result, 'list-item-framing-lost', 'pandoc-to-carve', 'degraded', 'degraded');
  assert.deepEqual(pandocToCarve(pandocDoc([list])).diagnostics, [], 'at the top level the writer places it');
});
