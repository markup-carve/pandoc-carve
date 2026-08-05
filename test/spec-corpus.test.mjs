/*
 * The shared spec corpus, converted through this package.
 *
 * test/corpus.test.mjs reads test/fixtures - about a dozen files. The spec
 * corpus has 610, and nothing here ran against it. That gap was not theoretical:
 * sweeping the corpus by hand found both defects fixed in #10, including a stack
 * overflow reachable from a two-word document (`# A </#a>`) that had been live
 * on the published package indefinitely, because no fixture contained a cyclic
 * cross-reference (#12).
 *
 * The gate is deliberately NOT rendering equivalence - pandoc's writers are not
 * Carve's, and comparing them would fail on differences that are correct. It is
 * the two things that are always wrong:
 *
 *   1. a THROW, and
 *   2. an "unknown node type" warning, which is how a consumer that switches on
 *      node-type strings finds out the engine grew a node - silently, otherwise.
 *
 * WHAT THIS DOES NOT COVER, said out loud because the numbers look total: the
 * converter reads the engine's RUNTIME tree (parse()), and the pinned ^0.1.2
 * engine exports no toAstJson at all, so there is no wire form to check against
 * the spec's ast-schema.json. Over these 610 documents the runtime tree carries
 * 47 distinct type names; the schema declares 58 and names one of the 47
 * differently (critic-comment against critic_comment). Some of that difference is
 * legitimate - PART 12 §1 lets an implementation's internals differ from what it
 * serializes - and some of it is the pin being old. Either way "0 unknown node
 * types" is a statement about what THIS pin produces, not about the vocabulary,
 * and raising the pin (#7) is what widens it.
 *
 * A MISSING SUBMODULE FAILS. It does not skip: a skipped corpus reads exactly
 * like a converted one in a CI log, which is the failure mode this file exists to
 * remove. "git submodule update --init" is the fix, and CI checks out with
 * submodules: recursive.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carveToPandoc } from '../dist/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(repo, 'spec', 'tests', 'corpus');

test('the spec corpus submodule is checked out', () => {
  assert.ok(
    existsSync(corpusDir),
    corpusDir + ' is missing. Run "git submodule update --init". This is a failure ' +
      'rather than a skip on purpose: a skipped corpus and a converted one look the ' +
      'same in a CI log.',
  );
});

const corpus = existsSync(corpusDir)
  ? readdirSync(corpusDir)
      .filter((file) => file.endsWith('.crv'))
      .sort()
      .map((file) => ({ name: file, source: readFileSync(join(corpusDir, file), 'utf8') }))
  : [];

test('the whole corpus is being read, not a sample', () => {
  // The count is the other half of the submodule check: a submodule pinned at a
  // commit with a handful of documents would pass every test below.
  assert.ok(
    corpus.length > 500,
    'expected the full corpus, found ' + corpus.length + ' documents',
  );
});

test('every corpus document converts without throwing', () => {
  const threw = [];
  for (const { name, source } of corpus) {
    try {
      const { doc } = carveToPandoc(source);
      assert.ok(Array.isArray(doc.blocks), name + ': no blocks array');
    } catch (error) {
      threw.push(name + ': ' + String(error.message).split('\n')[0]);
    }
  }
  assert.deepEqual(threw, [], 'document(s) that threw:\n  ' + threw.join('\n  '));
});

test('no corpus document degrades an unrecognized node type', () => {
  const unknown = new Map();
  for (const { name, source } of corpus) {
    let warnings;
    try {
      warnings = carveToPandoc(source).warnings ?? [];
    } catch {
      continue; // the throw test above owns this document
    }
    for (const warning of warnings) {
      const match = /unknown node type "([^"]+)"/.exec(warning);
      if (!match) continue;
      if (!unknown.has(match[1])) unknown.set(match[1], name);
    }
  }
  assert.deepEqual(
    [...unknown].map(([type, name]) => type + ' (first at ' + name + ')'),
    [],
    'the converter degraded node type(s) it does not recognize. Handle them in ' +
      'src/convert.ts - a degraded node still converts, so nothing else here fails, ' +
      'and the output silently loses their meaning.',
  );
});
