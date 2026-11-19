import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render as carveToHtml } from '../vendor/carve/index.js';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const roundtrip = (src) => pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;

test('reverse: a plain paragraph needs no internal carrier', () => {
  const { doc } = carveToPandoc('paragraph text');
  assert.equal(doc.blocks[0].t, 'Para');
  assert.ok(!JSON.stringify(doc).includes('carve-paragraph'));
});

test('reverse: emphasis family round-trips to source syntax', () => {
  const out = roundtrip('/em/ *b* /*bi*/ {__u__} {~~s~~} {==h==} {^sup^} {,sub,}');
  for (const needle of ['/em/', '*b*', '/*bi*/', '{__u__}', '{~~s~~}', '{==h==}', '{^sup^}', '{,sub,}']) {
    assert.ok(out.includes(needle), `${needle} in: ${out}`);
  }
});

test('reverse: inline attributes round-trip through typed carriers', () => {
  const samples = [
    '*x*{#i .c k=v}', '/x/{#i .c k=v}', '{__x__}{#i .c k=v}', '{~~x~~}{#i .c k=v}',
    '{^x^}{#i .c k=v}', '{,x,}{#i .c k=v}', '$`x`{#i .c k=v}',
    '{==x==}{#i .c k=v}', '{+x+}{#i .c k=v}', '{-x-}{#i .c k=v}', ':heart:{#i .c k=v}',
    'x[^n]{#i .c k=v}\n\n[^n]: note',
  ];
  for (const source of samples) {
    const back = pandocToCarve(carveToPandoc(source).doc).carve;
    assert.match(back, /\{#i \.c k=v\}/, `${source}: ${back}`);
  }
});

test('reverse: bold-italic keeps the nesting pandoc wrote', () => {
  const para = (inl) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [inl] }] });
  const x = [{ t: 'Str', c: 'x' }];
  const emphStrong = para({ t: 'Emph', c: [{ t: 'Strong', c: x }] });
  const strongEmph = para({ t: 'Strong', c: [{ t: 'Emph', c: x }] });
  for (const [doc, outer, inner] of [[emphStrong, 'emphasis', 'strong'], [strongEmph, 'strong', 'emphasis']]) {
    const { ast, warnings } = pandocToCarveAst(doc);
    assert.deepEqual(warnings, []);
    assert.equal(ast.children[0].children[0].type, outer);
    assert.equal(ast.children[0].children[0].children[0].type, inner);
    const source = pandocToCarve(doc).carve;
    const back = carveToPandoc(source).doc.blocks[0].c[0];
    assert.equal(back.t, outer === 'emphasis' ? 'Emph' : 'Strong');
    assert.equal(back.c[0].t, inner === 'emphasis' ? 'Emph' : 'Strong');
  }
});

test('reverse: an empty mark stays in the tree and reports source loss', () => {
  const para = (inl) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [{ t: 'Str', c: 'a' }, { t: 'Space' }, inl, { t: 'Space' }, { t: 'Str', c: 'b' }] }] });
  for (const t of ['Emph', 'Strong', 'Underline', 'Strikeout', 'Superscript', 'Subscript']) {
    const doc = para({ t, c: [] });
    assert.equal(pandocToCarveAst(doc).ast.children[0].children[2].children.length, 0, t);
    assert.ok(pandocToCarve(doc).warnings.some((w) => w.includes('unspellable')), t);
  }
  assert.equal(pandocToCarveAst(para({ t: 'Emph', c: [{ t: 'Strong', c: [] }] })).ast.children[0].children[2].children[0].type, 'strong');
});

test("reverse: a description's block structure comes back", () => {
  const source = ':: Term\n: first\n\n  second';
  const back = roundtrip(source);
  assert.ok(back.includes('\n\n'), back);
  const [list] = carveToPandoc(back).doc.blocks;
  assert.equal(list.t, 'DefinitionList');
  assert.equal(list.c[0][1][0].length, 2);
});

test('reverse: a pandoc list mixing inline and block descriptions keeps both entries', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'DefinitionList',
        c: [
          [[{ t: 'Str', c: 'A' }], [[{ t: 'Plain', c: [{ t: 'Str', c: 'inline' }] }]]],
          [[{ t: 'Str', c: 'B' }], [[{ t: 'Para', c: [{ t: 'Str', c: 'block' }] }]]],
        ],
      },
    ],
  };
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.deepEqual(warnings, []);
  assert.deepEqual(ast.children[0].children.map((node) => node.type),
    ['definition_term', 'definition_description', 'definition_term', 'definition_description']);
  assert.match(pandocToCarve(doc).carve, /:: A[\s\S]*:: B/u);
});

test('reverse: heading attrs, code block title, raw blocks', () => {
  const out = roundtrip('{#id .cls}\n== Head\n\n```python "f.py"\nx=1\n```\n\n```=html\n<hr>\n```');
  assert.ok(out.includes('{#id .cls}'));
  assert.ok(out.includes('== Head'));
  assert.ok(/``` ?python "f\.py"/.test(out), out);
  assert.ok(out.includes('```=html'));
});

test('reverse: links, autolinks, images, crossrefs', () => {
  const out = roundtrip('{#sec}\n= S\n\n[t](https://e.com "Ti") <https://e.com> <hi@e.com> ![alt](i.png) </#sec>');
  assert.ok(out.includes('[t](https://e.com "Ti")'));
  assert.ok(out.includes('<https://e.com>'));
  assert.ok(out.includes('<hi@e.com>'));
  assert.ok(out.includes('![alt](i.png)'));
  assert.ok(out.includes('</#sec>'));
});

test('reverse: footnotes come back as footnotes', () => {
  const out = roundtrip('x[^n] y^[inline note]\n\n[^n]: def body');
  // A single-paragraph reference note legitimately comes back as an inline
  // note (pandoc's Note node does not distinguish the two source forms).
  assert.ok(out.includes('^[inline note]'));
  assert.ok(out.includes('def body'));
  assert.ok(/\^\[def body\]|\[\^/.test(out), `footnote form in: ${out}`);
});

test('reverse: mention/tag/symbol/extension/critic restore natively', () => {
  const src = 'Hi @alice on #rel via :kbd[Ctrl] and :heart: {+ add +} {- del -}';
  const out = roundtrip(src);
  assert.ok(out.includes('@alice'));
  assert.ok(out.includes('#rel'));
  assert.ok(out.includes(':kbd[Ctrl]'));
  assert.ok(out.includes(':heart:'));
  assert.ok(out.includes('{+ add +}') || out.includes('{+add+}'));
  assert.ok(out.includes('{- del -}') || out.includes('{-del-}'));
});

test('reverse: admonition with title round-trips', () => {
  const out = roundtrip('::: warning "Careful"\nbody text\n:::');
  assert.ok(out.includes('::: warning "Careful"'), out);
  assert.ok(out.includes('body text'));
});

test('reverse: table with alignment, spans and caption', () => {
  const colspan = roundtrip('|= A |=> B |= C |\n| x | < | z |\n^ Table 1: cap');
  assert.ok(/Table 1\\?: cap/.test(colspan), colspan);
  assert.ok(colspan.includes('<'), `colspan marker in: ${colspan}`);
  assert.match(colspan, /\|= > B/u, `right alignment lost: ${colspan}`);

  const rowspan = roundtrip('|= A |= B |\n| x | y |\n| ^ | z |');
  assert.ok(rowspan.includes('^'), `rowspan marker in: ${rowspan}`);
});

test('reverse: Pandoc short captions survive structurally', () => {
  const pandoc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{
      t: 'Figure',
      c: [
        ['', [], []],
        [[{ t: 'Str', c: 'Navigation' }], [{ t: 'Plain', c: [{ t: 'Str', c: 'Full' }] }]],
        [{ t: 'Plain', c: [{ t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'alt' }], ['/i.png', '']] }] }],
      ],
    }],
  };
  const result = pandocToCarveAst(pandoc);
  assert.equal(result.ast.children[0].caption.short[0].value, 'Navigation');
  assert.equal(result.ast.children[0].caption.children[0].children[0].value, 'Full');
  assert.deepEqual(result.warnings, []);
});

test('reverse: ordered list styles and start survive', () => {
  const out = roundtrip('3. third\n4. fourth');
  assert.ok(out.includes('{start=3}') && out.includes('. third'), out);
  const alpha = roundtrip('a) first\nb) second');
  assert.ok(/a[.)]/.test(alpha), alpha);
});

test('reverse: task lists survive', () => {
  const out = roundtrip('- [x] done\n- [_] todo');
  assert.ok(/- \[x\] done/.test(out), out);
  assert.ok(/- \[[ _]\] todo/.test(out), out);
});

test('reverse: frontmatter regenerates', () => {
  const out = roundtrip('---\ntitle: My Doc\ntags: [a, b]\n---\nbody');
  assert.ok(out.startsWith('---\n'), out);
  assert.ok(out.includes('title: My Doc'));
  assert.ok(out.includes('tags: [a, b]'));
});

test('reverse: Pandoc small caps, quotes, and citations enter the typed tree', () => {
  // Hand-built pandoc doc with nodes convert.ts never emits.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      { t: 'Para', c: [{ t: 'SmallCaps', c: [{ t: 'Str', c: 'caps' }] }] },
      {
        t: 'Para',
        c: [
          { t: 'Quoted', c: [{ t: 'DoubleQuote' }, [{ t: 'Str', c: 'quoted' }]] },
          {
            t: 'Cite',
            c: [
              [{ citationId: 'key1', citationMode: { t: 'NormalCitation' } }],
              [{ t: 'Str', c: '[@key1]' }],
            ],
          },
        ],
      },
    ],
  };
  const { carve, warnings } = pandocToCarve(doc);
  assert.ok(carve.includes('caps'));
  // A Quoted is no longer foreign either: it is a pair of quote marks, written
  // as the `"` an author types (test/policy.test.mjs owns the round trip).
  assert.ok(carve.includes('"quoted"'), `quotation kept in: ${carve}`);
  // A Cite is no longer foreign: it is a citation group now, and the only
  // diagnostic left is the bibliography one.
  assert.ok(carve.includes('[@key1]'), `citation kept in: ${carve}`);
  const { ast } = pandocToCarveAst(doc);
  assert.equal(ast.children[0].children[0].type, 'small_caps');
  assert.equal(ast.children[1].children.at(-1).type, 'citation_group');
  assert.ok(warnings.some((w) => w.includes('small_caps')));
});

// A LineBlock is not foreign: Carve's `::: |` line block is the same construct,
// and the warning that said otherwise was pinned here for a while.
test('reverse: a LineBlock becomes a line block, stanzas and all', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'LineBlock',
        c: [[{ t: 'Str', c: 'line1' }], [{ t: 'Str', c: 'line2' }], [], [{ t: 'Str', c: 'stanza2' }]],
      },
    ],
  };
  const { carve, warnings } = pandocToCarve(doc);
  // The `::: |` form, not `{.line-block}`: the AST carries PART 9 SS23's
  // `line_block` node now, and the engine's writer spells it this way.
  assert.match(carve, /^::: \|$/m, carve);
  assert.doesNotMatch(carve, /\{\.line-block\}/, carve);
  assert.match(carve, /line1/);
  assert.match(carve, /stanza2/);
  // The stanza break is a BLANK LINE between the block's paragraphs, not a third
  // hard break in the first one.
  assert.match(carve, /line2\n\nstanza2/);
  assert.deepStrictEqual(warnings, []);

  const { ast } = pandocToCarveAst(doc);
  assert.equal(ast.children[0].type, 'line_block', 'and the exchange AST carries the node');
  assert.equal(ast.children[0].attrs, undefined, 'with no leftover .line-block class');

  // The whole loop: the emitted source parses back to the same node, and that
  // converts to the LineBlock it started as, stanza break included.
  assert.deepStrictEqual(carveToPandoc(carve).doc.blocks, doc.blocks);
});

test('reverse: multi-block Note becomes a reference footnote with generated id', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Para',
        c: [
          { t: 'Str', c: 'x' },
          {
            t: 'Note',
            c: [
              { t: 'Para', c: [{ t: 'Str', c: 'first' }] },
              { t: 'Para', c: [{ t: 'Str', c: 'second' }] },
            ],
          },
        ],
      },
    ],
  };
  const { carve } = pandocToCarve(doc);
  assert.ok(carve.includes('[^fn1]'), carve);
  assert.ok(carve.includes('first'));
  assert.ok(carve.includes('second'));
});

test('a captioned quote round-trips to identical Carve source', () => {
  // Forward wraps the quote in a Figure with the caption; reverse reads that
  // single-host Figure back as the `figure` it is, and renderCarve writes the
  // `> quote` + `^ caption` pair.
  const src = '> To be, or not to be.\n^ Hamlet\n';
  const { carve, warnings } = pandocToCarve(carveToPandoc(src).doc);
  assert.deepEqual(warnings, []);
  assert.equal(carve, src);
});

// C2-A-082 to C2-A-084: the figure node is gone; the caption sits in the quote's own slot.
test('the exchange AST carries a captioned quote with its caption slot', () => {
  // PART 9 §4b: the generic captioned wrapper, target and all. The withdrawn
  // §4a shape put the caption in an `attribution` field on the quote itself
  // (carve#1213); `resources/ast-schema.json` has no such property, and an
  // unknown property is rejected on ingest (PART 12 §11), so producing it here
  // would emit an AST no engine will read back.
  const { ast, warnings } = pandocToCarveAst(carveToPandoc('> q\n^ Hamlet\n').doc);
  assert.deepEqual(warnings, []);
  const [quote] = ast.children;
  assert.equal(quote.type, 'block_quote');
  assert.deepEqual(quote.caption.children[0].children, [{ type: 'text', value: 'Hamlet' }]);
  assert.ok(!JSON.stringify(ast).includes('attribution'), 'no attribution field');
});

test('a foreign Figure-wrapped BlockQuote is a captioned quote', () => {
  // The shape any pandoc filter produces for a quote with its attribution -
  // and the shape the HTML Standard names as the right one, which is the
  // argument PART 9 §4b withdrew the attribution clause on.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['', [], []],
          [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Author' }] }]],
          [{ t: 'BlockQuote', c: [{ t: 'Para', c: [{ t: 'Str', c: 'wise' }] }] }],
        ],
      },
    ],
  };
  const { carve, warnings } = pandocToCarve(doc);
  assert.deepEqual(warnings, []);
  assert.equal(carve, '> wise\n^ Author\n');
});

test('a figure host with attributes keeps its Div child in the 0.2 tree', () => {
  // Pandoc's BlockQuote has no Attr slot, so a quote with attributes crosses
  // inside a Div and the Figure holds a Div rather than the quote. A `div` is
  // not a legal `figure.target`, so that Div is the wrapper - reading it as an
  // authored container instead sent the document down the unwrap path, which
  // dropped the figure and left the caption as a trailing paragraph.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['', [], []],
          [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Author' }] }]],
          [
            {
              t: 'Div',
              c: [
                ['inner', ['kept'], []],
                [{ t: 'BlockQuote', c: [{ t: 'Para', c: [{ t: 'Str', c: 'wise' }] }] }],
              ],
            },
          ],
        ],
      },
    ],
  };
  // C2-A-082 to C2-A-084: the captioned Div is a figure_group panel, which the writer spells without loss.
  const { carve, warnings } = pandocToCarve(doc);
  assert.deepEqual(warnings, []);
  assert.equal(carve, ':::: figure\n{#inner}\n::: kept\n> wise\n:::\n::::\n^ Author\n');

  // C2-A-082 to C2-A-084: a div takes no caption slot, so the captioned Div becomes a figure_group panel.
  const { ast } = pandocToCarveAst(doc);
  const [figure] = ast.children;
  assert.equal(figure.type, 'figure_group');
  assert.equal(figure.children[0].type, 'div');
  assert.equal(figure.children[0].attrs.id, 'inner');
  assert.equal(figure.children[0].children[0].type, 'block_quote');

  // The control: a Div holding TWO blocks is not a wrapper for one host, so it
  // is not read as one - it becomes the `figure_group` the forward direction
  // writes this shape for, caption and all, rather than a lone `figure`.
  const two = structuredClone(doc);
  two.blocks[0].c[2][0].c[1].push({ t: 'Para', c: [{ t: 'Str', c: 'more' }] });
  const [wider] = pandocToCarveAst(two).ast.children;
  assert.equal(wider.type, 'figure_group');
  assert.equal(wider.caption.children[0].children[0].value, 'Author');
  assert.deepEqual(wider.children[0].children.map((block) => block.type), ['block_quote', 'paragraph']);
});

test('an attribution-classed Span inside a quote is ordinary content', () => {
  // The §4a lowering emitted a bare `[...]{.attribution}` Span as the quote's
  // last block, and the reverse direction consumed that idiom to rebuild the
  // attribution - which meant a FOREIGN document using the same class had its
  // paragraph lifted out of the quote and turned into a caption. With §4a
  // withdrawn (carve#1213) nothing claims the class: the span is a span,
  // whatever else its Attr carries.
  const quoteWith = (span) => ({
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{ t: 'BlockQuote', c: [{ t: 'Para', c: [span] }] }],
  });
  const withId = pandocToCarve(
    quoteWith({ t: 'Span', c: [['x1', ['attribution'], []], [{ t: 'Str', c: 'A' }]] }),
  );
  assert.equal(withId.carve, '> [A]{#x1 .attribution}\n');
  const bare = pandocToCarve(
    quoteWith({ t: 'Span', c: [['', ['attribution'], []], [{ t: 'Str', c: 'A' }]] }),
  );
  assert.equal(bare.carve, '> [A]{.attribution}\n');
  assert.ok(!bare.carve.includes('^ '), 'the span is not lifted out as a caption');
});

test('a Figure-wrapped quote keeps its short caption in the AST and says so', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['', [], []],
          [[{ t: 'Str', c: 'nav' }], [{ t: 'Plain', c: [{ t: 'Str', c: 'Author' }] }]],
          [{ t: 'BlockQuote', c: [{ t: 'Para', c: [{ t: 'Str', c: 'wise' }] }] }],
        ],
      },
    ],
  };
  const { carve, warnings } = pandocToCarve(doc);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('field short of a caption node'), warnings[0]);
  assert.equal(carve, '> wise\n^ Author\n');
  const { ast } = pandocToCarveAst(doc);
  assert.deepEqual(ast.children[0].caption.short, [{ type: 'text', value: 'nav' }]);
});

test('a comment whose content opens with a percent survives the round trip (#168)', () => {
  // THE CONTRACT IS THE RENDERED DOCUMENT, NOT THE BYTES. The engine's writer
  // separates a line comment's marker from its content unconditionally, so a
  // content that itself opens with a percent comes back spelled `%% %` rather
  // than `%%%`. Under 0.1.5 that was a different document - `%%%` at the inner
  // item's column 0 ended that item and `%% %` did not, so the follower moved
  // between items, which is what #168 reported and what the ledger carried.
  //
  // carve-js#1601 rules the fold window strictly between an item's base and
  // content column, and under that rule neither spelling ends the item: the two
  // read the same, and the corpus sidecar for this document agrees with the new
  // reading rather than the old one. The loss was the pin, not the writer.
  //
  // So this pins what the round trip owes - the same rendered document - and
  // deliberately not the spelling, which the writer is free to choose. It is a
  // regression guard against the engine reading the marker run as significant
  // again without the sidecar saying so.
  const src = '- - x\n  %%%\n  y\n';
  assert.equal(carveToHtml(roundtrip(src)), carveToHtml(src));
});

test('a percent-leading comment says the same thing in either spelling (#168)', () => {
  // A glued `%%%` opens a comment fence (markup-carve/carve#4955), so the two
  // spellings are different nodes now; each still renders the same and keeps
  // that through the round trip.
  for (const [a, b] of [['%% %', '%%%'], ['%% %foo', '%%%foo'], ['%% % x', '%%% x']]) {
    assert.equal(carveToHtml(a + '\n'), carveToHtml(b + '\n'));
    for (const src of [a + '\n', b + '\n']) assert.equal(carveToHtml(roundtrip(src)), carveToHtml(src), src);
  }
});

test('reverse: a Pandoc code span with backticks and a newline remains code', () => {
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [
    { t: 'Para', c: [{ t: 'Code', c: [['', [], []], 'a`b\nc'] }] },
  ] };
  const { carve, warnings } = pandocToCarve(doc);
  assert.deepEqual(warnings, []);
  assert.equal(carveToPandoc(carve).doc.blocks[0].c[0].c[1], 'a`b\nc');
});

test('reverse: a block note comes back with its label', () => {
  const back = roundtrip('see[^a]\n\n[^a]: note\n\n  more\n');
  assert.match(back, /see\[\^a\]/);
  assert.match(back, /\[\^a\]: note/);
  assert.equal((back.match(/^\[\^a\]:/gm) ?? []).length, 1, back);
});

test('reverse: a Div that is not a single-block wrapper stays a div', () => {
  const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
  const p = (s) => ({ t: 'Para', c: [{ t: 'Str', c: s }] });
  const two = pandocToCarve(doc([{ t: 'Div', c: [['', ['c'], [['wrapper', '1']]], [p('a'), p('b')]] }])).carve;
  assert.ok(two.includes(':::'), two);
  const custom = pandocToCarve(doc([{ t: 'Div', c: [['', ['c'], [['wrapper', 'custom']]], [p('a')]] }])).carve;
  assert.ok(custom.includes(':::') && custom.includes('wrapper=custom'), custom);
  // An inner block with attrs of its own is not a wrapper target.
  const inner = { t: 'Div', c: [['in', [], []], [p('a')]] };
  const nested = pandocToCarve(doc([{ t: 'Div', c: [['out', [], [['wrapper', '1']]], [inner]] }])).carve;
  assert.ok(nested.includes('#out') && nested.includes('#in'), nested);
  // Its footnote is converted once, not once per attempt.
  const note = { t: 'Note', c: [p('n1'), p('n2')] };
  const noted = { t: 'Div', c: [['in', [], []], [{ t: 'Para', c: [{ t: 'Str', c: 'a' }, note] }]] };
  const once = pandocToCarve(doc([{ t: 'Div', c: [['out', [], [['wrapper', '1']]], [noted]] }, p('b')])).carve;
  assert.deepEqual(once.match(/^\[\^[^\]]+\]:/gm), ['[^fn1]:'], once);
  assert.ok(once.includes('a[^fn1]'), once);
});

test("reverse: pandoc's section Divs preserve their nested headings", () => {
  const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
  const p = (s) => ({ t: 'Para', c: [{ t: 'Str', c: s }] });
  const h = (level, s, attr = ['', [], []]) => ({ t: 'Header', c: [level, attr, [{ t: 'Str', c: s }]] });
  const sec = (attr, body) => ({ t: 'Div', c: [attr, body] });
  const nested = doc([sec(['A', ['section'], []], [h(1, 'A'), p('text'), sec(['B', ['section'], []], [h(2, 'B'), p('more')])])]);
  const [outer] = pandocToCarveAst(nested).ast.children;
  assert.equal(outer.type, 'div');
  assert.equal(outer.attrs.id, 'A');
  assert.deepEqual(outer.attrs.classes, ['section']);
  assert.equal(outer.children[0].type, 'heading');
  assert.equal(outer.children[2].type, 'div');
  assert.equal(outer.children[2].children[0].level, 2);
  const source = pandocToCarve(nested).carve;
  assert.match(source, /:::: section[\s\S]*= A[\s\S]*::: section[\s\S]*== B/u);
  const attributed = pandocToCarveAst(doc([sec(['h', ['c', 'section'], [['k', 'v']]], [h(1, 'Head', ['head', ['extra'], []])])])).ast.children[0];
  assert.equal(attributed.attrs.id, 'h');
  assert.equal(attributed.children[0].attrs.id, 'head');
  assert.deepEqual(attributed.children[0].attrs.classes, ['extra']);
  const [quote] = pandocToCarveAst(doc([{ t: 'BlockQuote', c: [sec(['H', ['section'], []], [h(1, 'H')])] }])).ast.children;
  assert.equal(quote.children[0].type, 'div');
});

test('reverse: a section-classed Div that is not a pandoc section stays a div', () => {
  const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
  const p = (s) => ({ t: 'Para', c: [{ t: 'Str', c: s }] });
  // A heading that kept its own id: an authored `{.section}` div.
  const authored = pandocToCarve(doc([{ t: 'Div', c: [['', ['section'], []], [{ t: 'Header', c: [1, ['H', [], []], [{ t: 'Str', c: 'H' }]] }]] }])).carve;
  assert.ok(authored.includes('::: section'), authored);
  // A sectioned heading whose id is not the generated one keeps the div.
  const own = pandocToCarve(doc([{ t: 'Div', c: [['s', ['section'], []], [{ t: 'Header', c: [1, ['mine', [], []], [{ t: 'Str', c: 'Head' }]] }]] }])).carve;
  assert.ok(own.includes(':::') && own.includes('#mine'), own);
  // No heading first.
  const plain = pandocToCarve(doc([{ t: 'Div', c: [['s', ['section'], []], [p('x')]] }])).carve;
  assert.ok(plain.includes(':::') && plain.includes('#s'), plain);
});

test('reverse: an authored section div round-trips through the bridge', () => {
  const src = '::: section\n= H\n\nx\n:::\n';
  assert.equal(roundtrip(src), src);
  assert.equal(carveToPandoc(roundtrip(src)).doc.blocks[0].t, 'Div');
});
