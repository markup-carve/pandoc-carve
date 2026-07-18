import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();

/**
 * Semantic parity spot-checks: pandoc's HTML writer and carveToHtml differ in
 * markup details (attributes, whitespace), but core semantics must agree.
 */
const cases = [
  ['/em/', ['<em>em</em>']],
  ['*strong*', ['<strong>strong</strong>']],
  ['_under_', ['<u>under</u>']],
  ['~gone~', ['strike']],
  ['# Head', ['Head</h1>']],
  ['> quote', ['<blockquote>']],
  ['`code`', ['<code>code</code>']],
  ['[t](https://e.com)', ['href="https://e.com"']],
  ['- a\n- b', ['<li>', '</ul>']],
  ['1. a\n2. b', ['<ol']],
  ['|= H |\n| c |', ['<table>', '<th', '<td']],
];

for (const [src, needles] of cases) {
  test(`parity: ${JSON.stringify(src)}`, { skip: !pandoc && 'pandoc not found' }, () => {
    const direct = carveToHtml(src);
    const bridged = pandocRender(pandoc, carveToPandoc(src).doc, 'html');
    for (const needle of needles) {
      // "strike" = semantic check: any strikethrough element counts.
      const strikeRe = /<s>|<del>|<strike>|line-through/;
      const inDirect = needle === 'strike' ? strikeRe.test(direct) : direct.includes(needle);
      const inBridged = needle === 'strike' ? strikeRe.test(bridged) : bridged.includes(needle);
      assert.ok(inDirect, `carveToHtml contains ${needle}: ${direct}`);
      assert.ok(inBridged, `pandoc html contains ${needle}: ${bridged}`);
    }
  });
}
