import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();
const firstKvs = (src, options) => carveToPandoc(src, options).doc.blocks[0].c[0][2];

const MARKED = {
  paragraph: '{.c}\nhello\n',
  quote: '{.c}\n> hello\n',
  bullet: '{.c}\n- a\n- b\n',
  ordered: '{.c}\n1. a\n2. b\n',
  description: '{.c}\n:: term\n: definition\n',
  rule: '{.c}\n---\n',
};

test('wrapper marker: off by default', () => {
  for (const src of Object.values(MARKED)) assert.deepEqual(firstKvs(src), [], src);
});

test('wrapper marker: leads the key-values of a Para, BlockQuote, list or rule wrapper', () => {
  for (const [name, src] of Object.entries(MARKED)) {
    assert.deepEqual(firstKvs(src, { wrapperMarker: true }), [['wrapper', '1']], name);
  }
  assert.deepEqual(firstKvs('{#i .c k=v}\nhello\n', { wrapperMarker: true }), [['wrapper', '1'], ['k', 'v']]);
});

test('wrapper marker: a Plain stays unmarked', () => {
  // Pandoc's HTML writer drops the attributes of a marked Plain outright.
  const item = carveToPandoc('- {.c}\n  hello\n- b\n', { wrapperMarker: true }).doc.blocks[0].c[0][0];
  assert.equal(item.t, 'Div');
  assert.equal(item.c[1][0].t, 'Plain');
  assert.deepEqual(item.c[0][2], []);
});

test('wrapper marker: roundtrip turns it on and keeps carve-block last', () => {
  assert.deepEqual(firstKvs('{.c k=v}\nhello\n', { roundtrip: true }), [
    ['wrapper', '1'],
    ['k', 'v'],
    ['carve-block', 'paragraph'],
  ]);
  assert.deepEqual(firstKvs('{.c}\nhello\n', { roundtrip: true, wrapperMarker: false }), [['carve-block', 'paragraph']]);
});

test('wrapper marker: import restores the attributes, an authored wrapper key included', () => {
  for (const src of ['{wrapper=1}\nhello\n', '{wrapper=1}\nhello\n^ cap\n', '{wrapper=1}\n> To be.\n^ Hamlet\n']) {
    assert.equal(pandocToCarve(carveToPandoc(src).doc).carve, src, `${src} by default`);
  }
  for (const options of [{ wrapperMarker: true }, { roundtrip: true }]) {
    for (const [name, src] of Object.entries(MARKED)) {
      assert.equal(pandocToCarve(carveToPandoc(src, options).doc).carve, src, `${name} ${JSON.stringify(options)}`);
    }
    for (const src of ['{wrapper=1}\nhello\n', '{wrapper=1}\n---\n']) {
      assert.equal(pandocToCarve(carveToPandoc(src, options).doc).carve, src, `${src} ${JSON.stringify(options)}`);
    }
  }
});

test('wrapper marker: a captioned quote keeps its attributes', () => {
  const src = '{.c}\n> To be.\n^ Hamlet\n';
  const back = pandocToCarve(carveToPandoc(src, { wrapperMarker: true }).doc).carve;
  assert.equal(carveToHtml(back), carveToHtml(src));
});

test('wrapper marker: pandoc HTML puts the attributes where Carve does', { skip: !pandoc && 'pandoc not found' }, () => {
  const html = (src) => pandocRender(pandoc, carveToPandoc(src, { wrapperMarker: true }).doc, 'html');
  assert.equal(html(MARKED.paragraph).trim(), '<p class="c">hello</p>');
  assert.match(html(MARKED.quote), /^<blockquote class="c">/);
  assert.match(html(MARKED.bullet), /^<ul class="c">/);
});

test('wrapper marker: a Djot round trip through pandoc keeps the attributes', { skip: !pandoc && 'pandoc not found' }, () => {
  for (const [name, src] of Object.entries(MARKED)) {
    const djot = pandocRender(pandoc, carveToPandoc(src, { wrapperMarker: true }).doc, 'djot');
    assert.ok(!djot.includes(':::'), `${name}: the djot writer unwrapped it\n${djot}`);
    const read = spawnSync(pandoc, ['-f', 'djot', '-t', 'json'], { input: djot, encoding: 'utf8' });
    assert.equal(read.status, 0, read.stderr);
    assert.equal(carveToHtml(pandocToCarve(JSON.parse(read.stdout)).carve), carveToHtml(src), name);
  }
});

test('wrapper marker: the CLI flag', () => {
  const cli = new URL('../dist/cli.js', import.meta.url).pathname;
  const run = (...flags) => {
    const r = spawnSync(process.execPath, [cli, '-', '-t', 'json', ...flags], { input: MARKED.paragraph, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout).blocks[0].c[0][2];
  };
  assert.deepEqual(run(), []);
  assert.deepEqual(run('--wrapper-marker'), [['wrapper', '1']]);
});
