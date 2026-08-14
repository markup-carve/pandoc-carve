import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, carveAstToPandoc } from '../dist/index.js';

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
  const xs = firstInlines('/i/ *b* /*bi*/ _u_ ~s~ =h= {^sup^} {,sub,}');
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
  assert.deepEqual(cb.c[0][2], [['title', 'greet.py']]);
});

test('inline literal renders as prose, never as Code', () => {
  // PART 9 SS27: the <code> wrapper is dropped, so it must NOT become Pandoc
  // Code (monospace) - that would invert the construct's whole purpose.
  const xs = firstInlines('!`/kaet/`');
  assert.deepEqual(xs, [{ t: 'Str', c: '/kaet/' }]);
  assert.ok(!xs.some((x) => x.t === 'Code'));

  // ... unlike its code-span sibling, which stays Code.
  assert.equal(firstInlines('`/kaet/`')[0].t, 'Code');
});

test('inline literal carries attributes on a Span', () => {
  // carve-js emits a <span> only when the attribute block is present, and
  // bare text otherwise - the Pandoc mapping mirrors that split.
  const [span] = firstInlines('!`x`{.ipa}');
  assert.equal(span.t, 'Span');
  assert.deepEqual(span.c[0], ['', ['ipa'], []]);
  assert.deepEqual(span.c[1], [{ t: 'Str', c: 'x' }]);
});

test('inline literal content stays verbatim and emits no warning', () => {
  const { doc, warnings } = carveToPandoc('!`a<b>` and !`*not bold*`');
  const xs = doc.blocks[0].c;
  // no inline construct is parsed inside, and nothing degrades
  assert.ok(!xs.some((x) => x.t === 'Strong'));
  assert.equal(xs[0].c, 'a<b>');
  assert.deepEqual(warnings, []);
});

test('inline literal preserves runs of spaces verbatim', () => {
  // Prose collapses a run of spaces to a single Space, but a literal captures
  // its content VERBATIM - collapsing would lose what the author wrote.
  const xs = carveToPandoc('!`a  b`').doc.blocks[0].c;
  assert.deepEqual(xs.map((x) => x.t), ['Str', 'Space', 'Space', 'Str']);
  // ... while ordinary prose still collapses, so the change stays scoped.
  const prose = carveToPandoc('a  b').doc.blocks[0].c;
  assert.deepEqual(prose.map((x) => x.t), ['Str', 'Space', 'Str']);
});

test('inline literal contributes its text to heading slugs for crossrefs', () => {
  // It renders as visible prose, so it must slug like a code span does -
  // otherwise a crossref into that heading could never resolve.
  const [, para] = blocks('# !`Cat`\n\nSee </#cat>\n');
  const link = para.c.find((x) => x.t === 'Link');
  assert.ok(link, 'crossref did not resolve into the literal-only heading');
  assert.equal(link.c[2][0], '#cat');
  assert.deepEqual(link.c[1], [{ t: 'Str', c: 'Cat' }]);
});

test('links, autolinks, images', () => {
  const [a] = firstInlines('[t](https://e.com "Ti")');
  assert.equal(a.t, 'Link');
  assert.deepEqual(a.c[2], ['https://e.com', 'Ti']);

  const [auto] = firstInlines('<https://e.com>');
  assert.equal(auto.t, 'Link');
  assert.deepEqual(auto.c[0][1], ['uri']);

  const [email] = firstInlines('<hi@e.com>');
  assert.deepEqual(email.c[0][1], ['email']);

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
  assert.equal(dp.c[0].c[0].t, 'DisplayMath');
});

test('footnotes: reference and inline resolve to Note', () => {
  const xs = firstInlines('x[^n]\n\n[^n]: the /def/ here');
  const note = xs.find((x) => x.t === 'Note');
  assert.ok(note, 'reference note present');
  assert.equal(note.c[0].t, 'Para');
  assert.ok(note.c[0].c.some((i) => i.t === 'Emph'));

  const xs2 = firstInlines('x^[inline note]');
  const note2 = xs2.find((x) => x.t === 'Note');
  assert.ok(note2, 'inline note present');
});

test('missing footnote definition degrades with warning', () => {
  const r = carveToPandoc('x[^ghost]');
  assert.ok(r.warnings.some((w) => w.includes('ghost')));
  assert.ok(r.doc.blocks[0].c.some((i) => i.t === 'Superscript'));
});

test('link reference definitions resolve their links and emit no block or warning', () => {
  const result = carveToPandoc('[label][ref]\n\n[ref]: https://example.com "Title"');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.doc.blocks.length, 1, 'the definition itself renders nothing');
  const link = result.doc.blocks[0].c.find((inline) => inline.t === 'Link');
  assert.ok(link, 'the reference became a link');
  assert.deepEqual(link.c[2], ['https://example.com', 'Title']);
});

test('ordered list: start, alpha and roman styles; bullet list; tasks', () => {
  const [ol] = blocks('3. c\n4. d');
  assert.equal(ol.t, 'OrderedList');
  assert.equal(ol.c[0][0], 3);
  assert.equal(ol.c[0][1].t, 'Decimal');

  const [alpha] = blocks('a) x\nb) y');
  assert.equal(alpha.c[0][1].t, 'LowerAlpha');

  const [roman] = blocks('i. x\nii. y');
  assert.equal(roman.c[0][1].t, 'LowerRoman');

  const [tasks] = blocks('- [x] done\n- [_] todo');
  assert.equal(tasks.t, 'BulletList');
  assert.deepEqual(tasks.c[0][0].c.slice(0, 2), [{ t: 'Str', c: '☒' }, { t: 'Space' }]);
  assert.deepEqual(tasks.c[1][0].c.slice(0, 2), [{ t: 'Str', c: '☐' }, { t: 'Space' }]);
});

test('ordered-list delimiter maps to Period/OneParen when the AST carries it', async () => {
  // carve-js records `delim` from PR 342 onward; until the dependency ships
  // it, exercise the mapping with a hand-built AST through convert().
  const { convert } = await import('../dist/convert.js');
  const list = (delim) => ({
    type: 'document',
    children: [{
      type: 'list', ordered: true, tight: true, delim,
      items: [{ type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }] }],
    }],
  });
  assert.equal(convert(list(')')).doc.blocks[0].c[0][2].t, 'OneParen');
  assert.equal(convert(list('.')).doc.blocks[0].c[0][2].t, 'Period');
  assert.equal(convert(list(undefined)).doc.blocks[0].c[0][2].t, 'DefaultDelim');
});

test('import records the pandoc list delimiter on the Carve AST', async () => {
  const { pandocToCarve } = await import('../dist/reverse.js');
  const doc = (delim) => ({
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{ t: 'OrderedList', c: [[1, { t: 'Decimal' }, { t: delim }], [[{ t: 'Plain', c: [{ t: 'Str', c: 'a' }] }]]] }],
  });
  assert.equal(pandocToCarve(doc('OneParen')).ast.children[0].delim, ')');
  assert.equal(pandocToCarve(doc('Period')).ast.children[0].delim, '.');
  assert.equal(pandocToCarve(doc('DefaultDelim')).ast.children[0].delim, undefined);
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

test('blockquote and thematic break', () => {
  const [bq] = blocks('> quoted');
  assert.equal(bq.t, 'BlockQuote');
  const [, hr] = blocks('a\n\n---\n');
  assert.equal(hr.t, 'HorizontalRule');
});

test('table: alignment colspecs, head/body split, caption', () => {
  const [t] = blocks('|= L |=> R |=~ C |\n| 1 | 2 | 3 |\n^ Table 1: caption');
  assert.equal(t.t, 'Table');
  const colspecs = t.c[2].map((cs) => cs[0].t);
  assert.deepEqual(colspecs, ['AlignDefault', 'AlignRight', 'AlignCenter']);
  // caption
  assert.equal(t.c[1][1][0].t, 'Plain');
  // one head row, one body row
  assert.equal(t.c[3][1].length, 1);
  assert.equal(t.c[4][0][3].length, 1);
});

test('structural short captions map to Pandoc without changing the full caption', () => {
  const doc = {
    type: 'document',
    srcByteLength: 0,
    children: [{
      type: 'figure',
      target: { type: 'image', src: '/i.png', alt: 'alt' },
      caption: [{ type: 'text', value: 'Full caption' }],
      shortCaption: [{ type: 'text', value: 'Navigation label' }],
    }],
  };
  const [figure] = carveAstToPandoc(doc).doc.blocks;
  assert.equal(figure.t, 'Figure');
  assert.equal(figure.c[1][0][0].c, 'Navigation');
  assert.equal(figure.c[1][1][0].c[0].c, 'Full');

  const tableDoc = {
    type: 'document',
    srcByteLength: 0,
    children: [{
      type: 'table',
      align: ['default'],
      rows: [],
      caption: [{ type: 'text', value: 'Full table caption' }],
      shortCaption: [{ type: 'text', value: 'Table list label' }],
    }],
  };
  const [table] = carveAstToPandoc(tableDoc).doc.blocks;
  assert.equal(table.t, 'Table');
  assert.equal(table.c[1][0][0].c, 'Table');
  assert.equal(table.c[1][1][0].c[0].c, 'Full');
});

test('table span inversion: colspan and rowspan land on origin cell', () => {
  const [t] = blocks('|= A |= B |\n| x  | <  |\n| ^  | y  |');
  const bodyRows = t.c[4][0][3];
  // row 1: single cell with colSpan 2
  const row1Cells = bodyRows[0][1];
  assert.equal(row1Cells.length, 1);
  assert.equal(row1Cells[0][3], 2, 'colSpan');
  assert.equal(row1Cells[0][2], 2, 'rowSpan (x also spans down via ^ below)');
  // row 2: only the y cell remains
  const row2Cells = bodyRows[1][1];
  assert.equal(row2Cells.length, 1);
});

test('2D table span: rowspan+colspan block counts rows, not continuations', () => {
  const [t] = blocks('|= A |= B |= C |\n| x | < | c1 |\n| ^ | ^ | c2 |');
  const bodyRows = t.c[4][0][3];
  const [rowSpan, colSpan] = [bodyRows[0][1][0][2], bodyRows[0][1][0][3]];
  assert.equal(rowSpan, 2, 'rowSpan = rows covered');
  assert.equal(colSpan, 2, 'colSpan = cols covered');
  // row 2 has only the c2 cell left
  assert.equal(bodyRows[1][1].length, 1);
});

test('symbols option resolves :name:, unmapped still degrades', () => {
  const r = carveToPandoc('a :heart: b :ghost: c', { symbols: { heart: '♥' } });
  const json = JSON.stringify(r.doc.blocks);
  assert.ok(json.includes('♥'), 'mapped symbol replaced');
  assert.ok(json.includes('data-symbol'), 'unmapped still classed span');
  assert.ok(!r.warnings.some((w) => w.includes('heart')), 'no warning for mapped');
  assert.ok(r.warnings.some((w) => w.includes('ghost')), 'warning for unmapped');
});

test('listTable option converts ::: list-table to a real Table', () => {
  const src = '{header-rows=1}\n::: list-table "Cap"\n- - A\n  - B\n- - EMEA\n  - Strong.\n\n    Second para.\n- - APAC\n  - <\n:::';
  // default: degraded Div
  const [div] = blocks(src);
  assert.equal(div.t, 'Div');
  // opt-in: real table with head row, caption, colspan, block cells
  const [t] = carveToPandoc(src, { listTable: true }).doc.blocks;
  assert.equal(t.t, 'Table');
  assert.equal(t.c[1][1][0].c[0].c, 'Cap');
  assert.equal(t.c[3][1].length, 1, 'one header row');
  const bodyRows = t.c[4][0][3];
  assert.equal(bodyRows.length, 2);
  // EMEA row second cell holds TWO Para blocks (multi-block cell)
  assert.equal(bodyRows[0][1][1][4].length, 2);
  // APAC row: single cell with colSpan 2
  assert.equal(bodyRows[1][1].length, 1);
  assert.equal(bodyRows[1][1][0][3], 2, 'colspan from < marker');
});

test('listTable: boolean {header-rows} means one header row (codex finding)', () => {
  const src = '{header-rows}\n::: list-table\n- - A\n- - 1\n:::';
  const [t] = carveToPandoc(src, { listTable: true }).doc.blocks;
  assert.equal(t.t, 'Table');
  assert.equal(t.c[3][1].length, 1, 'boolean form promotes first row to header');
});

test('listTable: malformed structure falls back to Div, content preserved (codex finding)', () => {
  const src = '::: list-table\nstray paragraph\n\n- - A\n- - 1\n:::';
  const r = carveToPandoc(src, { listTable: true });
  const [div] = r.doc.blocks;
  assert.equal(div.t, 'Div', 'defers to degraded Div');
  assert.ok(JSON.stringify(div).includes('stray'), 'stray content kept');
  assert.ok(r.warnings.some((w) => w.includes('not table-shaped')));
});

test('figure from captioned image; blockquote attribution', () => {
  const [fig] = blocks('![alt](i.png)\n^ Figure 1: cap');
  assert.equal(fig.t, 'Figure');
  assert.equal(fig.c[2][0].c[0].t, 'Image');

  // PART 9 §4a: a captioned quote is a quote carrying an attribution, not a
  // figure - the attribution rides INSIDE the BlockQuote as a trailing Span,
  // so every pandoc writer keeps it attached (a Figure wrapper lost it
  // wholesale in the plain and rst writers).
  const [quote] = blocks('> wise words\n^ Author');
  assert.equal(quote.t, 'BlockQuote');
  const attribution = quote.c[quote.c.length - 1];
  assert.equal(attribution.t, 'Para');
  assert.equal(attribution.c[0].t, 'Span');
  assert.deepEqual(attribution.c[0].c[0], ['', ['attribution'], []]);
  assert.equal(attribution.c[0].c[1][0].c, 'Author');
});

test('a quote attribution consumes no figure number and keeps `#` literal', () => {
  // §4a: the placeholder has nothing to resolve against on a quote. The quote
  // must also not bump the Figure sequence, or the real figure after it would
  // be numbered 2.
  const out = blocks('> q\n^ Figure #: Src\n\n![alt](i.png)\n^ Figure #: real\n');
  const spanText = JSON.stringify(out[0]);
  assert.ok(spanText.includes('"attribution"'), 'quote carries the attribution span');
  assert.ok(spanText.includes('#'), 'placeholder stays a literal #: ' + spanText);
  const figText = JSON.stringify(out[1]);
  assert.equal(out[1].t, 'Figure');
  assert.ok(figText.includes('"1:"'), 'the image is Figure 1, not 2: ' + figText);
});

test('admonition becomes classed Div with title paragraph', () => {
  const [div] = blocks('::: tip "My Title"\nbody text\n:::');
  assert.equal(div.t, 'Div');
  assert.deepEqual(div.c[0][1], ['admonition', 'tip']);
  assert.equal(div.c[1][0].c[0].t, 'Strong');
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
  assert.deepEqual(classes, ['mention', 'tag', 'ext-kbd', 'symbol']);
  // abbreviation in second paragraph carries title kv
  const abbr = r.doc.blocks[1].c.find((i) => i.t === 'Span');
  assert.deepEqual(abbr.c[0][2], [['title', 'HyperText']]);
  // degradations are warned, not silent
  assert.ok(r.warnings.some((w) => w.includes('ext-kbd') || w.includes('kbd')));
  assert.ok(r.warnings.some((w) => w.includes('heart')));
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
  assert.deepEqual(pdiv.c[0], ['', ['lead'], []]);
  assert.equal(pdiv.c[1][0].t, 'Para');

  // Roundtrip mode adds the restore marker; default stays clean.
  const marked = carveToPandoc('{.lead}\nparagraph text', { roundtrip: true }).doc.blocks[0];
  assert.deepEqual(marked.c[0], ['', ['lead'], [['carve-block', 'paragraph']]]);

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
  assert.deepEqual(div.c[0][1], ['admonition', 'warning', 'urgent']);
});

test('critic markup maps to classed spans', () => {
  const xs = firstInlines('{+ add +} {- del -} {~ old ~> new ~} {# note #}');
  const spans = xs.filter((i) => i.t === 'Span');
  const classes = spans.map((s) => s.c[0][1][0]);
  assert.deepEqual(classes, ['insertion', 'deletion', 'substitution', 'comment-annotation']);
});

test('comments render nothing', () => {
  const r = carveToPandoc('%% gone\n\nvisible %% trailing\n\n%%%\nblock comment\n%%%');
  assert.equal(r.doc.blocks.length, 1);
  const text = JSON.stringify(r.doc.blocks);
  assert.ok(!text.includes('gone'));
  assert.ok(!text.includes('block comment'));
});

test('frontmatter maps to typed meta', () => {
  const r = carveToPandoc('---\ntitle: My Doc\nauthor: Jane\ntags: [a, b]\n---\nbody');
  assert.equal(r.doc.meta.title.t, 'MetaInlines');
  assert.equal(r.doc.meta.author.t, 'MetaList');
  assert.equal(r.doc.meta.tags.t, 'MetaList');
  assert.equal(r.doc.meta.tags.c.length, 2);
});

test('hard break and soft break', () => {
  const xs = firstInlines('a\\\nb');
  assert.ok(xs.some((i) => i.t === 'LineBreak'));
  const xs2 = firstInlines('a\nb');
  assert.ok(xs2.some((i) => i.t === 'SoftBreak'));
});

test('smart typography flows through as text', () => {
  const text = JSON.stringify(firstInlines('an em --- dash ... and -> arrow (c)'));
  assert.ok(text.includes('—'));
  assert.ok(text.includes('…'));
  assert.ok(text.includes('→'));
  assert.ok(text.includes('©'));
});

test('tab panel [label] degrades to a div-label caption (graceful degradation)', () => {
  // A grouping [label] that no group extension consumes MUST survive as a
  // visible caption, or the LaTeX/DOCX reader cannot tell the panels apart.
  const [container] = blocks(
    ':::: tabs\n::: tab [Installation]\nRun it.\n:::\n::: tab [Usage]\nCall it.\n:::\n::::',
  );
  const [panelA, panelB] = container.c[1];
  const captionA = panelA.c[1][0];
  assert.equal(captionA.t, 'Para');
  assert.deepEqual(captionA.c, [{ t: 'Strong', c: [{ t: 'Str', c: 'Installation' }] }]);
  assert.deepEqual(panelB.c[1][0].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'Usage' }] }]);
});

test('title precedes the [label] caption when a div carries both', () => {
  const [div] = blocks('::: note "Heads up" [side]\nBody.\n:::');
  assert.deepEqual(div.c[1][0].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'Heads' }, { t: 'Space' }, { t: 'Str', c: 'up' }] }]);
  assert.deepEqual(div.c[1][1].c, [{ t: 'Strong', c: [{ t: 'Str', c: 'side' }] }]);
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

test('the div spelling of a line block is recognized too', () => {
  const [lb] = blocks('{.line-block}\n:::\none\ntwo\n:::');
  assert.equal(lb.t, 'LineBlock');
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
  assert.deepEqual(firstInlines('a\\ b'), [{ t: 'Str', c: 'a\u00A0b' }]);
});

test("a line block's preserved indentation reaches pandoc as no-break spaces", () => {
  const [lb] = blocks('::: |\n  indented\n:::');
  assert.deepEqual(lb.c[0], [{ t: 'Str', c: '\u00A0\u00A0indented' }]);
});
