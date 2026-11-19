import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const attributed = {
  paragraph: '{.c}\nhello\n',
  quote: '{.c}\n> hello\n',
  bullet: '{.c}\n- a\n- b\n',
  ordered: '{.c}\n1. a\n2. b\n',
};

test('attributed blocks use 0.2 carriers without a private wrapper key', () => {
  for (const [name, source] of Object.entries(attributed)) {
    const { doc } = carveToPandoc(source);
    assert.ok(!JSON.stringify(doc).includes('"wrapper"'), name);
    const { ast, warnings } = pandocToCarveAst(doc);
    assert.deepEqual(warnings, [], name);
    assert.deepEqual(ast.children[0].attrs.classes, ['c'], name);
  }
});

test('a captioned quote keeps its attributes through the 0.2 tree', () => {
  const source = '{.c}\n> To be.\n^ Hamlet\n';
  const { doc } = carveToPandoc(source);
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.deepEqual(warnings, []);
  // C2-A-082 to C2-A-084: a caption sits in the slot of its block; the figure node is gone.
  assert.equal(ast.children[0].type, 'block_quote');
  assert.deepEqual(ast.children[0].attrs.classes, ['c']);
  assert.equal(pandocToCarve(doc).carve, source);
});
