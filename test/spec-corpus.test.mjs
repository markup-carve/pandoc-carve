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
 * Since #16 there is a third, and it is the one that checks the VOCABULARY
 * rather than this pin's habits:
 *
 *   3. every document's serialized AST validates against
 *      spec/resources/ast-schema.json - the file PART 12 pins the exchange
 *      format with.
 *
 * That check was impossible while the converter read the engine's runtime tree,
 * because "every node type is handled" cannot be asserted against a contract the
 * converter does not consume. It consumes it now: src/ast-json.ts maps the
 * runtime tree onto the wire shape on the way in (and hands over to the engine's
 * own toAstJson once a pin exports one), so what the schema validates below is
 * exactly what convert() reads.
 *
 * WHAT THIS STILL DOES NOT COVER: the pin. A construct the published ^0.1.2
 * cannot parse produces no node here, so no corpus document exercises the arms
 * for node types a later engine adds - conformance of what IS produced is not
 * coverage of the whole vocabulary. Raising the pin (#7) is what widens it.
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
import Ajv2020 from 'ajv/dist/2020.js';
import { carveToCarveAst, carveToPandoc } from '../dist/index.js';

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

test("every corpus document's serialized AST conforms to the spec AST schema", () => {
  const schemaPath = join(repo, 'spec', 'resources', 'ast-schema.json');
  assert.ok(existsSync(schemaPath), schemaPath + ' is missing - the submodule is incomplete');
  const validate = new Ajv2020({ strict: false }).compile(
    JSON.parse(readFileSync(schemaPath, 'utf8')),
  );

  const invalid = [];
  for (const { name, source } of corpus) {
    let ast;
    try {
      ast = carveToCarveAst(source);
    } catch (error) {
      invalid.push(name + ': serialization threw: ' + String(error.message).split('\n')[0]);
      continue;
    }
    if (validate(ast)) continue;
    const error = validate.errors[0];
    invalid.push(
      name + ': ' + (error.instancePath || '/') + ' ' + error.message + ' ' +
        JSON.stringify(error.params),
    );
  }

  assert.deepEqual(
    invalid,
    [],
    'document(s) whose serialized AST does not match spec/resources/ast-schema.json. ' +
      'The converter reads that shape, so a document listed here converts from something ' +
      'the spec does not define:\n  ' + invalid.join('\n  '),
  );
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
