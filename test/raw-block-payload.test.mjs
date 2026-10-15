import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carveToPandoc, carveAstToPandoc, pandocToCarve, pandocToCarveAst, PANDOC_API_VERSION,
} from '../dist/index.js';

const pandocDoc = (blocks) => ({ 'pandoc-api-version': PANDOC_API_VERSION, meta: {}, blocks });
const raw = (format, text) => ({ t: 'RawBlock', c: [format, text] });

test('a raw block reaches pandoc without the final line feed Carve publishes', () => {
  assert.deepEqual(carveToPandoc('```=html\n<hr class=x>\n```\n').doc.blocks, [raw('html', '<hr class=x>')]);
  assert.deepEqual(carveToPandoc('```=latex\n\\clearpage\n```\n').doc.blocks, [raw('latex', '\\clearpage')]);
});

test('only one line feed is dropped', () => {
  const { doc } = carveAstToPandoc({ type: 'document', children: [{ type: 'raw_block', format: 'html', content: 'a\n\n' }] });
  assert.deepEqual(doc.blocks, [raw('html', 'a\n')]);
  const bare = carveAstToPandoc({ type: 'document', children: [{ type: 'raw_block', format: 'html', content: 'a' }] });
  assert.deepEqual(bare.doc.blocks, [raw('html', 'a')]);
});

test('a blank-only raw payload is reported as unspellable', () => {
  const result = carveAstToPandoc({ type: 'document', children: [{ type: 'raw_block', format: 'html', content: '\n' }] });
  assert.deepEqual(result.doc.blocks, [raw('html', '')]);
  assert.deepEqual(result.diagnostics.map((d) => d.code), ['field-unspellable']);
});

test('an imported RawBlock gets the final line feed a parsed fence carries', () => {
  const { ast } = pandocToCarveAst(pandocDoc([raw('html', '<hr class=x>')]));
  assert.deepEqual(ast.children, [{ type: 'raw_block', format: 'html', content: '<hr class=x>\n' }]);
  const commonmark = pandocToCarveAst(pandocDoc([raw('html', '<hr class=x>\n')]));
  assert.equal(commonmark.ast.children[0].content, '<hr class=x>\n', 'a reader that keeps the break gets no second one');
  const empty = pandocToCarveAst(pandocDoc([raw('html', '')]));
  assert.equal(empty.ast.children[0].content, '');
});

for (const [format, text] of [['html', '<hr class=x>'], ['latex', '\\clearpage'], ['html', 'a\n\nb']]) {
  test(`a ${format} RawBlock survives pandoc -> carve -> pandoc unchanged (${JSON.stringify(text)})`, () => {
    const input = pandocDoc([{ t: 'Para', c: [{ t: 'Str', c: 'Z' }] }, raw(format, text)]);
    const viaSource = carveToPandoc(pandocToCarve(input).carve).doc.blocks;
    assert.deepEqual(viaSource[1], raw(format, text));
    const viaAst = carveAstToPandoc(pandocToCarveAst(input).ast).doc.blocks;
    assert.deepEqual(viaAst[1], raw(format, text));
  });
}
