import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { carveToPandoc, pandocToCarve, carveToPandoc as exportCarve } from '../dist/index.js';

const root = resolve(import.meta.dirname, '..');
const examples = join(root, 'examples');
const pandoc = (args, input) => execFileSync('pandoc', args, { input, maxBuffer: 32 * 1024 * 1024 });
const content = (value) => {
  if (Array.isArray(value)) return value.map(content).join(' ');
  if (!value || typeof value !== 'object') return '';
  if (value.t === 'Str') return String(value.c);
  if (value.t === 'Code' || value.t === 'CodeBlock' || value.t === 'Math') return String(value.c?.[1] ?? '');
  if (value.t === 'Image') return content(value.c?.[1]);
  if (value.t === 'Link') return content(value.c?.[1]);
  return content(value.c ?? value.blocks ?? []);
};
const hasNode = (value, type) => {
  if (Array.isArray(value)) return value.some(x => hasNode(x, type));
  if (!value || typeof value !== 'object') return false;
  return value.t === type || Object.values(value).some(x => hasNode(x, type));
};

for (const [name, phrases, expected] of [
  ['article', ['Introduction', 'First item', 'Ordered one'], 'Header'],
  ['interactive', ['Interactive constructs', 'hidden', 'graph TD'], 'Header'],
  ['spans', ['Table spans', 'North', 'South'], 'Table'],
]) {
  for (const format of ['latex', 'typst', 'docx', 'html', 'epub']) {
    test(`export ${name} through ${format} and read the file back`, () => {
      const source = readFileSync(join(examples, 'export', `${name}.crv`), 'utf8');
      const doc = carveToPandoc(source).doc;
      const temp = mkdtempSync(join(tmpdir(), 'pandoc-carve-e2e-'));
      try {
        const file = join(temp, `out.${format}`);
        pandoc(['-f', 'json', '-t', format, '--resource-path', join(examples, 'export'), '-o', file], JSON.stringify(doc));
        const back = JSON.parse(pandoc(['-f', format, '-t', 'json', file]).toString());
        const text = content(back.blocks).replace(/\s+/g, ' ');
        const readablePhrases = format === 'latex' ? phrases.filter(phrase => phrase !== 'graph TD' && phrase !== 'South') : phrases;
        for (const phrase of readablePhrases) assert.ok(text.includes(phrase), `${name}/${format}: missing ${phrase}: ${text.slice(0, 300)}`);
        assert.ok(hasNode(back.blocks, format === 'latex' && name === 'spans' ? 'Div' : expected), `${name}/${format}: missing ${expected}`);
        if (format === 'latex' && name === 'interactive') assert.match(readFileSync(file, 'utf8'), /graph/);
        if (format === 'latex' && name === 'spans') assert.match(readFileSync(file, 'utf8'), /South/);
      } finally { rmSync(temp, { recursive: true, force: true }); }
    });
  }
}
for (const [name, format, phrases] of [
  ['paper.tex', 'latex', ['Import from LaTeX', 'First bullet', 'inline formula']],
  ['notes.rst', 'rst', ['Import from reStructuredText', 'A bullet', 'closing paragraph']],
]) {
  test(`import ${name} through Pandoc and export the result`, () => {
    const input = readFileSync(join(examples, 'import', name));
    const doc = JSON.parse(pandoc(['-f', format, '-t', 'json'], input).toString());
    const carve = pandocToCarve(doc).carve;
    const returned = exportCarve(carve).doc;
    const text = content(returned.blocks).replace(/\s+/g, ' ');
    for (const phrase of phrases) assert.ok(text.includes(phrase), `${name}: missing ${phrase}: ${text.slice(0, 300)}`);
    assert.ok(hasNode(returned.blocks, 'Header'));
  });
}
test('import DOCX from the repository report seed', () => {
  const source = readFileSync(join(examples, 'import', 'report.md'));
  const file = join(mkdtempSync(join(tmpdir(), 'pandoc-carve-docx-')), 'report.docx');
  try {
    pandoc(['-f', 'markdown', '-t', 'docx', '-o', file], source);
    const doc = JSON.parse(pandoc(['-f', 'docx', '-t', 'json', file]).toString());
    const returned = exportCarve(pandocToCarve(doc).carve).doc;
    assert.ok(content(returned.blocks).includes('Report'));
    assert.ok(hasNode(returned.blocks, 'Header'));
  } finally { rmSync(resolve(file, '..'), { recursive: true, force: true }); }
});
