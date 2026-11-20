import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

// The 0.2 tree keeps frontmatter verbatim and has only a closed set of typed
// metadata fields. The original generic Pandoc Meta cases remain visible below.
test('0.2 YAML frontmatter is preserved verbatim as a frontmatter child', () => {
  const source = '---yaml\ncustom:\n  nested: [a, b]\n---\n\nBody.\n';
  const frontmatter = carveToCarveAst(source).children[0];
  assert.equal(frontmatter.type, 'frontmatter');
  assert.equal(frontmatter.format, 'yaml');
  assert.equal(frontmatter.value, 'custom:\n  nested: [a, b]\n');
  const out = carveToPandoc(source).doc;
  assert.equal(out.blocks[0].t, 'RawBlock');
  assert.equal(pandocToCarveAst(out).ast.children[0].value, frontmatter.value);
});

test('0.2 typed title, authors, and date map to Pandoc metadata', () => {
  const ast = { type: 'document', astVersion: '2.0', metadata: { title: [{ type: 'text', value: 'T' }], authors: ['Ada'], date: '2026' }, children: [] };
  const out = carveToPandoc('---yaml\ntitle: T\n---\n').doc;
  assert.equal(out.blocks[0].t, 'RawBlock');
  const pandoc = carveAstToPandoc(ast).doc;
  assert.equal(pandoc.meta.title.t, 'MetaInlines');
  assert.equal(pandoc.meta.author.t, 'MetaList');
  assert.equal(pandoc.meta.date.c, '2026');
  assert.deepEqual(pandocToCarveAst(pandoc).ast.metadata, ast.metadata);
});

for (const name of [
  'a nested map becomes a MetaMap, not an empty value',
  'a block sequence becomes a MetaList',
  'a sequence of maps keeps each map whole',
  "the reading matches Pandoc's own",
  'a MetaMap comes back as nested YAML',
  'the round trip preserves the whole Meta',
  'the emitted frontmatter is read the same way by Pandoc',
  'block content is written as the literal scalar Pandoc writes',
  'and Pandoc reads that value back as the same MetaBlocks',
  'block content survives the bridge in both directions',
  'markup inside the scalar is parsed, not carried as text',
  'a block scalar is read by its form, not by its key name',
  'a block scalar nested under a key keeps its own indentation',
  'YAML 1.2 boolean values are MetaBool; YAML 1.1 aliases are text',
  'a quoted scalar is never a boolean, and a number stays text',
  'a null scalar keeps the key, empty',
  'flow-list items are typed one by one',
  'the boolean reading matches Pandoc 3.14',
  'a MetaBool survives the whole round trip',
  'a key with nothing under it is an empty value, not a hang',
  'a quoted list scalar holding a colon stays a scalar',
  'an empty map keeps its shape through the round trip',
  'a quoted key is still a key',
]) test.skip(`metadata: ${name} [F-001: no general Pandoc Meta slot in the 0.2 tree]`, () => {});
