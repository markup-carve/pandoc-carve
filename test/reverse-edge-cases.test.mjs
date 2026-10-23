import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
const para = (...inlines) => ({ t: 'Para', c: inlines });
const link = (classes, text, href) => ({ t: 'Link', c: [['', classes, []], [{ t: 'Str', c: text }], [href, '']] });

test('an email autolink the engine cannot spell is written as a link', () => {
  const address = 'jürgen@bücher.de';
  const result = pandocToCarve(doc([para(link(['email'], address, `mailto:${address}`))]));
  const html = carveToHtml(result.carve);
  assert.match(html, new RegExp(`<a href="mailto:${address}">${address}</a>`), result.carve);
  assert.doesNotMatch(result.carve, /\.email/);
});

test('an ASCII autolink still comes back as an autolink', () => {
  const result = pandocToCarve(doc([para(link(['email'], 'a@b.de', 'mailto:a@b.de'))]));
  assert.equal(result.carve.trim(), '<a@b.de>');
});

test('a link with an empty destination comes back as a link', () => {
  const result = pandocToCarve(doc([para(link([], 'Empty', ''))]));
  assert.equal(result.carve, '[Empty]()\n');
  assert.equal(carveToHtml(result.carve).trim(), '<p><a href="">Empty</a></p>');
  assert.deepEqual(result.diagnostics, []);
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

test('an uncaptioned Figure imports as a figure group instead of throwing', () => {
  const image = { t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'a' }], ['b.png', '']] };
  const figure = { t: 'Figure', c: [['', [], []], [null, []], [{ t: 'Para', c: [image] }]] };
  const result = pandocToCarve(doc([figure]));
  assert.match(carveToHtml(result.carve), /<figure class="carve-figure-group">\s*<img src="b.png" alt="a">\s*<\/figure>/);
});

test('an empty Table imports as an empty CSV table', () => {
  const table = { t: 'Table', c: [['', [], []], [null, []], [], [['', [], []], []], [[['', [], []], 0, [], []]], [['', [], []], []]] };
  const result = pandocToCarve(doc([table]));
  assert.match(carveToHtml(result.carve), /^<table>\s*<\/table>/);
});

test('roundtrip mode brings a one-block figure group back as a group', () => {
  for (const src of ['::: figure\n![a](b.png)\n:::\n^ cap\n', '::: figure\n| a | b |\n:::\n^ cap\n']) {
    const back = pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;
    assert.equal(carveToHtml(back), carveToHtml(src), back);
  }
});
