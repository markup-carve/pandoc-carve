import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

const examplePath = new URL('../vendor/carve/examples.json', import.meta.url);
const schemaPath = new URL('../vendor/carve/ast-schema.json', import.meta.url);
const examples = JSON.parse(readFileSync(examplePath, 'utf8'));
const corpus = examples.filter((example) => !example.flags?.length);
const id = (example) => `${example.file}#${example.number}`;
const validate = new Ajv2020({ strict: false }).compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

function schemaFailures(convert) {
  const invalid = [];
  for (const example of corpus) {
    try {
      const ast = convert(example.input);
      if (!validate(ast)) invalid.push(`${id(example)}: ${validate.errors?.[0]?.instancePath || '/'} ${validate.errors?.[0]?.message}`);
    } catch (error) {
      invalid.push(`${id(example)}: ${String(error.message).split('\n')[0]}`);
    }
  }
  return invalid;
}

test('the 0.2 spec corpus and schema are vendored', () => {
  assert.ok(existsSync(examplePath));
  assert.ok(existsSync(schemaPath));
});

test('the whole 0.2 example corpus is being read', () => {
  assert.equal(examples.length, 505);
  assert.equal(corpus.length, 476);
  assert.equal(new Set(examples.map(id)).size, examples.length);
});

test('every 0.2 corpus document converts without throwing', () => {
  const failures = [];
  for (const example of corpus) {
    try {
      assert.ok(Array.isArray(carveToPandoc(example.input).doc.blocks));
    } catch (error) {
      failures.push(`${id(example)}: ${String(error.message).split('\n')[0]}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('every 0.2 corpus engine tree conforms to the 0.2 spec schema', () => {
  assert.deepEqual(schemaFailures(carveToCarveAst), []);
});

test('no 0.2 corpus document degrades an unrecognized node type', () => {
  const unknown = [];
  for (const example of corpus) {
    const { warnings } = carveToPandoc(example.input);
    for (const warning of warnings) if (/unknown node type/u.test(warning)) unknown.push(`${id(example)}: ${warning}`);
  }
  assert.deepEqual(unknown, []);
});

test('every 0.2 corpus document returns from Pandoc as a schema-conformant tree', () => {
  assert.deepEqual(schemaFailures((source) => pandocToCarveAst(carveToPandoc(source).doc).ast), []);
});
