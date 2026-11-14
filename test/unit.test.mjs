import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, carveAstToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';

const blocks = (src) => carveToPandoc(src).doc.blocks;
const firstInlines = (src) => blocks(src)[0].c;

test('paragraph with word-split text', () => {
  assert.deepEqual(firstInlines('Hello world'), [
    { t: 'Str', c: 'Hello' },
    { t: 'Space' },
    { t: 'Str', c: 'world' },
  ]);
});

test('emphasis family maps to native constructors', () => {
  const xs = firstInlines('/i/ *b* */bi/* {_u_} {~s~} {=h=} {^sup^} {,sub,}');
  const tags = xs.filter((x) => x.t !== 'Space').map((x) => x.t);
  assert.deepEqual(tags, [
    'Emph',
    'Strong',
    'Strong', // bold-italic outer
    'Underline',
    'Strikeout',
    'Span', // highlight
    'Superscript',
    'Subscript',
  ]);
  // bold-italic nests Emph inside Strong
  assert.equal(xs.filter((x) => x.t === 'Strong')[1].c[0].t, 'Emph');
  // highlight carries class "mark"
  const mark = xs.find((x) => x.t === 'Span');
  assert.deepEqual(mark.c[0][1], ['mark']);
});

test('heading with attributes', () => {
  const [h] = blocks('{#intro .lead}\n## Setup');
  assert.equal(h.t, 'Header');
  assert.equal(h.c[0], 2);
  assert.deepEqual(h.c[1], ['intro', ['lead'], []]);
});

test('code span and code block with language and title', () => {
  const [para] = blocks('`x = 1`');
  assert.equal(para.c[0].t, 'Code');
  assert.equal(para.c[0].c[1], 'x = 1');

  const [cb] = blocks('```python "greet.py"\ndef f(): pass\n```');
  assert.equal(cb.t, 'CodeBlock');
  assert.deepEqual(cb.c[0][1], ['python']);
  assert.deepEqual(cb.c[0][2], [['carve-title', JSON.stringify([{ type: 'text', value: 'greet.py' }])]]);
});

test('inline literal renders as prose, never as Code', () => {
  // PART 9 SS27: the <code> wrapper is dropped, so it must NOT become Pandoc
  // Code (monospace) - that would invert the construct's whole purpose.
  const xs = firstInlines('!`/kaet/`');
  assert.deepEqual(xs[0].c[1], [{ t: 'Str', c: '/kaet/' }]);
  assert.deepEqual(xs[0].c[0][1], ['carve-literal']);
  assert.ok(!xs.some((x) => x.t === 'Code'));

  // ... unlike its code-span sibling, which stays Code.
  assert.equal(firstInlines('`/kaet/`')[0].t, 'Code');
});

test('inline literal carries attributes on a Span', () => {
  // carve-js emits a <span> only when the attribute block is present, and
  // bare text otherwise - the Pandoc mapping mirrors that split.
  const [span] = firstInlines('!`x`{.ipa}');
  assert.equal(span.t, 'Span');
  assert.deepEqual(span.c[0], ['', ['carve-literal', 'ipa'], [['value', '"x"']]]);
  assert.deepEqual(carveToPandoc('!`x`{.ipa}').doc.blocks[0].c[0].c[1], [{ t: 'Str', c: 'x' }]);
  assert.deepEqual(span.c[1], [{ t: 'Str', c: 'x' }]);
});

test('inline literal content stays verbatim and emits no warning', () => {
  const { doc, warnings } = carveToPandoc('!`a<b>` and !`*not bold*`');
  const xs = doc.blocks[0].c;
  // no inline construct is parsed inside, and nothing degrades
  assert.ok(!xs.some((x) => x.t === 'Strong'));
  assert.deepEqual(xs[0].c[1], [{ t: 'Str', c: 'a<b>' }]);
  assert.deepEqual(warnings, []);
});

test('inline literal preserves runs of spaces verbatim', () => {
  // Prose collapses a run of spaces to a single Space, but a literal captures
  // its content VERBATIM - collapsing would lose what the author wrote.
  const xs = carveToPandoc('!`a  b`').doc.blocks[0].c;
  assert.deepEqual(xs[0].c[1].map((x) => x.t), ['Str', 'Space', 'Space', 'Str']);
  // ... while ordinary prose still collapses, so the change stays scoped.
  const prose = carveToPandoc('a  b').doc.blocks[0].c;
  assert.deepEqual(prose.map((x) => x.t), ['Str', 'Space', 'Str']);
});

test('inline literal contributes its text to heading slugs for crossrefs', () => {
  // It renders as visible prose, so it must slug like a code span does -
  // otherwise a crossref into that heading could never resolve.
  const [, para] = blocks('# !`Cat`\n\nSee </#Cat>\n');
  const link = para.c.find((x) => x.t === 'Link');
  assert.ok(link, 'crossref did not resolve into the literal-only heading');
  assert.equal(link.c[2][0], '#Cat');
  assert.deepEqual(link.c[1][0].c[1], [{ t: 'Str', c: 'Cat' }]);
});

test('name lookups compare case exactly', () => {
  const [para] = blocks('# Plan\n\n{#Fig-One}\n![x](x.png)\n^ Figure #: One\n\n</#Plan> </#plan> [Plan][] [plan][] </#fig-one>\n').filter((b) => b.t === 'Para');
  const links = para.c.filter((x) => x.t === 'Link');
  assert.deepEqual(links.map((l) => l.c[2][0]), ['#Plan', '#plan', '#Plan', '', '#fig-one']);
  assert.ok(links[3].c[0][2].some(([key]) => key === 'carve-unresolved'));
});

test('a crossref reaches an id spelled in either normalization form', () => {
  const nfd = 'cafe\u0301';
  for (const [id, target] of [[nfd, nfd], ['caf\u00e9', nfd]]) {
    const [para] = blocks(`{id="${id}"}\n# Hello\n\n</#${target}>\n`).filter((b) => b.t === 'Para');
    const link = para.c.find((x) => x.t === 'Link');
    assert.equal(link.c[2][0], `#${target}`, `${JSON.stringify(id)} <- ${JSON.stringify(target)}`);
    assert.ok(link.c[0][2].some(([key]) => key === 'carve-xref'));
  }
});

test('links, autolinks, images', () => {
  const [a] = firstInlines('[t](https://e.com "Ti")');
  assert.equal(a.t, 'Link');
  assert.deepEqual(a.c[2], ['https://e.com', 'Ti']);

  const [auto] = firstInlines('<https://e.com>');
  assert.equal(auto.t, 'Link');
  assert.deepEqual(auto.c[0][2], [['carve-autolink', '1']]);

  const [email] = firstInlines('<hi@e.com>');
  assert.equal(email.c[2][0], 'mailto:hi@e.com');

  const [img] = firstInlines('inline ![alt text](i.png) here').filter((x) => x.t === 'Image');
  assert.deepEqual(img.c[2], ['i.png', '']);
  assert.deepEqual(img.c[1], [{ t: 'Str', c: 'alt' }, { t: 'Space' }, { t: 'Str', c: 'text' }]);
});

test('raw inline and raw block pass through with their format', () => {
  const xs = firstInlines('x `\\alpha`{=latex} y `<b>`{=html}');
  const raws = xs.filter((x) => x.t === 'RawInline');
  assert.deepEqual(raws, [
    { t: 'RawInline', c: ['latex', '\\alpha'] },
    { t: 'RawInline', c: ['html', '<b>'] },
  ]);

  const [rb] = blocks('```=html\n<details>x</details>\n```');
  assert.equal(rb.t, 'RawBlock');
  assert.equal(rb.c[0], 'html');
});

test('math inline and display', () => {
  const xs = firstInlines('$`e=mc^2`');
  assert.deepEqual(xs[0], { t: 'Math', c: [{ t: 'InlineMath' }, 'e=mc^2'] });
  const [dp] = blocks('$$`e^{i\\pi}+1=0`');
  assert.equal(dp.c[1][0].c[0].c[0].t, 'DisplayMath');
});

test('footnotes: reference and inline resolve to Note', () => {
  const xs = firstInlines('x[^n]\n\n[^n]: the /def/ here');
  const note = xs.find((x) => x.t === 'Span' && x.c[0][1].includes('carve-footnote-ref'))?.c[1][0];
  assert.ok(note, 'reference note present');
  assert.equal(note.c[0].t, 'Para');
  assert.ok(note.c[0].c.some((i) => i.t === 'Emph'));

  const xs2 = firstInlines('x^[inline note]');
  const note2 = xs2.find((x) => x.t === 'Note');
  assert.ok(note2, 'inline note present');
});

test('missing footnote definition stays identifiable in Pandoc JSON', () => {
  const r = carveToPandoc('x[^ghost]');
  const ref = r.doc.blocks[0].c[1];
  assert.equal(ref.t, 'Span');
  assert.deepEqual(ref.c[0][2], [['key', 'ghost']]);
  assert.deepEqual(ref.c[1], [{ t: 'Note', c: [] }]);
});

test('link reference definitions resolve their links and survive as tree data', () => {
  const result = carveToPandoc('[label][ref]\n\n[ref]: https://example.com "Title"');
  assert.equal(result.doc.blocks.length, 2, 'the definition is carried as raw tree data');
  const link = result.doc.blocks[0].c.find((inline) => inline.t === 'Link');
  assert.ok(link, 'the reference became a link');
  assert.deepEqual(link.c[2][0], 'https://example.com');
  assert.equal(result.doc.blocks[1].c[0], 'carve-tree');
});

test('ordered list: start, alpha and roman styles; bullet list; tasks', () => {
  const [ol] = blocks('3. c\n4. d');
  assert.equal(ol.t, 'OrderedList');
  assert.equal(ol.c[0][0], 3);
  assert.equal(ol.c[0][1].t, 'Decimal');

  const [alpha] = blocks('a) x\nb) y');
  assert.equal(alpha.c[0][1].t, 'LowerAlpha');

  // A roman marker with a dot needs two spaces (markup-carve/carve#4828).
  const [roman] = blocks('i.  x\nii.  y');
  assert.equal(roman.c[0][1].t, 'LowerRoman');

  const [tasks] = blocks('- [x] done\n- [_] todo');
  assert.equal(tasks.t, 'BulletList');
  assert.deepEqual(tasks.c.map((item) => item[0].c[0].c), ['☒', '☐']);
  assert.deepEqual(tasks.c.map((item) => item[0].c[2].c[0][2]), [[['mark', 'x']], [['mark', '_']]]);
});

test('ordered-list delimiter maps to Period and OneParen in a 0.2 tree', () => {
  const list = (delimiter) => ({ type: 'document', astVersion: '2.0', children: [{
    type: 'list', marker: { kind: 'ordered', style: '1', ...(delimiter ? { delimiter } : {}) }, spacing: 'tight',
    children: [{ type: 'list_item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }] }],
  }] });
  assert.equal(carveAstToPandoc(list(')')).doc.blocks[0].c[0][2].t, 'OneParen');
  assert.equal(carveAstToPandoc(list('.')).doc.blocks[0].c[0][2].t, 'Period');
  assert.equal(carveAstToPandoc(list(undefined)).doc.blocks[0].c[0][2].t, 'Period');
});

test('import records the Pandoc list delimiter on the 0.2 marker', () => {
  const doc = (delimiter) => ({
    'pandoc-api-version': [1, 23, 1], meta: {},
    blocks: [{ t: 'OrderedList', c: [[1, { t: 'Decimal' }, { t: delimiter }], [[{ t: 'Plain', c: [{ t: 'Str', c: 'a' }] }]]] }],
  });
  assert.equal(pandocToCarveAst(doc('OneParen')).ast.children[0].marker.delimiter, ')');
  assert.equal(pandocToCarveAst(doc('Period')).ast.children[0].marker.delimiter, '.');
  assert.equal(pandocToCarveAst(doc('DefaultDelim')).ast.children[0].marker.delimiter, '.');
});

test('tight list items become Plain, loose stay Para', () => {
  const [tight] = blocks('- a\n- b');
  assert.equal(tight.c[0][0].t, 'Plain');
  const [loose] = blocks('- a\n\n- b');
  assert.equal(loose.c[0][0].t, 'Para');
});

test('definition list', () => {
  const [dl] = blocks(':: Term\n:  Definition body');
  assert.equal(dl.t, 'DefinitionList');
  const [term, defs] = dl.c[0];
  assert.deepEqual(term[0], { t: 'Str', c: 'Term' });
  assert.equal(defs[0][0].t, 'Para');
});

test("a definition description's looseness reaches pandoc, in both spellings", () => {
  // Two blocks: the blank line between them is the loose spelling.
  const [twoBlocks] = blocks(':: Term\n:  first\n\n   second');
  assert.deepEqual(twoBlocks.c[0][1][0].map((b) => b.t), ['Para', 'Para']);

  // One block: no blank line can stand anywhere, so PART 9 section 17's
  // consumed `loose` key is the only spelling, and it must still arrive.
  const [spelled] = blocks('{loose}\n:: Term\n:  only');
  assert.equal(spelled.c[0][1][0][0].t, 'Para');
});

test('blockquote and thematic break', () => {
  const [bq] = blocks('> quoted');
  assert.equal(bq.t, 'BlockQuote');
  const [, hr] = blocks('a\n\n***\n');
  assert.equal(hr.t, 'HorizontalRule');
});

test('table: alignment colspecs, head/body split, caption', () => {
  const [t] = blocks('|= L |={>} R |={~} C |\n| 1 | 2 | 3 |\n^ Table 1: caption');
  assert.equal(t.t, 'Table');
  const colspecs = t.c[2].map((cs) => cs[0].t);
  assert.deepEqual(colspecs, ['AlignDefault', 'AlignRight', 'AlignCenter']);
  // caption
  assert.equal(t.c[1][1][0].t, 'Plain');
  // one head row, one body row
  assert.equal(t.c[3][1].length, 1);
  assert.equal(t.c[4][0][3].length, 1);
});

/*
 * A marker on a HEAD cell is the column's alignment; a marker on a BODY cell is
 * that cell's own. Measured on the engine: `|>a| b |` styles `a` and leaves the
 * cell below it untouched. Reading a body row's markers as the column's aligned
 * cells the author never aligned - every pandoc writer applies a ColSpec to any
 * cell carrying AlignDefault.
 */

test('table: a body cell marker aligns that cell, not its column', () => {
  const [t] = blocks('|{>} a| b |\n| c | d |');
  assert.deepEqual(t.c[2].map((cs) => cs[0].t), ['AlignDefault', 'AlignDefault'], 'the column is untouched');
  const cellAlign = (r, c) => t.c[4][0][3][r][1][c][1].t;
  assert.equal(cellAlign(0, 0), 'AlignRight', 'the marked cell keeps it');
  assert.equal(cellAlign(1, 0), 'AlignDefault', 'the cell below does not inherit it');
});

test('table: a head cell marker becomes the column, and only the column', () => {
  // Every cell in the row has to be a header cell for the row to BE the head.
  const [t] = blocks('|={>} H|= I |\n| c | d |');
  assert.deepEqual(t.c[2].map((cs) => cs[0].t), ['AlignRight', 'AlignDefault']);
  assert.equal(t.c[3][1][0][1][0][1].t, 'AlignRight', 'the authored cell mark survives alongside the resolved column');
});

test('structural short captions map to Pandoc without changing the full caption', () => {
  const doc = {
    type: 'document',
    astVersion: '2.0',
    children: [{
      type: 'figure',
      children: [{ type: 'paragraph', children: [{ type: 'image', src: '/i.png', alt: 'alt' }] }],
      caption: { type: 'caption', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Full caption' }] }], short: [{ type: 'text', value: 'Navigation label' }] },
    }],
  };
  const [figure] = carveAstToPandoc(doc).doc.blocks;
  assert.equal(figure.t, 'Figure');
  assert.equal(figure.c[1][0][0].c, 'Navigation');
  assert.equal(figure.c[1][1][0].c[0].c, 'Full');

  const tableDoc = {
    type: 'document',
    astVersion: '2.0',
    children: [{
      type: 'table',
      columns: [],
      children: [],
      caption: { type: 'caption', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Full table caption' }] }], short: [{ type: 'text', value: 'Table list label' }] },
    }],
  };
  const [table] = carveAstToPandoc(tableDoc).doc.blocks;
  assert.equal(table.t, 'Table');
  assert.equal(table.c[1][0][0].c, 'Table');
  assert.equal(table.c[1][1][0].c[0].c, 'Full');
});

test('table span inversion: colspan lands on origin cell, a blocked ^ stays a cell', () => {
  const [t] = blocks('|= A |= B |\n| x  | <  |\n| ^  | y  |');
  const bodyRows = t.c[4][0][3];
  const row1Cells = bodyRows[0][1];
  assert.equal(row1Cells.length, 1);
  assert.equal(row1Cells[0][3], 2, 'colSpan');
  // Extending x down would cover y, so the ^ is blocked (corpus 579).
  assert.equal(row1Cells[0][2], 1, 'rowSpan');
  assert.equal(bodyRows[1][1].length, 2);
});

test('2D table span: rowspan+colspan block counts rows, not continuations', () => {
  const paragraph = value => ({ type: 'cell_paragraph', children: [{ type: 'text', value }] });
  const cell = (value, extra = {}) => ({ type: 'table_cell', header: false, children: [paragraph(value)], ...extra });
  const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'table', columns: Array.from({ length: 3 }, () => ({ type: 'table_column' })), children: [{ type: 'table_body', children: [
    { type: 'table_row', children: [cell('x', { rowspan: 2, colspan: 2 }), cell('c1')] },
    { type: 'table_row', children: [cell('c2')] },
  ] }] }] };
  const [t] = carveAstToPandoc(ast).doc.blocks;
  const bodyRows = t.c[4][0][3];
  const [rowSpan, colSpan] = [bodyRows[0][1][0][2], bodyRows[0][1][0][3]];
  assert.equal(rowSpan, 2, 'rowSpan = rows covered');
  assert.equal(colSpan, 2, 'colSpan = cols covered');
  // row 2 has only the c2 cell left
  assert.equal(bodyRows[1][1].length, 1);
});

test('symbols retain their names in a fallback Pandoc span', () => {
  const r = carveToPandoc('a :heart: b :ghost: c');
  const spans = r.doc.blocks[0].c.filter(node => node.t === 'Span');
  assert.deepEqual(spans.map(node => node.c[0][2]), [[['name', 'heart']], [['name', 'ghost']]]);
  assert.equal(r.warnings.filter(warning => warning.includes('symbol:')).length, 2);
});

test('a captioned image and a captioned quote are both a Figure', () => {
  const [fig] = blocks('![alt](i.png)\n^ Figure 1: cap');
  assert.equal(fig.t, 'Figure');
  assert.equal(fig.c[2][0].c[1][0].c[0].t, 'Image');

  // PART 9 §4b: `figure` is the GENERIC captioned wrapper, and a quote is not
  // a special host. carve#1161 briefly made a caption on a quote an
  // `attribution` Span inside the BlockQuote; that clause is withdrawn
  // (carve#1213), and the HTML Standard puts the attribution outside the
  // blockquote, in exactly this figure/figcaption shape.
  const [quote] = blocks('> wise words\n^ Author');
  assert.equal(quote.t, 'Figure');
  assert.equal(quote.c[2][0].t, 'BlockQuote');
  assert.equal(quote.c[1][1][0].c[0].c, 'Author');

  // The control: without the caption the quote is a bare BlockQuote, so the
  // wrapper above is the caption's doing.
  const [bare] = blocks('> wise words');
  assert.equal(bare.t, 'BlockQuote');
});

test('a quote figure draws a number like any other figure', () => {
  // §4a excluded a quote from the counter, because an attribution was not a
  // numbered thing. Withdrawn: the quote takes Figure 1 and the image after it
  // takes Figure 2, exactly as a captioned code listing between them would.
  const out = blocks('> q\n^ Figure #: Src\n\n![alt](i.png)\n^ Figure #: real\n');
  assert.equal(out[0].t, 'Figure');
  assert.ok(JSON.stringify(out[0].c[1][1]).includes('"1"'), 'the quote is Figure 1');
  assert.equal(out[1].t, 'Figure');
  assert.ok(JSON.stringify(out[1].c[1][1]).includes('"2"'), 'the image is Figure 2');
});

test('a quote figure is a crossref target like any other figure', () => {
  // The rendered number and the `</#id>` text come from two different passes,
  // so pinning one says nothing about the other: §4a excluded a quote figure
  // from the crossref pass as well, and with only the rendered-number test
  // above, restoring that exclusion left the suite green while `</#q>` went
  // unresolved and every later figure's crossref shifted down by one.
  const r = carveToPandoc(
    '{#q}\n> To be\n^ Figure #: Src\n\n{#i}\n![alt](i.png)\n^ Figure #: real\n\nSee </#q> and </#i>.\n',
  );
  assert.deepEqual(r.warnings, []);
  const links = r.doc.blocks[2].c.filter((i) => i.t === 'Link');
  assert.deepEqual(
    links.map((l) => [l.c[2][0], l.c[1].map((x) => x.c ?? ' ').join('')]),
    [['#q', 'Figure 1'], ['#i', 'Figure 2']],
  );
});

test('admonition becomes classed Div with title paragraph', () => {
  const [div] = blocks('::: tip "My Title"\nbody text\n:::');
  assert.equal(div.t, 'Div');
  assert.deepEqual(div.c[0][1], ['carve-admonition', 'tip']);
  assert.deepEqual(JSON.parse(div.c[0][2][0][1]), [{ type: 'text', value: 'My Title' }]);
});

test('generic div keeps id and classes', () => {
  const [div] = blocks('{#box .highlight}\n:::\nhi\n:::');
  assert.deepEqual(div.c[0], ['box', ['highlight'], []]);
});

test('crossref resolves heading text; unresolved warns', () => {
  const r = carveToPandoc('{#sec}\n# My Section\n\nSee </#sec>.');
  const para = r.doc.blocks[1];
  const link = para.c.find((i) => i.t === 'Link');
  assert.deepEqual(link.c[2], ['#sec', '']);
  assert.deepEqual(link.c[1], [{ t: 'Str', c: 'My' }, { t: 'Space' }, { t: 'Str', c: 'Section' }]);
  assert.equal(r.warnings.length, 0);

  const bad = carveToPandoc('See </#nowhere>.');
  assert.ok(bad.warnings.some((w) => w.includes('nowhere')));
});

test('mentions, tags, symbols, abbreviations, extensions degrade to classed spans', () => {
  const r = carveToPandoc('Hi @alice about #release and :kbd[Ctrl] plus :heart:\n\n*[HTML]: HyperText\n\nHTML');
  const xs = r.doc.blocks[0].c;
  const spans = xs.filter((i) => i.t === 'Span');
  const classes = spans.map((s) => s.c[0][1][0]);
  assert.deepEqual(classes, ['carve-mention', 'carve-tag', 'carve-extension', 'carve-symbol']);
  const abbr = r.doc.blocks[2].c.find((i) => i.t === 'Span');
  assert.deepEqual(abbr.c[0][2], [['key', 'HTML'], ['expansion', 'HyperText']]);
  // degradations are warned, not silent
  assert.ok(r.warnings.some((w) => w.includes('ext-kbd') || w.includes('kbd')));
  assert.ok(r.warnings.some((w) => w.includes('symbol:')));
});

test('inline span keeps id and classes (codex finding 1)', () => {
  const [span] = firstInlines('[x y]{#id .red}');
  assert.equal(span.t, 'Span');
  assert.deepEqual(span.c[0], ['id', ['red'], []]);
  assert.deepEqual(span.c[1], [{ t: 'Str', c: 'x' }, { t: 'Space' }, { t: 'Str', c: 'y' }]);
});

test('block attrs on non-Attr blocks preserved via Div wrapper (codex finding 2)', () => {
  const [pdiv] = blocks('{.lead}\nparagraph text');
  assert.equal(pdiv.t, 'Div');
  assert.deepEqual(pdiv.c[0], ['', ['carve-paragraph', 'lead'], []]);
  assert.equal(pdiv.c[1][0].t, 'Para');

  // Roundtrip mode adds the restore marker; default stays clean.
  const marked = carveToPandoc('{.lead}\nparagraph text').doc.blocks[0];
  assert.deepEqual(marked.c[0], ['', ['carve-paragraph', 'lead'], []]);

  const [qdiv] = blocks('{#q}\n> quote');
  assert.equal(qdiv.t, 'Div');
  assert.equal(qdiv.c[0][0], 'q');
  assert.equal(qdiv.c[1][0].t, 'BlockQuote');

  const [ldiv] = blocks('{#list .fancy}\n- a\n- b');
  assert.equal(ldiv.t, 'Div');
  assert.equal(ldiv.c[1][0].t, 'BulletList');

  // attr-carrying blocks do NOT get double-wrapped
  const [h] = blocks('{#hid}\n# Head');
  assert.equal(h.t, 'Header');
});

test('admonition merges its own attrs into the Div', () => {
  const [div] = blocks('{#warn1 .urgent}\n::: warning\ncareful\n:::');
  assert.equal(div.t, 'Div');
  assert.equal(div.c[0][0], 'warn1');
  assert.deepEqual(div.c[0][1], ['carve-admonition', 'warning', 'urgent']);
});

test('critic markup keeps insert, delete, and comment nodes', () => {
  const xs = firstInlines('{+ add +} {- del -} {- old -}{+ new +} {# note #}');
  const spans = xs.filter((i) => i.t === 'Span');
  const classes = spans.map((s) => s.c[0][1][0]);
  assert.deepEqual(classes, ['carve-insert', 'carve-delete', 'carve-delete', 'carve-insert']);
  assert.ok(xs.some(i => i.t === 'RawInline' && i.c[0] === 'carve-critic-comment'));
});

test('comments survive the Pandoc JSON bridge as raw carriers', () => {
  const r = carveToPandoc('%% gone\n\nvisible %% trailing\n\n%%%\nblock comment\n%%%');
  assert.equal(r.doc.blocks[0].c[0], 'carve-comment-line');
  assert.equal(r.doc.blocks[2].c[0], 'carve-comment-block');
  assert.equal(r.doc.blocks[2].c[1], 'block comment');
});

test('frontmatter stays raw while typed root metadata maps to Pandoc meta', () => {
  const r = carveToPandoc('---\ntitle: My Doc\nauthor: Jane\ntags: [a, b]\n---\nbody');
  assert.equal(r.doc.blocks[0].c[0], 'carve-frontmatter:yaml');
  const typed = carveAstToPandoc({ type: 'document', astVersion: '2.0', children: [], metadata: { title: [{ type: 'text', value: 'My Doc' }], authors: ['Jane'] } });
  assert.equal(typed.doc.meta.title.t, 'MetaInlines');
  assert.equal(typed.doc.meta.author.t, 'MetaList');
});

test('hard break and soft break', () => {
  const xs = firstInlines('a\\\nb');
  assert.ok(xs.some((i) => i.t === 'LineBreak'));
  const xs2 = firstInlines('a\nb');
  assert.ok(xs2.some((i) => i.t === 'SoftBreak'));
});

test('smart typography flows through as text', () => {
  // `->` and `(c)` stay text (markup-carve/carve#4831, #4824).
  const text = JSON.stringify(firstInlines('an em --- dash ... and --> arrow (tm)'));
  assert.ok(text.includes('—'));
  assert.ok(text.includes('…'));
  assert.ok(text.includes('→'));
  assert.ok(text.includes('™'));
});

test('tab panel group labels remain visible in Pandoc', () => {
  const [container] = blocks(':::: tabs\n::: tab [Installation]\nRun it.\n:::\n::: tab [Usage]\nCall it.\n:::\n::::');
  const [panelA, panelB] = container.c[1];
  assert.deepEqual(panelA.c[1][0].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'Installation' }] }]);
  assert.deepEqual(panelB.c[1][0].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'Usage' }] }]);
});

test('a div title precedes its group label', () => {
  const [div] = blocks('::: note "Heads up" [side]\nBody.\n:::');
  assert.deepEqual(div.c[1][0].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'Heads' }, { t: 'Space' }, { t: 'Str', c: 'up' }] }]);
  assert.deepEqual(div.c[1][1].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'side' }] }]);
  assert.deepEqual(div.c[0][2].find(([key]) => key === 'carve-group-label'), ['carve-group-label', 'side']);
});

// A line block is VERSE (PART 9 SS23) and Pandoc has `LineBlock` for it. The
// builder existed here and nothing called it, so every line block reached the
// writers as a classed Div and lost the semantics.
test('a line block becomes a LineBlock, one entry per line', () => {
  const [lb] = blocks('::: |\nRoses are red,\nViolets are blue.\n:::');
  assert.equal(lb.t, 'LineBlock');
  assert.equal(lb.c.length, 2);
  assert.deepEqual(lb.c[1], [
    { t: 'Str', c: 'Violets' },
    { t: 'Space' },
    { t: 'Str', c: 'are' },
    { t: 'Space' },
    { t: 'Str', c: 'blue.' },
  ]);
});

test('a stanza break is an empty line', () => {
  const [lb] = blocks('::: |\nStanza one,\nstill one.\n\nStanza two.\n:::');
  assert.deepEqual(lb.c.map((line) => line.length === 0), [false, false, true, false]);
});

test('a generic div called line-block keeps its soft newline semantics', () => {
  const [div] = blocks('{.line-block}\n:::\none\ntwo\n:::');
  assert.equal(div.t, 'Div');
  assert.equal(div.c[1][0].t, 'Para');
  assert.equal(div.c[1][0].c.some((inline) => inline.t === 'LineBreak'), false);
});

// Pandoc's LineBlock has no attribute slot, so an attributed div stays a Div
// rather than lose the id the author wrote.
test('a line-block div carrying an id stays a Div', () => {
  const [div] = blocks('{#x .line-block}\n:::\none\n:::');
  assert.equal(div.t, 'Div');
  assert.equal(div.c[0][0], 'x');
});

// U+E000 is the engines' sentinel for a no-break space the parser RESOLVED. It
// is private-use: passing it through put a tofu box in every writer downstream.
test('a resolved no-break space reaches pandoc as a real one', () => {
  assert.deepEqual(firstInlines('a\\ b'), [{ t: 'Str', c: 'a' }, { t: 'Str', c: '\u00A0' }, { t: 'Str', c: 'b' }]);
});

test("a line block's preserved indentation reaches pandoc as no-break spaces", () => {
  const [lb] = blocks('::: |\n  indented\n:::');
  assert.deepEqual(lb.c[0], [{ t: 'Str', c: '\u00A0\u00A0indented' }]);
});

test('block and inline comments retain their payload in raw carriers', () => {
  const block = carveToPandoc('a\n\n%% hidden note\n\nb\n');
  assert.deepEqual(block.doc.blocks[1], { t: 'RawBlock', c: ['carve-comment-line', 'hidden note'] });

  const inline = carveToPandoc('# Title %% tail note\n');
  assert.ok(inline.doc.blocks[0].c[2].some(node => node.t === 'RawInline' && node.c[1] === 'tail note'));
});

test('Pandoc Example and TwoParens survive through 0.2 list carriers', () => {
  const doc = (style, delimiter) => ({
    'pandoc-api-version': [1, 23, 1], meta: {},
    blocks: [{ t: 'OrderedList', c: [[1, { t: style }, { t: delimiter }], [[{ t: 'Plain', c: [{ t: 'Str', c: 'a' }] }]]] }],
  });
  const example = doc('Example', 'TwoParens');
  const ast = pandocToCarveAst(example).ast;
  assert.deepEqual(ast.children[0].attrs.keyValues, [
    ['carve-example', '1'], ['carve-example-delimiter', 'TwoParens'],
  ]);
  assert.deepEqual(carveAstToPandoc(ast).doc.blocks[0].c[0], example.blocks[0].c[0]);
  assert.match(pandocToCarve(example).carve, /carve-example=1/u);
  assert.equal(pandocToCarveAst(doc('Decimal', 'OneParen')).ast.children[0].marker.delimiter, ')');
  assert.equal(pandocToCarveAst(doc('UpperRoman', 'Period')).ast.children[0].marker.style, 'I');
});

test('an unresolved reference is identifiable and reported', () => {
  for (const [source, kind] of [['[r][]', 'Link'], ['![i][]', 'Image']]) {
    const result = carveToPandoc(source);
    const block = result.doc.blocks[0];
    const inline = kind === 'Image' ? block.c[1][0].c[0] : block.c[0];
    assert.equal(inline.t, kind);
    assert.equal(inline.c[2][0], '');
    assert.ok(inline.c[0][2].some(([key]) => key === 'carve-unresolved'));
    assert.ok(result.warnings.some(warning => warning.includes('unresolved reference')));
  }
  const resolved = carveToPandoc('[a][t]\n\n[t]: /u');
  assert.equal(resolved.doc.blocks[0].c[0].c[2][0], '/u');
  assert.ok(!resolved.warnings.some(warning => warning.includes('unresolved reference')));
  assert.equal(carveToPandoc('[T]: /u\n\n[a][t]').doc.blocks[1].c[0].c[2][0], '');
});

test('the last marked header row sets the column alignment', () => {
  const [table] = blocks('|={>} a |\n|={<} b |\n| c |');
  assert.equal(table.c[2][0][0].t, 'AlignLeft');
  assert.equal(table.c[3][1][0][1][0][1].t, 'AlignRight');
  assert.equal(table.c[3][1][1][1][0][1].t, 'AlignLeft');
});

test('a sole image keeps its attributes on the Image inside its block carrier', () => {
  for (const [source, location] of [['![alt](i.png){.c width=50}', 'image'], ['{.c width=50}\n![alt](i.png)', 'paragraph']]) {
    const [block] = blocks(source);
    assert.equal(block.t, 'Div');
    const image = block.c[1][0].c[0];
    assert.equal(image.t, 'Image');
    const attrs = location === 'image' ? image.c[0] : block.c[0];
    assert.ok(attrs[1].includes('c'));
    assert.ok(attrs[2].some(([key, value]) => key === 'width' && value === '50'));
  }
});

test('an unresolved image reference keeps its attributes', () => {
  const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [{ type: 'image', alt: 'a', key: 'missing', namespace: 'link', refForm: 'full', attrs: { classes: ['c'] } }] }] };
  const { doc } = carveAstToPandoc(ast);
  const image = doc.blocks[0].c[0];
  assert.equal(image.t, 'Image');
  assert.deepEqual(image.c[0][1], ['c']);
  assert.ok(image.c[0][2].some(([key]) => key === 'carve-unresolved'));
});
