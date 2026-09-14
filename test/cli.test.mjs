import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findPandoc } from './helpers.mjs';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');
const pandoc = findPandoc();

function run(args, input) {
  return spawnSync(process.execPath, [cli, ...args], {
    input,
    encoding: 'utf8',
    env: { ...process.env, PANDOC: pandoc ?? 'pandoc-definitely-missing' },
  });
}

test('cli: -t json emits a valid pandoc document without pandoc', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'doc.crv');
  writeFileSync(file, '# Hi\n\n/there/\n');
  const result = run([file, '-t', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(result.stdout);
  assert.deepEqual(doc['pandoc-api-version'], [1, 23, 1]);
  assert.equal(doc.blocks[0].t, 'Header');
});

test('cli: reads stdin with "-"', () => {
  const result = run(['-', '-t', 'json'], '*bold*\n');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('"Strong"'));
});

test('cli: -f carve-json converts a serialized AST from any engine', () => {
  // The wire form of `# Hi`, written by hand: no engine produced it, which is
  // the point - PART 12 is what the CLI reads here, not carve-js.
  const ast = {
    type: 'document',
    srcByteLength: 5,
    children: [{ type: 'heading', level: 1, children: [{ type: 'text', value: 'Hi' }] }],
  };
  const result = run(['-', '-f', 'carve-json', '-t', 'json'], JSON.stringify(ast));
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(result.stdout);
  assert.equal(doc.blocks[0].t, 'Header');
  assert.equal(doc.blocks[0].c[2][0].c, 'Hi');
});

test('cli: -f carve-json refuses a payload that is not a Carve AST', () => {
  const result = run(['-', '-f', 'carve-json', '-t', 'json'], '{"blocks":[]}');
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('not a Carve AST document'), result.stderr);
});

test('cli: degradation warnings land on stderr', () => {
  const result = run(['-', '-t', 'json'], 'a :heart: b\n');
  assert.equal(result.status, 0);
  assert.ok(result.stderr.includes('pandoc-carve: degraded:'));
});

test('cli: structured diagnostics stay separate from converted output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const report = join(dir, 'diagnostics.json');
  const result = run(['-', '-t', 'json', '--diagnostics', report], 'a :heart: b\n');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).blocks[0].t, 'Para');
  const reportEnvelope = JSON.parse(readFileSync(report, 'utf8'));
  assert.equal(reportEnvelope.schemaVersion, 2);
  assert.equal(reportEnvelope.sourceFormat, 'carve');
  assert.equal(reportEnvelope.diagnostics[0].code, 'symbol-unresolved');
  assert.equal(result.stderr, '');
});

test('cli: inbound diagnostics name the original source format', () => {
  const report = join(tmpdir(), `pandoc-carve-inbound-${process.pid}.json`);
  const input = JSON.stringify({
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{ t: 'Para', c: [{ t: 'Str', c: 'plain' }] }],
  });
  const result = run(['-', '-f', 'json', '--diagnostics', report], input);
  assert.equal(result.status, 0, result.stderr);
  const reportEnvelope = JSON.parse(readFileSync(report, 'utf8'));
  assert.equal(reportEnvelope.schemaVersion, 2);
  assert.equal(reportEnvelope.sourceFormat, 'pandoc-json');
  assert.deepEqual(reportEnvelope.diagnostics, []);
});

test('cli: replays every shared Pandoc fidelity fixture', () => {
  // Synced from markup-carve/carve@b1bcb5fa, tests/importer-fidelity/manifest.json.
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/importer-fidelity.json', import.meta.url)));
  for (const fixture of fixtures) {
    const report = join(tmpdir(), `pandoc-carve-fixture-${process.pid}-${fixture.id}.json`);
    const result = run(['-', '-f', 'json', '--diagnostics', report], fixture.input);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, fixture.expected.output, fixture.id);
    const actual = JSON.parse(readFileSync(report, 'utf8'));
    assert.equal(actual.schemaVersion, 2);
    assert.equal(actual.sourceFormat, fixture.sourceFormat);
    assert.equal(fixture.runner, 'external');
    assert.equal(fixture.repository, 'markup-carve/pandoc-carve');
    assert.deepEqual(
      actual.diagnostics.map(({ code, fidelity, confidence }) => ({ code, fidelity, confidence })),
      fixture.expected.diagnostics,
      fixture.id,
    );
  }
});

test('cli: a Pandoc reader boundary fails closed', () => {
  const report = join(tmpdir(), `pandoc-carve-reader-${process.pid}.json`);
  const result = run(['-', '-f', 'markdown', '--diagnostics', report, '--fail-on-loss'], 'plain');
  if (!pandoc) return assert.equal(result.status, 2);
  assert.equal(result.status, 3, result.stderr);
  const envelope = JSON.parse(readFileSync(report, 'utf8'));
  assert.equal(envelope.sourceFormat, 'pandoc-json');
  assert.deepEqual(
    envelope.diagnostics.map(({ code, fidelity, confidence }) => ({ code, fidelity, confidence })),
    [{ code: 'fidelity-unverified', fidelity: 'dropped', confidence: 'fallback' }],
  );
});

test('cli: fail-on-loss rejects both degradation and dropped content', () => {
  const degraded = run(['-', '-t', 'json', '--fail-on-loss'], 'a :heart: b\n');
  assert.equal(degraded.status, 3, degraded.stderr);
  const lossy = run(['-', '-t', 'json', '--fail-on-loss'], 'visible %% secret\n');
  assert.equal(lossy.status, 3, lossy.stderr);
  assert.doesNotThrow(() => JSON.parse(lossy.stdout), 'converted output is still complete');
});

test('cli: converts to latex through pandoc', { skip: !pandoc && 'pandoc not found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'doc.crv');
  const out = join(dir, 'doc.tex');
  writeFileSync(file, 'Some /emphasis/ here.\n');
  const result = run([file, '-t', 'latex', '-o', out]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(readFileSync(out, 'utf8').includes('\\emph{emphasis}'));
});

test('cli: helpful error when pandoc is missing', () => {
  const result = spawnSync(process.execPath, [cli, '-', '-t', 'latex'], {
    input: 'x\n',
    encoding: 'utf8',
    env: { ...process.env, PANDOC: '/nonexistent/pandoc' },
  });
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes('not found'));
});

test('cli: usage on no args', () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('Usage'));
});
