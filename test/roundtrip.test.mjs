import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();

test('raw spans are target-routed by pandoc writers', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = 'A `<b>H</b>`{=html} B `\\textbf{L}`{=latex} C `#strong[T]`{=typst} D';
  const { doc } = carveToPandoc(src);

  const html = pandocRender(pandoc, doc, 'html');
  assert.ok(html.includes('<b>H</b>'), 'html raw fires in html');
  assert.ok(!html.includes('textbf'), 'latex raw dropped in html');
  assert.ok(!html.includes('strong[T]'), 'typst raw dropped in html');

  const latex = pandocRender(pandoc, doc, 'latex');
  assert.ok(latex.includes('\\textbf{L}'), 'latex raw fires in latex');
  assert.ok(!latex.includes('<b>'), 'html raw dropped in latex');

  const typst = pandocRender(pandoc, doc, 'typst');
  assert.ok(typst.includes('#strong[T]'), 'typst raw fires in typst');
  assert.ok(!typst.includes('textbf'), 'latex raw dropped in typst');
});

test('emphasis divergence is bridged (unlike pandoc -f djot)', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = '/italic/ and *bold* and _underline_ and ~strike~';
  const { doc } = carveToPandoc(src);

  const latex = pandocRender(pandoc, doc, 'latex');
  assert.ok(latex.includes('\\emph{italic}'), 'carve italic -> emph');
  assert.ok(latex.includes('\\textbf{bold}'), 'carve bold -> textbf');
  assert.ok(latex.includes('\\ul{underline}') || latex.includes('\\underline{underline}'), 'underline preserved');
  assert.ok(latex.includes('\\st{strike}') || latex.includes('\\sout{strike}'), 'strike preserved');

  const html = pandocRender(pandoc, doc, 'html');
  assert.ok(html.includes('<em>italic</em>'));
  assert.ok(html.includes('<strong>bold</strong>'));
  assert.ok(html.includes('<u>underline</u>'), 'underline as <u>, NOT <em>');
});

test('math, footnotes, tables, figures survive to latex', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = [
    'Inline $`e=mc^2` math.',
    '',
    'A note[^n] here.',
    '',
    '[^n]: note body',
    '',
    '|= L |=> R |',
    '| a  |  b |',
    '^ Table 1: numbers',
    '',
    '![alt](img.png)',
    '^ Figure 1: pic',
  ].join('\n');
  const { doc, warnings } = carveToPandoc(src);
  assert.deepEqual(warnings, []);

  const latex = pandocRender(pandoc, doc, 'latex');
  assert.ok(latex.includes('\\(e=mc^2\\)'), 'inline math');
  assert.ok(latex.includes('\\footnote{note body}'), 'footnote');
  assert.ok(latex.includes('longtable') || latex.includes('tabular'), 'table environment');
  assert.ok(latex.includes('Table 1: numbers'), 'table caption');
  assert.ok(latex.includes('\\includegraphics') && latex.includes('img.png'), 'image');
  assert.ok(latex.includes('Figure 1: pic'), 'figure caption');
});

test('typst output covers the same core', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = '# Title\n\n/em/ and *strong*, x{^2^}.\n\n- a\n- b';
  const { doc } = carveToPandoc(src);
  const typst = pandocRender(pandoc, doc, 'typst');
  assert.ok(typst.includes('= Title'));
  assert.ok(typst.includes('#emph[em]'));
  assert.ok(typst.includes('#strong[strong]'));
  assert.ok(typst.includes('#super[2]'));
});

test('docx binary output is producible', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveToPandoc('# T\n\nSome /styled/ text.');
  const out = pandocRender(pandoc, doc, 'docx', ['-o', '-']);
  assert.ok(out.length > 1000, 'docx bytes produced');
  assert.ok(out.startsWith('PK'), 'zip container magic');
});

test('meta title reaches standalone output', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveToPandoc('---\ntitle: The Title\nauthor: Jane Doe\n---\nBody.');
  const latex = pandocRender(pandoc, doc, 'latex', ['-s']);
  assert.ok(latex.includes('\\title{The Title}'));
  assert.ok(latex.includes('\\author{Jane Doe}'));
});
