import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, resolve } from '@markup-carve/carve';
import { carveToPandoc } from '../dist/index.js';

const headers = (value, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => headers(v, out));
  else if (value && typeof value === 'object') {
    if (value.t === 'Header') out.push(value.c[1][0]);
    Object.values(value).forEach((v) => headers(v, out));
  }
  return out;
};

const links = (value, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => links(v, out));
  else if (value && typeof value === 'object') {
    if (value.t === 'Link') out.push({ classes: value.c[0][1], target: value.c[2][0] });
    Object.values(value).forEach((v) => links(v, out));
  }
  return out;
};

test('a heading carries the id the engine derives for it', () => {
  const { doc } = carveToPandoc(
    "# it's a heading\n\n# it's a heading\n\n# 1 Intro\n\n# ![alt *x*](a.png) img\n\n{#given}\n# Explicit\n",
  );
  assert.deepEqual(headers(doc), ['it-s-a-heading', 'it-s-a-heading-2', 's-1-Intro', 'alt-x-img', 'given']);
});

test('a collapsed reference and a crossref reach the derived heading id', () => {
  const { doc, warnings } = carveToPandoc("# it's a heading\n\nSee [it's a heading][] and </#it-s-a-heading>.\n");
  const found = links(doc);
  assert.deepEqual(found.map((l) => l.target), ['#it-s-a-heading', '#it-s-a-heading']);
  assert.ok(found.every((l) => !l.classes.includes('unresolved')), JSON.stringify(found));
  assert.deepEqual(warnings.filter((w) => w.includes('crossref')), []);
});

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(repo, 'spec', 'tests', 'corpus');

test('every corpus heading crosses with the id the engine renders it with', () => {
  assert.ok(existsSync(corpusDir), 'spec corpus submodule is missing');
  const engineIds = (value, out = []) => {
    if (Array.isArray(value)) value.forEach((v) => engineIds(v, out));
    else if (value && typeof value === 'object') {
      if (value.type === 'heading' && value.attrs?.id) out.push(value.attrs.id);
      Object.values(value).forEach((v) => engineIds(v, out));
    }
    return out;
  };
  const differ = [];
  let compared = 0;
  for (const file of readdirSync(corpusDir).filter((f) => f.endsWith('.crv')).sort()) {
    const source = readFileSync(join(corpusDir, file), 'utf8');
    let expected;
    try {
      expected = engineIds(resolve(parse(source))).sort();
    } catch {
      continue;
    }
    if (expected.length === 0) continue;
    compared++;
    const actual = headers(carveToPandoc(source).doc).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      differ.push(`${file}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    }
  }
  assert.ok(compared > 50, `compared only ${compared} documents with headings`);
  assert.deepEqual(differ, []);
});
