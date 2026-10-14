import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  pandocToCarve, pandocToCarveAst, PandocImportLimitError, MAX_PANDOC_DEPTH, MAX_LIST_DEPTH,
} from '../dist/index.js';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');
const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
const str = (c) => ({ t: 'Str', c });

const quotes = (depth) => {
  let block = { t: 'Para', c: [str('x')] };
  for (let i = 0; i < depth; i++) block = { t: 'BlockQuote', c: [block] };
  return doc([block]);
};
const emphs = (depth) => {
  let inline = str('x');
  for (let i = 0; i < depth; i++) inline = { t: 'Emph', c: [inline] };
  return doc([{ t: 'Para', c: [inline] }]);
};
// JSON.stringify recurses, so a deep document is spelled as text directly.
const deepJson = (depth) => '{"pandoc-api-version":[1,23,1],"meta":{},"blocks":['
  + '{"t":"BlockQuote","c":['.repeat(depth) + '{"t":"Para","c":[]}' + ']}'.repeat(depth) + ']}';
const looseLists = (depth) => {
  let block = { t: 'Para', c: [str('x')] };
  for (let i = 0; i < depth; i++) block = { t: 'BulletList', c: [[{ t: 'Para', c: [str('i')] }, block]] };
  return doc([block]);
};

const refused = (fn, kind) => {
  let caught;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof PandocImportLimitError, `expected a PandocImportLimitError, got ${caught}`);
  assert.equal(caught.diagnostic.code, 'pandoc-nesting-too-deep');
  assert.equal(caught.diagnostic.direction, 'pandoc-to-carve');
  assert.equal(caught.diagnostic.severity, 'error');
  assert.equal(caught.diagnostic.details.kind, kind);
  return caught;
};

test('a document nested past the node limit is refused with a structured diagnostic, not a stack overflow', () => {
  refused(() => pandocToCarve(quotes(3000)), 'nodes');
  refused(() => pandocToCarve(emphs(3000)), 'nodes');
  refused(() => pandocToCarveAst(quotes(3000)), 'nodes');
  refused(() => pandocToCarve(deepJson(200000)), 'nodes');
});

test('the node limit is the engine render cap, and a shallow document still converts', () => {
  assert.ok(MAX_PANDOC_DEPTH > 100);
  refused(() => pandocToCarve(quotes(MAX_PANDOC_DEPTH)), 'nodes');
  assert.match(pandocToCarve(quotes(20)).carve, /> > x/);
});

test('lists nested past the list limit are refused quickly', () => {
  const started = Date.now();
  const error = refused(() => pandocToCarve(looseLists(MAX_LIST_DEPTH + 1)), 'lists');
  assert.ok(Date.now() - started < 1000, 'the guard ran after the slow writer, not before it');
  assert.equal(error.diagnostic.details.limit, MAX_LIST_DEPTH);
  assert.ok(pandocToCarve(looseLists(10)).carve.includes('x'));
});

test('cli: an over-deep document exits 1 and writes the diagnostic to the report', () => {
  const result = spawnSync(process.execPath, [cli, '-', '-f', 'json', '--diagnostics', '-'], {
    input: deepJson(3000),
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  const report = JSON.parse(result.stderr);
  assert.deepEqual(report.diagnostics.map((d) => d.code), ['pandoc-nesting-too-deep']);
  const schema = JSON.parse(readFileSync(new URL('./fixtures/migration-report-schema.json', import.meta.url)));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(report), true, JSON.stringify(validate.errors));
});
