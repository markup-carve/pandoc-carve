import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

const document = children => ({ type: 'document', astVersion: '2.0', children });
const paragraph = children => ({ type: 'paragraph', children });
const text = value => ({ type: 'text', value });
const inlineText = nodes => nodes.map(node => Array.isArray(node) ? inlineText(node) : node.t === 'Str' ? node.c : node.t === 'Space' ? ' ' : node.t === 'Span' ? inlineText(node.c[1]) : Array.isArray(node.c) ? inlineText(node.c) : '').join('');
const captionText = block => inlineText(block.c[1][1].flatMap(part => part.c ?? []));
const crossref = result => result.doc.blocks.flatMap(block => block.t === 'Para' ? block.c : []).find(node => node.t === 'Link');

test('smart punctuation exports its resolved glyph', () => {
  const ast = document([paragraph([
    { type: 'smart_punctuation', kind: 'em_dash', source: '---', glyph: '—' },
    { type: 'smart_punctuation', kind: 'ellipsis', source: '...', glyph: '…' },
    { type: 'smart_punctuation', kind: 'left_double_quote', source: '"', glyph: '“' },
  ])]);
  const result = carveAstToPandoc(ast);
  assert.equal(inlineText(result.doc.blocks[0].c), '—…“');
  assert.deepEqual(result.warnings, []);
});

test('escaped punctuation survives as ordinary text', () => {
  const result = carveToPandoc('\\-');
  assert.deepEqual(result.doc.blocks[0].c, [{ t: 'Str', c: '-' }]);
  assert.deepEqual(result.warnings, []);
});

test('line block maps to Pandoc LineBlock', () => {
  const block = carveToPandoc('::: |\nRoses are red,\nViolets are blue.\n:::').doc.blocks[0];
  assert.equal(block.t, 'LineBlock');
  assert.equal(block.c.length, 2);
});

test('smart punctuation and escaped text produce no warning', () => {
  assert.deepEqual(carveToPandoc('a --- b and \\*').warnings, []);
});

test('cyclic heading crossref resolves one level', () => {
  const result = carveToPandoc('# A </#A>');
  const link = result.doc.blocks[0].c[2].find(node => node.t === 'Link');
  assert.equal(link.t, 'Link');
  assert.deepEqual(link.c[1], [{ t: 'Str', c: 'A' }]);
  assert.deepEqual(result.warnings, []);
});

test('caption number is substituted per label', () => {
  const result = carveToPandoc('![a](1.png)\n^ Figure #: one\n\n![b](2.png)\n^ Listing #: two\n\n' +
    '![c](3.png)\n^ *Figure* #: three\n\n![d](4.png)\n^ Supplementary Figure #: four\n\n' +
    '|=H|\n|x|\n^ Table #: t');
  assert.deepEqual(result.doc.blocks.map(captionText), [
    'Figure 1: one', 'Listing 1: two', 'Figure 2: three', 'Supplementary Figure 1: four', 'Table 1: t',
  ]);
});

test('numbered figure crossref uses its caption number', () => {
  const result = carveToPandoc('{#fig-sun}\n![s](s.png)\n^ Figure #: sun\n\nSee </#fig-sun>.');
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(crossref(result).c[1], [{ t: 'Str', c: 'Figure' }, { t: 'Space' }, { t: 'Str', c: '1' }]);
  assert.equal(crossref(result).c[2][0], '#fig-sun');
});

test('forward figure crossref uses its caption number', () => {
  const result = carveToPandoc('See </#fig-sun>.\n\n{#fig-sun}\n![s](s.png)\n^ Figure #: sun');
  assert.deepEqual(result.warnings, []);
  assert.equal(inlineText(crossref(result).c[1]), 'Figure 1');
});

test('numbered table crossref uses its caption number', () => {
  const result = carveToPandoc('{#tbl-x}\n|=H|\n|x|\n^ Table #: t\n\nSee </#tbl-x>.');
  assert.deepEqual(result.warnings, []);
  assert.equal(inlineText(crossref(result).c[1]), 'Table 1');
});

test('unidentified figures still advance caption numbering for later crossrefs', () => {
  const result = carveToPandoc('![a](1.png)\n^ Figure #: one\n\n{#fig-b}\n![b](2.png)\n^ Listing #: two\n\n' +
    '{#fig-c}\n![c](3.png)\n^ Figure #: three\n\nSee </#fig-b> and </#fig-c>.');
  const links = result.doc.blocks.at(-1).c.filter(node => node.t === 'Link');
  assert.deepEqual(links.map(link => inlineText(link.c[1])), ['Listing 1', 'Figure 2']);
});

test('captioned quote is a Figure around a BlockQuote', () => {
  const result = carveToPandoc('> To be\n^ Hamlet');
  assert.equal(result.doc.blocks[0].t, 'Figure');
  assert.equal(result.doc.blocks[0].c[2][0].t, 'BlockQuote');
  assert.equal(captionText(result.doc.blocks[0]), 'Hamlet');
  assert.equal(carveToPandoc('> To be').doc.blocks[0].t, 'BlockQuote');
});

test('quote figure keeps its short caption', () => {
  const ast = document([{ type: 'figure', children: [{ type: 'block_quote', children: [paragraph([text('q')])] }],
    caption: { type: 'caption', children: [paragraph([text('Author')])], short: [text('short')] } }]);
  const result = carveAstToPandoc(ast);
  assert.deepEqual(result.doc.blocks[0].c[1][0], [{ t: 'Str', c: 'short' }]);
});

test('quote figure and inner quote keep separate attributes', () => {
  const ast = document([{ type: 'figure', attrs: { id: 'outer', classes: ['fancy'], keyValues: [['b', '3']] },
    children: [{ type: 'block_quote', attrs: { id: 'inner', classes: ['kept'], keyValues: [['a', '1']] }, children: [paragraph([text('q')])] }],
    caption: { type: 'caption', children: [paragraph([text('Author')])] } }]);
  const [figure] = carveAstToPandoc(ast).doc.blocks;
  assert.equal(figure.c[0][0], 'outer');
  assert.deepEqual(figure.c[0][1], ['fancy']);
  assert.deepEqual(figure.c[0][2].filter(([key]) => key !== 'carve-caption'), [['b', '3']]);
  assert.ok(figure.c[0][2].some(([key]) => key === 'carve-caption'));
  assert.deepEqual(figure.c[2][0].c[0], ['inner', ['carve-block-quote', 'kept'], [['a', '1']]]);
});

test('ruby fallback shows base text and annotation', () => {
  const ast = document([paragraph([{ type: 'ruby', pairs: [
    { type: 'ruby_pair', base: [text('漢')], annotation: [text('かん')] },
    { type: 'ruby_pair', base: [text('字')], annotation: [] },
  ] }])]);
  const result = carveAstToPandoc(ast);
  const carrier = result.doc.blocks[0].c[0];
  assert.equal(inlineText(carrier.c[1]), '漢(かん)字()');
  assert.ok(result.warnings.some(warning => warning.includes('ruby')));
  assert.equal(pandocToCarveAst(result.doc).ast.children[0].children[0].type, 'ruby');
});

test('ruby attributes wrap the flattened fallback', () => {
  const ast = document([paragraph([{ type: 'ruby', pairs: [{ type: 'ruby_pair', base: [text('a')], annotation: [text('b')] }], attrs: { id: 'r', classes: ['k'] } }])]);
  const [carrier] = carveAstToPandoc(ast).doc.blocks[0].c;
  assert.equal(carrier.t, 'Span');
  assert.deepEqual(carrier.c[0].slice(0, 2), ['r', ['carve-ruby', 'k']]);
  assert.equal(inlineText(carrier.c[1]), 'a(b)');
});

test('unknown block extension exposes its declared fallback', () => {
  const ast = { ...document([{ type: 'block_extension', name: 'org.example.diagram', version: '1', children: [],
    fallback: [{ type: 'code_block', value: 'graph TD;', syntax: 'mermaid' }] }]),
    extensions: [{ name: 'org.example.diagram', required: false, version: '1' }] };
  const result = carveAstToPandoc(ast);
  assert.equal(result.doc.blocks[0].t, 'Div');
  assert.equal(result.doc.blocks[0].c[1][0].t, 'CodeBlock');
  assert.equal(result.doc.blocks[0].c[1][0].c[1], 'graph TD;');
  assert.ok(result.warnings.some(warning => warning.includes('fallback')));
});

test('table continuation joins fragments with one Space', () => {
  const result = carveToPandoc('| a | x |\n+ b | y |');
  const cell = result.doc.blocks[0].c[4][0][3][0][1][0][4];
  assert.deepEqual(cell, [{ t: 'Plain', c: [{ t: 'Str', c: 'a' }, { t: 'Space' }, { t: 'Str', c: 'b' }] }]);
  assert.deepEqual(result.warnings, []);
});
