import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

const roundtrip = (src) => pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;

test('reverse: default export carries no roundtrip marker', () => {
  const json = JSON.stringify(carveToPandoc('{.lead}\nparagraph text').doc);
  assert.ok(!json.includes('carve-block'), 'marker must be opt-in');
});

test('reverse: emphasis family round-trips to source syntax', () => {
  const out = roundtrip('/em/ *b* /*bi*/ _u_ ~s~ =h= {^sup^} {,sub,}');
  // Bold-italic is expected as `*/bi/*`, not the authored `/*bi*/`. Carve parses
  // both spellings to the same strong-wrapping-emphasis AST, so the authored
  // nesting order is not recoverable, and carve's own formatter canonicalizes to
  // `*/.../*` too (carveToCarve('/*bi*/') === '*/bi/*'). Carve's round-trip
  // contract is HTML equivalence, not source byte-identity, and that holds here.
  for (const needle of ['/em/', '*b*', '*/bi/*', '_u_', '~s~', '=h=', '{^sup^}', '{,sub,}']) {
    assert.ok(out.includes(needle), `${needle} in: ${out}`);
  }
});

test('reverse: heading attrs, code block title, raw blocks', () => {
  const out = roundtrip('{#id .cls}\n## Head\n\n```python "f.py"\nx=1\n```\n\n```=html\n<hr>\n```');
  assert.ok(out.includes('{#id .cls}'));
  assert.ok(out.includes('## Head'));
  assert.ok(/``` ?python "f\.py"/.test(out), out);
  assert.ok(out.includes('```=html'));
});

test('reverse: links, autolinks, images, crossrefs', () => {
  const out = roundtrip('{#sec}\n# S\n\n[t](https://e.com "Ti") <https://e.com> <hi@e.com> ![alt](i.png) </#sec>');
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
  // Right alignment survives in EITHER spelling. A round-trip that replays the
  // authored header emits Carve's own `|=>`; one that rebuilds the table emits
  // a Markdown-style separator with a trailing colon. Asserting only the second
  // pinned the lossier of the two - it failed the moment the round-trip got
  // good enough to give the header back unchanged.
  assert.ok(
    /\|=>/.test(colspan) || /:/.test(colspan.split('\n')[1] ?? ''),
    `right alignment lost: ${colspan}`,
  );

  const rowspan = roundtrip('|= A |= B |\n| x | y |\n| ^ | z |');
  assert.ok(rowspan.includes('^'), `rowspan marker in: ${rowspan}`);
});

test('reverse: ordered list styles and start survive', () => {
  const out = roundtrip('3. third\n4. fourth');
  assert.ok(out.includes('3.'), out);
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

test('reverse: foreign pandoc nodes degrade with warnings, never throw', () => {
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
  assert.ok(carve.includes('“quoted”'));
  // Citation source text is kept as literal (escaped) text.
  assert.ok(carve.includes('key1'), `citation text kept in: ${carve}`);
  assert.ok(warnings.some((w) => w.includes('SmallCaps')));
  assert.ok(warnings.some((w) => w.includes('Cite')));
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
  assert.match(carve, /\{\.line-block\}/);
  assert.match(carve, /line1/);
  assert.match(carve, /stanza2/);
  // The stanza break is a BLANK LINE between the block's paragraphs, not a third
  // hard break in the first one.
  assert.match(carve, /line2\n\nstanza2/);
  assert.deepStrictEqual(warnings, []);
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
