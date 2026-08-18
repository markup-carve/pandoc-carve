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
import { declaredCorpusSize } from './helpers.mjs';

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
  '141-trailing-whitespace-boundaries.crv',
  '172-attribute-braces-on-a-list-item-marker-line.crv',
  '173-implicit-heading-references-with-no-definition.crv',
  '174-bare-dot-ordered-markers-3.crv',
  '21-math-2.crv',
  '215-a-marker-attribute-may-hold-a-quoted-brace.crv',
  '22-footnotes-4.crv',
  '22-footnotes-5.crv',
  '221-a-heading-reference-folds-unicode-normalization-but-not-compatibility.crv',
  '227-a-definition-inside-a-definition-list-dd-is-collected-and-the-entry-keeps-no-trace-2.crv',
  '227-a-definition-inside-a-definition-list-dd-is-collected-and-the-entry-keeps-no-trace.crv',
  '23-inline-footnotes-2.crv',
  '252-a-tab-separates-two-attributes-and-pads-a-block-as-a-space-does-2.crv',
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
  // Pandoc ColSpec carries horizontal alignment and width, but has no vertical
  // alignment slot. The bridge deliberately does not leak Carve's `valigns`
  // source metadata into the Pandoc table Attr, so these two vertical-axis
  // examples lose that axis on the source round trip. The AST path remains
  // lossless because it keeps the Carve column records directly.
  '370-table-columns-carry-alignment-vertical-alignment-and-widths.crv',
  '371-a-table-alignment-run-carries-two-independent-axes.crv',
  // AN EMPTY LINE INSIDE A LINE BLOCK HAS NO SPELLING ON THE WAY BACK.
  //
  // One cause under all of them. A pandoc LineBlock is a list of lines and may hold
  // an EMPTY one; a Carve line block spells each line as a source line, and a
  // blank source line inside `::: |` ends the paragraph rather than producing an
  // empty line. So the reverse direction writes the blank, the block comes back
  // as two paragraphs, and the `<br>` is gone. Measured: `::: |` / `a \` / `b` /
  // `:::` renders `a <br> <br> b` and returns `<p>a</p><p>b</p>`, with the
  // forward direction reporting nothing - a silent loss of the class this file
  // exists to catch, which is why these are named here rather than normalized
  // away.
  //
  // Where the empty line comes from differs, and one half WAS the engine PIN
  // rather than the bridge: a backslash break inside a line block used to be
  // ADDITIVE in the carve-js commit this package depended on, which predated
  // carve#1339 and carve#1340 (implemented in markup-carve/carve-js#1172), so a
  // line ending in a backslash reached pandoc as two breaks with an empty line
  // between them. That pin has moved, and exactly the three documents predicted
  // here - 344, 345 and 345-3 - came off this list, because the ledger's own
  // "no longer lossy" check requires it rather than merely permitting it.
  //
  // What is left is the bridge's own, and all of it is one shape: an empty
  // LineBlock line that Carve has no way to spell.
  //
  //   - 344-2 and 344-4: a comment-only line is removed before any inline run,
  //     so the line survives as an EMPTY one.
  //   - 345-2: a body line that is a lone backslash IS an empty line.
  //   - the 346 family: a line block whose LAST body line ends in a backslash
  //     is a TRAILING empty LineBlock line.
  '344-a-comment-only-line-in-a-line-block-is-removed-before-any-inline-run-2.crv',
  '344-a-comment-only-line-in-a-line-block-is-removed-before-any-inline-run-4.crv',
  '345-a-line-block-s-hard-break-keeps-its-backslash-2.crv',
  '346-a-line-block-s-last-body-line-keeps-its-backslash-2.crv',
  '346-a-line-block-s-last-body-line-keeps-its-backslash-3.crv',
  '346-a-line-block-s-last-body-line-keeps-its-backslash-4.crv',
  '346-a-line-block-s-last-body-line-keeps-its-backslash.crv',
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
  // EQUALITY AGAINST THE DECLARED SIZE, NOT A FLOOR.
  //
  // This was `atLeast: 1000` against a corpus that holds 1239 documents, which
  // is the markup-carve/carve#755 shape one step removed: the check runs, and
  // reports success over a population nobody chose. 239 documents could vanish
  // from under it - a half-checked-out submodule, a pin that moved backwards, a
  // filter that stopped matching - and the gate would stay green while the
  // ledger below silently described a smaller corpus than the one the ledger
  // was written against. The floor could not even tell the CURRENT corpus from
  // the 1124-document one this file's ledger predates.
  //
  // The expectation is derived, not written down: spec/tests/corpus is
  // generated from the `::: compare` blocks in spec/resources/examples, so the
  // spec declares its own corpus size and a submodule bump moves both halves at
  // once. There is no literal here to go stale, and no bound to outgrow.
  //
  // Deliberately the same derivation test/spec-corpus.test.mjs uses, shared
  // through helpers.mjs: two corpus gates that disagree about how big the
  // corpus is would each be able to pass on a population the other rejects.
  const declared = declaredCorpusSize(repo);
  assert.ok(
    declared > 0,
    'the corpus source pages declare no ::: compare blocks at all - that is a ' +
      'wiring problem, not a corpus of size zero.',
  );
  assert.equal(
    corpus.length,
    declared,
    'expected the full corpus: spec/resources/examples declares ' + declared +
      ' documents, spec/tests/corpus holds ' + corpus.length + '. The round trip ' +
      'is only as good as the population it runs over, and the ledger below is ' +
      'only meaningful against the corpus it was written against.',
  );
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
