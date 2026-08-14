import { test } from 'node:test'
import assert from 'node:assert/strict'
import { convert } from '../dist/convert.js'
import { carveToPandoc } from '../dist/index.js'

// These nodes are built by hand rather than parsed, because the published
// carve-js this package depends on predates them. That is the point: the arms
// have to be here before the dependency bump, not after - a consumer without
// them degrades silently (carve#355).

const doc = (blocks) => ({ type: 'document', children: blocks })
const para = (inlines) => ({ type: 'paragraph', children: inlines })
const strs = (result) => {
  const out = []
  const walk = (x) => {
    if (Array.isArray(x)) return x.forEach(walk)
    if (x && typeof x === 'object') {
      if (x.t === 'Str') out.push(x.c)
      Object.values(x).forEach(walk)
    }
  }
  walk(result.doc.blocks)
  return out.join(' ')
}

test('smart punctuation carries the resolved glyph, not the source run', () => {
  // Pandoc applies smart punctuation when READING markdown, not when consuming
  // a JSON AST, so emitting `--` here would put a literal double hyphen in the
  // LaTeX or DOCX. Carve already resolved it.
  const result = convert(
    doc([
      para([
        { type: 'smart_punctuation', kind: 'em_dash', value: '---' },
        { type: 'smart_punctuation', kind: 'ellipsis', value: '...' },
        { type: 'smart_punctuation', kind: 'left_double_quote', value: '"', glyph: '“' },
      ]),
    ]),
  )
  // One Str, not three: `strs` joins node values with a space, so the spacing
  // here is the helper's and not the document's. Adjacent Str nodes are merged
  // on the way out (pandoc's own readers emit one Str per word), and what this
  // test is about is that each glyph survives RESOLVED - `—` and not `---`.
  assert.equal(strs(result), '—…“')
  assert.deepEqual(result.warnings, [])
})

test('an escaped character survives as the character', () => {
  const result = convert(doc([para([{ type: 'escaped_text', value: '-' }])]))
  assert.equal(strs(result), '-')
  assert.deepEqual(result.warnings, [])
})

test('a line block maps to pandoc LineBlock rather than a paragraph', () => {
  // Pandoc has the node natively, so the line structure survives instead of
  // collapsing into one run of text.
  const result = convert(
    doc([
      {
        type: 'line_block',
        children: [
          para([
            { type: 'text', value: 'Roses are red,' },
            { type: 'hard_break' },
            { type: 'text', value: 'Violets are blue.' },
          ]),
        ],
      },
    ]),
  )
  const block = result.doc.blocks[0]
  assert.equal(block.t, 'LineBlock')
  assert.equal(block.c.length, 2, 'one entry per line')
  assert.deepEqual(result.warnings, [])
})

test('none of the three warns', () => {
  // The default arm warns on every occurrence, so a document with ordinary
  // prose punctuation used to flood stderr.
  const result = convert(
    doc([
      para([
        { type: 'text', value: 'a' },
        { type: 'smart_punctuation', kind: 'ellipsis', value: '...' },
        { type: 'escaped_text', value: '*' },
      ]),
    ]),
  )
  assert.deepEqual(result.warnings, [])
})

test('a cyclic crossref resolves one level instead of overflowing the stack', () => {
  // corpus 118. `# A </#a>` is a heading whose crossref targets its own id, so
  // resolving the link text re-enters the same heading. The engine emits the
  // target's text with the nested crossref DROPPED - `<a href="#A">A </a>` -
  // and this used to recur until the stack ran out, on both engines.
  const result = carveToPandoc('# A </#a>\n')
  assert.deepEqual(result.warnings, [])
  assert.equal(strs(result), 'A A')
})

test('a caption number is substituted, counted per kind', () => {
  // `^ Figure #: text` asks for a literal number. The tree carries only the
  // placeholder - the value is assigned at render time - so it degraded to
  // empty and captions reached pandoc as `Figure : text`. Figures and tables
  // keep independent sequences, which is what the engine does.
  // Per LABEL, not per element kind - `Figure`, `Listing`, `Figure` on three
  // FIGURES numbers them 1, 1, 2. Keying on figure-versus-table would have
  // given the Listing a 2, which is what review caught.
  // The label is ALL the text before the `#`, markup flattened. Three narrower
  // readings were wrong and each was caught in review: the element kind gave
  // the Listing a 2, the last word merged `Supplementary Figure` into
  // `Figure`, and reading only `text` nodes sent `*Figure*` to a generic
  // counter where the engine shares the `Figure` sequence.
  const result = carveToPandoc(
    '![a](1.png)\n^ Figure #: one\n\n![b](2.png)\n^ Listing #: two\n\n' +
      '![c](3.png)\n^ *Figure* #: three\n\n![d](4.png)\n^ Supplementary Figure #: four\n\n' +
      '|=H|\n|x|\n^ Table #: t\n',
  )
  const text = strs(result)
  for (const want of [
    'Figure 1:',
    'Listing 1:',
    'Figure 2:',
    'Supplementary Figure 1:',
    'Table 1:',
  ]) {
    assert.ok(text.includes(want), `${want} missing from: ${text}`)
  }
})

test('a crossref to a numbered figure resolves to "Figure 1", not the raw id', () => {
  // pandoc-carve#11. `ctx.headings` (pass 1's crossref target map) used to be
  // built from heading ids only, so `heading_ref` never found a captioned
  // figure/table's own `{#id}` and fell back to the "unresolved target"
  // warning with the raw id as link text - even though #10 already made the
  // caption's own number render correctly right next to it.
  const result = carveToPandoc('{#fig-sun}\n![s](s.png)\n^ Figure #: sun\n\nSee </#fig-sun>.\n')
  assert.deepEqual(result.warnings, [])
  const para = result.doc.blocks[1]
  const link = para.c.find((i) => i.t === 'Link')
  assert.deepEqual(link.c[2], ['#fig-sun', ''])
  assert.deepEqual(link.c[1], [{ t: 'Str', c: 'Figure' }, { t: 'Space' }, { t: 'Str', c: '1' }])
})

test('a crossref to a numbered figure resolves even when it precedes the figure', () => {
  // Pass 1 walks the whole document before pass 2 resolves any crossref, so a
  // BACKWARD reference (the usual case) and a FORWARD one behave identically.
  const result = carveToPandoc('See </#fig-sun>.\n\n{#fig-sun}\n![s](s.png)\n^ Figure #: sun\n')
  assert.deepEqual(result.warnings, [])
  assert.ok(strs(result).includes('See Figure 1 .'))
})

test('a crossref to a numbered table caption resolves to "Table 1"', () => {
  // A table's `{#id}` and `^ Table #: ...` land directly on the `table` node
  // (no `figure` wrapper - a table carries its own native caption), so the
  // pass-1 walk has to recognize `table` as a captioned-target kind too, not
  // only `figure`.
  const result = carveToPandoc('{#tbl-x}\n|=H|\n|x|\n^ Table #: t\n\nSee </#tbl-x>.\n')
  assert.deepEqual(result.warnings, [])
  const para = result.doc.blocks[1]
  const link = para.c.find((i) => i.t === 'Link')
  assert.deepEqual(link.c[1], [{ t: 'Str', c: 'Table' }, { t: 'Space' }, { t: 'Str', c: '1' }])
})

test('caption numbering for crossref targets stays in sync when some figures carry no id', () => {
  // The per-label counter that assigns "Figure 1"/"Figure 2" has to advance
  // for EVERY numbered caption in document order, including ones with no
  // `{#id}` at all (unreferenceable, but still consuming a number) - otherwise
  // a later id'd figure's resolved number would drift from what the caption
  // itself actually renders.
  const result = carveToPandoc(
    '![a](1.png)\n^ Figure #: one\n\n' +
      '{#fig-b}\n![b](2.png)\n^ Listing #: two\n\n' +
      '{#fig-c}\n![c](3.png)\n^ Figure #: three\n\n' +
      'See </#fig-b> and </#fig-c>.\n',
  )
  assert.deepEqual(result.warnings, [])
  assert.ok(strs(result).includes('See Listing 1 and Figure 2 .'))
})

test('a §4a quote attribution rides inside the BlockQuote as an attribution Span', () => {
  // The shape an engine past carve#1159 serializes: `attribution` on the
  // block_quote itself, no figure wrapper. Hand-built because the pinned
  // engine still parses the source into the old quote-figure shape - and the
  // arm has to be here before the dependency bump, not after.
  const result = convert(
    doc([
      {
        type: 'block_quote',
        children: [para([{ type: 'text', value: 'To be' }])],
        attribution: [{ type: 'text', value: 'Hamlet' }],
      },
    ]),
  )
  assert.deepEqual(result.warnings, [])
  const [quote] = result.doc.blocks
  assert.equal(quote.t, 'BlockQuote')
  const last = quote.c[quote.c.length - 1]
  assert.deepEqual(last, {
    t: 'Para',
    c: [{ t: 'Span', c: [['', ['attribution'], []], [{ t: 'Str', c: 'Hamlet' }]] }],
  })
})

test('both attribution shapes lower to the identical Pandoc document', () => {
  // Old shape: what a `^0.1.2`-line engine hands over for `> To be` + `^ Hamlet`.
  const old = convert(
    doc([
      {
        type: 'figure',
        target: { type: 'block_quote', children: [para([{ type: 'text', value: 'To be' }])] },
        caption: [{ type: 'text', value: 'Hamlet' }],
      },
    ]),
  )
  const neu = convert(
    doc([
      {
        type: 'block_quote',
        children: [para([{ type: 'text', value: 'To be' }])],
        attribution: [{ type: 'text', value: 'Hamlet' }],
      },
    ]),
  )
  assert.deepEqual(old.doc.blocks, neu.doc.blocks)
  assert.deepEqual(old.warnings, [])
})

test('a quote-figure short caption is dropped with a warning', () => {
  // The §4a model has no navigation-caption slot on a quote; silent loss is
  // the one thing a bridge must not do with it.
  const result = convert(
    doc([
      {
        type: 'figure',
        target: { type: 'block_quote', children: [para([{ type: 'text', value: 'q' }])] },
        caption: [{ type: 'text', value: 'Author' }],
        shortCaption: [{ type: 'text', value: 'short' }],
      },
    ]),
  )
  assert.equal(result.warnings.length, 1)
  assert.ok(result.warnings[0].includes('short caption'), result.warnings[0])
})

test('a quote-figure upgrade merges figure and quote attrs instead of overwriting', () => {
  // The two nodes collapse into one §4a quote; attrs on BOTH must survive.
  const result = convert(
    doc([
      {
        type: 'figure',
        target: {
          type: 'block_quote',
          children: [para([{ type: 'text', value: 'q' }])],
          attrs: { id: 'inner', classes: ['kept'], keyValues: { a: '1', b: '2' } },
        },
        caption: [{ type: 'text', value: 'Author' }],
        attrs: { id: 'outer', classes: ['fancy'], keyValues: { b: '3' } },
      },
    ]),
  )
  assert.deepEqual(result.warnings, [])
  // BlockQuote has no Attr slot, so the merged attrs ride on the Div wrapper.
  const [div] = result.doc.blocks
  assert.equal(div.t, 'Div')
  const [id, classes, kvs] = div.c[0]
  assert.equal(id, 'outer')
  assert.deepEqual(classes, ['kept', 'fancy'])
  assert.deepEqual(Object.fromEntries(kvs), { a: '1', b: '3' })
  assert.equal(div.c[1][0].t, 'BlockQuote')
})
