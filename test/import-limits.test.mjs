import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const cli = new URL('../dist/cli.js', import.meta.url).pathname;
const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
const str = (c) => ({ t: 'Str', c });
const quotes = (depth) => {
  let block = { t: 'Para', c: [str('x')] };
  for (let i = 0; i < depth; i++) block = { t: 'BlockQuote', c: [block] };
  return doc([block]);
};
const emphs = (depth) => {
  let inline = str('x');
  for (let i = 0; i < depth; i++) inline = { t: 'Emph', c: [inline] };
  return doc([{ t: 'Para', c: [inline] }]);
};
const looseLists = (depth) => {
  let block = { t: 'Para', c: [str('x')] };
  for (let i = 0; i < depth; i++) block = { t: 'BulletList', c: [[{ t: 'Para', c: [str('i')] }, block]] };
  return doc([block]);
};
const deepJson = (depth) => '{"pandoc-api-version":[1,23,1],"meta":{},"blocks":['
  + '{"t":"BlockQuote","c":['.repeat(depth) + '{"t":"Para","c":[]}' + ']}'.repeat(depth) + ']}';

test('deep Pandoc nodes are refused before recursive conversion', () => {
  assert.throws(() => pandocToCarve(quotes(3000)), /Pandoc node nesting exceeds the import limit/u);
  assert.throws(() => pandocToCarveAst(emphs(3000)), /Pandoc node nesting exceeds the import limit/u);
  assert.throws(() => pandocToCarve(deepJson(5000)), /Pandoc JSON nesting exceeds the import limit/u);
});

test('a shallow Pandoc document still converts', () => {
  assert.match(pandocToCarve(quotes(20)).carve, /> > x/u);
});

test('deep Pandoc lists are refused before the writer runs', () => {
  assert.throws(() => pandocToCarve(looseLists(101)), /Pandoc list nesting exceeds the import limit/u);
  assert.ok(pandocToCarve(looseLists(10)).carve.includes('x'));
});

test('the CLI exits with a clear error for over-deep JSON', () => {
  const result = spawnSync(process.execPath, [cli, '-', '-f', 'json'], {
    input: deepJson(3000), encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Pandoc JSON nesting exceeds the import limit/u);
});
