import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { carveAstToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();
const text = (value) => ({ type: 'text', value });
const citation = (key, extra = {}) => ({ type: 'citation', key, namespace: 'citation', ...extra });
const group = (children, raw) => ({ type: 'citation_group', children, raw });
const doc = (...children) => ({ type: 'document', astVersion: '2.0', children });
const para = (...children) => ({ type: 'paragraph', children });
const P = (value) => ({ t: 'Str', c: value });
const pRecord = (id, mode = 'NormalCitation', prefix = [], suffix = []) => ({ citationId: id, citationPrefix: prefix, citationSuffix: suffix, citationMode: { t: mode }, citationNoteNum: 1, citationHash: 0 });
const pDoc = (records, content) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [{ t: 'Cite', c: [records, content] }] }] });
const pCite = (out) => out.blocks[0].c[0];
const cGroup = (out) => out.children[0].children[0];
const inlineText = (items) => (items ?? []).map((x) => x.value ?? '').join('');

test('citations: a group reaches Pandoc as a native Cite', () => {
  const ast = doc(para(text('See '), group([
    citation('smith2020', { prefix: [text('see also')], locator: { label: 'page', children: [text('33')] } }),
    citation('jones1999', { mode: 'suppress-author' }),
  ], '[see also @smith2020, p. 33; -@jones1999]')));
  const { doc: out, warnings } = carveAstToPandoc(ast);
  const cite = out.blocks[0].c.find((x) => x.t === 'Cite');
  assert.ok(cite);
  assert.deepEqual(cite.c[0].map((x) => x.citationId), ['smith2020', 'jones1999']);
  assert.deepEqual(cite.c[0].map((x) => x.citationMode.t), ['NormalCitation', 'SuppressAuthor']);
  assert.equal(cite.c[0][0].citationSuffix.map((x) => x.t === 'Space' ? ' ' : x.c).join(''), ', p. 33');
  assert.ok(warnings.some((w) => w.includes('typed locator (page)')), warnings.join(' | '));
});

test('citations: author-in-text marks the item in Pandoc', () => {
  const ast = doc(para(group([citation('doe2021', { mode: 'author-in-text' })], '[+@doe2021]')));
  const out = carveAstToPandoc(ast).doc;
  assert.equal(pCite(out).c[0][0].citationMode.t, 'AuthorInText');
});

test('citations: a typed locator is flattened into the suffix and reported once', () => {
  const ast = doc(para(group([citation('doe2021', { locator: { label: 'chapter', children: [text('4')] } })], '[@doe2021, chap. 4]')));
  const { doc: out, warnings } = carveAstToPandoc(ast);
  assert.equal(warnings.filter((w) => w.includes('typed locator')).length, 1);
  assert.ok(warnings[0].includes('@doe2021') && warnings[0].includes('(chapter)'));
  assert.equal(pCite(out).c[0][0].citationSuffix.map((x) => x.t === 'Space' ? ' ' : x.c).join(''), ', chap. 4');
  const plain = doc(para(group([citation('roe1999')], '[@roe1999]')));
  assert.deepEqual(carveAstToPandoc(plain).warnings, []);
});

test('citations: suppressed and author-in-text items retain separate modes', () => {
  const ast = doc(para(group([citation('a', { mode: 'author-in-text' }), citation('b', { mode: 'suppress-author' })], '[+@a; -@b]')));
  const records = pCite(carveAstToPandoc(ast).doc).c[0];
  assert.deepEqual(records.map((x) => x.citationMode.t), ['AuthorInText', 'SuppressAuthor']);
});

test('citations: a foreign Cite becomes a citation group with items', () => {
  const foreign = pDoc([pRecord('smith2020', 'NormalCitation', [P('see')], [P(','), { t: 'Space' }, P('p.'), { t: 'Space' }, P('12')]), pRecord('jones1999', 'SuppressAuthor')], [P('[see @smith2020, p. 12; -@jones1999]')]);
  const { ast, warnings } = pandocToCarveAst(foreign);
  const cite = cGroup(ast);
  assert.equal(cite.type, 'citation_group');
  assert.deepEqual(cite.children.map((x) => x.key), ['smith2020', 'jones1999']);
  assert.equal(cite.children[1].mode, 'suppress-author');
  assert.equal(inlineText(cite.children[0].prefix), 'see');
  assert.equal(cite.children[0].locator.label, 'page');
  assert.equal(inlineText(cite.children[0].locator.children), '12');
  assert.deepEqual(warnings, []);
});

test('citations: foreign prose Cite content is rebuilt from records', () => {
  const foreign = pDoc([pRecord('smith2020', 'AuthorInText', [], [P(','), { t: 'Space' }, P('p.'), { t: 'Space' }, P('12')])], [P('Smith'), { t: 'Space' }, P('(2020, 12)')]);
  const cite = cGroup(pandocToCarveAst(foreign).ast);
  assert.equal(cite.raw, '[+@smith2020, p. 12]');
  assert.equal(cite.children[0].mode, 'author-in-text');
});

test('citations: mixed Pandoc modes remain on separate items', () => {
  const foreign = pDoc([pRecord('a', 'AuthorInText'), pRecord('b')], []);
  const { ast, warnings } = pandocToCarveAst(foreign);
  assert.deepEqual(cGroup(ast).children.map((x) => x.mode), ['author-in-text', undefined]);
  assert.deepEqual(warnings, []);
});

test('citations: JSON round trip preserves keys, modes, locators, and raw source', () => {
  const original = group([citation('smith2020', { locator: { label: 'page', children: [text('33')] } }), citation('jones1999', { mode: 'suppress-author' })], '[@smith2020, p. 33; -@jones1999]');
  const back = cGroup(pandocToCarveAst(carveAstToPandoc(doc(para(original))).doc).ast);
  assert.deepEqual(back.children.map((x) => [x.key, x.mode]), [['smith2020', undefined], ['jones1999', 'suppress-author']]);
  assert.equal(back.children[0].locator.label, 'page');
  assert.equal(inlineText(back.children[0].locator.children), '33');
  assert.equal(back.raw, original.raw);
});

test('citations: citeproc reads a page locator from the Pandoc suffix', { skip: !pandoc && 'pandoc not found' }, () => {
  const out = carveAstToPandoc(doc(para(text('See '), group([citation('smith2020', { locator: { label: 'page', children: [text('33')] } })], '[@smith2020, p. 33]')))).doc;
  const directory = mkdtempSync(join(tmpdir(), 'pandoc-carve-cite-'));
  const bibliography = join(directory, 'bib.json');
  try {
    writeFileSync(bibliography, JSON.stringify([{ id: 'smith2020', type: 'book', title: 'A Book', author: [{ family: 'Smith', given: 'Jane' }], issued: { 'date-parts': [[2020]] } }]));
    const rendered = pandocRender(pandoc, out, 'plain', ['--citeproc', `--bibliography=${bibliography}`]);
    assert.match(rendered, /\(Smith 2020, 33\)/u);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('citations: Pandoc writers print the stored raw source without citeproc', { skip: !pandoc && 'pandoc not found' }, () => {
  const out = carveAstToPandoc(doc(para(group([citation('smith2020', { locator: { children: [text('p. 33')] } })], '[@smith2020, p. 33]')))).doc;
  const latex = pandocRender(pandoc, out, 'latex');
  assert.ok(latex.includes('@smith2020'), latex);
  assert.ok(latex.includes('p. 33'), latex);
});

test('citations: bracket source that matches the records is recovered verbatim', () => {
  const raw = '[/see/ @smith2020;@jones1999]';
  const foreign = pDoc([pRecord('smith2020'), pRecord('jones1999')], [P(raw)]);
  assert.equal(cGroup(pandocToCarveAst(foreign).ast).raw, raw);
});

test('citations: Pandoc reading an integral marker removes plus from the prefix', { skip: !pandoc && 'pandoc not found' }, () => {
  const foreign = read('[+@smith2020, p. 12]\n');
  const cite = cGroup(pandocToCarveAst(foreign).ast);
  assert.equal(cite.raw, '[+@smith2020, p. 12]');
  assert.equal(cite.children[0].mode, 'author-in-text');
  assert.equal(cite.children[0].prefix, undefined);
  const record = pCite(carveAstToPandoc(pandocToCarveAst(foreign).ast).doc).c[0][0];
  assert.equal(record.citationMode.t, 'AuthorInText');
});

test('citations: an escaped at sign in a prefix is not treated as a key', () => {
  const raw = '[see \\@nobody @smith2020]';
  const foreign = pDoc([pRecord('smith2020', 'NormalCitation', [P('see'), { t: 'Space' }, P('@nobody')])], [P(raw)]);
  const cite = cGroup(pandocToCarveAst(foreign).ast);
  assert.deepEqual(cite.children.map((item) => item.key), ['smith2020']);
  assert.equal(cite.raw, raw);
});

test('citations: Cite content with a stale key is rebuilt', () => {
  const foreign = pDoc([pRecord('renamed')], [P('[@stale]')]);
  const cite = cGroup(pandocToCarveAst(foreign).ast);
  assert.equal(cite.children[0].key, 'renamed');
  assert.equal(cite.raw, '[@renamed]');
});

test('citations: a definition keeps the key that binds it to citations', () => {
  const definition = { type: 'citation_definition', key: 'doe1990', namespace: 'citation', children: [text('Doe, J. 1990.')] };
  const { doc: out, warnings } = carveAstToPandoc(doc(definition));
  assert.equal(out.blocks[0].t, 'RawBlock');
  assert.equal(out.blocks[0].c[0], 'carve-tree');
  assert.equal(pandocToCarveAst(out).ast.children[0].key, 'doe1990');
  assert.ok(warnings.some((w) => w.includes('citation_definition')));
});

test('citations: a definition stays a nonrendering raw carrier, not body prose', () => {
  const definition = { type: 'citation_definition', key: 'doe1990', namespace: 'citation', children: [text('Doe, J. 1990.')] };
  const out = carveAstToPandoc(doc(definition)).doc;
  assert.deepEqual(out.blocks.map((block) => block.t), ['RawBlock']);
  assert.deepEqual(pandocToCarveAst(out).ast.children[0].children, definition.children);
});

test('citations: typed bibliography metadata rides along with a definition', () => {
  const definition = { type: 'citation_definition', key: 'doe1990', namespace: 'citation', children: [text('D.')], metadata: { bibliography: { authors: ['Doe'], issued: '1990' } } };
  const back = pandocToCarveAst(carveAstToPandoc(doc(definition)).doc).ast.children[0];
  assert.deepEqual(back.metadata, definition.metadata);
});

test('citations: a definition is carried once, without a nested wrapper', () => {
  const definition = { type: 'citation_definition', key: 'doe1990', namespace: 'citation', children: [text('D.')] };
  const out = carveAstToPandoc(doc(definition)).doc;
  assert.equal(out.blocks.length, 1);
  assert.equal(out.blocks[0].t, 'RawBlock');
});

test('citations: an empty definition remains an empty definition', () => {
  const definition = { type: 'citation_definition', key: 'bare', namespace: 'citation', children: [] };
  const back = pandocToCarveAst(carveAstToPandoc(doc(definition)).doc).ast.children[0];
  assert.deepEqual(back.children, []);
  assert.equal(back.key, 'bare');
});

const cite = (key) => group([citation(key)], `[@${key}]`);
const ref = (key) => ({ type: 'footnote_ref', key, namespace: 'footnote' });
const note = (key, children = [para(text('f'))]) => ({ type: 'footnote', key, namespace: 'footnote', children });
const noteNums = (value) => [...JSON.stringify(value).matchAll(/"citationNoteNum":(\d+)/gu)].map((match) => Number(match[1]));
const read = (source) => JSON.parse(execFileSync(pandoc, ['-f', 'markdown', '-t', 'json'], { input: source, encoding: 'utf8' }));
for (const [name, source, ast] of [
  ['a citation in running text, before any note', 'a [@x]\n', doc(para(text('a '), cite('x')))],
  ['a citation after one note', 'n[^1]\n\nb [@x]\n\n[^1]: f\n', doc(para(text('n'), ref('1')), para(text('b '), cite('x')), note('1'))],
  ['a citation after two notes', 'n[^1] m[^2]\n\nb [@x]\n\n[^1]: f\n\n[^2]: g\n', doc(para(text('n'), ref('1'), text(' m'), ref('2')), para(text('b '), cite('x')), note('1'), note('2', [para(text('g'))]))],
  ['a citation inside a note', 'p[^1]\n\n[^1]: inside [@x]\n', doc(para(text('p'), ref('1')), note('1', [para(text('inside '), cite('x'))]))],
  ['an inline note, then a citation after it', 'p^[inside [@x]] then [@y]\n', doc(para(text('p'), { type: 'inline_footnote', children: [text('inside '), cite('x')] }, text(' then '), cite('y')))],
]) test(`citations: the note number matches Pandoc's reader - ${name}`, { skip: !pandoc && 'pandoc not found' }, () => {
  assert.deepEqual(noteNums(carveAstToPandoc(ast).doc), noteNums(read(source)));
});

test('citations: a citation retains its note number through Pandoc JSON', { skip: !pandoc && 'pandoc not found' }, () => {
  const original = read('Text [@doe1990] here.\n');
  const back = carveAstToPandoc(pandocToCarveAst(original).ast).doc;
  assert.deepEqual(noteNums(back), noteNums(original));
  const citeNode = back.blocks[0].c.find((node) => node.t === 'Cite');
  assert.deepEqual(citeNode.c[0].map((record) => record.citationId), ['doe1990']);
});
