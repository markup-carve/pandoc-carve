import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parse, render } from '../vendor/carve-v2/index.js';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { normalizeHtml } from './html-equivalence.mjs';

const path = new URL('../vendor/carve-v2/examples.json', import.meta.url);
const examples = JSON.parse(readFileSync(path, 'utf8'));
const corpus = examples.filter((example) => !example.flags?.length);
const id = (example) => `${example.file}#${example.number}`;

// The 0.2 writer cannot spell a multirow CSV table head as a pipe table.
// Both losses are reported on the return leg. Remove an entry when it passes.
const knownLossy = new Set(['syntax-blocks.md#217', 'syntax-blocks.md#230']);

function measure() {
  const lossy = [];
  const silent = [];
  const threw = [];
  for (const example of corpus) {
    try {
      const forward = carveToPandoc(example.input);
      const reverse = pandocToCarve(forward.doc);
      if (normalizeHtml(render(parse(example.input))) === normalizeHtml(render(parse(reverse.carve)))) continue;
      lossy.push(id(example));
      if (!forward.warnings.length && !reverse.warnings.length) silent.push(id(example));
    } catch (error) {
      threw.push(`${id(example)}: ${String(error.message).split('\n')[0]}`);
    }
  }
  return { lossy, silent, threw };
}

const result = measure();

test('the 0.2 round trip corpus is vendored', () => {
  assert.ok(existsSync(path));
});

test('the round trip is measured against the whole 0.2 corpus', () => {
  assert.equal(examples.length, 371);
  assert.equal(corpus.length, 367);
  assert.deepEqual(result.threw, []);
});

test('every lossy 0.2 round trip reports a warning', () => {
  assert.deepEqual(result.silent, []);
});

test('every 0.2 example round trips through Pandoc except the ledger', () => {
  assert.deepEqual(result.lossy.filter((name) => !knownLossy.has(name)), []);
});

test('the round trip ledger contains no fixed example', () => {
  assert.deepEqual([...knownLossy].filter((name) => !result.lossy.includes(name)), []);
});
