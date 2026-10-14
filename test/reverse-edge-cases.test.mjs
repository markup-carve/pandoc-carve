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

test('a link with an empty destination keeps its text and says the link went', () => {
  const result = pandocToCarve(doc([para(link([], 'Empty', ''))]));
  assert.equal(carveToHtml(result.carve).trim(), '<p>Empty</p>');
  assert.deepEqual(result.diagnostics.map((d) => d.code), ['link-empty-destination-dropped']);
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
