import { test } from 'node:test'
import assert from 'node:assert/strict'
import { convert } from '../dist/convert.js'

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
