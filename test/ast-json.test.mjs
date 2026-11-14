/* The Carve 0.2 tree is the bridge's interchange contract. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTree } from '../vendor/carve-v2/index.js';
import { carveAstToPandoc, carveToCarveAst, carveToPandoc } from '../dist/index.js';

const nodesOfType = (value, type, found = []) => {
  if (Array.isArray(value)) for (const item of value) nodesOfType(item, type, found);
  else if (value && typeof value === 'object') {
    if (value.type === type) found.push(value);
    for (const child of Object.values(value)) nodesOfType(child, type, found);
  }
  return found;
};

const SOURCE = `---
title: Wire
---

# Heading

Text[^a] and {# a note #} and ^[on the spot].

:: term
:  description

[^a]: the body
`;

const WIRE = {
  type: 'document', astVersion: '2.0', metadata: { title: [{ type: 'text', value: 'From another engine' }] },
  children: [
    { type: 'frontmatter', format: 'yaml', value: 'title: From another engine\n' },
    { type: 'paragraph', children: [
      { type: 'text', value: 'See ' },
      { type: 'footnote_ref', key: 'note', namespace: 'footnote' },
      { type: 'text', value: ' and ' },
      { type: 'critic_comment', value: 'an annotation' },
    ] },
    { type: 'definition_list', children: [
      { type: 'definition_term', children: [{ type: 'text', value: 'term' }] },
      { type: 'definition_description', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'described' }] }] },
    ] },
    { type: 'footnote', key: 'note', namespace: 'footnote', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'defined' }] }] },
  ],
};

test('the 0.2 root has a version and no runtime-only fields', () => {
  const ast = carveToCarveAst(SOURCE);
  assert.deepEqual(Object.keys(ast).sort(), ['astVersion', 'children', 'srcByteLength', 'stages', 'type']);
  assert.equal(ast.astVersion, '2.0');
  assert.equal(ast.frontmatter, undefined);
  assert.equal(ast.footnoteDefs, undefined);
});

test('frontmatter is the first child with verbatim payload', () => {
  const first = carveToCarveAst(SOURCE).children[0];
  assert.equal(first.type, 'frontmatter');
  assert.equal(first.format, 'yaml');
  assert.equal(first.value, 'title: Wire\n');
});

test('footnote definition is a child with its key and body', () => {
  const defs = carveToCarveAst(SOURCE).children.filter(node => node.type === 'footnote');
  assert.equal(defs.length, 1);
  assert.equal(defs[0].key, 'a');
  assert.equal(defs[0].namespace, 'footnote');
  assert.equal(defs[0].children[0].type, 'paragraph');
});

test('footnote reference and inline footnote remain distinct nodes', () => {
  const nodes = carveToCarveAst(SOURCE).children;
  const refs = nodesOfType(nodes, 'footnote_ref');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].key, 'a');
  assert.equal(refs[0].children, undefined);
  assert.equal(nodesOfType(nodes, 'inline_footnote').length, 1);
});

test('definition list has a flat run of term and description children', () => {
  const [list] = nodesOfType(carveToCarveAst(SOURCE).children, 'definition_list');
  assert.deepEqual(list.children.map(node => node.type), ['definition_term', 'definition_description']);
});

test('critic comment uses the 0.2 node name and value field', () => {
  const nodes = carveToCarveAst(SOURCE).children;
  assert.equal(nodesOfType(nodes, 'critic_comment').length, 1);
  assert.equal(nodesOfType(nodes, 'critic-comment').length, 0);
  assert.equal(nodesOfType(nodes, 'critic_comment')[0].value, ' a note ');
});

test('parsed document validates against the vendored 0.2 tree contract', () => {
  assert.doesNotThrow(() => validateTree(carveToCarveAst(SOURCE)));
});

test('captioned quote is a figure with caption and quote child', () => {
  const [figure] = carveToCarveAst('> To be, or not to be.\n^ Hamlet\n').children;
  validateTree({ type: 'document', astVersion: '2.0', children: [figure] });
  assert.equal(figure.type, 'figure');
  assert.equal(figure.children[0].type, 'block_quote');
  assert.equal(figure.caption.children[0].children[0].value, 'Hamlet');
  assert.equal(carveToCarveAst('> To be, or not to be.\n').children[0].type, 'block_quote');
});

test('handwritten interchange document validates', () => {
  assert.doesNotThrow(() => validateTree(WIRE));
});

test('handwritten interchange document converts frontmatter and typed metadata', () => {
  const { doc } = carveAstToPandoc(WIRE);
  assert.equal(doc.blocks[0].c[0], 'carve-frontmatter:yaml');
  assert.equal(doc.meta.title.t, 'MetaInlines');
  assert.equal(doc.meta.title.c[0].c, 'From');
});

test('handwritten footnote reference resolves through its definition', () => {
  const { doc } = carveAstToPandoc(WIRE);
  const reference = doc.blocks[1].c.find(node => node.t === 'Span');
  assert.equal(reference.c[1][0].t, 'Note');
  assert.ok(JSON.stringify(reference).includes('defined'));
  assert.equal(doc.blocks.at(-1).c[0], 'carve-tree');
});

test('handwritten definition list survives conversion', () => {
  const list = carveAstToPandoc(WIRE).doc.blocks.find(block => block.t === 'DefinitionList');
  assert.equal(list.c.length, 1);
  assert.equal(list.c[0][0][0].c, 'term');
});

test('JSON text is accepted where a tree object is', () => {
  assert.deepEqual(carveAstToPandoc(JSON.stringify(WIRE)).doc, carveAstToPandoc(WIRE).doc);
});

test('a non-document payload is refused by name', () => {
  assert.throws(() => carveAstToPandoc({ type: 'paragraph', children: [] }), /root is not a document/);
  assert.throws(() => carveAstToPandoc('[]'), /not a tree/);
});

test('footnote definition is never mistaken for a reference', () => {
  const definition = WIRE.children.find(node => node.type === 'footnote');
  assert.equal(definition.type, 'footnote');
  assert.equal(definition.children[0].type, 'paragraph');
  assert.equal(carveAstToPandoc(WIRE).doc.blocks.at(-1).c[0], 'carve-tree');
});

test('source and serialized paths agree', () => {
  const direct = carveToPandoc(SOURCE).doc;
  const fromTree = carveAstToPandoc(JSON.stringify(carveToCarveAst(SOURCE))).doc;
  assert.deepEqual(fromTree, direct);
});
