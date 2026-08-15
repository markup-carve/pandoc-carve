/*
 * Composite figures (PART 9 §4c, carve#1122) across the bridge.
 *
 * The construct is a bare `::: figure` container - fence, separator, the kind
 * word, nothing else - and pandoc's own subfigure model is a `Figure` whose
 * blocks are `Figure`s, so this maps structurally rather than degrading.
 *
 * Every test here has a CONTROL, because the two spellings are one character
 * apart and an engine that lacked §4c rendered them identically: a titled or
 * labelled opener (`::: figure "T"`, `::: figure [g]`) is NOT this production
 * and must stay the generic `Div ["admonition","figure"]` it always was
 * (corpus 318-composite-figures-8). Without the control a passing test proves
 * only that the rule ran, not that it discriminated.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToCarveAst, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();
const blocks = (src) => carveToPandoc(src).doc.blocks;
const strs = (x) => {
  const out = [];
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      if (v.t === 'Str') out.push(v.c);
      else if (v.t === 'Space') out.push(' ');
      Object.values(v).forEach(walk);
    }
  };
  walk(x);
  return out.join('');
};

const GROUP = [
  '{#fig-x .columns-2}',
  '::: figure',
  '{#fig-x-a}',
  '![one](a.png)',
  '^ (a) One',
  '',
  '{#fig-x-b}',
  '![two](b.png)',
  '^ (b) Two',
  ':::',
  '^ Figure #: Group caption',
  '',
].join('\n');

test('a bare figure fence becomes a Figure of nested Figures', () => {
  const [group, ...rest] = blocks(GROUP);
  assert.deepEqual(rest, []);
  assert.equal(group.t, 'Figure');

  const [attr, [shortCaption, caption], body] = group.c;
  assert.deepEqual(attr, ['fig-x', ['columns-2'], []], 'the group carries its own attrs');
  assert.equal(shortCaption, null, 'PART 12 §16: the group has no shortCaption slot');
  assert.equal(strs(caption), 'Figure 1: Group caption');

  assert.deepEqual(body.map((b) => b.t), ['Figure', 'Figure'], 'panels are nested Figures');
  assert.equal(body[0].c[0][0], 'fig-x-a');
  assert.equal(strs(body[0].c[1][1]), '(a) One');
  assert.equal(body[1].c[0][0], 'fig-x-b');
});

test('CONTROL: a titled or labelled opener is not a group and stays a Div', () => {
  // 318-composite-figures-8. One character of difference decides the
  // production, so this is the assertion that makes the test above mean
  // something: the same body with a title on the opener must NOT nest.
  const titled = blocks(GROUP.replace('::: figure', '::: figure "A titled figure div"'));
  assert.equal(titled[0].t, 'Div');
  assert.deepEqual(
    titled[0].c[0][1].slice(0, 2),
    ['admonition', 'figure'],
    'the pre-§4c generic shape',
  );
  assert.equal(strs(titled[0].c[1][0]), 'A titled figure div', 'the title is preserved, not dropped');

  const labelled = blocks(['::: figure [g]', 'Body.', ':::', ''].join('\n'));
  assert.equal(labelled[0].t, 'Div');
  assert.deepEqual(labelled[0].c[0][1], ['admonition', 'figure']);

  // And the `^ ` line after a titled opener's closer is an ordinary paragraph,
  // not a group caption - the caption slot belongs to the group kind only. Its
  // `#` is not a placeholder either, so no number is drawn for it.
  const after = titled[1];
  assert.equal(after.t, 'Para');
  assert.equal(strs(after), '^ Figure #: Group caption');
});

test('the group is one numbering unit and takes its number at the OPENING fence', () => {
  // 318-composite-figures-11: the group's `^ ` line is the construct's LAST
  // line, yet the group is Figure 1 and the figure nested inside its stray
  // content is Figure 2. Converting the caption after the children would swap
  // them.
  const [group] = blocks(
    [':::: figure', '::: note', '![x](x.png)', '^ Figure #: inner', ':::', '::::', '^ Figure #: group', ''].join('\n'),
  );
  assert.equal(strs(group.c[1][1]), 'Figure 1: group');
  const inner = group.c[2][0].c[1][0];
  assert.equal(inner.t, 'Figure');
  assert.equal(strs(inner.c[1][1]), 'Figure 2: inner');
});

test("a panel's # stays literal and consumes no number", () => {
  // §4c: a panel is not a sequence unit, so its `#` "stays LITERAL - the
  // visible failure this language prefers to a silent one". Drawing a number
  // there would also shift the figure AFTER the group from 2 to 3.
  const [group, after] = blocks(
    ['::: figure', '![one](a.png)', '^ Figure #: A panel', ':::', '^ Figure #: Group', '', '![z](z.png)', '^ Figure #: After', ''].join('\n'),
  );
  assert.equal(strs(group.c[2][0].c[1][1]), 'Figure #: A panel');
  assert.equal(strs(group.c[1][1]), 'Figure 1: Group');
  assert.equal(strs(after.c[1][1]), 'Figure 2: After');
});

test('a panel id crossrefs as the group number plus a letter', () => {
  // 318-composite-figures-2.
  const out = blocks(
    ['{#fig-first}', '![lead](lead.png)', '^ Figure #: First', '', '{#fig-x}', '::: figure', '{#fig-a}', '![one](a.png)', '^ (a) One', '', '{#fig-b}', '![two](b.png)', '^ (b) Two', ':::', '^ Figure #: Second', '', 'See </#fig-x>, </#fig-a> and </#fig-b>.', ''].join('\n'),
  );
  const links = [];
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      if (v.t === 'Link') links.push([v.c[2][0], strs(v.c[1])]);
      Object.values(v).forEach(walk);
    }
  };
  walk(out);
  assert.deepEqual(links, [
    ['#fig-x', 'Figure 2'],
    ['#fig-a', 'Figure 2a'],
    ['#fig-b', 'Figure 2b'],
  ]);
});

test('a captioned quote is a PANEL inside the group and an attribution outside it', () => {
  // §4c is explicit that "the quote is not a special host inside the group
  // either", which is the one place §4a's reroute does not apply.
  const [group] = blocks(['::: figure', '> Brevity.', '^ A quoted panel', ':::', '^ Figure #: G', ''].join('\n'));
  const panel = group.c[2][0];
  assert.equal(panel.t, 'Figure', 'inside the group: a nested Figure');
  assert.equal(panel.c[2][0].t, 'BlockQuote');
  assert.equal(strs(panel.c[1][1]), 'A quoted panel');

  const outside = blocks(['> Brevity.', '^ An attribution', ''].join('\n'));
  assert.equal(outside[0].t, 'BlockQuote', 'outside: §4a still routes it to the quote');
});

test('stray content is preserved in place between the panels', () => {
  // 318-composite-figures-5: "no renderer may silently drop or re-attach it".
  const [group] = blocks(
    ['::: figure', 'Both were shot the same day.', '', '![one](a.png)', '^ (a) One', ':::', '^ Figure #: G', ''].join('\n'),
  );
  assert.deepEqual(group.c[2].map((b) => b.t), ['Para', 'Figure']);
});

test('a table panel keeps its own caption and adds no wrapper', () => {
  const [group] = blocks(
    ['::: figure', '| a | b |', '|---|---|', '| 1 | 2 |', '^ Table #: A table panel', ':::', '^ Figure #: G', '', '| c |', '|---|', '| 3 |', '^ Table #: After', ''].join('\n'),
  );
  const panel = group.c[2][0];
  assert.equal(panel.t, 'Table', 'a bare Table, not a Figure around one');
  assert.equal(strs(panel.c[1][1]), 'Table #: A table panel', 'the panel draws no number either');
  // The `Table 1` the document DOES hand out goes to the table after the group.
  assert.equal(strs(blocks(['::: figure', '| a |', '|---|', '| 1 |', '^ Table #: panel', ':::', '^ Figure #: G', '', '| c |', '|---|', '| 3 |', '^ Table #: After', ''].join('\n'))[1].c[1][1]), 'Table 1: After');
});

test('a subfigure-shaped pandoc Figure imports as figure_group', () => {
  const nested = (id, alt, src, capt) => ({
    t: 'Figure',
    c: [
      [id, [], []],
      [null, [{ t: 'Plain', c: [{ t: 'Str', c: capt }] }]],
      [{ t: 'Plain', c: [{ t: 'Image', c: [['', [], []], [{ t: 'Str', c: alt }], [src, '']] }] }],
    ],
  });
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['fig-x', [], []],
          [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Group' }] }]],
          [nested('fig-a', 'one', 'a.png', 'A'), nested('fig-b', 'two', 'b.png', 'B')],
        ],
      },
    ],
  };
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.deepEqual(warnings, []);
  const [group] = ast.children;
  assert.equal(group.type, 'figure_group', 'not the old unwrap-with-a-warning path');
  assert.equal(group.attrs.id, 'fig-x');
  assert.deepEqual(group.children.map((c) => c.type), ['figure', 'figure']);
  assert.deepEqual(group.children.map((c) => c.attrs.id), ['fig-a', 'fig-b']);
  assert.equal(group.caption[0].value, 'Group');
  assert.ok(!('target' in group), 'PART 12 §16: the group carries no target');

  const { carve } = pandocToCarve(doc);
  assert.equal(
    carve,
    ['{#fig-x}', '::: figure', '{#fig-a}', '![one](a.png)', '^ A', '', '{#fig-b}', '![two](b.png)', '^ B', ':::', '^ Group', ''].join('\n'),
  );
});

test('CONTROL: a single-target pandoc Figure keeps its plain figure mapping', () => {
  // The ticket's own condition: only NESTED Figure/Table content is a group.
  // A lone captioned image is one figure, and a group of one would be a
  // different document.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['', [], []],
          [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Lone' }] }]],
          [{ t: 'Plain', c: [{ t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'x' }], ['x.png', '']] }] }],
        ],
      },
    ],
  };
  const { ast } = pandocToCarveAst(doc);
  assert.equal(ast.children[0].type, 'figure');
  assert.equal(pandocToCarve(doc).carve, '![x](x.png)\n^ Lone\n');
});

test('a Figure-wrapped table panel keeps the wrapper id it is referenced by', () => {
  // pandoc's readers put the label on the Figure, not on the Table it wraps,
  // and the two collapse into one Carve node - so the wrapper's id has to
  // survive the collapse or `</#id>` to that panel resolves against nothing.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['fig-x', [], []],
          [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'Group' }] }]],
          [
            {
              t: 'Figure',
              c: [
                ['panel-t', ['wide'], []],
                [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'A table panel' }] }]],
                [
                  {
                    t: 'Table',
                    c: [
                      ['', ['inner'], []],
                      [null, []],
                      [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]],
                      [['', [], []], []],
                      [[['', [], []], 0, [], [[['', [], []], [[['', [], []], { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: [{ t: 'Str', c: 'a' }] }]]]]]]],
                      [['', [], []], []],
                    ],
                  },
                ],
              ],
            },
          ],
        ],
      },
    ],
  };
  const { ast } = pandocToCarveAst(doc);
  const [group] = ast.children;
  assert.equal(group.type, 'figure_group');
  const [panel] = group.children;
  assert.equal(panel.type, 'table', '§4c: the panel wrapper adds nothing to a table');
  assert.equal(panel.attrs.id, 'panel-t', 'the wrapper id, not dropped with the wrapper');
  assert.deepEqual(panel.attrs.classes, ['inner', 'wide'], 'classes union, inner first');
  assert.equal(panel.caption.map((c) => c.value).join(''), 'A table panel');
});

test('a group with a pandoc short caption warns rather than inventing a field', () => {
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Figure',
        c: [
          ['', [], []],
          [[{ t: 'Str', c: 'nav' }], [{ t: 'Plain', c: [{ t: 'Str', c: 'Group' }] }]],
          [
            {
              t: 'Figure',
              c: [
                ['', [], []],
                [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'A' }] }]],
                [{ t: 'Plain', c: [{ t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'x' }], ['x.png', '']] }] }],
              ],
            },
          ],
        ],
      },
    ],
  };
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('short caption'), warnings[0]);
  assert.ok(!('shortCaption' in ast.children[0]), 'PART 12 §16 has no such slot on the group');
});

test('the group survives Carve -> pandoc -> Carve as a group', () => {
  const { doc, warnings } = carveToPandoc(GROUP);
  assert.deepEqual(warnings, []);
  const back = pandocToCarve(doc);
  assert.deepEqual(back.warnings, []);
  // Identical to the source except for the caption number, which every figure
  // loses to resolution on the way out - `#` is a request, `1` is the answer.
  assert.equal(back.carve, GROUP.replace('Figure #:', 'Figure 1:'));

  // And a second lap is stable.
  const again = pandocToCarve(carveToPandoc(back.carve).doc);
  assert.equal(again.carve, back.carve);
});

test("a panel's # comes back as the character it printed, not as a number", () => {
  // The asymmetry is the point. A caption's `#` is a REQUEST and the rendered
  // number is the answer, and this bridge resolves on the way out for every
  // figure - so the group's `#` comes back as "1" and cannot be re-requested.
  // A panel's `#` was never answered, so it comes back as the character, and
  // `renderCarve` escapes it to keep it literal on re-parse.
  //
  // Guessing the placeholder back out of a printed `#` is deliberately not
  // done: it would have to misread an author's genuine literal `#` to do it,
  // and the group caption above shows the bridge does not do that either.
  const src = ['::: figure', '![one](a.png)', '^ Figure #: A panel', ':::', '^ Figure #: Group', ''].join('\n');
  const { carve } = pandocToCarve(carveToPandoc(src).doc);
  assert.equal(
    carve,
    ['::: figure', '![one](a.png)', '^ Figure \\#: A panel', ':::', '^ Figure 1: Group', ''].join('\n'),
  );

  const [group] = carveToCarveAst(carve).children;
  assert.equal(group.type, 'figure_group', 'still a group after the lap');
  assert.deepEqual(
    group.children[0].caption.map((c) => c.type),
    ['text', 'escaped_text', 'text'],
    'the panel caption still reads "Figure #: A panel" and still draws nothing',
  );
  // The visible text is unchanged, which is the guarantee that matters: a
  // panel that had started drawing numbers would print "Figure 1: A panel".
  assert.equal(
    group.children[0].caption.map((c) => c.value).join(''),
    'Figure #: A panel',
  );
});

test('the nesting reaches a writer', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveToPandoc(GROUP);
  const latex = pandocRender(pandoc, doc, 'latex');
  assert.ok(latex.includes('\\begin{subfigure}'), 'panels reach latex as subfigures:\n' + latex);
  assert.ok(latex.includes('Group caption'), latex);

  const html = pandocRender(pandoc, doc, 'html');
  assert.ok(/<figure[^>]*>[\s\S]*<figure/.test(html), 'nested figures in html:\n' + html);
});
