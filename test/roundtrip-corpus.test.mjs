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
 *   - PROSE WHITESPACE RUNS. Code, attribute values and nonbreaking spaces
 *     remain significant. Pandoc's `Space` is one space, so `a  b` is `a b`, the
 *     same normalization its own markdown reader performs.
 *
 * Compare parsed DOM trees, so equivalent entity spellings, optional end tags,
 * and other HTML parser normalization also compare equal.
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
import { normalizeHtml } from './html-equivalence.mjs';

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

const KNOWN_LOSSY = new Set([
  // A BLANK-ONLY CODE PAYLOAD AND AN EMPTY ONE SHARE ONE PANDOC ENCODING.
  // `CARVE-P12-064` distinguishes `"\n"` from `""`; pandoc's own markdown reader
  // returns `""` for both a blank-line payload and an empty fence, so the
  // CodeBlock has nowhere to keep the difference. The bridge reports it as
  // `field-unspellable` rather than losing it in silence.
  '524-an-empty-code-payload-renders-no-characters-2.crv',
  '291-a-fence-keeps-the-blank-line-at-the-end-of-its-content-5.crv',
  '291-a-fence-keeps-the-blank-line-at-the-end-of-its-content-6.crv',
  '619-a-fence-run-that-dedents-out-of-a-child-keeps-the-outer-item-tight-10.crv',
  '626-an-indented-plus-below-a-nested-fence-stays-content-at-every-depth-5.crv',
  '626-an-indented-plus-below-a-nested-fence-stays-content-at-every-depth-7.crv',
  '638-nested-plus-below-fence-and-description.crv',
  '101-table-header-cell-rowspan.crv',
  '110-empty-link-and-image-titles-are-preserved.crv',
  '173-implicit-heading-references-with-no-definition.crv',
  '22-footnotes-5.crv',
  '23-inline-footnotes-2.crv',
  // A ROW HEADER OUTSIDE THE LEADING RUN cannot be said in pandoc's model.
  // `RowHeadColumns` is a count of a row's FIRST cells and `Cell` carries no
  // header flag of its own, so `| =h |= i |` - a data cell, then a row header -
  // has nowhere to be recorded. Splitting into further bodies does not help:
  // that partitions ROWS, and this is cells disagreeing WITHIN a row.
  //
  // Both documents reach that shape through the padding rule - a kind marker is
  // a marker only when a space follows it, so `|=h|` is the literal text `=h`
  // and only the second cell is a header. Against an engine that needed no
  // space BOTH cells were headers, the leading run covered them, and the trip
  // was clean. That is why this surfaces on a pin bump rather than on any
  // change to this bridge, and it is a MODEL limit, not a mapping defect.
  //
  // The forward direction now WARNS instead of dropping it in silence
  // (`table-row-head-outside-leading-run`), which is the whole of what can be
  // done short of a slot pandoc does not have.
  '256-table-cell-padding-must-be-a-space-18.crv',
  '284-a-ragged-table-keeps-each-row-s-cell-count-2.crv',
  '284-a-ragged-table-keeps-each-row-s-cell-count-3.crv',
  '284-a-ragged-table-keeps-each-row-s-cell-count.crv',
  '311-a-footnote-in-reference-link-text-nests-the-anchors-too-3.crv',
  // PANDOC'S `Note` HAS NO IDENTITY. A note cited twice becomes two notes on
  // the return leg.
  '311-a-footnote-in-reference-link-text-nests-the-anchors-too-4.crv',
  '573-a-footnote-reference-in-link-text-keeps-its-id-on-the-sup.crv',
  // A LINE-BLOCK CODE SPAN HOLDING A FENCE LINE has no spelling the engine's
  // writer accepts once its layout is gone, so the newlines fold to spaces and
  // the bridge reports `field-unspellable`.
  '561-a-line-block-payload-span-pairs-past-the-content-column-2.crv',
  '561-a-line-block-payload-span-pairs-past-the-content-column.crv',
  // A CLASS ON A CODE BLOCK IS READ AS ITS LANGUAGE. Pandoc's `CodeBlock` has
  // one class list and its writers treat the first class as the language, so
  // `{.c}` over a fence comes back as `` ```c ``.
  '584-a-fence-past-the-column-after-an-attribute-line-opens-on-its-authored-base-2.crv',
  '584-a-fence-past-the-column-after-an-attribute-line-opens-on-its-authored-base.crv',
  '606-an-unclosed-fence-after-an-attribute-line-in-a-container-ends-at-its-closer-2.crv',
  '650-a-wrapped-attribute-line-interrupts-like-a-one-line-attribute-line-3.crv',
  '650-a-wrapped-attribute-line-interrupts-like-a-one-line-attribute-line.crv',
  '315-an-inline-note-s-content-resolves-after-the-note-6.crv',
  '323-a-block-attached-after-an-invisible-line-leaves-the-item-tight-5.crv',
  '328-an-unclosed-verbatim-run-in-a-row-stops-at-the-closing-pipe-2.crv',
  // Both of the next two are reported by the forward direction and documented
  // under Limitations in docs/reference.md, the same way 494 and 495 are.
  //
  // A DECLARED BODY CARRIES ONE ROW-HEAD COUNT, and pandoc's model has no slot
  // for a per-row one: `RowHeadColumns` applies to every data row of its body.
  // `{body-rows=2}` over `|= A |= B |` and `| c | d |` states ONE body whose
  // first row's cells are both header cells and whose second row's are not, so
  // the count collapses to the one both rows agree on and row 1 loses its
  // scope. Splitting the body would carry the cells but contradict the count
  // the source states.
  //
  // Masked until the engine pin reached 0.1.10. Measured on 0.1.8, which does
  // not consume the metadata at all (carve-js#2495): the keys leaked as literal
  // `<table body-rows="2">` on BOTH sides of the comparison and the document
  // read as a clean round trip. The gate's oracle is the pinned engine, so a
  // blind spot the engine and the bridge share is one it cannot see.
  '544-explicit-body-counts-include-native-header-cells.crv',
  // A ROWSPAN THAT CROSSES A DECLARED BODY BOUNDARY. The engine keeps the table
  // in one `<tbody>` and the span at its stated height; the bridge honors the
  // boundary, so pandoc's per-section row lists clip the span to the first body
  // and the continuation becomes an empty cell in the second. Same masking as
  // 544 above: byte-identical on 0.1.8 because neither side read the metadata.
  '542-a-span-across-bodies-keeps-their-header-semantics.crv',
  // A rowspan that starts in a head or foot row and continues into the body.
  // Pandoc's `TableHead` and `TableBody` hold separate row lists and confine a
  // cell's `rowSpan` to its own section, so the continuation is clipped to an
  // empty body cell - reported by the forward direction, and documented under
  // Limitations in docs/reference.md.
  '494-an-explicit-table-head-span-keeps-one-row-group.crv',
  '495-a-table-foot-span-keeps-one-row-group.crv',
  // Pandoc ColSpec carries horizontal alignment and width, but has no vertical
  // alignment slot. The bridge deliberately does not leak Carve's `valigns`
  // source metadata into the Pandoc table Attr, so these two vertical-axis
  // examples lose that axis on the source round trip. The AST path remains
  // lossless because it keeps the Carve column records directly.
  '370-table-columns-carry-alignment-vertical-alignment-and-widths.crv',
  '371-a-table-alignment-run-carries-two-independent-axes.crv',
  '373-a-vertical-table-marker-needs-a-horizontal-partner.crv',
  // A header cell after an unmarked cell has no Pandoc RowHeadColumns slot.
  // Vertical alignment likewise has no Pandoc table slot. All three losses
  // are reported by the forward conversion.
  '659-table-spans-keep-alignment-defaults-in-physical-columns-2.crv',
  '659-table-spans-keep-alignment-defaults-in-physical-columns-7.crv',
  '659-table-spans-keep-alignment-defaults-in-physical-columns-10.crv',
  '375-a-table-cell-can-inherit-horizontal-alignment.crv',
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
  '345-a-line-block-s-hard-break-keeps-its-backslash-2.crv',
  '346-a-line-block-s-last-body-line-keeps-its-backslash-2.crv',
  '346-a-line-block-s-last-body-line-keeps-its-backslash.crv',
  '45-inline-extensions-12.crv',
  '45-inline-extensions-13.crv',
  '45-inline-extensions-7.crv',
  // The same shape as `256-...-18` above: `|=<< Note |= Plain |` leaves the
  // first cell literal and marks only the second as a row header.
  '53-table-doubled-alignment-marker.crv',
  // An inline note still has no attribute slot. The standalone Note case is
  // covered by the attributed footnote reference tests.
  '475-footnote-references-take-an-attribute-run-editorial-substitution-and-comment-take-none-2.crv',
  '71-attribute-edge-cases-10.crv',
  '71-attribute-edge-cases-8.crv',
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
const silent = [];
for (const { name, source } of corpus) {
  let back;
  let reported;
  try {
    const forward = carveToPandoc(source, { roundtrip: true });
    const reverse = pandocToCarve(forward.doc);
    back = reverse.carve;
    reported = forward.diagnostics.length + reverse.diagnostics.length;
  } catch (error) {
    lossy.push(`${name}: threw: ${String(error.message).split('\n')[0]}`);
    continue;
  }
  if (normalizeHtml(carveToHtml(source)) !== normalizeHtml(carveToHtml(back))) {
    lossy.push(name);
    if (reported === 0) silent.push(name);
  }
}

test('every document that does not survive the trip says so in a diagnostic', () => {
  // An empty diagnostics list is the report's claim that nothing was lost, so
  // a ledgered loss that reports nothing is a false clean bill.
  assert.ok(lossy.length > 0, 'the round trip measured no loss at all, so this check compared nothing');
  assert.deepEqual(silent, [], 'lost in the round trip with no diagnostic:\n  ' + silent.join('\n  '));
});

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
