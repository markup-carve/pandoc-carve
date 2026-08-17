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
 *   - Quoted is NO LONGER one of them. P10 recorded it as a deliberate loss on
 *     the premise that "Carve has no quote node"; the premise was wrong. `"`
 *     and `'` resolve to `smart_punctuation` carrying the mark's KIND, so the
 *     pair rebuilds pandoc's wrapping `Quoted` and the row moved from policy
 *     to round-trip. What is pinned here now is the round trip and the three
 *     shapes that must NOT be promoted to a quotation;
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

test('a quotation is written as the marks an author types, and warns about nothing', () => {
  const { carve, warnings } = pandocToCarve(para([quoted('DoubleQuote', 'quoted')]));
  assert.equal(carve, '"quoted"\n');
  assert.deepEqual(warnings, [], 'nothing is lost, so nothing is reported');
});

test('the single-quote kind is written the same way', () => {
  const { carve, warnings } = pandocToCarve(para([quoted('SingleQuote', 'q')]));
  assert.equal(carve, "'q'\n");
  assert.deepEqual(warnings, []);
});

test('a document without a quotation gets no quotation warning', () => {
  const { warnings } = pandocToCarve(para([{ t: 'Str', c: 'plain' }]));
  assert.equal(warnings.length, 0, warnings.join(' | '));
});

test('a quotation comes back as a Quoted, of the kind it left as', () => {
  for (const kind of ['DoubleQuote', 'SingleQuote']) {
    const { carve } = pandocToCarve(para([quoted(kind, 'quoted')]));
    const [para1] = carveToPandoc(carve).doc.blocks;
    assert.deepEqual(para1.c, [quoted(kind, 'quoted')], `${kind} round-trips`);
  }
});

test('a quotation around markup keeps both, nested the way it left', () => {
  const rich = {
    t: 'Quoted',
    c: [{ t: 'DoubleQuote' }, [{ t: 'Emph', c: [{ t: 'Str', c: 'a' }] }]],
  };
  const { carve } = pandocToCarve(para([rich]));
  assert.equal(carve, '"/a/"\n');
  assert.deepEqual(carveToPandoc(carve).doc.blocks[0].c, [rich]);
});

test('quotations nest, inner kind and outer kind both preserved', () => {
  const inner = quoted('SingleQuote', 'b');
  const outer = {
    t: 'Quoted',
    c: [{ t: 'DoubleQuote' }, [{ t: 'Str', c: 'a' }, { t: 'Space' }, inner]],
  };
  const { carve } = pandocToCarve(para([outer]));
  assert.equal(carve, '"a \'b\'"\n');
  assert.deepEqual(carveToPandoc(carve).doc.blocks[0].c, [outer]);
});

/*
 * WHAT MUST NOT BECOME A QUOTATION. The marks pair from the CLOSING side
 * against still-open marks of the same kind, which is what keeps these three
 * apart from a real quotation. Each is a case where promoting the mark would
 * assert something the source does not say.
 */

test('an apostrophe is a lone closing mark and stays one', () => {
  // `it's` resolves to a right_single_quote with no opener. Pairing it with
  // the next apostrophe in the paragraph would quote the text between them.
  const doc = carveToPandoc("it's fine, isn't it\n").doc;
  assert.ok(!JSON.stringify(doc).includes('"Quoted"'), JSON.stringify(doc));
});

test('an unclosed quote mark stays a mark', () => {
  const doc = carveToPandoc('"unclosed here\n').doc;
  assert.ok(!JSON.stringify(doc).includes('"Quoted"'), JSON.stringify(doc));
});

test('a quotation crossing an emphasis boundary pairs with nothing', () => {
  // The two marks land in different sibling arrays, where neither can see the
  // other - `"a /b" c/` is not a quotation in any reading.
  const doc = carveToPandoc('"a /b" c/\n').doc;
  assert.ok(!JSON.stringify(doc).includes('"Quoted"'), JSON.stringify(doc));
});

test('a quote character that is ordinary text stays ordinary text', () => {
  // What makes the unescaped mark safe to read as a quotation: the writer
  // escapes the ones that are not.
  const { carve } = pandocToCarve(para([{ t: 'Str', c: 'he said "x" and it\'s his' }]));
  assert.ok(carve.includes('\\"x\\"'), carve);
  assert.deepEqual(
    carveToPandoc(carve).doc.blocks[0].c.filter((x) => x.t === 'Str').map((x) => x.c),
    ['he', 'said', '"x"', 'and', "it's", 'his'],
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
