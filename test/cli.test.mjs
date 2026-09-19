import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findPandoc } from './helpers.mjs';
import Ajv2020 from 'ajv/dist/2020.js';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');
const pandoc = findPandoc();
const reportSchema = JSON.parse(readFileSync(new URL('./fixtures/migration-report-schema.json', import.meta.url)));
const validateMigrationReport = new Ajv2020({ strict: true }).compile(reportSchema);
const assertMigrationReport = report => assert.equal(
  validateMigrationReport(report), true, JSON.stringify(validateMigrationReport.errors),
);

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

test('cli: stdin includes are opt-in through an absolute root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  writeFileSync(join(dir, 'child.crv'), 'Included.\n');
  const literal = run(['-', '-t', 'json'], '{{ child.crv }}\n');
  assert.equal(literal.status, 0, literal.stderr);
  assert.match(literal.stdout, /child\.crv/);
  const expanded = run(['-', '-t', 'json', '--include-root', dir], '{{ child.crv }}\n');
  assert.equal(expanded.status, 0, expanded.stderr);
  assert.match(expanded.stdout, /Included/);
});

test('cli: named files expand from their directory and --no-includes opts out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'main.crv');
  writeFileSync(file, '{{ child.crv }}\n');
  writeFileSync(join(dir, 'child.crv'), 'Included.\n');
  const expanded = run([file, '-t', 'json']);
  assert.equal(expanded.status, 0, expanded.stderr);
  assert.match(expanded.stdout, /Included/);
  const literal = run([file, '-t', 'json', '--no-includes']);
  assert.equal(literal.status, 0, literal.stderr);
  assert.match(literal.stdout, /child\.crv/);
});

test('cli: include warnings expose no absolute containment path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'main.crv');
  writeFileSync(file, '{{ ../outside.crv }}\n');
  const result = run([file, '-t', 'json', '--include-root', dir]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /include-unresolved/);
  assert.doesNotMatch(result.stderr, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('cli: include warnings remain contained when the root is a symlink', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const link = `${dir}-link`;
  symlinkSync(dir, link, 'dir');
  try {
    const file = join(link, 'main.crv');
    writeFileSync(file, '{{ missing.crv }}\n');
    const result = run([file, '-t', 'json', '--include-root', link]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /\[include-root\]\/main\.crv/);
    assert.doesNotMatch(result.stderr, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    rmSync(link);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cli: include failures participate in structured diagnostics and fail-on-loss', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'main.crv');
  writeFileSync(file, '{{ missing.crv }}\n');
  const result = run([file, '-t', 'json', '--diagnostics', '-', '--fail-on-loss']);
  assert.equal(result.status, 3, result.stderr);
  const report = JSON.parse(result.stderr);
  assertMigrationReport(report);
  assert.equal(report.diagnostics[0].code, 'include-unresolved');
  assert.equal(report.diagnostics[0].details.file, '[include-root]/main.crv');
});

test('cli: normalized include renames do not fail on loss', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'main.crv');
  writeFileSync(file, '{#dup}\n# Main\n\n{{ child.crv }}\n');
  writeFileSync(join(dir, 'child.crv'), '{#dup}\n# Child\n');
  const result = run([file, '-t', 'json', '--diagnostics', '-', '--fail-on-loss']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stderr);
  const renamed = report.diagnostics.find(item => item.code === 'include-heading-id-rename');
  assert.equal(renamed.fidelity, 'normalized');
});

test('cli: stdin include diagnostics omit an unknown file identity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const result = run(['-', '-t', 'json', '--include-root', dir, '--diagnostics', '-'], '{{ missing.crv }}\n');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stderr);
  assert.equal(Object.hasOwn(report.diagnostics[0].details, 'file'), false);
});

test('cli: reports the count of suppressed include warnings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const file = join(dir, 'main.crv');
  writeFileSync(file, Array.from({ length: 105 }, (_, index) => `{{ missing-${index}.crv }}`).join('\n'));
  const result = run([file, '-t', 'json']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /5 additional include warning\(s\) suppressed/);
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

test('cli: -f carve-json rejects source-only include options', () => {
  const result = run(['-', '-f', 'carve-json', '--no-includes'], '{}');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /only apply to Carve source input/);
});

test('cli: Pandoc readers reject source-only include options', () => {
  const result = run(['-', '-f', 'json', '--include-root', tmpdir()], '{}');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /only apply to Carve source input/);
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
  assertMigrationReport(reportEnvelope);
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
  assertMigrationReport(reportEnvelope);
  assert.equal(reportEnvelope.schemaVersion, 2);
  assert.equal(reportEnvelope.sourceFormat, 'pandoc-json');
  assert.deepEqual(reportEnvelope.diagnostics, []);
});

test('cli: replays every shared Pandoc fidelity fixture', () => {
  // Synced from the pinned spec submodule, tests/importer-fidelity/manifest.json.
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/importer-fidelity.json', import.meta.url)));
  for (const fixture of fixtures) {
    const report = join(tmpdir(), `pandoc-carve-fixture-${process.pid}-${fixture.id}.json`);
    const result = run(['-', '-f', 'json', '--diagnostics', report], fixture.input);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, fixture.expected.output, fixture.id);
    const actual = JSON.parse(readFileSync(report, 'utf8'));
    assertMigrationReport(actual);
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
  assertMigrationReport(envelope);
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
