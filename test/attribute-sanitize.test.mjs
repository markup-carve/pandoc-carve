import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carveToPandoc } from '../dist/index.js';
import { isDangerousAttrName, renderedAttrValue } from '../dist/attribute-sanitize.js';

const attrsOfFirstInline = (doc) => doc.blocks[0].c[0].c[0];

test('dangerous attribute names are removed before the Pandoc boundary', () => {
  for (const name of ['onclick', 'ONFOCUS', 'srcdoc', 'formaction']) {
    const result = carveToPandoc(`[danger]{${name}="steal()"}\n`);
    assert.deepEqual(attrsOfFirstInline(result.doc)[2], []);
    assert.equal(result.diagnostics[0]?.code, 'unsafe-attribute-name');
    assert.equal(result.diagnostics[0]?.details?.attribute, name);
  }
});

test('dangerous scalar, URL-list, and CSS values are blanked and diagnosed', () => {
  const cases = [
    ['background', 'javascript:steal()'],
    ['srcset', 'safe.png 1x,javascript:steal() 2x'],
    ['imagesrcset', 'safe.png 1x, data:text/html,x 2x'],
    ['ping', 'https://safe.example java\u007fscript:steal()'],
    ['attributionsrc', 'https://safe.example javascript:steal()'],
    ['style', 'x:expr\\65 ssion(steal())'],
  ];
  for (const [name, value] of cases) {
    const result = carveToPandoc(`[danger]{${name}="${value}"}\n`);
    assert.deepEqual(attrsOfFirstInline(result.doc)[2], [[name, '']], `${name} was not blanked`);
    assert.equal(result.diagnostics[0]?.code, 'unsafe-attribute-value');
  }
});

test('safe prose and URL values survive silently', () => {
  const result = carveToPandoc('[safe]{title="https: prose" data-url="https://example.com" style="color: red"}\n');
  assert.deepEqual(attrsOfFirstInline(result.doc)[2], [
    ['title', 'https: prose'],
    ['data-url', 'https://example.com'],
    ['style', 'color: red'],
  ]);
  assert.deepEqual(result.diagnostics, []);
});

test('an attribute href cannot carry a dangerous override into Pandoc', () => {
  const result = carveToPandoc('[safe](https://example.com){href="javascript:steal()"}\n');
  const link = result.doc.blocks[0].c[0];
  assert.deepEqual(link.c[0][2], [['href', '']]);
  assert.equal(link.c[2][0], 'https://example.com');
  assert.equal(result.diagnostics[0]?.code, 'unsafe-attribute-value');
});

test("the attribute mirror agrees with the installed engine's policy", async () => {
  const require = createRequire(import.meta.url);
  const dist = join(dirname(require.resolve('@markup-carve/carve/package.json')), 'dist');
  const engine = await import(pathToFileURL(join(dist, 'render-html.js')).href);
  for (const name of ['onclick', 'ONCLICK', 'srcdoc', 'formaction', 'title', 'data-url']) {
    assert.equal(isDangerousAttrName(name), engine.isDangerousAttrName(name), name);
  }
  const cases = [
    ['background', 'java\u007fscript:x'],
    ['srcset', 'safe.png 1x,javascript:x 2x'],
    ['ping', 'https://safe.example,comma'],
    ['style', 'x:expr\\65 ssion(x)'],
    ['title', 'javascript: is prose here'],
  ];
  for (const [name, value] of cases) {
    assert.equal(renderedAttrValue(name, value), engine.renderedAttrValue(name, value), `${name}=${value}`);
  }
});
