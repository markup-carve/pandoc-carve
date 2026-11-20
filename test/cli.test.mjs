import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('cli: pdf requires an output file before Pandoc is called', () => {
  const result = run(['-', '-t', 'pdf', '--pandoc', '/nonexistent/pandoc'], 'Hello.\n');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'pandoc-carve: -t pdf requires -o <file.pdf>\n');
});

test('cli: pdf uses the output path to select the writer', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fake = join(dir, 'fake-pandoc.mjs');
  const argsFile = join(dir, 'args.json');
  const output = join(dir, 'out.pdf');
  writeFileSync(fake, `#!${process.execPath}\nimport { writeFileSync } from 'node:fs';\nwriteFileSync(process.env.PANDOC_ARGS_FILE, JSON.stringify(process.argv.slice(2)));\n`);
  chmodSync(fake, 0o755);
  const result = run(['-', '-t', 'pdf', '-o', output, '--pandoc', fake], 'Hello.\n', { PANDOC_ARGS_FILE: argsFile });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(argsFile, 'utf8')), ['-f', 'json', '-o', output]);
});

test('cli: Pandoc writer exit status passes through on failure and success', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fake = join(dir, 'fake-pandoc.mjs');
  writeFileSync(fake, `#!${process.execPath}\nprocess.stdout.write('writer output\\n');\nprocess.stderr.write('writer diagnostic\\n');\nprocess.exit(Number(process.env.PANDOC_EXIT_STATUS));\n`);
  chmodSync(fake, 0o755);
  for (const [writer, status, expectedStdout] of [['latex', 47, ''], ['pdf', 47, ''], ['latex', 0, 'writer output\n']]) {
    const output = writer === 'pdf' ? ['-o', join(dir, 'out.pdf')] : [];
    const result = run(['-', '-t', writer, ...output, '--pandoc', fake], 'Hello.\n', { PANDOC_EXIT_STATUS: String(status) });
    assert.equal(result.status, status);
    assert.equal(result.stdout, expectedStdout);
    assert.equal(result.stderr, status === 0 ? '' : 'writer diagnostic\n');
  }
});

test('cli: no arguments shows usage', () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/u);
});

const includeFixture = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'doc.crv'), 'Intro\n\n{{ part.crv }}\n');
  writeFileSync(join(dir, 'part.crv'), 'Included *text*\n');
  return dir;
};

test('cli: -s writes a standalone document', (t) => {
  const dir = includeFixture(t);
  const result = run(['-t', 'html', '-s', join(dir, 'doc.crv')]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<!DOCTYPE html>/u);
  assert.doesNotMatch(run(['-t', 'html', join(dir, 'doc.crv')]).stdout, /<!DOCTYPE/u);
});

test('cli: a named file expands its includes', (t) => {
  const dir = includeFixture(t);
  const result = run(['-t', 'html', join(dir, 'doc.crv')]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '<p>Intro</p>\n<p>Included <strong>text</strong></p>\n');
  assert.equal(result.stderr, '');
});

test('cli: --no-includes leaves the include unexpanded', (t) => {
  const dir = includeFixture(t);
  const result = run(['-t', 'html', '--no-includes', join(dir, 'doc.crv')]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /class="carve-include" data-path="part\.crv"/u);
  assert.match(result.stderr, /include: unresolved/u);
});

test('cli: stdin expands includes only with --include-root', (t) => {
  const dir = includeFixture(t);
  const source = '{{ part.crv }}\n';
  assert.match(run(['-', '-t', 'json'], source).stdout, /carve-include/u);
  const result = run(['-', '-t', 'json', '--include-root', dir], source);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"Strong"/u);
  assert.doesNotMatch(result.stdout, /carve-include/u);
});

test('cli: --include-root is absolute and applies to Carve source only', (t) => {
  const dir = includeFixture(t);
  const relative = run([join(dir, 'doc.crv'), '-t', 'json', '--include-root', 'relative']);
  assert.equal(relative.status, 1);
  assert.match(relative.stderr, /--include-root must be an absolute path/u);
  const imported = run(['-', '-f', 'json', '--no-includes'], JSON.stringify(doc([])));
  assert.equal(imported.status, 1);
  assert.match(imported.stderr, /only apply to Carve source input/u);
});

test('cli: an include outside the root is reported and fails the loss gate', (t) => {
  const dir = includeFixture(t);
  writeFileSync(join(dir, 'doc.crv'), '{{ ../outside.crv }}\n');
  const result = run([join(dir, 'doc.crv'), '-t', 'json', '--fail-on-loss']);
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stderr, /include-outside-root/u);
});

test('cli: arguments after -- and --pandoc reach Pandoc', (t) => {
  const dir = includeFixture(t);
  const fake = join(dir, 'fake-pandoc.mjs');
  writeFileSync(fake, `#!${process.execPath}\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)));\n`);
  chmodSync(fake, 0o755);
  const exported = run([join(dir, 'doc.crv'), '-t', 'latex', '-s', '--pandoc', fake, '--', '--toc', '-V', 'x=y'], undefined, { PANDOC: '/nonexistent/pandoc' });
  assert.equal(exported.status, 0, exported.stderr);
  assert.deepEqual(JSON.parse(exported.stdout), ['-f', 'json', '-t', 'latex', '-s', '--toc', '-V', 'x=y']);
  const imported = run(['-', '-f', 'markdown', '-t', 'json', '--pandoc', fake, '--', '--tab-stop=2'], 'x\n');
  assert.equal(imported.status, 0, imported.stderr);
  assert.deepEqual(JSON.parse(imported.stdout), ['-f', 'markdown', '-t', 'json', '--tab-stop=2']);
});

test('cli: --toc after -- builds a table of contents', (t) => {
  const dir = includeFixture(t);
  writeFileSync(join(dir, 'doc.crv'), '= One\n\n= Two\n');
  const result = run([join(dir, 'doc.crv'), '-t', 'html', '-s', '--', '--toc']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /id="TOC"/u);
});

test('cli: an unknown option is an error', () => {
  const result = run(['-', '-t', 'json', '--roundtrip'], 'x\n');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown option: --roundtrip/u);
});
