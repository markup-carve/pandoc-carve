import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cli = new URL('../dist/cli.js', import.meta.url).pathname;
const run = (args, input, env = {}) => spawnSync(process.execPath, [cli, ...args], {
  input, encoding: 'utf8', env: { ...process.env, ...env },
});

const doc = (blocks, meta = {}) => ({ 'pandoc-api-version': [1, 23, 1], meta, blocks });

test('cli: -t json emits a Pandoc document without invoking Pandoc', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'doc.crv');
  writeFileSync(file, '= Hi\n\n*bold*\n');
  const result = run([file, '-t', 'json'], undefined, { PANDOC: '/nonexistent/pandoc' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output['pandoc-api-version'], [1, 23, 1]);
  assert.equal(output.blocks[0].t, 'Header');
});

test('cli: reads Carve source from stdin', () => {
  const result = run(['-', '-t', 'json'], '*bold*\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"Strong"/u);
});

test('cli: -f carve-json converts a handwritten 0.2 tree', () => {
  const ast = { type: 'document', astVersion: '2.0', children: [
    { type: 'heading', level: 1, children: [{ type: 'text', value: 'Hi' }] },
  ] };
  const result = run(['-', '-f', 'carve-json', '-t', 'json'], JSON.stringify(ast));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).blocks[0].c[2][0].c, 'Hi');
});

test('cli: -f carve-json refuses a non-Carve payload', () => {
  const result = run(['-', '-f', 'carve-json', '-t', 'json'], '{"blocks":[]}');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not a Carve AST document/u);
});

test('cli: conversion warnings land on stderr', () => {
  const result = run(['-', '-t', 'json'], 'a :heart: b\n');
  assert.equal(result.status, 0);
  assert.match(result.stderr, /pandoc-carve: degraded: symbol/u);
});

test('cli: an unverified Pandoc reader fails the loss gate', () => {
  const result = run(['-', '-f', 'markdown', '--fail-on-loss'], 'plain');
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stderr, /fidelity-unverified/u);
  assert.match(result.stdout, /plain/u);
});

test('cli: fail-on-loss rejects conversion warnings and still emits output', () => {
  const result = run(['-', '-t', 'json', '--fail-on-loss'], 'a :heart: b\n');
  assert.equal(result.status, 3, result.stderr);
  assert.equal(JSON.parse(result.stdout).blocks[0].t, 'Para');
});

test('cli: omitted Pandoc metadata fails the loss gate', () => {
  const input = JSON.stringify(doc([{ t: 'Para', c: [{ t: 'Str', c: 'item' }] }],
    { custom: { t: 'MetaString', c: 'value' } }));
  const result = run(['-', '-f', 'json', '--fail-on-loss'], input);
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /item/u);
  assert.match(result.stderr, /metadata custom: no typed 0\.2 slot/u);
});

test('cli: converts to LaTeX through Pandoc', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'doc.crv');
  const output = join(dir, 'doc.tex');
  writeFileSync(file, 'Some *emphasis* here.\n');
  const result = run([file, '-t', 'latex', '-o', output]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(output, 'utf8'), /\\textbf\{emphasis\}/u);
});

test('cli: missing Pandoc has a clear error', () => {
  const result = run(['-', '-t', 'latex'], 'x\n', { PANDOC: '/nonexistent/pandoc' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /pandoc not found/u);
});

test('cli: no arguments shows usage', () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/u);
});
