import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carveToPandoc, carveAstToPandoc, pandocToCarve, pandocToCarveAst, PANDOC_API_VERSION,
} from '../dist/index.js';

const pandocDoc = (blocks) => ({ 'pandoc-api-version': PANDOC_API_VERSION, meta: {}, blocks });
const raw = (format, text) => ({ t: 'RawBlock', c: [format, text] });

test('a raw block reaches Pandoc with its 0.2 payload line feed', () => {
  assert.deepEqual(carveToPandoc('```=html\n<hr class=x>\n```\n').doc.blocks, [raw('html', '<hr class=x>\n')]);
  assert.deepEqual(carveToPandoc('```=latex\n\\clearpage\n```\n').doc.blocks, [raw('latex', '\\clearpage\n')]);
});

test('the tree path preserves every raw payload line feed', () => {
  const { doc } = carveAstToPandoc({ type: 'document', astVersion: '2.0', children: [{ type: 'raw_block', format: 'html', value: 'a\n\n' }] });
  assert.deepEqual(doc.blocks, [raw('html', 'a\n\n')]);
  const bare = carveAstToPandoc({ type: 'document', astVersion: '2.0', children: [{ type: 'raw_block', format: 'html', value: 'a' }] });
  assert.deepEqual(bare.doc.blocks, [raw('html', 'a')]);
});

test('a blank-only raw payload stays exact in both directions', () => {
  const result = carveAstToPandoc({ type: 'document', astVersion: '2.0', children: [{ type: 'raw_block', format: 'html', value: '\n' }] });
  assert.deepEqual(result.doc.blocks, [raw('html', '\n')]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(carveToPandoc(pandocToCarve(result.doc).carve).doc.blocks, [raw('html', '\n')]);
});

test('an imported RawBlock keeps its exact payload in the 0.2 tree', () => {
  const { ast } = pandocToCarveAst(pandocDoc([raw('html', '<hr class=x>')]));
  assert.deepEqual(ast.children, [{ type: 'raw_block', format: 'html', value: '<hr class=x>' }]);
  const commonmark = pandocToCarveAst(pandocDoc([raw('html', '<hr class=x>\n')]));
  assert.equal(commonmark.ast.children[0].value, '<hr class=x>\n');
  const empty = pandocToCarveAst(pandocDoc([raw('html', '')]));
  assert.equal(empty.ast.children[0].value, '');
});

for (const [format, text] of [['html', '<hr class=x>'], ['latex', '\\clearpage'], ['html', 'a\n\nb']]) {
  test(`a ${format} RawBlock stays exact through the tree and reports source loss (${JSON.stringify(text)})`, () => {
    const input = pandocDoc([{ t: 'Para', c: [{ t: 'Str', c: 'Z' }] }, raw(format, text)]);
    const source = pandocToCarve(input);
    assert.ok(source.warnings.some((warning) => warning.includes('field value of a raw_block node')), source.warnings.join(' | '));
    const viaSource = carveToPandoc(source.carve).doc.blocks;
    assert.deepEqual(viaSource[1], raw(format, `${text}\n`));
    const viaAst = carveAstToPandoc(pandocToCarveAst(input).ast).doc.blocks;
    assert.deepEqual(viaAst[1], raw(format, text));
  });
}
