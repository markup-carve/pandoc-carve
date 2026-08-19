import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

const stripDocumentEphemera = (value) => {
  if (Array.isArray(value)) return value.map(stripDocumentEphemera);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'pos' && key !== 'srcByteLength')
    .map(([key, child]) => [key, stripDocumentEphemera(child)]));
};

test('roundtrip provenance preserves adjacent inline and block comments exactly', () => {
  const source = 'before %% one\n%% two\n\n%%%\n多行\ncomment\n%%%\n';
  const original = carveToCarveAst(source);
  const converted = carveToPandoc(source, { roundtrip: true });
  assert.deepEqual(converted.warnings, []);
  assert.deepEqual(stripDocumentEphemera(pandocToCarveAst(converted.doc).ast), stripDocumentEphemera(original));
});

test('normal mode still drops comments and reports a stable diagnostic', () => {
  const result = carveToPandoc('visible %% secret\n');
  assert.equal(result.diagnostics[0].code, 'comment-dropped');
  assert.equal(result.diagnostics[0].severity, 'lossy');
  assert.equal(result.diagnostics[0].sourceLocation.startLine, 1);
  assert.deepEqual(result.warnings, result.diagnostics.map(({ message }) => message));
});

test('unknown inline and block nodes survive as versioned opaque data', () => {
  const ast = {
    type: 'document',
    children: [
      { type: 'future_block', feature: { version: 2 }, children: [{ type: 'paragraph', children: [{ type: 'text', value: 'block fallback' }] }] },
      { type: 'paragraph', children: [{ type: 'future_inline', token: '雪', children: [{ type: 'text', value: 'inline fallback' }] }] },
    ],
  };
  const result = carveAstToPandoc(ast, { roundtrip: true });
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(stripDocumentEphemera(pandocToCarveAst(result.doc).ast), ast);
});

test('normal unknown nodes remain readable and diagnosed', () => {
  const result = carveAstToPandoc({ type: 'document', children: [{ type: 'future_block', value: 'read me' }] });
  assert.equal(result.doc.blocks[0].t, 'Para');
  assert.equal(result.diagnostics[0].code, 'unknown-carve-block');
});

test('known nodes never use the opaque path', () => {
  const result = carveAstToPandoc({ type: 'document', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'known' }] }] }, { roundtrip: true });
  assert.ok(!JSON.stringify(result.doc).includes('carve-provenance'));
});

test('malformed private data falls back to its visible content', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [{ t: 'Span', c: [['', ['carve-provenance'], [['data-carve-provenance', 'not-json']]], [{ t: 'Str', c: 'safe' }]] }] }],
  };
  const result = pandocToCarveAst(doc);
  assert.equal(result.ast.children[0].children[0].type, 'span');
  assert.equal(result.ast.children[0].children[0].children[0].value, 'safe');
});

test('roundtrip citation provenance retains typed fields and item order', () => {
  const source = 'See [before -@doe, chapter 2; +@roe, pp. 7–9 after].\n';
  const original = carveToCarveAst(source);
  const converted = carveToPandoc(source, { roundtrip: true });
  assert.ok(JSON.stringify(converted.doc).includes('"Cite"'), 'the native Cite remains available to citeproc');
  assert.ok(!converted.diagnostics.some(({ code }) => code === 'citation-locator-flattened'));
  assert.deepEqual(stripDocumentEphemera(pandocToCarveAst(converted.doc).ast), stripDocumentEphemera(original));
});

test('every emitted warning has a structured counterpart', () => {
  const forward = carveAstToPandoc({ type: 'document', children: [{ type: 'future_block', value: 'x' }] });
  assert.deepEqual(forward.warnings, forward.diagnostics.map(({ message }) => message));
  assert.ok(forward.diagnostics.every(({ code, direction, severity }) => code && direction && severity));
});
