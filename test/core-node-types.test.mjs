import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_NODE_TYPES } from '../dist/core-node-types.js';
import { carveAstToPandoc } from '../dist/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(join(repo, 'spec', 'resources', 'ast-schema.json'), 'utf8'));

function schemaTypes(node, out = new Set()) {
  if (Array.isArray(node)) node.forEach((child) => schemaTypes(child, out));
  else if (node && typeof node === 'object') {
    const type = node.properties?.type;
    if (type?.const !== undefined) out.add(type.const);
    for (const name of type?.enum ?? []) out.add(name);
    Object.values(node).forEach((child) => schemaTypes(child, out));
  }
  return out;
}

test('the core node type list is the pinned schema list', () => {
  assert.deepEqual([...CORE_NODE_TYPES].sort(), [...schemaTypes(schema)].sort());
});

const doc = (children) => ({ type: 'document', astVersion: '2.0', children });

test('an unknown core block or inline type is refused, not degraded', () => {
  assert.throws(() => carveAstToPandoc(doc([{ type: 'future_block', value: 'x' }])), /unknown node type "future_block" at \/children\/0/);
  assert.throws(
    () => carveAstToPandoc(doc([{ type: 'paragraph', children: [{ type: 'future_inline', value: 'x' }] }])),
    /unknown node type "future_inline" at \/children\/0\/children\/0/,
  );
});

test('a type key inside attributes or data is not a node', () => {
  const result = carveAstToPandoc(doc([{
    type: 'paragraph',
    attrs: { keyValues: { type: 'note' } },
    data: { 'org.example': { type: 'anything' } },
    children: [{ type: 'text', value: 'kept' }],
  }]));
  assert.ok(JSON.stringify(result.doc).includes('kept'));
});
