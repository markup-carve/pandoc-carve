import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, render } from '../vendor/carve/index.js';
import { carveToPandoc } from '../dist/index.js';

const CONTROLS = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069].map(cp => String.fromCodePoint(cp));

test('the bridge strips the same bidi controls the engine strips from HTML', () => {
  for (const ch of CONTROLS) {
    assert.equal(render(parse(`a${ch}b`)).trim(), '<p>ab</p>');
    const result = carveToPandoc(`a${ch}b`);
    assert.equal(JSON.stringify(result.doc).includes(ch), false);
    assert.match(result.warnings.join('\n'), /bidi control stripped/);
  }
  assert.ok(render(parse('a\u200eb')).includes('\u200e'));
  assert.ok(JSON.stringify(carveToPandoc('a\u200eb').doc).includes('\u200e'));
});

test('bidi controls do not reach Pandoc from text, code, math, or a code block', () => {
  for (const ch of CONTROLS) {
    const source = `a${ch}b \`c${ch}d\` $\`e${ch}f\`\n\n\`\`\`\ng${ch}h\n\`\`\`\n\n# i${ch}j\n`;
    assert.equal(JSON.stringify(carveToPandoc(source).doc).includes(ch), false);
  }
});

test('a document without bidi controls reports nothing about them', () => {
  assert.deepEqual(carveToPandoc('plain text\n').warnings, []);
});
