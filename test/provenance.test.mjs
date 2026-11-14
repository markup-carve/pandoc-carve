import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

const stripDocumentEphemera = (value) => {
  if (Array.isArray(value)) return value.map(stripDocumentEphemera);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'pos' && key !== 'srcByteLength' && key !== 'stages')
    .map(([key, child]) => [key, stripDocumentEphemera(child)]));
};

test('roundtrip provenance preserves adjacent inline and block comments exactly', () => {
  const source = 'before %% one\n%% two\n\n%%%\n多行\ncomment\n%%%\n';
  const original = carveToCarveAst(source);
  const converted = carveToPandoc(source, { roundtrip: true });
  assert.deepEqual(converted.warnings, []);
  assert.deepEqual(stripDocumentEphemera(pandocToCarveAst(converted.doc).ast), stripDocumentEphemera(original));
});

test('normal mode carries comments as typed Pandoc raw inlines', () => {
  const result = carveToPandoc('visible %% secret\n');
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.doc.blocks[0].c.at(-1), { t: 'RawInline', c: ['carve-comment-line', 'secret'] });
  assert.equal(pandocToCarveAst(result.doc).ast.children[0].children.at(-1).type, 'comment');
});

test('known nodes use native Pandoc nodes without a private provenance carrier', () => {
  const result = carveAstToPandoc({ type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'known' }] }] });
  assert.deepEqual(result.doc.blocks, [{ t: 'Para', c: [{ t: 'Str', c: 'known' }] }]);
});

test('malformed private data falls back to its visible content', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [{ t: 'Span', c: [['', ['carve-provenance'], [['data-carve-provenance', 'not-json']]], [{ t: 'Str', c: 'safe' }]] }] }],
  };
  const result = pandocToCarveAst(doc);
  assert.equal(result.ast.children[0].children[0].type, 'span');
  assert.equal(result.ast.children[0].children[0].children[0].value, 'safe');
});

test('citation groups retain typed fields and item order through Pandoc JSON', () => {
  const original = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [
    { type: 'text', value: 'See ' },
    { type: 'citation_group', raw: '[-@doe, chap. 2; +@roe, pp. 7–9]', children: [
      { type: 'citation', namespace: 'citation', key: 'doe', mode: 'suppress-author', locator: { label: 'chapter', children: [{ type: 'text', value: '2' }] } },
      { type: 'citation', namespace: 'citation', key: 'roe', mode: 'author-in-text', locator: { label: 'pages', children: [{ type: 'text', value: '7–9' }] } },
    ] },
  ] }] };
  const converted = carveAstToPandoc(original);
  assert.ok(JSON.stringify(converted.doc).includes('"Cite"'), 'the native Cite remains available to citeproc');
  const imported = pandocToCarveAst(converted.doc).ast.children[0].children.find((node) => node.type === 'citation_group');
  assert.equal(imported.type, 'citation_group');
  assert.deepEqual(imported.children.map((citation) => [citation.key, citation.mode, citation.locator.label]),
    [['doe', 'suppress-author', 'chapter'], ['roe', 'author-in-text', 'pages']]);
});
