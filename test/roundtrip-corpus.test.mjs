/*
 * THE ROUND TRIP, OVER THE WHOLE CORPUS: Carve -> pandoc -> Carve.
 *
 * This is the gate the other corpus checks are not.
 * test/spec-corpus.test.mjs runs every document but asks only that it CONVERTS
 * and that its AST validates. test/equivalence.test.mjs compares rendered HTML
 * properly - for 36 inline snippets; for whole documents it compares the SECOND
 * round trip against the first, so a first pass that loses something passes as
 * long as it loses it consistently. Measured when this file was written: 89 of
 * 1143 documents came back rendering differently, and nothing was red.
 *
 * WHAT IS COMPARED. Rendered HTML, with two differences normalized away because
 * the bridge documents both as semantics-preserving:
 *
 *   - ATTRIBUTE ORDER inside a tag. Pandoc's Attr has fixed slots, so `{.c #i}`
 *     comes back `{#i .c}` and the author's order is not representable.
 *   - WHITESPACE RUNS. Pandoc's `Space` is one space, so `a  b` is `a b`, the
 *     same normalization its own markdown reader performs.
 *
 * Anything else is a real difference in what the reader sees.
 *
 * THE ALLOWLIST IS A LEDGER, NOT A SETTING. Every entry is a document that does
 * not survive yet. It may only ever shrink: a document that starts round-
 * tripping must come OFF the list, which the "no longer lossy" check below
 * enforces, so a fix cannot quietly leave a stale entry behind and a
 * regression cannot hide inside one.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { shortfall } from './helpers.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(repo, 'spec', 'tests', 'corpus');

test('the spec corpus submodule is checked out', () => {
  assert.ok(
    existsSync(corpusDir),
    corpusDir + ' is missing. Run "git submodule update --init". A failure ' +
      'rather than a skip: a skipped corpus and a clean one read the same.',
  );
});

const corpus = existsSync(corpusDir)
  ? readdirSync(corpusDir)
      .filter((file) => file.endsWith('.crv'))
      .sort()
      .map((file) => ({ name: file, source: readFileSync(join(corpusDir, file), 'utf8') }))
  : [];

/** Attribute order and whitespace runs, the two documented equivalences. */
const normalizeHtml = (html) => html
  .replace(/<(\w+)((?:\s+[\w:-]+(?:="[^"]*")?)+)\s*(\/?)>/g, (_, tag, attrs, slash) => {
    const sorted = [...attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)]
      .map((m) => (m[2] === undefined ? m[1] : `${m[1]}="${m[2]}"`))
      .sort();
    return `<${tag} ${sorted.join(' ')}${slash}>`;
  })
  .replace(/\s+/g, ' ')
  .trim();

const KNOWN_LOSSY = new Set([
  '101-table-header-cell-rowspan.crv',
  '106-blocked-span-marker-renders-as-empty-cell.crv',
  '107-colspan-marker-scans-left-past-a-consumed-cell.crv',
  '110-empty-link-and-image-titles-are-preserved.crv',
  '128-editorial-markup-takes-a-trailing-attribute.crv',
  '134-footnote-definition-requires-an-inline-body.crv',
  '135-footnote-definition-separator-must-be-a-space.crv',
  '141-trailing-whitespace-boundaries.crv',
  '159-indented-reference-and-footnote-definitions-stay-literal-2.crv',
  '163-unresolved-footnote-reference-with-a-trailing-attribute-stays-literal.crv',
  '172-attribute-braces-on-a-list-item-marker-line.crv',
  '173-implicit-heading-references-with-no-definition.crv',
  '174-bare-dot-ordered-markers-3.crv',
  '184-a-definition-below-every-content-column-folds-as-text.crv',
  '21-math-2.crv',
  '215-a-marker-attribute-may-hold-a-quoted-brace.crv',
  '22-footnotes-4.crv',
  '22-footnotes-5.crv',
  '221-a-heading-reference-folds-unicode-normalization-but-not-compatibility.crv',
  '227-a-definition-inside-a-definition-list-dd-is-collected-and-the-entry-keeps-no-trace-2.crv',
  '227-a-definition-inside-a-definition-list-dd-is-collected-and-the-entry-keeps-no-trace.crv',
  '23-inline-footnotes-2.crv',
  '252-a-tab-separates-two-attributes-and-pads-a-block-as-a-space-does-2.crv',
  '267-a-definition-marker-s-separator-is-a-space-and-it-is-a-run-8.crv',
  '267-a-definition-marker-s-separator-is-a-space-and-it-is-a-run-9.crv',
  '268-trailing-whitespace-on-a-content-line-is-dropped-10.crv',
  '273-the-inline-attribute-interior-is-space-only-the-attribute-line-is-not.crv',
  '274-a-quoted-attribute-value-stops-at-the-newline-2.crv',
  '275-a-collapsed-reference-reaches-a-heading-by-the-heading-s-rendered-text-4.crv',
  '275-a-collapsed-reference-reaches-a-heading-by-the-heading-s-rendered-text-6.crv',
  '275-a-collapsed-reference-reaches-a-heading-by-the-heading-s-rendered-text-9.crv',
  '284-a-ragged-table-keeps-each-row-s-cell-count-2.crv',
  '284-a-ragged-table-keeps-each-row-s-cell-count-3.crv',
  '284-a-ragged-table-keeps-each-row-s-cell-count.crv',
  '288-heading-index-plain-text-covers-visible-leaves-and-rejects-an-empty-key-2.crv',
  '288-heading-index-plain-text-covers-visible-leaves-and-rejects-an-empty-key-3.crv',
  '288-heading-index-plain-text-covers-visible-leaves-and-rejects-an-empty-key.crv',
  '302-a-math-span-s-base-class-keeps-the-class-slot-in-place-2.crv',
  '302-a-math-span-s-base-class-keeps-the-class-slot-in-place.crv',
  '311-a-footnote-in-reference-link-text-nests-the-anchors-too-3.crv',
  '312-a-note-body-s-own-references-resolve-2.crv',
  '312-a-note-body-s-own-references-resolve-3.crv',
  '315-an-inline-note-s-content-resolves-after-the-note-6.crv',
  '315-an-inline-note-s-content-resolves-after-the-note-7.crv',
  '318-composite-figures-11.crv',
  '318-composite-figures-2.crv',
  '318-composite-figures-9.crv',
  '322-an-attribute-block-reaches-the-nested-list-it-precedes-10.crv',
  '323-a-block-attached-after-an-invisible-line-leaves-the-item-tight-5.crv',
  '328-an-unclosed-verbatim-run-in-a-row-stops-at-the-closing-pipe-2.crv',
  '336-a-footnote-definition-inside-an-item-s-comment-registers-nothing.crv',
  '45-inline-extensions-12.crv',
  '45-inline-extensions-13.crv',
  '45-inline-extensions-7.crv',
  '46-symbols-4.crv',
  '70-blocks-that-render-to-nothing-2.crv',
  '71-attribute-edge-cases-10.crv',
  '71-attribute-edge-cases-8.crv',
  '80-trailing-attribute-block-edge-cases.crv',
  '90-list-item-attributes-2.crv',
  '90-list-item-attributes-3.crv',
  '90-list-item-attributes-4.crv',
  '90-list-item-attributes.crv',
]);

test('the round trip is measured against the whole corpus, not a sample', () => {
  // The same guard spec-corpus.test.mjs applies to itself: an empty or
  // truncated corpus would make every assertion below describe nothing.
  const thin = shortfall({
    label: 'CORPUS',
    actual: corpus.length,
    atLeast: 1000,
    of: 'document(s) in spec/tests/corpus',
    hint: 'the round trip is only as good as the population it runs over.',
  });
  assert.equal(thin, null, thin ?? '');
});

const lossy = [];
for (const { name, source } of corpus) {
  let back;
  try {
    back = pandocToCarve(carveToPandoc(source, { roundtrip: true }).doc).carve;
  } catch (error) {
    lossy.push(`${name}: threw: ${String(error.message).split('\n')[0]}`);
    continue;
  }
  if (normalizeHtml(carveToHtml(source)) !== normalizeHtml(carveToHtml(back))) lossy.push(name);
}

test('every corpus document survives Carve -> pandoc -> Carve, except the ledger', () => {
  const unexpected = lossy.filter((name) => !KNOWN_LOSSY.has(name));
  assert.deepEqual(
    unexpected,
    [],
    'document(s) that stopped round-tripping. Either the change lost something, ' +
      'or the loss is genuine and understood - in which case add it to ' +
      'KNOWN_LOSSY with the reason, rather than widening the comparison:\n  ' +
      unexpected.join('\n  '),
  );
});

test('the ledger holds no document that already round-trips', () => {
  // A stale entry is worse than a missing one: it reads as a known loss and
  // silently accepts a real regression on that document forever.
  const fixed = [...KNOWN_LOSSY].filter((name) => !lossy.includes(name));
  assert.deepEqual(
    fixed,
    [],
    'these documents round-trip now and must come OFF KNOWN_LOSSY:\n  ' + fixed.join('\n  '),
  );
});
