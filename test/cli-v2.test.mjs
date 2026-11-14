import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'dist/cli-v2.js');
const run = (args, input) => execFileSync(process.execPath, [cli, ...args], { input, encoding: 'utf8' });

test('0.2 CLI exports a real LaTeX file to stdout', () => {
  const output = run([join(root, 'examples/export/article.crv'), '-t', 'latex']);
  assert.match(output, /\\section\{Introduction\}/);
  assert.match(output, /First item/);
});
test('0.2 CLI imports LaTeX through Pandoc', () => {
  const output = run([join(root, 'examples/import/paper.tex'), '-f', 'latex']);
  assert.match(output, /Import from LaTeX/);
  assert.match(output, /First bullet/);
});
test('0.2 CLI accepts Pandoc JSON on stdin', () => {
  const json = run([join(root, 'examples/export/article.crv')]);
  const output = run(['-f', 'json'], json);
  assert.match(output, /Introduction/);
});
