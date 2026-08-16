import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();

/** Read foreign source with pandoc, so the fixture is pandoc's own output. */
const pandocRead = (bin, source, from = 'markdown') =>
  JSON.parse(execFileSync(bin, ['-f', from, '-t', 'json'], { input: source, encoding: 'utf8' }));

/*
 * The constructs markup-carve/carve#1210's P10 closes as deliberate policy
 * rather than as gaps to map. Documenting a loss is only honest when the
 * documented behavior is the measured one, so each row is pinned here:
 *
 *   - SmallCaps degrades to a `.smallcaps` span AND comes back;
 *   - Quoted degrades to literal curly quotes and SAYS so (it was silent);
 *   - a ColSpec's ColWidth is dropped, silently and on purpose;
 *   - a rowspan crossing the head/body boundary is clipped, with a warning
 *     (asserted in test/row-groups.test.mjs, which owns the table shapes).
 */

const para = (inlines) => ({
  'pandoc-api-version': [1, 23, 1],
  meta: {},
  blocks: [{ t: 'Para', c: inlines }],
});

const quoted = (kind, s) => ({ t: 'Quoted', c: [{ t: kind }, [{ t: 'Str', c: s }]] });

// --- SmallCaps -------------------------------------------------------------

test('policy: SmallCaps imports as a .smallcaps span, with the warning that says so', () => {
  const { carve, warnings } = pandocToCarve(
    para([{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }]),
  );
  assert.ok(carve.includes('[caps]{.smallcaps}'), carve);
  assert.ok(
    warnings.some((w) => w.includes('SmallCaps') && w.includes('.smallcaps span')),
    warnings.join(' | '),
  );
});

test('policy: the .smallcaps span exports back to SmallCaps, so the degradation round-trips', () => {
  const before = para([{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }]);
  const { carve } = pandocToCarve(before);
  const after = carveToPandoc(carve).doc;
  assert.deepEqual(after.blocks[0].c, before.blocks[0].c);
});

test('policy: a .smallcaps span keeps its other attributes around the SmallCaps', () => {
  // pandoc's own markdown reader strips the class, wraps the content in
  // SmallCaps and hangs whatever is left on a Span. Same shape here.
  const { doc } = carveToPandoc('[x]{#i .smallcaps .other k=v}\n');
  assert.deepEqual(doc.blocks[0].c, [
    {
      t: 'Span',
      c: [
        ['i', ['other'], [['k', 'v']]],
        [{ t: 'SmallCaps', c: [{ t: 'Str', c: 'x' }] }],
      ],
    },
  ]);
});

test('policy: the class is matched case-sensitively, as pandoc matches it', () => {
  const { doc } = carveToPandoc('[x]{.SmallCaps}\n');
  assert.equal(doc.blocks[0].c[0].t, 'Span', JSON.stringify(doc.blocks[0].c));
});

test(
  'policy: small caps survive to a writer that has no classes',
  { skip: !pandoc && 'pandoc not found' },
  () => {
    // The reason the export arm exists: a bare Span reaches the LaTeX writer as
    // `{x}`, which renders nothing at all.
    const { doc } = carveToPandoc('Hello [world]{.smallcaps}.\n');
    assert.match(pandocRender(pandoc, doc, 'latex'), /\\textsc\{world\}/);
  },
);

test(
  'policy: pandoc and the bridge agree on what a .smallcaps span means',
  { skip: !pandoc && 'pandoc not found' },
  () => {
    for (const src of ['[x]{.smallcaps}', '[x]{.smallcaps #i}', '[x]{#i .smallcaps .other}']) {
      const theirs = pandocRead(pandoc, `${src}\n`).blocks[0].c;
      const ours = carveToPandoc(`${src}\n`).doc.blocks[0].c;
      assert.deepEqual(ours, theirs, src);
    }
  },
);

// --- Quoted ----------------------------------------------------------------

test('policy: Quoted degrades to literal curly quotes and reports it', () => {
  const { carve, warnings } = pandocToCarve(para([quoted('DoubleQuote', 'quoted')]));
  assert.ok(carve.includes('“quoted”'), carve);
  const hits = warnings.filter((w) => w.includes('Quoted'));
  assert.equal(hits.length, 1, warnings.join(' | '));
  assert.match(hits[0], /curly quote/);
});

test('policy: the single-quote kind degrades the same way, and is reported too', () => {
  const { carve, warnings } = pandocToCarve(para([quoted('SingleQuote', 'q')]));
  assert.ok(carve.includes('‘q’'), carve);
  assert.equal(warnings.filter((w) => w.includes('Quoted')).length, 1, warnings.join(' | '));
});

test('policy: many quotations report once, not once each', () => {
  const doc = para([
    quoted('DoubleQuote', 'one'),
    { t: 'Space' },
    quoted('SingleQuote', 'two'),
    { t: 'Space' },
    quoted('DoubleQuote', 'three'),
  ]);
  const { carve, warnings } = pandocToCarve(doc);
  for (const needle of ['“one”', '‘two’', '“three”']) assert.ok(carve.includes(needle), carve);
  assert.equal(warnings.filter((w) => w.includes('Quoted')).length, 1, warnings.join(' | '));
});

test('policy: a document without a quotation gets no quotation warning', () => {
  const { warnings } = pandocToCarve(para([{ t: 'Str', c: 'plain' }]));
  assert.equal(warnings.length, 0, warnings.join(' | '));
});

test('policy: the degradation is one-way, which is what the warning claims', () => {
  const { carve } = pandocToCarve(para([quoted('DoubleQuote', 'quoted')]));
  const back = carveToPandoc(carve).doc;
  assert.ok(
    !JSON.stringify(back).includes('"Quoted"'),
    'a Quoted that came back would make the warning wrong',
  );
});

// --- ColWidth --------------------------------------------------------------

const GRID_TABLE = `+---------------+------+
| Wide column   | B    |
+===============+======+
| a             | b    |
+---------------+------+
`;

test(
  'policy: a ColSpec width is dropped, and dropped silently',
  { skip: !pandoc && 'pandoc not found' },
  () => {
    const doc = pandocRead(pandoc, GRID_TABLE);
    const colspecs = doc.blocks[0].c[2];
    // The premise: pandoc DERIVED these widths from the ASCII column widths.
    // Nobody wrote them, which is the reason there is no diagnostic.
    assert.ok(
      colspecs.every((cs) => cs[1].t === 'ColWidth'),
      JSON.stringify(colspecs),
    );

    const { carve, warnings } = pandocToCarve(doc);
    // Padded form per spec section 6e: a space between marker and content.
    assert.ok(carve.includes('|= Wide column |'), carve);
    assert.equal(warnings.length, 0, warnings.join(' | '));
    assert.ok(!/\d\.\d/.test(carve), `no width reached the source: ${carve}`);
  },
);

test('policy: tables leaving the bridge carry ColWidthDefault, alignment aside', () => {
  const { doc } = carveToPandoc('|=A|=B|\n|:--|--:|\n| a | b |\n');
  const colspecs = doc.blocks[0].c[2];
  assert.deepEqual(
    colspecs.map((cs) => cs[1]),
    [{ t: 'ColWidthDefault' }, { t: 'ColWidthDefault' }],
  );
  // Alignment is the half of a ColSpec that DOES cross, in both directions.
  assert.deepEqual(
    colspecs.map((cs) => cs[0].t),
    ['AlignLeft', 'AlignRight'],
  );
  const back = pandocToCarve(doc).carve;
  // Padded form per spec section 6e: the writer separates every cell's content
  // from its markers with a space, so the alignment sigils read `|=< A |`.
  assert.ok(back.includes('|=< A |=> B |'), back);
});
