import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, validateTree } from '../vendor/carve/index.js';
import { carveAstToPandoc, carveToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();
const EXTENDED = ['-', '_', '>', '?'];
const listAst = (item, mark) => ({ type: 'document', astVersion: '2.0', children: [{
  type: 'list', marker: { kind: 'bullet', char: '-' }, spacing: 'tight', children: [{
    type: 'list_item', ...(mark === undefined ? {} : { task: { mark } }), ...item,
    children: [{ type: 'paragraph', children: [{ type: 'text', value: 'body' }] }],
  }],
}] });
const firstItem = doc => doc.blocks[0].c[0][0].c;
const markerSpan = doc => firstItem(doc).find(inline => inline.t === 'Span');
const carriedMark = doc => markerSpan(doc)?.c[0][2].find(([key]) => key === 'mark')?.[1];

test('task carrier reader distinguishes a marked item from a plain item', () => {
  const marked = carveAstToPandoc(listAst({}, '-'));
  const plain = carveAstToPandoc(listAst({}, undefined));
  assert.equal(carriedMark(marked.doc), '-');
  assert.equal(markerSpan(plain.doc), undefined);
  assert.equal(pandocToCarveAst(marked.doc).ast.children[0].children[0].task.mark, '-');
  assert.equal(pandocToCarveAst(plain.doc).ast.children[0].children[0].task, undefined);
});

for (const mark of EXTENDED) {
  test(`Carve to Pandoc carries the ${mark} task mark`, () => {
    const result = carveAstToPandoc(listAst({}, mark));
    assert.equal(carriedMark(result.doc), mark);
    assert.equal(firstItem(result.doc)[0].c, '☐');
    assert.deepEqual(result.warnings, []);
  });
}

test('default task marks retain distinct ballots without a loss warning', () => {
  for (const [mark, ballot] of [[' ', '☐'], ['x', '☒']]) {
    const result = carveAstToPandoc(listAst({}, mark));
    assert.equal(carriedMark(result.doc), mark);
    assert.equal(firstItem(result.doc)[0].c, ballot);
    assert.deepEqual(result.warnings, []);
  }
});

test('task item attributes stay beside its mark', () => {
  const result = carveAstToPandoc(listAst({ attrs: { id: 'i', classes: ['c'], keyValues: [['k', 'v']] } }, '>'));
  assert.deepEqual(markerSpan(result.doc).c[0], ['i', ['carve-task', 'c'], [['k', 'v'], ['mark', '>']]]);
  const restored = pandocToCarveAst(result.doc).ast.children[0].children[0];
  assert.equal(restored.task.mark, '>');
  assert.deepEqual(restored.attrs, { id: 'i', classes: ['c'], keyValues: [['k', 'v']] });
});

for (const mark of EXTENDED) {
  test(`Pandoc to Carve restores the ${mark} task mark`, () => {
    const doc = carveAstToPandoc(listAst({}, mark)).doc;
    const { ast } = pandocToCarveAst(doc);
    assert.equal(ast.children[0].children[0].task.mark, mark);
    validateTree(ast);
  });
}

test('all extended task marks survive a source round trip', () => {
  const source = '- [-] dropped\n- [_] paused\n- [>] deferred\n- [?] maybe\n';
  const back = pandocToCarve(carveToPandoc(source).doc).carve;
  assert.equal(render(back), render(source));
  for (const mark of EXTENDED) assert.ok(back.includes(`[${mark}]`));
});

test('an attributed task item keeps its ballot first', () => {
  const doc = carveToPandoc('-{.c} [x] attributed').doc;
  const item = firstItem(doc);
  assert.deepEqual(item.slice(0, 2), [{ t: 'Str', c: '☒' }, { t: 'Space' }]);
  assert.equal(item[2].t, 'Span');
  assert.deepEqual(item[2].c[0][1], ['carve-task', 'c']);
});

test('Pandoc renders an attributed task item as a checkbox', { skip: !pandoc && 'pandoc is not installed' }, () => {
  const html = pandocRender(pandoc, carveToPandoc('-{.c} [x] attributed').doc, 'html');
  assert.match(html, /<input type="checkbox" checked/);
});

test('an attributed task item survives a source round trip', () => {
  const source = '-{.c} [x] attributed\n-{#i} [ ] open\n';
  const back = pandocToCarve(carveToPandoc(source).doc).carve;
  assert.equal(render(back), render(source));
  assert.match(back, /-\{\.c\} \[x\]/);
  assert.match(back, /-\{#i\} \[ \]/);
});
