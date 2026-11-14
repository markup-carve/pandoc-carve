import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parse, treesEqual } from '../vendor/carve-v2/index.js';
import { grade, meaningTree } from '../scripts/roundtrip-grade.mjs';

test('source provenance is the only heading-id equivalence', () => {
  const generated = parse('# Heading\n');
  const authored = structuredClone(generated);
  authored.children[0].attrs = { id: generated.children[0].generatedId };
  delete authored.children[0].generatedId;
  assert.equal(grade(generated, authored).verdict, 'same-meaning');
  authored.children[0].attrs.id = 'other';
  assert.equal(treesEqual(meaningTree(generated), meaningTree(authored)), false);
});

test('comments and source spelling normalize, content and destinations do not', () => {
  const withComment = parse(readFileSync(new URL('./fixtures/probes-0.2/comment_braced.crv', import.meta.url), 'utf8'));
  const withoutComment = structuredClone(withComment);
  withoutComment.children[0].children = withoutComment.children[0].children.filter(n => n.type !== 'comment');
  assert.equal(grade(withComment, withoutComment).verdict, 'same-meaning');
  const link = parse('[label](https://example.org)\n');
  const changed = structuredClone(link);
  changed.children[0].children[0].href = 'https://other.example';
  assert.equal(treesEqual(meaningTree(link), meaningTree(changed)), false);
  const table = parse('| A | B |\n| - | - |\n| C | D |\n');
  const otherCell = structuredClone(table);
  otherCell.children[0].children[0].children[0].children[0].children[0].children[0].value = 'X';
  assert.equal(treesEqual(meaningTree(table), meaningTree(otherCell)), false);
});

test('a lost word names the first differing block', () => {
  const before = parse('One.\n\nTwo.\n');
  const after = parse('One.\n\nThree.\n');
  const result = grade(before, after);
  assert.equal(result.verdict, 'lossy');
  assert.equal(result.differenceBlock.index, 2);
  assert.equal(result.differenceBlock.beforeType, 'paragraph');
});

test('caption words count as block text', () => {
  const before = parse(readFileSync(new URL('./fixtures/probes-0.2/figure_caption.crv', import.meta.url), 'utf8'));
  const after = structuredClone(before);
  delete after.children[0].caption;
  const result = grade(before, after);
  assert.equal(result.verdict, 'lossy');
  assert.match(result.differenceBlock.before, /Figure: An image/);
});
