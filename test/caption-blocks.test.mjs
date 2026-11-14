import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const str = (value) => ({ t: 'Str', c: value });
const para = (...inlines) => ({ t: 'Para', c: inlines });
const document = (block) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [block] });
const quote = { t: 'BlockQuote', c: [para(str('Quote'))] };
const figure = (caption) => ({ t: 'Figure', c: [['', [], []], [null, caption], [quote]] });
const table = (caption) => ({ t: 'Table', c: [['', [], []], [null, caption], [], [['', [], []], []], [[['', [], []], 0, [], []]], [['', [], []], []]] });
const caption = (input) => pandocToCarveAst(input).ast.children[0].caption;

test('a quote figure retains both caption paragraphs', () => {
  const input = document(figure([para(str('First')), para(str('Second'))]));
  assert.deepEqual(caption(input).children.map((block) => block.children[0].value), ['First', 'Second']);
  const source = pandocToCarve(input);
  assert.equal(source.carve, '> Quote\n^ First Second\n');
  assert.ok(source.warnings.some((w) => w.includes('caption') && w.includes('structure-unspellable')));
});

test('formatted inline runs on both sides of a caption boundary stay separate', () => {
  const input = document(figure([para({ t: 'Strong', c: [str('first')] }), para({ t: 'Emph', c: [str('second')] })]));
  const blocks = caption(input).children;
  assert.deepEqual(blocks.map((block) => block.children[0].type), ['strong', 'emphasis']);
  assert.equal(pandocToCarve(input).carve, '> Quote\n^ *first* /second/\n');
});

test('a table caption keeps a nonparagraph first block and later text', () => {
  const input = document(table([{ t: 'CodeBlock', c: [['', [], []], 'Code\nmore'] }, para(str('Tail'))]));
  assert.deepEqual(caption(input).children.map((block) => block.type), ['code_block', 'paragraph']);
  assert.equal(caption(input).children[0].value, 'Code\nmore');
  assert.ok(pandocToCarve(input).warnings.some((w) => w.includes('caption') && w.includes('structure-unspellable')));
});

test('a nested block caption retains its words and reports source flattening', () => {
  const input = document(figure([{ t: 'Div', c: [['', [], []], [para(str('Nested')), para(str('words'))]] }, para(str('Tail'))]));
  const blocks = caption(input).children;
  assert.deepEqual(blocks.map((block) => block.type), ['div', 'paragraph']);
  assert.deepEqual(blocks[0].children.map((block) => block.children[0].value), ['Nested', 'words']);
  const source = pandocToCarve(input);
  assert.ok(source.warnings.some((w) => w.includes('caption') && w.includes('structure-unspellable')));
});
