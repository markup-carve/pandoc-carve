import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { carveToPandoc, carveAstToPandoc, pandocToCarveAst } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

// carve#6788: Pandoc's track-change and comment spans <-> Carve revision keys.
const pandoc = findPandoc();
const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');
const API = [1, 23, 1];
const doc = (inlines) => ({ 'pandoc-api-version': API, meta: {}, blocks: [{ t: 'Para', c: inlines }] });
const str = (s) => ({ t: 'Str', c: s });
const space = { t: 'Space' };
const span = (classes, kvs, xs = []) => ({ t: 'Span', c: [['', classes, kvs], xs] });
const commentStart = (id, xs, author = 'bob@example.org', date = '2026-11-21T09:30:00Z') => span(['comment-start'], [['comment-id', id], ['author', author], ['date', date]], xs);
const commentEnd = (id) => span(['comment-end'], [['comment-id', id]]);
const inlinesOf = (ast) => ast.children[0].children.map(({ pos, ...rest }) => rest);
const repaired = (warnings) => warnings.filter(w => w.startsWith('import-structure-repaired: comment'));

test('revision: insertion and deletion spans become insert and delete with author and datetime', () => {
  const { ast } = pandocToCarveAst(doc([
    span(['deletion'], [['author', 'Ann'], ['date', '2026-11-20T10:00:00Z']], [str('10')]),
    span(['insertion'], [['author', 'Ann'], ['date', '2026-11-20T10:00:00Z']], [str('12')]),
  ]));
  assert.deepEqual(inlinesOf(ast), [
    { type: 'delete', children: [{ type: 'text', value: '10' }], attrs: { keyValues: [['author', 'Ann'], ['datetime', '2026-11-20T10:00:00Z']] } },
    { type: 'insert', children: [{ type: 'text', value: '12' }], attrs: { keyValues: [['author', 'Ann'], ['datetime', '2026-11-20T10:00:00Z']] } },
  ]);
});

test('revision: a point comment becomes an editorial comment with no warning', () => {
  const { ast, warnings } = pandocToCarveAst(doc([str('a'), commentStart('1', [str('check'), space, str('this')]), commentEnd('1'), str('b')]));
  assert.deepEqual(inlinesOf(ast)[1], { type: 'critic_comment', value: 'check this', attrs: { keyValues: [['author', 'bob@example.org'], ['datetime', '2026-11-21T09:30:00Z']] } });
  assert.deepEqual(repaired(warnings), []);
});

test('revision: a ranged comment is written at the range end and the lost range is reported', () => {
  const { ast, warnings } = pandocToCarveAst(doc([commentStart('3', [str('check')]), str('euros'), commentEnd('3'), str('.')]));
  assert.deepEqual(inlinesOf(ast).map(n => n.type), ['text', 'critic_comment', 'text']);
  assert.equal(inlinesOf(ast)[0].value, 'euros');
  assert.deepEqual(repaired(warnings), ['import-structure-repaired: comment 3 covered a range; it is written as a point comment at the range end and the range is lost']);
});

test('revision: a comment range across paragraphs lands at the comment-end', () => {
  const input = { 'pandoc-api-version': API, meta: {}, blocks: [
    { t: 'Para', c: [str('one'), commentStart('7', [str('note')])] },
    { t: 'Para', c: [str('two'), commentEnd('7')] },
  ] };
  const { ast, warnings } = pandocToCarveAst(input);
  assert.deepEqual(ast.children[0].children.map(n => n.type), ['text']);
  assert.deepEqual(ast.children[1].children.map(n => n.type), ['text', 'critic_comment']);
  assert.equal(repaired(warnings).length, 1);
});

test('revision: a ranged comment in a metadata title lands at its comment-end', () => {
  const input = { 'pandoc-api-version': API, meta: { title: { t: 'MetaInlines', c: [commentStart('4', [str('note')]), str('Title'), commentEnd('4')] } }, blocks: [] };
  const { ast, warnings } = pandocToCarveAst(input);
  assert.deepEqual(ast.metadata.title.map(n => n.type), ['text', 'critic_comment']);
  assert.deepEqual(repaired(warnings), ['import-structure-repaired: comment 4 covered a range; it is written as a point comment at the range end and the range is lost']);
});

test('revision: a comment without a comment-end stays at its start and is reported', () => {
  const { ast, warnings } = pandocToCarveAst(doc([str('a'), commentStart('9', [str('lost')]), str('b')]));
  assert.deepEqual(inlinesOf(ast).map(n => n.type), ['text', 'critic_comment', 'text']);
  assert.deepEqual(repaired(warnings), ['import-structure-repaired: comment 9 has no comment-end after it; it is written as a point comment at its start']);
});

test('revision: formatting in a comment body is flattened to text and reported', () => {
  const { ast, warnings } = pandocToCarveAst(doc([commentStart('2', [str('first'), space, { t: 'Strong', c: [str('bold')] }, { t: 'LineBreak' }, str('second')]), commentEnd('2')]));
  assert.equal(inlinesOf(ast)[0].value, 'first bold second');
  assert.deepEqual(repaired(warnings), ['import-structure-repaired: comment 2 formatting is flattened to the text of an editorial comment']);
});

test('revision: insert and delete with revision keys write Pandoc insertion and deletion spans', () => {
  const { doc: out } = carveToPandoc('The fee is {-10-}{author=Ann datetime=2026-11-20T10:00Z}{+12+}{author=Ann datetime=2026-11-20T10:00Z} {+plain+}.\n');
  const spans = out.blocks[0].c.filter(x => x.t === 'Span').map(x => x.c[0]);
  assert.deepEqual(spans, [
    ['', ['deletion'], [['author', 'Ann'], ['date', '2026-11-20T10:00Z']]],
    ['', ['insertion'], [['author', 'Ann'], ['date', '2026-11-20T10:00Z']]],
    ['', ['carve-insert'], []],
  ]);
});

test('revision: an editorial comment with attributes writes a comment-start and comment-end pair', () => {
  const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [
    { type: 'text', value: 'a' },
    { type: 'critic_comment', value: 'check', attrs: { keyValues: [['author', 'bob'], ['datetime', '2026-11-21T09:30Z']] } },
    { type: 'critic_comment', value: 'plain' },
    { type: 'critic_comment', value: 'two  spaces\nand a line', attrs: { keyValues: [['author', 'bob']] } },
  ] }] };
  const { doc: out } = carveAstToPandoc(ast);
  assert.deepEqual(out.blocks[0].c.slice(1), [
    span(['comment-start'], [['comment-id', '0'], ['author', 'bob'], ['date', '2026-11-21T09:30Z']], [str('check')]),
    commentEnd('0'),
    { t: 'RawInline', c: ['carve-critic-comment', 'plain'] },
    span(['comment-start'], [['comment-id', '1'], ['author', 'bob']], [str('two'), space, space, str('spaces'), { t: 'SoftBreak' }, str('and'), space, str('a'), space, str('line')]),
    commentEnd('1'),
  ]);
  const back = pandocToCarveAst(out);
  assert.deepEqual(inlinesOf(back.ast), ast.children[0].children);
  assert.deepEqual(repaired(back.warnings), []);
});

function writeDocx(dir, input) {
  const docx = join(dir, 'rev.docx');
  const gen = spawnSync(pandoc, ['-f', 'json', '-t', 'docx', '-o', docx], { input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(gen.status, 0, gen.stderr);
  return docx;
}

test('revision: a real DOCX with track changes and comments imports with revision keys', { skip: !pandoc && 'pandoc not found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-rev-'));
  const docx = writeDocx(dir, doc([
    str('The'), space, str('fee'), space, str('is'), space,
    span(['deletion'], [['author', 'Ann'], ['date', '2026-11-20T10:00:00Z']], [str('10')]),
    span(['insertion'], [['author', 'Ann'], ['date', '2026-11-20T10:00:00Z']], [str('12')]),
    space, commentStart('0', [str('check'), space, str('with'), space, str('finance')]), str('euros'), commentEnd('0'), str('.'),
    space, commentStart('1', [str('point')], 'Cy', '2026-11-22T08:00:00Z'), commentEnd('1'),
  ]));
  const out = join(dir, 'out.crv');
  const result = spawnSync(process.execPath, [cli, docx, '-f', 'docx', '-o', out, '--', '--track-changes=all'], { encoding: 'utf8', env: { ...process.env, PANDOC: pandoc } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(out, 'utf8'), 'The fee is {-10-}{author=Ann datetime=2026-11-20T10:00:00Z}{+12+}{author=Ann datetime=2026-11-20T10:00:00Z} euros{#check with finance#}{author=bob@example.org datetime=2026-11-21T09:30:00Z}\\. {#point#}{author=Cy datetime=2026-11-22T08:00:00Z}\n');
  assert.match(result.stderr, /comment 0 covered a range/u);
  assert.doesNotMatch(result.stderr, /comment 1 /u);
});

test('revision: Carve revision keys survive a real DOCX round trip', { skip: !pandoc && 'pandoc not found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-rev-'));
  const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [
    { type: 'text', value: 'The fee is ' },
    { type: 'delete', children: [{ type: 'text', value: '10' }], attrs: { keyValues: [['author', 'Ann'], ['datetime', '2026-11-20T10:00:00Z']] } },
    { type: 'insert', children: [{ type: 'text', value: '12' }], attrs: { keyValues: [['author', 'Ann'], ['datetime', '2026-11-20T10:00:00Z']] } },
    { type: 'text', value: ' euros.' },
    { type: 'critic_comment', value: 'check with finance', attrs: { keyValues: [['author', 'bob@example.org'], ['datetime', '2026-11-21T09:30:00Z']] } },
  ] }] };
  const docx = writeDocx(dir, carveAstToPandoc(ast).doc);
  const json = spawnSync(pandoc, ['-f', 'docx', '--track-changes=all', '-t', 'json', docx], { encoding: 'utf8' });
  assert.equal(json.status, 0, json.stderr);
  const back = pandocToCarveAst(json.stdout);
  const marked = (xs) => xs.filter(n => n.type !== 'text');
  assert.deepEqual(marked(inlinesOf(back.ast)), marked(ast.children[0].children));
  assert.deepEqual(repaired(back.warnings), []);
});
