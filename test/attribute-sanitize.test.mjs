import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, render } from '../vendor/carve/index.js';
import { carveToPandoc } from '../dist/index.js';
import { isDangerousAttrName, renderedAttrValue } from '../dist/attribute-sanitize.js';

const attrsOfFirstInline = (doc) => doc.blocks[0].c[0].c[0];

test('dangerous attribute names are removed before the Pandoc boundary', () => {
  for (const name of ['onclick', 'ONFOCUS', 'srcdoc', 'formaction']) {
    const result = carveToPandoc(`[danger]{${name}="steal()"}\n`);
    assert.deepEqual(attrsOfFirstInline(result.doc)[2], []);
    assert.match(result.warnings.join('\n'), /unsafe attribute name/);
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
    assert.match(result.warnings.join('\n'), /unsafe attribute value/);
  }
});

test('safe prose and URL values survive silently', () => {
  const result = carveToPandoc('[safe]{title="https: prose" data-url="https://example.com" style="color: red"}\n');
  assert.deepEqual(attrsOfFirstInline(result.doc)[2], [
    ['title', 'https: prose'],
    ['data-url', 'https://example.com'],
    ['style', 'color: red'],
  ]);
  assert.deepEqual(result.warnings, []);
});

test('an attribute href cannot carry a dangerous override into Pandoc', () => {
  const result = carveToPandoc('[safe](https://example.com){href="javascript:steal()"}\n');
  const link = result.doc.blocks[0].c[0];
  assert.deepEqual(link.c[0][2], [['href', '']]);
  assert.equal(link.c[2][0], 'https://example.com');
  assert.match(result.warnings.join('\n'), /unsafe attribute value/);
});

test("attribute filtering agrees with the current engine's HTML output", () => {
  for (const [name, value] of [
    ['onclick', 'steal()'],
    ['srcdoc', 'unsafe'],
    ['background', 'java\u007fscript:x'],
    ['srcset', 'safe.png 1x,javascript:x 2x'],
    ['style', 'x:expr\\65 ssion(x)'],
    ['title', 'javascript: is prose here'],
  ]) {
    const source = `[x]{${name}="${value}"}`;
    const kvs = attrsOfFirstInline(carveToPandoc(source).doc)[2];
    const html = render(parse(source));
    const valueOut = kvs.find(([key]) => key === name)?.[1];
    if (isDangerousAttrName(name)) {
      assert.equal(valueOut, undefined);
      assert.ok(!html.includes(` ${name}=`));
    } else {
      assert.equal(valueOut, renderedAttrValue(name, value));
      assert.ok(html.includes(` ${name}="${valueOut}"`), html);
    }
  }
});
