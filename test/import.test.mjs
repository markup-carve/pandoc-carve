import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { carveToHtml } from '@markup-carve/carve';
import { pandocToCarve } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

const pandoc = findPandoc();
const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');

function pandocToJson(from, input) {
  const result = spawnSync(pandoc, ['-f', from, '-t', 'json'], {
    input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('import: markdown -> carve produces native Carve syntax', { skip: !pandoc && 'pandoc not found' }, () => {
  const md = [
    '# Title',
    '',
    'Some *emphasis* and **strong** with `code`, ~~strike~~ and a [link](https://e.com).',
    '',
    '- one',
    '- two',
    '',
    '> quoted',
    '',
    '| A | B |',
    '|---|--:|',
    '| 1 | 2 |',
  ].join('\n');
  const { carve } = pandocToCarve(pandocToJson('markdown', md));
  assert.ok(carve.includes('# Title'));
  // Markdown *em* must become Carve /em/, ** -> *
  assert.ok(carve.includes('/emphasis/'), carve);
  assert.ok(carve.includes('*strong*'), carve);
  assert.ok(carve.includes('~strike~'), carve);
  assert.ok(carve.includes('[link](https://e.com)'));
  assert.ok(carve.includes('- one'));
  assert.ok(carve.includes('> quoted'));
  // Renders cleanly as Carve
  const html = carveToHtml(carve);
  assert.ok(html.includes('<em>emphasis</em>'));
  assert.ok(html.includes('<strong>strong</strong>'));
});

test('import: latex -> carve', { skip: !pandoc && 'pandoc not found' }, () => {
  const tex = '\\section{Intro}\n\nSome \\emph{em} and \\textbf{bold} plus $e=mc^2$ math.\n';
  const { carve } = pandocToCarve(pandocToJson('latex', tex));
  assert.ok(carve.includes('# Intro'));
  assert.ok(carve.includes('/em/'));
  assert.ok(carve.includes('*bold*'));
  assert.ok(carve.includes('$`e=mc^2`'), carve);
});

test('import: docx -> carve end-to-end via CLI', { skip: !pandoc && 'pandoc not found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-'));
  const docx = join(dir, 'in.docx');
  // Build a real docx with pandoc first.
  const gen = spawnSync(pandoc, ['-f', 'markdown', '-t', 'docx', '-o', docx], {
    input: '# From Word\n\nA *styled* paragraph with a [link](https://e.com).\n\n- bullet\n',
    encoding: 'utf8',
  });
  assert.equal(gen.status, 0, gen.stderr);

  const out = join(dir, 'out.crv');
  const result = spawnSync(process.execPath, [cli, docx, '-f', 'docx', '-o', out], {
    encoding: 'utf8',
    env: { ...process.env, PANDOC: pandoc },
  });
  assert.equal(result.status, 0, result.stderr);
  const carve = readFileSync(out, 'utf8');
  assert.ok(carve.includes('# From Word'));
  assert.ok(carve.includes('/styled/'), carve);
  assert.ok(carve.includes('[link](https://e.com)'));
  assert.ok(carve.includes('- bullet'));
});

test('import: cli -f json needs no pandoc', () => {
  const doc = JSON.stringify({
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{ t: 'Para', c: [{ t: 'Emph', c: [{ t: 'Str', c: 'hi' }] }] }],
  });
  const result = spawnSync(process.execPath, [cli, '-', '-f', 'json'], {
    input: doc,
    encoding: 'utf8',
    env: { ...process.env, PANDOC: '/nonexistent/pandoc' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('/hi/'));
});

test('import: html -> carve', { skip: !pandoc && 'pandoc not found' }, () => {
  const html = '<h1>Web Page</h1><p>Text with <em>em</em>, <strong>strong</strong> and <u>underline</u>.</p>';
  const { carve } = pandocToCarve(pandocToJson('html', html));
  assert.ok(carve.includes('# Web Page'));
  assert.ok(carve.includes('/em/'));
  assert.ok(carve.includes('*strong*'));
  assert.ok(carve.includes('_underline_'), carve);
});
