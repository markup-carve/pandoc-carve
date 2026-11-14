import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carveToPandoc } from '../dist/index.js';

const examples = JSON.parse(readFileSync(new URL('../vendor/carve-v2/examples.json', import.meta.url), 'utf8'));
const cases = examples.filter((example) => !example.flags?.length);
const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (value) => value.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/gu, (whole, body) => {
  if (body[0] !== '#') return named[body.toLowerCase()] ?? whole;
  const code = body[1] === 'x' || body[1] === 'X'
    ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
});

function htmlTargets(html) {
  const found = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gu)) found.push(decodeEntities(match[1]));
  for (const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/gu)) found.push(decodeEntities(match[1]));
  return found.filter((target) => !target.startsWith('#')).sort();
}

function pandocTargets(node) {
  const found = [];
  const walk = (value, insideLink = false) => {
    if (Array.isArray(value)) return value.forEach((child) => walk(child, insideLink));
    if (!value || typeof value !== 'object') return;
    if (value.t === 'Link' && Array.isArray(value.c)) {
      const [attr, children, destination] = value.c;
      const unresolved = attr[2].some(([key]) => key === 'carve-unresolved');
      if (!insideLink && !unresolved && !destination[0].startsWith('#')) found.push(destination[0]);
      walk(children, true);
      return;
    }
    if (value.t === 'Image' && Array.isArray(value.c)) {
      const [attr, children, destination] = value.c;
      const unresolved = attr[2].some(([key]) => key === 'carve-unresolved');
      if (!unresolved && !destination[0].startsWith('#')) found.push(destination[0]);
      walk(children, insideLink);
      return;
    }
    for (const child of Object.values(value)) walk(child, insideLink);
  };
  walk(node);
  return found.sort();
}

function disagreement(source, html) {
  const expected = htmlTargets(html);
  const actual = pandocTargets(carveToPandoc(source).doc);
  return JSON.stringify(expected) === JSON.stringify(actual)
    ? null : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

test('the vendored 0.2 example oracle is present and complete', () => {
  assert.equal(examples.length, 371);
  assert.equal(cases.length, 367);
});

const probes = [
  ['the AST reader sees an extra target', '[t](/probe)\n', '<p>t</p>\n', true],
  ['the HTML reader sees an extra target', 'plain\n', '<p><a href="/probe">t</a></p>\n', true],
  ['matching targets agree', '[t](/probe)\n', '<p><a href="/probe">t</a></p>\n', false],
  ['escaped entities decode to the same target', '[t](/a?x=1&y=2)\n', '<p><a href="/a?x=1&amp;y=2">t</a></p>\n', false],
];
for (const [name, source, html, shouldDisagree] of probes) {
  test(`target oracle: ${name}`, () => {
    assert.equal(disagreement(source, html) !== null, shouldDisagree);
  });
}

test('the target oracle exercises the full example set', () => {
  assert.ok(cases.length > 300);
  assert.ok(cases.filter((example) => htmlTargets(example.html).length > 0).length >= 30);
});

test('0.2 example link and image targets match their expected HTML', () => {
  const divergent = [];
  for (const example of cases) {
    try {
      const found = disagreement(example.input, example.html);
      if (found) divergent.push(`${example.file}#${example.number}: ${found}`);
    } catch (error) {
      divergent.push(`${example.file}#${example.number}: ${String(error)}`);
    }
  }
  assert.deepEqual(divergent, []);
});

test('a nested source link does not become a nested Pandoc Link', () => {
  const { doc, warnings } = carveToPandoc('[a\nb](/u) and [[x](/y)](/z)');
  assert.deepEqual(pandocTargets(doc), ['/u', '/z']);
  assert.ok(!JSON.stringify(doc).includes('/y'));
  assert.ok(warnings.some((warning) => warning.includes('nested link flattened')));
});
