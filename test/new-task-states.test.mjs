import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

for (const [state, name] of [['/', 'progress'], ['!', 'blocked'], ['_', 'open alias']]) {
  test(`${name} task state survives the Pandoc round trip`, () => {
    const source = `- [${state}] task\n`;
    const converted = carveToPandoc(source, { roundtrip: true });
    assert.equal(converted.diagnostics.length, 0);
    const back = pandocToCarve(converted.doc).carve;
    assert.ok(back.includes(`[${state}]`), back);
  });

  test(`${name} task state is reported when the envelope is disabled`, () => {
    const converted = carveToPandoc(`- [${state}] task\n`);
    assert.ok(converted.diagnostics.some((finding) => finding.code === 'task-state-dropped'));
  });
}
