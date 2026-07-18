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

test('cli: degradation warnings land on stderr', () => {
  const result = run(['-', '-t', 'json'], 'a :heart: b\n');
  assert.equal(result.status, 0);
  assert.ok(result.stderr.includes('pandoc-carve: degraded:'));
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
