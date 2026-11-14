import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/table-readers/${name}.json`, import.meta.url)));
function findTables(node) {
  if (Array.isArray(node)) return node.flatMap(findTables);
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === 'table' ? [node] : []), ...findTables(node.children ?? []), ...findTables(node.caption?.children ?? [])];
}
const rows = (table) => table.children.filter((g) => g.type === 'table_head' || g.type === 'table_body' || g.type === 'table_foot').flatMap((g) => g.children.filter((r) => r.type === 'table_row'));
const cells = (table) => rows(table).map((r) => r.children);
const text = (node) => node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');

test('a Typst table inside an alignment Div and captionless Figure remains a table', () => {
  const { ast, warnings } = pandocToCarveAst(load('typst-spanning-table'));
  const found = findTables(ast);
  assert.equal(found.length, 1);
  assert.deepEqual(warnings, []);
  assert.equal(found[0].type, 'table');
});

test('blank rows keep their cells and position as a table row', () => {
  const { ast, warnings } = pandocToCarveAst(load('latex-blank-row'));
  const table = findTables(ast)[0];
  assert.deepEqual(cells(table)[1].map((c) => c.children), [[], []]);
  assert.deepEqual(warnings, []);
});

test('a blank row keeps its row attributes', () => {
  const doc = load('latex-blank-row');
  doc.blocks[0].c[4][0][3][0][0] = ['blank-row', [], []];
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.equal(rows(findTables(ast)[0])[1].attrs.id, 'blank-row');
  assert.deepEqual(warnings, []);
});

const pandoc = findPandoc();
for (const [name, source] of [
  ['table', '|= A |= B |\n| a | b |\n'],
  ['table-align', '|=> A |=< B |\n| a | b |\n'],
  ['table-ragged', '|= A |= B |\n| a |\n| c | d |\n'],
  ['table-rowspan', '|= A |= B |\n| a | b |\n| ^ | d |\n'],
  ['table-span', '|= A |= B |\n| a | < |\n| c | d |\n'],
]) {
  test(`Typst ${name} imports without a bridge exception`, { skip: !pandoc && 'pandoc is not installed' }, () => {
    const written = execFileSync(pandoc, ['-f', 'json', '-t', 'typst'], { input: JSON.stringify(carveToPandoc(source).doc), encoding: 'utf8' });
    const doc = JSON.parse(execFileSync(pandoc, ['-f', 'typst', '-t', 'json'], { input: written, encoding: 'utf8' }));
    assert.equal(findTables(pandocToCarveAst(doc).ast).length, 1);
  });
}

test('LaTeX colspan output imports the reader-returned table without a bridge exception', { skip: !pandoc && 'pandoc is not installed' }, () => {
  const source = '|= A |= B |\n| a | < |\n| c | d |\n';
  const written = execFileSync(pandoc, ['-f', 'json', '-t', 'latex'], { input: JSON.stringify(carveToPandoc(source).doc), encoding: 'utf8' });
  const doc = JSON.parse(execFileSync(pandoc, ['-f', 'latex', '-t', 'json'], { input: written, encoding: 'utf8' }));
  assert.equal(findTables(pandocToCarveAst(doc).ast).length, 1);
});

test('blank-row fallback converts notes and inline diagnostics once', () => {
  const doc = load('latex-blank-row');
  doc.blocks[0].c[4][0][3][1][1][0][4] = [{ t: 'Plain', c: [
    { t: 'SmallCaps', c: [{ t: 'Str', c: 'Caps' }] },
    { t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'First' }] }, { t: 'Para', c: [{ t: 'Str', c: 'Second' }] }] },
  ] }];
  const { ast, warnings } = pandocToCarveAst(doc);
  const cell = cells(findTables(ast)[0])[2][0];
  assert.deepEqual(cell.children[0].children.map((x) => x.type), ['small_caps', 'footnote_ref']);
  assert.equal(ast.children.at(-1).type, 'footnote');
  assert.equal(ast.children.at(-1).children.length, 2);
  assert.equal(warnings.filter((w) => /small.?caps/iu.test(w)).length, 0);
});

test('a soft break inside a cell survives in the 0.2 tree', () => {
  const table = findTables(pandocToCarveAst(load('markdown-multiline-softbreak')).ast)[0];
  assert.ok(cells(table).flat().some((cell) => JSON.stringify(cell).includes('soft_break')));
});

test('a hard break inside a cell survives in the 0.2 tree', () => {
  const table = findTables(pandocToCarveAst(load('markdown-grid-hardbreak')).ast)[0];
  assert.ok(cells(table).flat().some((cell) => JSON.stringify(cell).includes('hard_break')));
});

test('a soft break nested in emphasis stays nested in a cell', () => {
  const C = (inlines) => [['', [], []], { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: inlines }]];
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Table', c: [
    ['', [], []], [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]], [['', [], []], []],
    [[['', [], []], 0, [], [[['', [], []], [C([{ t: 'Emph', c: [{ t: 'Str', c: 'a' }, { t: 'SoftBreak' }, { t: 'Str', c: 'b' }] }])]]]]],
    [['', [], []], []],
  ] }] };
  const { ast, warnings } = pandocToCarveAst(doc);
  const emphasis = cells(findTables(ast)[0])[0][0].children[0].children[0];
  assert.equal(emphasis.type, 'emphasis');
  assert.deepEqual(emphasis.children.map((x) => x.type), ['text', 'soft_break', 'text']);
  assert.deepEqual(warnings, []);
});
