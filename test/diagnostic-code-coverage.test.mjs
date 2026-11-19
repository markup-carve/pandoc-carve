import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, render } from '../vendor/carve/index.js';
import { carveAstToPandoc, carveToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';

const tree = (children) => ({ type: 'document', astVersion: '2.0', children });
const pandoc = (blocks = [], meta = {}) => ({ 'pandoc-api-version': [1, 23, 1], meta, blocks });
const text = (value) => ({ type: 'text', value });
const roundtrip = (source) => pandocToCarve(carveToPandoc(source).doc).carve;

test('an unknown Carve inline is rejected by the 0.2 tree validator', () => {
  assert.throws(() => carveAstToPandoc(tree([{ type: 'paragraph', children: [{ type: 'future_inline', value: 'x' }] }])), /unknown node type future_inline/u);
});

test('a blank-only code payload reaches Pandoc intact', () => {
  assert.equal(carveAstToPandoc(tree([{ type: 'code_block', value: '\n' }])).doc.blocks[0].c[1], '\n');
  assert.equal(carveAstToPandoc(tree([{ type: 'code_block', value: 'a\n\n' }])).doc.blocks[0].c[1], 'a\n\n');
});

test('an unknown Pandoc inline is reported', () => {
  const result = pandocToCarveAst(pandoc([{ t: 'Para', c: [{ t: 'FutureInline', c: 'x' }] }]));
  assert.match(result.warnings.join('\n'), /FutureInline: unsupported Pandoc inline/u);
});

test('an unknown Pandoc block is reported', () => {
  const result = pandocToCarveAst(pandoc([{ t: 'FutureBlock', c: 'x' }]));
  assert.match(result.warnings.join('\n'), /FutureBlock: unsupported Pandoc block/u);
  assert.deepEqual(result.ast.children, []);
});

test('empty MetaBlocks: skipped under F-001, general Pandoc metadata has no 0.2 tree slot', { skip: 'F-001: general Pandoc metadata has no 0.2 tree slot' }, () => {});
test('unsupported metadata value: skipped under F-001, general Pandoc metadata has no 0.2 tree slot', { skip: 'F-001: general Pandoc metadata has no 0.2 tree slot' }, () => {});

test('an unknown definition entry is rejected by the 0.2 tree validator', () => {
  assert.throws(() => carveAstToPandoc(tree([{ type: 'definition_list', children: [
    { type: 'definition_term', children: [text('term')] }, { type: 'future_entry' },
  ] }])), /unknown node type future_entry/u);
});

test('an orphan table rowspan placeholder remains in the row carrier', () => {
  const ast = parse('| A |\n');
  const cell = ast.children[0].children[0].children[0].children[0];
  cell.span = 'rowspan';
  cell.children = [];
  const output = carveAstToPandoc(ast);
  assert.match(JSON.stringify(output.doc), /carve-covered-cells/u);
});

test('a note referenced inside another note converts without throwing', () => {
  const result = carveToPandoc('A[^a].\n\n[^a]: see [^b]\n\n[^b]: two\n');
  const outer = result.doc.blocks[0].c.find((item) => item.t === 'Span');
  assert.ok(JSON.stringify(outer).includes('"Note"'));
  assert.ok(JSON.stringify(outer).includes('two'));
});

test('a note that references itself is bounded and reports the cycle', () => {
  const result = carveToPandoc('A[^a].\n\n[^a]: see [^a]\n');
  assert.match(result.warnings.join('\n'), /cyclic reference omitted/u);
  assert.equal(result.doc.blocks[0].c.filter((item) => item.t === 'Span').length, 1);
});

test('an unresolved cross-reference is reported and survives the Carve return', () => {
  const source = 'See </#nowhere>.\n';
  const forward = carveToPandoc(source);
  assert.match(forward.warnings.join('\n'), /xref: unresolved target nowhere/u);
  assert.equal(pandocToCarve(forward.doc).carve, source);
});

test('a Pandoc note holding a note keeps both note bodies', () => {
  const inner = { t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'two' }] }] };
  const outer = { t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'see' }, { t: 'Space' }, inner] }] };
  const source = pandocToCarve(pandoc([{ t: 'Para', c: [{ t: 'Str', c: 'One' }, outer] }])).carve;
  assert.match(source, /see/u);
  assert.match(source, /two/u);
  assert.match(render(parse(source)), /two/u);
});

test('inline footnote attributes survive through a 0.2 Pandoc carrier', () => {
  const source = 'a^[x]{.k} b\n';
  assert.equal(roundtrip(source), source);
  assert.match(JSON.stringify(carveToPandoc(source).doc), /carve-inline-attrs/u);
});

test('a footnote referenced twice creates two Pandoc notes', () => {
  const result = carveToPandoc('See[^m] and again[^m].\n\n[^m]: One note.\n');
  assert.equal(result.doc.blocks[0].c.filter((item) => item.t === 'Span').length, 2);
});

test('empty link and image titles survive roundtrip', () => {
  for (const source of ['[x](u "")\n', '![x](u.png "")\n']) assert.equal(roundtrip(source), source);
});

test('a code block class without syntax stays a class', () => {
  const source = '{.c}\n```\nx\n```\n';
  assert.equal(roundtrip(source), source);
  assert.equal(parse(roundtrip(source)).children[0].attrs.classes[0], 'c');
});

test('a line block hard break survives 0.2 source writing', () => {
  const source = '::: |\na\\\n:::\n';
  assert.equal(roundtrip(source), source);
});

test('table vertical alignment survives via the Pandoc carrier', () => {
  const source = '{valigns="top,middle"}\n| A | B |\n';
  assert.deepEqual(parse(roundtrip(source)).children[0].columns.map((column) => column.valign),
    parse(source).children[0].columns.map((column) => column.valign));
});

test('a tight two-paragraph list item inside a definition retains both paragraphs', () => {
  const plain = (value) => ({ t: 'Plain', c: [{ t: 'Str', c: value }] });
  const list = { t: 'BulletList', c: [[plain('a'), plain('more')]] };
  const result = pandocToCarve(pandoc([{ t: 'DefinitionList', c: [[[ { t: 'Str', c: 't' } ], [[list]]]] }]));
  const item = parse(result.carve).children[0].children[1].children[0].children[0];
  assert.deepEqual(item.children.map((child) => child.type), ['paragraph', 'paragraph']);
});
