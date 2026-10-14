import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc } from '../dist/index.js';

const CONTROLS = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]
  .map((cp) => String.fromCodePoint(cp));
const hex = (ch) => 'U+' + ch.codePointAt(0).toString(16);

test('the stripped set is the one the engine strips, and LRM is kept by both', () => {
  for (const ch of CONTROLS) {
    assert.equal(carveToHtml(`a${ch}b`).trim(), '<p>ab</p>', `engine kept ${hex(ch)}`);
  }
  assert.ok(carveToHtml('a\u200eb').includes('\u200e'), 'the engine strips LRM now; update the mirror');
  assert.ok(JSON.stringify(carveToPandoc('a\u200eb').doc).includes('\u200e'));
});

test('bidi override and isolate controls do not reach pandoc from text or code', () => {
  const fence = '```';
  for (const ch of CONTROLS) {
    const src = [
      `a${ch}b \`c${ch}d\` $\`e${ch}f\``,
      '',
      fence,
      `g${ch}h`,
      fence,
      '',
      `# i${ch}j`,
      '',
    ].join('\n');
    const result = carveToPandoc(src);
    const json = JSON.stringify(result.doc);
    assert.ok(!json.includes(ch), `${hex(ch)} reached pandoc: ${json}`);
    assert.ok(result.diagnostics.some((d) => d.code === 'bidi-control-stripped' && d.class === 'normalized'));
  }
});

test('a document without bidi controls reports nothing about them', () => {
  assert.deepEqual(carveToPandoc('plain text\n').diagnostics, []);
});
