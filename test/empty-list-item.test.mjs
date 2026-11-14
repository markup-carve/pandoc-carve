import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, validateTree } from '../vendor/carve-v2/index.js';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const doc = blocks => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
const plain = value => ({ t: 'Plain', c: [{ t: 'Str', c: value }] });
const ordered = entries => doc([{ t: 'OrderedList', c: [[1, { t: 'Decimal' }, { t: 'Period' }], entries] }]);
const bullet = entries => doc([{ t: 'BulletList', c: entries }]);
const itemBodies = source => [...render(source).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gu)].map(match => match[1].trim());

 test('item reader distinguishes empty bodies from ordinary bodies', () => {
  assert.deepEqual(itemBodies('1. a\n2. b'), ['a', 'b']);
  assert.deepEqual(itemBodies('1. %%'), ['']);
  assert.notDeepEqual(itemBodies('1. a'), itemBodies('1. b'));
  assert.equal(pandocToCarve(ordered([[]])).warnings.length, 1);
  assert.deepEqual(pandocToCarve(ordered([[plain('a')]])).warnings, []);
});

for (const [kind, build] of [['ordered', ordered], ['bullet', bullet]]) {
  test(`empty ${kind} item returns without visible plus text`, () => {
    const result = pandocToCarve(build([[]]));
    assert.ok(!/^\s*(?:1\.|\.|-)\s*\+/mu.test(result.carve));
    assert.deepEqual(itemBodies(result.carve), ['']);
    assert.match(result.carve, /%%/u);
    assert.ok(result.warnings.some(warning => warning.includes('empty-list-item-spelled')));
  });
}

test('an empty item retains its place among siblings', () => {
  const result = pandocToCarve(ordered([[plain('a')], [], [plain('c')]]));
  assert.deepEqual(itemBodies(result.carve), ['a', '', 'c']);
});

test('an empty task item keeps its box', () => {
  const result = pandocToCarve(bullet([[plain('☐')]]));
  assert.match(result.carve, /^- \[ \] %%/u);
  assert.deepEqual(itemBodies(result.carve).map(body => body.replace(/<[^>]*>/gu, '').trim()), ['']);
  assert.ok(result.warnings.some(warning => warning.includes('empty-list-item-spelled')));
});

test('a list with no empty item gets no placeholder', () => {
  const result = pandocToCarve(ordered([[plain('a')], [plain('b')]]));
  assert.deepEqual(result.warnings, []);
  assert.ok(!result.carve.includes('%%'));
});

test('the AST path leaves an empty item empty', () => {
  const { ast } = pandocToCarveAst(ordered([[]]));
  assert.deepEqual(ast.children[0].children[0].children, []);
  validateTree(ast);
});

test('a source empty item remains visually empty through the bridge', () => {
  const source = '1. a\n2. %%\n3. c\n';
  const back = pandocToCarve(carveToPandoc(source).doc).carve;
  assert.ok(!/^\s*(?:1\.|\.|-)\s*\+\s*$/mu.test(back));
  assert.deepEqual(itemBodies(back), ['a', '', 'c']);
  assert.equal(render(back), render(source));
});
