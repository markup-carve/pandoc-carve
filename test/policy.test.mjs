import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();

/** Read foreign source with pandoc, so the fixture is pandoc's own output. */
const pandocRead = (bin, source, from = 'markdown') =>
  JSON.parse(execFileSync(bin, ['-f', from, '-t', 'json'], { input: source, encoding: 'utf8' }));

// SmallCaps and column widths survive in the 0.2 tree. The source writer
// reports when it cannot spell those fields. Quotation marks use typed smart
// punctuation and round-trip through Pandoc's Quoted node.

const para = (inlines) => ({
  'pandoc-api-version': [1, 23, 1],
  meta: {},
  blocks: [{ t: 'Para', c: inlines }],
});

const quoted = (kind, s) => ({ t: 'Quoted', c: [{ t: kind }, [{ t: 'Str', c: s }]] });

// --- SmallCaps -------------------------------------------------------------

test('policy: SmallCaps imports as a typed node and reports source loss', () => {
  const { carve, warnings } = pandocToCarve(
    para([{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }]),
  );
  assert.equal(carve, 'caps\n');
  assert.ok(
    warnings.some((w) => w.includes('small_caps') && w.includes('structure-unspellable')),
    warnings.join(' | '),
  );
});

test('the AST target keeps SmallCaps as the interchange node, with nothing reported', () => {
  const { ast, warnings } = pandocToCarveAst(para([{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }]));
  assert.deepEqual(ast.children[0].children, [{ type: 'small_caps', children: [{ type: 'text', value: 'caps' }] }]);
  assert.ok(!warnings.some((w) => w.includes('SmallCaps')), warnings.join(' | '));
});

test('the small_caps node exports to SmallCaps, and its attributes ride a Span', () => {
  const wire = (attrs) => ({
    type: 'document',
    astVersion: '2.0',
    children: [{ type: 'paragraph', children: [{ type: 'small_caps', children: [{ type: 'text', value: 'caps' }], ...(attrs ? { attrs } : {}) }] }],
  });
  const bare = carveAstToPandoc(wire()).doc.blocks[0].c;
  assert.deepEqual(bare, [{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }]);

  const attributed = carveAstToPandoc(wire({ id: 'x', classes: ['k'] })).doc.blocks[0].c;
  assert.equal(attributed[0].t, 'Span');
  assert.deepEqual(attributed[0].c[0], ['x', ['carve-inline-attrs', 'k'], [['carve-inline-type', 'small_caps']]]);
  assert.deepEqual(attributed[0].c[1], [{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }]);
  assert.deepEqual(pandocToCarveAst(para(attributed)).ast.children[0].children[0].attrs, { id: 'x', classes: ['k'] });
});

test(
  'policy: typed small caps survive to a writer that has no classes',
  { skip: !pandoc && 'pandoc not found' },
  () => {
    const { doc } = carveAstToPandoc({ type: 'document', astVersion: '2.0', children: [
      { type: 'paragraph', children: [
        { type: 'text', value: 'Hello ' },
        { type: 'small_caps', children: [{ type: 'text', value: 'world' }] },
        { type: 'text', value: '.' },
      ] },
    ] });
    assert.match(pandocRender(pandoc, doc, 'latex'), /\\textsc\{world\}/);
  },
);

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
  'policy: a ColSpec width crosses the typed tree and reports source loss',
  { skip: !pandoc && 'pandoc not found' },
  () => {
    const doc = pandocRead(pandoc, GRID_TABLE);
    const colspecs = doc.blocks[0].c[2];
    // Pandoc derived these widths from the ASCII grid.
    assert.ok(
      colspecs.every((cs) => cs[1].t === 'ColWidth'),
      JSON.stringify(colspecs),
    );

    const { carve, warnings } = pandocToCarve(doc);
    assert.ok(carve.includes('|= Wide column |'), carve);
    assert.ok(warnings.some((warning) => warning.includes('field columns')), warnings.join(' | '));
    const { ast } = pandocToCarveAst(doc);
    assert.deepEqual(ast.children[0].columns.map((column) => column.width),
      colspecs.map((cs) => cs[1].c));
    const back = carveAstToPandoc(ast).doc.blocks[0].c[2].map((cs) => cs[1]);
    assert.deepEqual(back.map((width) => width.t), colspecs.map((cs) => cs[1].t));
    back.forEach((width, i) => {
      assert.ok(Math.abs(width.c - colspecs[i][1].c) < 1e-12, `${width.c} != ${colspecs[i][1].c}`);
    });
  },
);

test('policy: tables without authored widths carry ColWidthDefault and alignment', () => {
  const { doc } = carveToPandoc('{aligns=left,right}\n|= A |= B |\n| a | b |\n');
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
  assert.ok(back.includes('{aligns=left,right}'), back);
});
