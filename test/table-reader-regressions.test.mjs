import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

const load = name => JSON.parse(readFileSync(new URL(`./fixtures/table-readers/${name}.json`, import.meta.url)));
const tables = blocks => {
  const found = [];
  const walk = node => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      if (node.t === 'Table') found.push(node);
      else if (node.c) walk(node.c);
    }
  };
  walk(blocks);
  return found;
};
const normalized = value => {
  if (Array.isArray(value)) return value.map(normalized);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, key === 't' && item === 'Plain' ? 'Para' : normalized(item)]));
};

test('a Typst table inside an alignment Div and captionless Figure remains a table', () => {
  const doc = load('typst-spanning-table');
  const ast = pandocToCarveAst(doc).ast.children[0];
  assert.equal(ast.type, 'table');
  assert.equal(ast.attrs.keyValues.align, 'center');
  const result = pandocToCarve(doc);
  assert.deepEqual(result.warnings, []);
  const before = tables(doc.blocks)[0];
  const after = tables(carveToPandoc(result.carve).doc.blocks)[0];
  assert.deepEqual(normalized(after.c.slice(1)), normalized(before.c.slice(1)));
});

test('Figure and alignment-Div attributes merge into the table with the caption', () => {
  const doc = load('typst-spanning-table');
  const figure = doc.blocks[0];
  const div = figure.c[2][0];
  const table = div.c[1][0];
  figure.c[0] = ['outer', ['figure'], [['priority', 'outer']]];
  figure.c[1] = [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Caption' }] }]];
  div.c[0] = ['middle', ['div'], [['align', 'center'], ['priority', 'middle']]];
  table.c[0] = ['inner', ['table'], [['priority', 'inner']]];
  const result = pandocToCarve(doc);
  const converted = tables(carveToPandoc(result.carve).doc.blocks)[0];
  assert.deepEqual(converted.c[0], ['outer', ['table', 'div', 'figure'],
    [['priority', 'outer'], ['align', 'center']]]);
  assert.deepEqual(normalized(converted.c[1]), normalized(figure.c[1]));
  assert.deepEqual(result.diagnostics.map(d => d.code), ['table-wrapper-id-dropped', 'table-wrapper-id-dropped']);
});

test('blank rows keep their cells and position through the list-table source form', () => {
  const doc = load('latex-blank-row');
  const result = pandocToCarve(doc);
  assert.match(result.carve, /::: list-table/);
  assert.deepEqual(result.diagnostics.map(d => [d.code, d.fidelity]),
    [['table-blank-row-spelled', 'normalized']]);
  assert.deepEqual(normalized(carveToPandoc(result.carve).doc.blocks), normalized(doc.blocks));
  assert.equal(pandocToCarveAst(doc).ast.children[0].type, 'table');
});

test('row attributes lost by the list-table source form are reported', () => {
  const doc = load('latex-blank-row');
  doc.blocks[0].c[4][0][3][0][0] = ['blank-row', [], []];
  const result = pandocToCarve(doc);
  assert.equal(result.diagnostics.find(d => d.code === 'list-table-row-attributes-dropped').fidelity, 'dropped');
  assert.equal(pandocToCarveAst(doc).ast.children[0].rows[1].attrs.id, 'blank-row');
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
    const written = execFileSync(pandoc, ['-f', 'json', '-t', 'typst'], {
      input: JSON.stringify(carveToPandoc(source).doc), encoding: 'utf8',
    });
    const doc = JSON.parse(execFileSync(pandoc, ['-f', 'typst', '-t', 'json'], { input: written, encoding: 'utf8' }));
    const result = pandocToCarve(doc);
    const before = tables(doc.blocks)[0];
    const after = tables(carveToPandoc(result.carve).doc.blocks)[0];
    assert.ok(before && after);
    assert.deepEqual(normalized(after.c.slice(1)), normalized(before.c.slice(1)));
  });
}

test('LaTeX colspan output imports the reader-returned table without a bridge exception', {
  skip: !pandoc && 'pandoc is not installed',
}, () => {
  const source = '|= A |= B |\n| a | < |\n| c | d |\n';
  const written = execFileSync(pandoc, ['-f', 'json', '-t', 'latex'], {
    input: JSON.stringify(carveToPandoc(source).doc), encoding: 'utf8',
  });
  const doc = JSON.parse(execFileSync(pandoc, ['-f', 'latex', '-t', 'json'], { input: written, encoding: 'utf8' }));
  const result = pandocToCarve(doc);
  assert.deepEqual(normalized(carveToPandoc(result.carve).doc.blocks), normalized(doc.blocks));
});

test('blank-row fallback converts notes and inline diagnostics once', () => {
  const doc = load('latex-blank-row');
  doc.blocks[0].c[4][0][3][1][1][0][4] = [{ t: 'Plain', c: [
    { t: 'SmallCaps', c: [{ t: 'Str', c: 'Caps' }] },
    { t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'First' }] },
      { t: 'Para', c: [{ t: 'Str', c: 'Second' }] }] },
  ] }];
  const result = pandocToCarve(doc);
  assert.equal((result.carve.match(/^\[\^fn\d+\]:/gm) ?? []).length, 1);
  assert.equal(result.warnings.filter(w => /small.?caps/i.test(w)).length, 1);
});
