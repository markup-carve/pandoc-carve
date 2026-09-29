import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeHtml } from './html-equivalence.mjs';

test('HTML equivalence normalizes attribute order and prose whitespace', () => {
  assert.equal(normalizeHtml('<p id="a" class="b">one  two</p>'),
    normalizeHtml('<p class="b" id="a">one\ntwo</p>'));
});

test('HTML equivalence preserves code, attribute values, and nonbreaking spaces', () => {
  for (const [before, after] of [
    ['<pre><code>a  b\nc</code></pre>', '<pre><code>a b c</code></pre>'],
    ['<p><code>a  b</code></p>', '<p><code>a b</code></p>'],
    ['<p title="a  b">x</p>', '<p title="a b">x</p>'],
    ['<p>a&nbsp;b</p>', '<p>a b</p>'],
    ['<p style="white-space: pre-wrap">a  b</p>', '<p style="white-space: pre-wrap">a b</p>'],
    ['<p style="white-space:pre"><span>a  b</span></p>', '<p style="white-space:pre"><span>a b</span></p>'],
    ['<textarea>a  b</textarea>', '<textarea>a b</textarea>'],
    ['<script>"a  b"</script>', '<script>"a b"</script>'],
    ['<style>.a::after { content: "a  b" }</style>', '<style>.a::after { content: "a b" }</style>'],
    ['\u00a0<p>x</p>', '<p>x</p>'],
    ['<p>x</p>\u00a0', '<p>x</p>'],
    ['<p>x</p><!--a-->', '<p>x</p><!--b-->'],
  ]) assert.notEqual(normalizeHtml(before), normalizeHtml(after));
});

test('HTML equivalence preserves structure and escaped tag-shaped text', () => {
  assert.notEqual(normalizeHtml('<p>&lt;td&gt;</p>'), normalizeHtml('<p></p>'));
  assert.notEqual(normalizeHtml('<ul><li>x</li></ul>'), normalizeHtml('<p>x</p>'));
});
