import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, treesEqual, validateTree } from '../vendor/carve-v2/index.js';
import { carveToPandoc, carveAstToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import * as P from '../dist/pandoc.js';

const doc = blocks => ({ 'pandoc-api-version': [...P.PANDOC_API_VERSION], meta: {}, blocks });
const firstInline = source => carveToPandoc(source).doc.blocks[0].c[0];

test('0.2 heading exports as a Pandoc Header', () => {
  const result = carveToPandoc('# Title');
  assert.equal(result.doc.blocks[0].t, 'Header');
  assert.equal(result.doc.blocks[0].c[1][0], 'Title');
});
test('generated heading ID survives a JSON round trip as generated', () => {
  const source = '# Title';
  const initial = parse(source);
  const result = pandocToCarve(carveAstToPandoc(initial).doc);
  assert.ok(treesEqual(initial, parse(result.carve)));
});
test('0.2 braced underline exports as Underline', () => assert.equal(firstInline('{_x_}').t, 'Underline'));
test('0.2 braced strike exports as Strikeout', () => assert.equal(firstInline('{~x~}').t, 'Strikeout'));
test('0.2 braced highlight exports as a marked Span', () => {
  const inline = firstInline('{=x=}');
  assert.equal(inline.t, 'Span'); assert.ok(inline.c[0][1].includes('mark'));
});
test('0.2 three-star break exports as HorizontalRule', () => assert.equal(carveToPandoc('***').doc.blocks[0].t, 'HorizontalRule'));
test('a hyphen run in a paragraph remains inline punctuation', () => assert.equal(carveToPandoc('a --- b').doc.blocks[0].t, 'Para'));
test('smart punctuation survives a JSON round trip', () => {
  const initial = parse('a --- b');
  assert.ok(treesEqual(initial, parse(pandocToCarve(carveAstToPandoc(initial).doc).carve)));
});
test('tilde fences are plain paragraph content in 0.2', () => assert.equal(carveToPandoc('~~~\nx\n~~~').doc.blocks[0].t, 'Para'));
test('the code fence keeps its payload newline in Pandoc JSON', () => {
  const block = carveToPandoc('```js\na\n```').doc.blocks[0];
  assert.equal(block.t, 'CodeBlock'); assert.equal(block.c[1], 'a\n');
});
test('direct links and autolinks export to Pandoc links', () => {
  assert.equal(firstInline('[x](/u)').t, 'Link');
  assert.equal(firstInline('<https://x.org>').t, 'Link');
});
test('a blocked URL scheme is blanked at the Pandoc sink', () => {
  const result = carveToPandoc('[bad](java\u202ascript:alert(1))');
  assert.equal(result.doc.blocks[0].c[0].c[2][0], '');
  assert.match(result.warnings.join('\n'), /destination-denied/);
});
test('Pandoc JSON import builds a valid 0.2 tree', () => {
  const { ast } = pandocToCarveAst(doc([P.Para([P.Str('one'), P.Space, P.Str('two')])]));
  validateTree(ast);
  assert.equal(ast.astVersion, '2.0');
});
test('Pandoc JSON import uses the 0.2 writer', () => {
  assert.match(pandocToCarve(doc([P.Para([P.Str('one')])])).carve, /one/);
});
test('Pandoc figure short caption is preserved in the tree and reported by writer', () => {
  const figure = P.Figure(P.emptyAttr, [P.Str('Long')], [P.Para([P.Str('body')])], [P.Str('Short')]);
  const { ast } = pandocToCarveAst(doc([figure]));
  assert.equal(ast.children[0].caption.short[0].value, 'Short');
  assert.match(pandocToCarve(doc([figure])).warnings.join('\n'), /short|unspellable/i);
});
test('a Pandoc table with a simple cell can be imported', () => {
  const table = P.Table(P.emptyAttr, null, ['AlignLeft'], [], [{ bodyRows: [P.row([P.cell([P.Para([P.Str('x')])])])] }]);
  const { ast } = pandocToCarveAst(doc([table]));
  assert.equal(ast.children[0].children[0].children[0].children[0].children[0].type, 'cell_paragraph');
});
test('an unspellable Pandoc table cell reports a writer loss', () => {
  const table = P.Table(P.emptyAttr, null, ['AlignLeft'], [], [{ bodyRows: [P.row([P.cell([P.Para([P.Str('a')]), P.Para([P.Str('b')])])])] }]);
  assert.match(pandocToCarve(doc([table])).warnings.join('\n'), /unspellable/);
});
test('the parser currently splits adjacent task and plain items', () => {
  const ast = parse('- [x] done\n- plain');
  assert.equal(ast.children.length, 2);
});
for (const [name, source] of [
  ['plain list', '- one\n- two'],
  ['heading and direct link', '# H\n\n[x](/u)'],
  ['link reference definition', '[r]: /u\n\n[x][r]'],
  ['frontmatter', '---\ntitle: T\n---\n\nText.'],
]) test(`${name} preserves tree equality through Pandoc JSON`, () => {
  const original = parse(source);
  const exported = carveAstToPandoc(original);
  const imported = pandocToCarve(exported.doc);
  assert.ok(treesEqual(original, parse(imported.carve)), imported.warnings.join('\n'));
});
