import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const str = (value) => ({ t: 'Str', c: value });
const para = (...inlines) => ({ t: 'Para', c: inlines });
const document = (block) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [block] });
const quote = { t: 'BlockQuote', c: [para(str('Quote'))] };
const figure = (caption) => ({ t: 'Figure', c: [['', [], []], [null, caption], [quote]] });
const table = (caption) => ({
  t: 'Table',
  c: [['', [], []], [null, caption], [], [['', [], []], []], [[['', [], []], 0, [], []]], [['', [], []], []]],
});

test('a quote figure retains both caption paragraphs and reports the lost boundary', () => {
  const input = document(figure([para(str('First')), para(str('Second'))]));
  const source = pandocToCarve(input);
  const ast = pandocToCarveAst(input);
  assert.equal(source.carve, '> Quote\n^ First Second\n');
  assert.equal(ast.ast.children[0].caption.children[0].children[0].value, 'First Second');
  for (const result of [source, ast]) {
    assert.deepEqual(result.diagnostics.map((item) => item.code), ['caption-block-boundaries-flattened']);
  }
});

test('formatted inline runs on both sides of a caption boundary stay separate', () => {
  const input = document(figure([
    para({ t: 'Strong', c: [str('first')] }),
    para({ t: 'Emph', c: [str('second')] }),
  ]));
  const ast = pandocToCarveAst(input).ast.children[0];
  assert.deepEqual(ast.caption.children[0].children.map((node) => node.type), ['strong', 'text', 'emphasis']);
  assert.equal(ast.caption.children[0].children[1].value, ' ');
  assert.equal(pandocToCarve(input).carve, '> Quote\n^ *first* /second/\n');
});

test('a table caption keeps a nonparagraph first block and later text', () => {
  const input = document(table([
    { t: 'CodeBlock', c: [['', [], []], 'Code\nmore'] },
    para(str('Tail')),
  ]));
  const source = pandocToCarve(input);
  const ast = pandocToCarveAst(input);
  assert.match(source.carve, /\^ Code more Tail\n$/);
  assert.equal(ast.ast.children[0].caption.children[0].children[0].value, 'Code more Tail');
  assert.deepEqual(source.diagnostics.map((item) => item.code), [
    'caption-block-flattened', 'caption-block-boundaries-flattened',
  ]);
});

test('a nested block caption retains its words and reports the flattening', () => {
  const input = document(figure([
    { t: 'Div', c: [['', [], []], [para(str('Nested')), para(str('words'))]] },
    para(str('Tail')),
  ]));
  const result = pandocToCarve(input);
  assert.equal(result.carve, '> Quote\n^ Nested words Tail\n');
  assert.deepEqual(result.diagnostics.map((item) => item.code), [
    'caption-block-flattened', 'caption-block-boundaries-flattened',
  ]);
});
