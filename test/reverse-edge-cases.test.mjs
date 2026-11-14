import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render as carveToHtml } from '../vendor/carve-v2/index.js';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
const para = (...inlines) => ({ t: 'Para', c: inlines });
const link = (classes, text, href) => ({ t: 'Link', c: [['', classes, []], [{ t: 'Str', c: text }], [href, '']] });

test('a foreign email-classed link keeps its URL and class', () => {
  const address = 'jürgen@bücher.de';
  const result = pandocToCarve(doc([para(link(['email'], address, `mailto:${address}`))]));
  const html = carveToHtml(result.carve);
  assert.match(html, new RegExp(`<a href="mailto:${address}" class="email">${address}</a>`), result.carve);
  assert.match(result.carve, /\.email/u);
});

test('an authored ASCII autolink still comes back as an autolink', () => {
  const source = '<mailto:a@b.de>\n';
  const result = pandocToCarve(carveToPandoc(source).doc);
  assert.equal(result.carve, source);
});

test('a link with an empty destination comes back as a link', () => {
  const result = pandocToCarve(doc([para(link([], 'Empty', ''))]));
  assert.equal(result.carve, '[Empty]()\n');
  assert.equal(carveToHtml(result.carve).trim(), '<p><a href="">Empty</a></p>');
  assert.deepEqual(result.warnings, []);
});

test('a pandoc Div classed note is a div, not an admonition', () => {
  const div = { t: 'Div', c: [['', ['note'], []], [para({ t: 'Str', c: 'x' })]] };
  const html = carveToHtml(pandocToCarve(doc([div])).carve);
  assert.match(html, /<div class="note">/);
  assert.doesNotMatch(html, /admonition/);
});

test('a Carve admonition still comes back as one', () => {
  const back = pandocToCarve(carveToPandoc('::: note\nx\n:::\n').doc).carve;
  assert.match(carveToHtml(back), /<aside class="admonition note"/);
});

test('an uncaptioned Figure imports as a 0.2 figure instead of throwing', () => {
  const image = { t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'a' }], ['b.png', '']] };
  const figure = { t: 'Figure', c: [['', [], []], [null, []], [{ t: 'Para', c: [image] }]] };
  const result = pandocToCarve(doc([figure]));
  assert.equal(pandocToCarveAst(doc([figure])).ast.children[0].type, 'figure');
  assert.match(carveToHtml(result.carve), /<img src="b.png" alt="a">/u);
});

test('an empty Table remains in the tree and reports source elision', () => {
  const table = { t: 'Table', c: [['', [], []], [null, []], [], [['', [], []], []], [[['', [], []], 0, [], []]], [['', [], []], []]] };
  const result = pandocToCarve(doc([table]));
  assert.equal(pandocToCarveAst(doc([table])).ast.children[0].type, 'table');
  assert.ok(result.warnings.some((warning) => warning.includes('empty table')), result.warnings.join(' | '));
});

test('roundtrip mode brings a one-block figure group back as a group', () => {
  for (const src of ['::: figure\n![a](b.png)\n:::\n^ cap\n', '::: figure\n| a | b |\n:::\n^ cap\n']) {
    const back = pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;
    assert.equal(carveToHtml(back), carveToHtml(src), back);
  }
});
