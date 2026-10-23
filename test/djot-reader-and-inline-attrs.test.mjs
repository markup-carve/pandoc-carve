import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const doc = (inline) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [inline] }] });
const span = (classes, kvs = [], body = [{ t: 'Str', c: 'x' }], id = 'i') => ({ t: 'Span', c: [[id, classes, kvs], body] });
const first = (pandoc) => pandocToCarveAst(pandoc).ast.children[0].children[0];

for (const [marker, type] of [['insertion', 'insert'], ['inserted', 'insert'], ['deletion', 'delete'], ['deleted', 'delete'], ['mark', 'highlight']]) {
  test(`import ${marker} consumes only its marker and splits joined classes`, () => {
    const node = first(doc(span([`${marker} extra`], [['k', 'v']])));
    assert.equal(node.type, type);
    assert.equal(node.attrs.id, 'i');
    assert.deepEqual(node.attrs.classes, ['extra']);
    assert.equal(node.attrs.keyValues.k, 'v');
  });
}
test('inserted and deleted markers are found after another class', () => {
  for (const [marker, type] of [['inserted', 'insert'], ['deleted', 'delete']]) {
    const node = first(doc(span([`extra ${marker}`])));
    assert.equal(node.type, type);
    assert.deepEqual(node.attrs.classes, ['extra']);
  }
});
for (const [marker, key] of [['symbol', 'data-symbol'], ['emoji', 'data-emoji']]) {
  test(`import ${marker} keeps extra attributes`, () => {
    const node = first(doc(span([`${marker} extra`], [[key, 'heart'], ['k', 'v']])));
    assert.equal(node.type, 'symbol');
    assert.equal(node.name, 'heart');
    assert.equal(node.attrs.id, 'i');
    assert.deepEqual(node.attrs.classes, ['extra']);
    assert.deepEqual(node.attrs.keyValues, { k: 'v' });
  });
}

test('Djot task markers are stripped only when every bullet item has one', () => {
  const item = (mark) => [{ t: 'Plain', c: [{ t: 'Str', c: mark }, { t: 'Space' }, { t: 'Str', c: 'task' }] }];
  const list = (items) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'BulletList', c: items }] });
  const tasks = pandocToCarveAst(list([item('[x]'), item('[X]'), item('[ ]')] )).ast.children[0].items;
  assert.deepEqual(tasks.map((n) => n.checked), [true, true, false]);
  const plain = pandocToCarveAst(list([item('[x]'), item('no')])).ast.children[0].items;
  assert.equal(plain[0].checked, undefined);
  assert.equal(plain[0].children[0].children[0].value, '[x] task');
});

test('joined classes identify directive and code language', () => {
  const source = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [
    { t: 'Div', c: [['', ['admonition warning extra'], []], [{ t: 'Para', c: [{ t: 'Str', c: 'body' }] }]] },
    { t: 'CodeBlock', c: [['', ['python extra'], []], 'code'] },
  ] };
  const [admonition, code] = pandocToCarveAst(source).ast.children;
  assert.equal(admonition.type, 'admonition');
  assert.equal(admonition.kind, 'warning');
  assert.deepEqual(admonition.attrs.classes, ['extra']);
  assert.equal(code.lang, 'python');
  assert.deepEqual(code.attrs.classes, ['extra']);
});

for (const [inner, type] of [
  [{ t: 'Math', c: [{ t: 'InlineMath' }, 'x'] }, 'math'],
  [{ t: 'Note', c: [{ t: 'Para', c: [{ t: 'Str', c: 'note' }] }] }, 'inline_footnote'],
]) {
  for (const marked of [false, true]) {
    test(`Span around ${type} restores attributes, wrapper=${marked}`, () => {
      const kvs = marked ? [['wrapper', '1'], ['k', 'v']] : [['k', 'v']];
      const node = first(doc(span(['extra'], kvs, [inner])));
      assert.equal(node.type, type);
      assert.equal(node.attrs.id, 'i');
      assert.deepEqual(node.attrs.classes, ['extra']);
      assert.deepEqual(node.attrs.keyValues, { k: 'v' });
    });
  }
}

for (const [src, marker] of [
  ['*x*{#i .c k=v}', 'Strong'], ['/x/{#i .c k=v}', 'Emph'], ['_x_{#i .c k=v}', 'Underline'],
  ['~x~{#i .c k=v}', 'Strikeout'], ['{^x^}{#i .c k=v}', 'Superscript'], ['{,x,}{#i .c k=v}', 'Subscript'],
  ['$`x`{#i .c k=v}', 'Math'], ['x[^n]{#i .c k=v}\n\n[^n]: note', 'Note'],
]) {
  test(`${marker} exports attributed Span with wrapper option`, () => {
    for (const options of [{}, { wrapperMarker: true }, { roundtrip: true }]) {
      const result = carveToPandoc(src, options);
      const wrapper = result.doc.blocks[0].c.find((n) => n.t === 'Span');
      assert.equal(wrapper?.c[1][0]?.t, marker, src);
      assert.equal(wrapper.c[0][0], 'i');
      assert.deepEqual(wrapper.c[0][1], ['c']);
      assert.deepEqual(wrapper.c[0][2], options.wrapperMarker || options.roundtrip ? [['wrapper', '1'], ['k', 'v']] : [['k', 'v']]);
      assert.equal(result.warnings.some((w) => /attributes.*dropped/.test(w)), false);
      const back = pandocToCarveAst(result.doc).ast.children[0].children.find((n) => n.attrs?.id === 'i');
      assert.equal(back?.attrs?.keyValues?.k, 'v');
    }
  });
}
for (const [src, marker] of [['=x={#i .c k=v}', 'mark'], ['{+x+}{#i .c k=v}', 'insertion'], ['{-x-}{#i .c k=v}', 'deletion'], [':heart:{#i .c k=v}', 'symbol']]) {
  test(`${marker} keeps authored attributes on its classed Span`, () => {
    const result = carveToPandoc(src);
    const node = result.doc.blocks[0].c.find((n) => n.t === 'Span');
    assert.equal(node?.c[0][0], 'i');
    assert.deepEqual(node.c[0][1], [marker, 'c']);
    assert.equal(node.c[0][2].at(-1)[0], 'k');
    assert.equal(pandocToCarveAst(result.doc).ast.children[0].children.find((n) => n.attrs?.id === 'i')?.attrs?.keyValues?.k, 'v');
  });
}

test('mapped symbol keeps authored attributes and its name', () => {
  const result = carveToPandoc(':heart:{#i .c k=v}', { symbols: { heart: '♥' } });
  const node = result.doc.blocks[0].c[0];
  assert.equal(node.t, 'Span');
  assert.deepEqual(node.c[0], ['i', ['symbol', 'c'], [['data-symbol', 'heart'], ['k', 'v']]]);
  assert.equal(first(doc(node)).name, 'heart');
});

test('unresolved footnote reference stays literal', () => {
  const source = 'Text[^a]{.ref}.\n';
  const result = carveToPandoc(source);
  assert.ok(!result.doc.blocks[0].c.some((node) => node.t === 'Span'));
  assert.match(pandocToCarve(result.doc).carve, /Text\\\[\^a\]\./);
});

test('authored inline wrapper key gets a separate leading marker', () => {
  const source = '*x*{wrapper=1 k=v}';
  const result = carveToPandoc(source);
  const outer = result.doc.blocks[0].c[0];
  assert.deepEqual(outer.c[0][2], [['wrapper', '1'], ['wrapper', '1'], ['k', 'v']]);
  const node = first(doc(outer));
  assert.equal(node.type, 'strong');
  assert.deepEqual(node.attrs.keyValues, { wrapper: '1', k: 'v' });
});

test('a Djot reader symbol without an emoji imports as the symbol', () => {
  const node = first(doc(span(['symbol', 'extra'], [], [{ t: 'Str', c: 'foo_bar' }])));
  assert.equal(node.type, 'symbol');
  assert.equal(node.name, 'foo_bar');
  assert.deepEqual(node.attrs.classes, ['extra']);
  assert.equal(pandocToCarve(doc(span(['symbol'], [], [{ t: 'Str', c: 'foo_bar' }], ''))).carve, ':foo_bar:\n');
});

test('a symbol Span whose text cannot be a symbol name stays a span', () => {
  for (const body of [[{ t: 'Str', c: '_x' }], [{ t: 'Str', c: 'a:b' }], [{ t: 'Str', c: 'a' }, { t: 'Space' }, { t: 'Str', c: 'b' }]]) {
    assert.equal(first(doc(span(['symbol'], [], body))).type, 'span');
  }
});
