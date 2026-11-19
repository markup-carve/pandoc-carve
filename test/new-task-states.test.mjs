import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, treesEqual } from '../vendor/carve/index.js';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

for (const [mark, name] of [['/', 'progress'], ['!', 'blocked'], ['_', 'open alias']]) {
  test(`${name} task mark survives the 0.2 Pandoc round trip`, () => {
    const source = `- [${mark}] task\n`;
    const original = parse(source);
    const exported = carveToPandoc(source);
    const returned = pandocToCarveAst(exported.doc).ast;
    assert.ok(treesEqual(original, returned));
    assert.ok(pandocToCarve(exported.doc).carve.includes(`[${mark}]`));
  });
}
