import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarveAst } from '../dist/index.js';

const doc = inline => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [inline] }] });
const span = (classes, kvs = [], body = [{ t: 'Str', c: 'x' }], id = 'i') => ({ t: 'Span', c: [[id, classes, kvs], body] });
const first = pandoc => pandocToCarveAst(pandoc).ast.children[0].children[0];

for (const [marker, type] of [['carve-insert', 'insert'], ['carve-delete', 'delete'], ['mark', 'highlight']]) {
  test(`import ${marker} consumes only its marker`, () => {
    const node = first(doc(span([marker, 'extra'], [['k', 'v']])));
    assert.equal(node.type, type);
    assert.equal(node.attrs.id, 'i');
    assert.deepEqual(node.attrs.classes, ['extra']);
    assert.deepEqual(node.attrs.keyValues, [['k', 'v']]);
  });
}

test('symbol carrier preserves extra attributes', () => {
  const node = first(doc(span(['carve-symbol', 'extra'], [['k', 'v'], ['name', 'heart']])));
  assert.equal(node.type, 'symbol');
  assert.equal(node.name, 'heart');
  assert.deepEqual(node.attrs, { id: 'i', classes: ['extra'], keyValues: [['k', 'v']] });
});

test('task carrier is read per item and plain marker text stays text', () => {
  const task = mark => [{ t: 'Plain', c: [span(['carve-task'], [['mark', mark]], [], ''), { t: 'Str', c: 'task' }] }];
  const plain = [{ t: 'Plain', c: [{ t: 'Str', c: '[x]' }, { t: 'Space' }, { t: 'Str', c: 'plain' }] }];
  const input = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'BulletList', c: [task('x'), task('_'), plain] }] };
  const items = pandocToCarveAst(input).ast.children[0].children;
  assert.deepEqual(items.map(item => item.task?.mark), ['x', '_', undefined]);
  assert.equal(items[2].children[0].children[0].value, '[x]');
});

test('admonition and code language use distinct Pandoc classes', () => {
  const input = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [
    { t: 'Div', c: [['', ['carve-admonition', 'warning', 'extra'], []], [{ t: 'Para', c: [{ t: 'Str', c: 'body' }] }]] },
    { t: 'CodeBlock', c: [['', ['python', 'extra'], []], 'code'] },
  ] };
  const [admonition, code] = pandocToCarveAst(input).ast.children;
  assert.equal(admonition.type, 'admonition');
  assert.equal(admonition.kind, 'warning');
  assert.deepEqual(admonition.attrs.classes, ['extra']);
  assert.equal(code.syntax, 'python');
  assert.deepEqual(code.attrs.classes, ['extra']);
});

for (const [inner, type] of [
  [{ t: 'Math', c: [{ t: 'InlineMath' }, 'x'] }, 'math'],
  [{ t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'note' }] }] }, 'inline_footnote'],
]) {
  for (const markerFirst of [false, true]) {
    test(`inline attribute carrier restores ${type}, marker first=${markerFirst}`, () => {
      const classes = markerFirst ? ['carve-inline-attrs', 'extra'] : ['extra', 'carve-inline-attrs'];
      const node = first(doc(span(classes, [['k', 'v'], ['carve-inline-type', type]], [inner])));
      assert.equal(node.type, type);
      assert.deepEqual(node.attrs, { id: 'i', classes: ['extra'], keyValues: [['k', 'v']] });
    });
  }
}

for (const [source, pandocType] of [
  ['*x*{#i .c k=v}', 'Strong'], ['/x/{#i .c k=v}', 'Emph'], ['{_x_}{#i .c k=v}', 'Underline'],
  ['{~x~}{#i .c k=v}', 'Strikeout'], ['{^x^}{#i .c k=v}', 'Superscript'], ['{,x,}{#i .c k=v}', 'Subscript'],
  ['$`x`{#i .c k=v}', 'Math'], ['x^[note]{#i .c k=v}', 'Note'],
]) {
  test(`${pandocType} exports an attributed span carrier`, () => {
    const result = carveToPandoc(source);
    const carrier = result.doc.blocks[0].c.find(node => node.t === 'Span');
    assert.equal(carrier.c[1][0].t, pandocType);
    assert.equal(carrier.c[0][0], 'i');
    assert.deepEqual(carrier.c[0][1], ['carve-inline-attrs', 'c']);
    assert.deepEqual(carrier.c[0][2], [['k', 'v'], ['carve-inline-type', pandocType === 'Emph' ? 'emphasis' : pandocType === 'Note' ? 'inline_footnote' : pandocType === 'Math' ? 'math' : pandocType === 'Strikeout' ? 'strike' : pandocType.toLowerCase()]]);
    const restored = pandocToCarveAst(result.doc).ast.children[0].children.find(node => node.attrs?.id === 'i');
    assert.deepEqual(restored.attrs.keyValues, [['k', 'v']]);
  });
}

for (const [source, marker] of [
  ['{=x=}{#i .c k=v}', 'mark'], ['{+x+}{#i .c k=v}', 'carve-insert'],
  ['{-x-}{#i .c k=v}', 'carve-delete'], [':heart:{#i .c k=v}', 'carve-symbol'],
]) {
  test(`${marker} retains authored attributes`, () => {
    const result = carveToPandoc(source);
    const carrier = result.doc.blocks[0].c.find(node => node.t === 'Span');
    assert.equal(carrier.c[0][0], 'i');
    assert.deepEqual(carrier.c[0][1], [marker, 'c']);
    assert.ok(carrier.c[0][2].some(([key, value]) => key === 'k' && value === 'v'));
    const restored = first(doc(carrier));
    assert.equal(restored.attrs.id, 'i');
    assert.deepEqual(restored.attrs.keyValues, [['k', 'v']]);
  });
}

test('unresolved footnote reference retains its key and attributes', () => {
  const result = carveToPandoc('Text[^a]{.ref}.');
  const carrier = result.doc.blocks[0].c.find(node => node.t === 'Span');
  assert.deepEqual(carrier.c[0][1], ['carve-footnote-ref', 'ref']);
  assert.deepEqual(carrier.c[0][2], [['key', 'a']]);
  const restored = pandocToCarveAst(result.doc).ast.children[0].children.find(node => node.type === 'footnote_ref');
  assert.equal(restored.key, 'a');
  assert.deepEqual(restored.attrs.classes, ['ref']);
});

test('a foreign symbol class remains an ordinary span', () => {
  for (const body of [[{ t: 'Str', c: '_x' }], [{ t: 'Str', c: 'a:b' }], [{ t: 'Str', c: 'a' }, { t: 'Space' }, { t: 'Str', c: 'b' }]]) {
    assert.equal(first(doc(span(['symbol'], [], body))).type, 'span');
  }
});
