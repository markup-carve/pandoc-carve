/*
 * The bridge's input contract: the SERIALIZED AST of PART 12, not any engine's
 * runtime tree (#16).
 *
 * Two halves, and both matter:
 *
 *  1. What `carveToPandoc` feeds the converter is the exchange shape - checked
 *     against `spec/resources/ast-schema.json`, the file that pins it, rather
 *     than against this package's opinion of it.
 *  2. A serialized tree that arrived from somewhere else converts identically.
 *     The documents below are written by hand, in the wire shape, and never
 *     touch `parse()`: that is what a tree from carve-rs, carve-php or carve-go
 *     looks like on the way in, and converting it is the point of the ticket.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { normalizeCarveAst, parseCarveAst, toCarveAst } from '../dist/ast-json.js';
import { carveAstToPandoc, carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(join(repo, 'spec', 'resources', 'ast-schema.json'), 'utf8'));
const validate = new Ajv2020({ strict: false }).compile(schema);

/** Assert against the schema, reporting the first error where it happened. */
function assertConforms(doc, label) {
  if (validate(doc)) return;
  const e = validate.errors[0];
  assert.fail(`${label}: ${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`);
}

/** Every node of a given type, anywhere in the tree. */
function nodesOfType(value, type, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) nodesOfType(item, type, found);
  } else if (value && typeof value === 'object') {
    if (value.type === type) found.push(value);
    for (const child of Object.values(value)) nodesOfType(child, type, found);
  }
  return found;
}

const SOURCE = `---
title: Wire
---

# Heading

Text[^a] and {# a note #} and ^[on the spot].

:: term
:  description

[^a]: the body
`;

test('the root carries the three fields PART 12 allows, and no runtime ones', () => {
  const ast = carveToCarveAst(SOURCE);
  assert.deepEqual(Object.keys(ast).sort(), ['children', 'srcByteLength', 'type']);
  // The two the runtime keeps on the root instead, named so a regression says
  // which one came back.
  assert.equal(ast.frontmatter, undefined, 'frontmatter is a child, not a root field');
  assert.equal(ast.footnoteDefs, undefined, 'footnote definitions are children, not a root field');
});

test('frontmatter is the FIRST child, verbatim', () => {
  const ast = carveToCarveAst(SOURCE);
  assert.equal(ast.children[0].type, 'frontmatter');
  assert.equal(ast.children[0].format, 'yaml');
  assert.equal(ast.children[0].content.trim(), 'title: Wire');
});

test('a footnote definition is a `footnote` child carrying its label', () => {
  const ast = carveToCarveAst(SOURCE);
  const defs = ast.children.filter((n) => n.type === 'footnote');
  assert.equal(defs.length, 1);
  assert.equal(defs[0].label, 'a');
  assert.equal(defs[0].children[0].type, 'paragraph');
});

test('the reference to it is a `footnote_ref`, and `^[...]` an `inline_footnote`', () => {
  const ast = carveToCarveAst(SOURCE);
  // The pinned engine spells both `footnote`, which on the wire is the
  // DEFINITION block - the collision the mapping exists to remove.
  assert.equal(nodesOfType(ast.children, 'footnote_ref').length, 1);
  assert.equal(nodesOfType(ast.children, 'inline_footnote').length, 1);
  const refs = nodesOfType(ast.children, 'footnote_ref');
  assert.equal(refs[0].id, 'a');
  assert.equal(refs[0].inline, undefined, 'a reference carries no body');
});

test('a definition list is a flat run of definition_term / definition_description', () => {
  const [list] = nodesOfType(carveToCarveAst(SOURCE).children, 'definition_list');
  assert.deepEqual(
    list.items.map((n) => n.type),
    ['definition_term', 'definition_description'],
  );
});

test('the critic comment carries the schema spelling, not the hyphenated one', () => {
  const ast = carveToCarveAst(SOURCE);
  assert.equal(nodesOfType(ast.children, 'critic_comment').length, 1);
  assert.equal(nodesOfType(ast.children, 'critic-comment').length, 0);
});

test('the serialized document validates against the spec AST schema', () => {
  assertConforms(carveToCarveAst(SOURCE), 'serialized source');
});

test('a reversed Figure containing a BlockQuote validates against the spec AST schema', () => {
  const { ast } = pandocToCarveAst({
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{
      t: 'Figure',
      c: [
        ['', [], []],
        [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Hamlet' }] }]],
        [{ t: 'BlockQuote', c: [{ t: 'Para', c: [{ t: 'Str', c: 'To' }, { t: 'Space' }, { t: 'Str', c: 'be' }] }] }],
      ],
    }],
  });
  assertConforms(ast, 'reversed quote figure');
});

// --- The other direction: a tree that arrived already serialized ---

const WIRE = {
  type: 'document',
  srcByteLength: 0,
  children: [
    { type: 'frontmatter', format: 'yaml', content: 'title: From another engine\n' },
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'See ' },
        { type: 'footnote_ref', id: 'note' },
        { type: 'text', value: ' and ' },
        { type: 'critic_comment', text: 'an annotation' },
      ],
    },
    {
      type: 'definition_list',
      items: [
        { type: 'definition_term', children: [{ type: 'text', value: 'term' }] },
        {
          type: 'definition_description',
          children: [{ type: 'paragraph', children: [{ type: 'text', value: 'described' }] }],
        },
      ],
    },
    {
      type: 'footnote',
      label: 'note',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'defined' }] }],
    },
  ],
};

test('the hand-written wire document is itself schema-conformant', () => {
  // Otherwise the tests below would prove only that this package accepts its
  // own invention.
  assertConforms(WIRE, 'hand-written wire document');
});

test('a serialized AST from another engine converts: frontmatter reaches meta', () => {
  const { doc, warnings } = carveAstToPandoc(WIRE);
  assert.deepEqual(warnings, []);
  assert.equal(doc.meta.title.t, 'MetaInlines');
  assert.equal(doc.meta.title.c[0].c, 'From');
});

test('a serialized AST from another engine converts: the definition resolves', () => {
  const { doc } = carveAstToPandoc(WIRE);
  const json = JSON.stringify(doc.blocks);
  assert.ok(json.includes('"Note"'), 'the footnote_ref became a pandoc Note');
  assert.ok(json.includes('defined'), 'the Note carries the definition body');
  // The definition block is not ALSO emitted as a block of its own.
  assert.equal(doc.blocks.filter((b) => b.t === 'Para').length, 1);
});

test('a serialized AST from another engine converts: the definition list survives', () => {
  const { doc } = carveAstToPandoc(WIRE);
  const list = doc.blocks.find((b) => b.t === 'DefinitionList');
  assert.ok(list, 'a DefinitionList was emitted');
  assert.equal(list.c.length, 1, 'one entry: the description belongs to the term before it');
  assert.equal(list.c[0][0][0].c, 'term');
});

test('JSON text is accepted where an object is', () => {
  const fromText = carveAstToPandoc(JSON.stringify(WIRE)).doc;
  assert.deepEqual(fromText, carveAstToPandoc(WIRE).doc);
});

test('a payload that is not a document root is refused, by name', () => {
  assert.throws(() => carveAstToPandoc({ type: 'paragraph', children: [] }), /not a Carve AST document.*"paragraph"/s);
  assert.throws(() => carveAstToPandoc('[]'), /not a Carve AST document/);
});

test('a wire `footnote` definition is never mistaken for a reference', () => {
  // `footnote` means the DEFINITION on the wire and the pre-split REFERENCE in
  // an older engine's tree. Told apart by label + children, so normalization
  // must leave a definition alone - renaming it would drop every footnote body.
  const normalized = normalizeCarveAst(WIRE);
  const def = normalized.children.find((n) => n.label === 'note');
  assert.equal(def.type, 'footnote');
});

test('an older serialized tree still converts: the pre-split spellings fold in', () => {
  const legacy = {
    type: 'document',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'footnote', id: 'a' },
          { type: 'footnote', inline: [{ type: 'text', value: 'onthespot' }] },
          { type: 'critic-comment', text: 'annotation' },
        ],
      },
      {
        type: 'footnote',
        label: 'a',
        children: [{ type: 'paragraph', children: [{ type: 'text', value: 'resolved' }] }],
      },
    ],
  };
  const { doc, warnings } = carveAstToPandoc(legacy);
  const json = JSON.stringify(doc.blocks);
  assert.deepEqual(warnings, []);
  assert.ok(json.includes('resolved'), 'the reference resolved through the definition');
  assert.ok(json.includes('onthespot'), 'the inline footnote kept its body');
  assert.ok(json.includes('comment-annotation'), 'the critic comment kept its class');
});

test("the engine's own serializer is used when the engine exports one", () => {
  // The pinned ^0.1.2 exports no toAstJson, so the mapping in ast-json.ts runs.
  // When a later pin does export it, PART 12 section 1 makes the engine's own
  // mapping authoritative - this is that path, driven by a stub so it is
  // exercised now rather than after the bump.
  const calls = [];
  const serialized = toCarveAst({ marker: 'runtime' }, (doc) => {
    calls.push(doc);
    return {
      type: 'document',
      children: [{ type: 'paragraph', children: [{ type: 'critic-comment', text: 'x' }] }],
    };
  });
  assert.deepEqual(calls, [{ marker: 'runtime' }], 'the runtime document reached the serializer');
  assert.equal(serialized.children[0].children[0].type, 'critic_comment', 'normalization still runs');
});

test('normalization leaves a current tree structurally shared, not copied', () => {
  // Cheap to get wrong, and expensive: a deep copy per conversion, plus a
  // caller's tree quietly diverging from the one it handed over.
  assert.equal(normalizeCarveAst(WIRE), WIRE);
});

test('the source path and the serialized path agree', () => {
  // The same document, once as source and once round-tripped through the
  // exchange format. Different entry points, identical pandoc output.
  const direct = carveToPandoc(SOURCE).doc;
  const viaWire = carveAstToPandoc(JSON.stringify(carveToCarveAst(SOURCE))).doc;
  assert.deepEqual(viaWire, direct);
});

test('a definition list holding both shapes keeps every entry', () => {
  // The decision to flatten is made per LIST, so one runtime entry sends the
  // whole `items` array through the mapping - and an entry that was already a
  // wire node must survive that trip. Dropping it would delete authored
  // content with nothing to show for it.
  const mixed = {
    type: 'document',
    children: [
      {
        type: 'definition_list',
        items: [
          { type: 'definition_term', children: [{ type: 'text', value: 'wire' }] },
          {
            type: 'definition_description',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: 'already' }] }],
          },
          {
            terms: [[{ type: 'text', value: 'runtime' }]],
            definitions: [[{ type: 'paragraph', children: [{ type: 'text', value: 'mapped' }] }]],
          },
        ],
      },
    ],
  };
  const [list] = nodesOfType(toCarveAst(mixed).children, 'definition_list');
  assert.deepEqual(
    list.items.map((n) => n.type),
    ['definition_term', 'definition_description', 'definition_term', 'definition_description'],
  );
  const json = JSON.stringify(carveAstToPandoc(toCarveAst(mixed)).doc);
  for (const word of ['wire', 'already', 'runtime', 'mapped']) {
    assert.ok(json.includes(word), `"${word}" survived the mapping`);
  }
});

test('a malformed definition entry is skipped, not emitted empty', () => {
  const malformed = {
    type: 'document',
    children: [
      { type: 'definition_list', items: [{ terms: ['not an array of nodes'], definitions: [] }] },
    ],
  };
  const [list] = nodesOfType(toCarveAst(malformed).children, 'definition_list');
  assert.deepEqual(list.items, []);
  assert.doesNotThrow(() => carveAstToPandoc(toCarveAst(malformed)));
});

test('parseCarveAst returns the document it was given', () => {
  assert.equal(parseCarveAst(WIRE), WIRE);
});
