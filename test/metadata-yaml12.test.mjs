import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc } from '../dist/index.js';

const inline = (text) => ({ t: 'MetaInlines', c: [{ t: 'Str', c: text }] });

test('YAML 1.2 aliases remain strings at every metadata depth', () => {
  const source = `---yaml
root: yes
nested:
  flag: off
flow: [on, n, false, TRUE]
---
`;
  const { doc } = carveToPandoc(source);
  assert.deepEqual(doc.meta.root, inline('yes'));
  assert.deepEqual(doc.meta.nested.c.flag, inline('off'));
  assert.deepEqual(doc.meta.flow.c, [inline('on'), inline('n'), { t: 'MetaBool', c: false }, { t: 'MetaBool', c: true }]);
});
