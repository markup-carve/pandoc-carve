import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

/*
 * EVERY SPEC CLAUSE THIS REPO CITES STILL EXISTS.
 *
 * This file carries 80-odd `PART N section M` citations across its tests and
 * comments, and they are how a reader checks that a behavior being asserted is
 * the behavior the language actually requires. Nothing validated them, so a
 * wrong PART number or a clause the spec later withdrew read exactly like a
 * correct citation forever.
 *
 * That is not hypothetical here. `test/reverse.test.mjs` attributed the
 * frontmatter opener rule to PART 9 when the canonical writer is PART 11, and
 * PART 9 carries no clause with that label at all. The assertion was right and
 * the pointer was wrong, which is the worst combination - it sends the next
 * reader to a clause that does not exist and looks authoritative doing it.
 *
 * (Written without spelling the bad citation out, because this file is scanned
 * like every other: an example of a dangling citation would be indistinguishable
 * from one.)
 *
 * The spec repo found the same class in its own `tests/normativity.test.mjs`,
 * which validated PART 9 and PART 12 and therefore could not see a dangling
 * PART 10 or PART 11 citation (markup-carve/carve#1367). Widening it surfaced
 * eight. This is that gate, for this repo's side of the same citations.
 *
 * HOW IT RESOLVES A CLAUSE, and why it is a containment test rather than a
 * parser. The obvious approach - extract every section label per PART, then
 * check membership - needs a parser for a heading format that is right-aligned
 * on the period (`   9.` against `  10a.`) and that PART 8 uses twice with two
 * independent runs of numbers. A parser that under-collects reports live
 * clauses as dangling; one that over-collects silently stops failing. Both are
 * worse than the question actually being asked, which is only ever: does PART N
 * contain a section labelled M. So this slices the grammar between PART banners
 * and asks whether a heading line for M exists inside that slice. A nested
 * numbered list item can at worst make a real clause resolve, never make a
 * missing one resolve, because the label has to appear inside the right PART.
 */

const root = new URL('..', import.meta.url).pathname
const grammar = readFileSync(join(root, 'spec/resources/grammar.ebnf'), 'utf8')

/** Byte ranges of each PART, from its banner to the next one. */
const partRanges = () => {
  const banner = /^ {3}PART (\d+):/gm
  const marks = []
  for (const m of grammar.matchAll(banner)) marks.push({ part: Number(m[1]), at: m.index })
  const ranges = new Map()
  marks.forEach((mark, i) => {
    ranges.set(mark.part, grammar.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : grammar.length))
  })
  return ranges
}

const RANGES = partRanges()

/** Does PART `part` carry a section headed `label`? */
const clauseExists = (part, label) => {
  const body = RANGES.get(part)
  if (body === undefined) return false
  return new RegExp(String.raw`^ *${label.replace('.', '\\.')}\. `, 'm').test(body)
}

/*
 * Clauses this repo cites ON PURPOSE although the spec no longer carries them,
 * each because the withdrawal itself is the point being explained.
 *
 * KEYED BY SITE, not by clause. A ledger keyed by the clause alone exempts it
 * everywhere, so a NEW citation to a withdrawn clause - the shape that means
 * this repo still implements behavior the language removed - would pass on the
 * strength of an unrelated historical mention elsewhere. That is a content
 * parity defect wearing a citation's clothes, and it is the one thing this file
 * most needs to catch. Naming the file makes the exemption exactly as wide as
 * the review that granted it.
 *
 * An entry also CLAIMS THE CLAUSE IS GONE, so it fails if a later pin brings it
 * back. A stale exemption cannot sit here quietly the way a magic number can.
 */
const WITHDRAWN = new Map([
  [
    'test/ast-json.test.mjs',
    new Map([
      [
        'PART 9 §4a',
        'a caption on a quote was briefly an `attribution` field on the quote; withdrawn by markup-carve/carve#1213, and a captioned quote is a `figure` again. Cited where the engine pin is checked against the withdrawal.',
      ],
    ]),
  ],
  [
    'test/spec-citations.test.mjs',
    new Map([
      ['PART 9 §4a', 'named by this ledger and by the self-check below, which pins it as absent.'],
      [
        'PART 11 §10d',
        'the writer-side half of the same withdrawal (markup-carve/carve#1213); PART 11 runs 10c then 10e. Named by the self-check below, which pins it as absent.',
      ],
    ]),
  ],
])

/** Is this exact site allowed to name this withdrawn clause? */
const exempt = (file, cite) => WITHDRAWN.get(file)?.has(cite) ?? false

/** Every file git tracks, so a glob cannot quietly stop matching. */
const trackedFiles = () =>
  execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    // The submodule is the spec itself; its own citations are its own gate's job.
    .filter((f) => !f.startsWith('spec/') && !f.startsWith('dist/'))

const CITATION = /PART\s+(\d+)\s*(?:§|section\s+)(\d+[a-z]?)/g

const scan = () => {
  const found = []
  for (const rel of trackedFiles()) {
    let text
    try {
      text = readFileSync(join(root, rel), 'utf8')
    } catch {
      continue // a binary or deleted path is not a citation site
    }
    for (const m of text.matchAll(CITATION)) {
      found.push({
        file: rel,
        line: text.slice(0, m.index).split('\n').length,
        part: Number(m[1]),
        label: m[2],
        cite: `PART ${m[1]} §${m[2]}`,
      })
    }
  }
  return found
}

test('the citation scan actually reads this repo', () => {
  const files = trackedFiles()
  assert.ok(
    files.length > 0,
    'git ls-files returned nothing, so the scan below compared no files and would pass over any citation',
  )
  const found = scan()
  assert.ok(
    found.length > 0,
    `no spec citations found across ${files.length} tracked files. This repo cites the spec heavily, so zero ` +
      'means the scan stopped matching, not that the citations were removed',
  )
})

test('the grammar splits into PARTs the way this test assumes', () => {
  // If the banner format changes, every range is empty and every citation
  // "dangles" - loudly, rather than every citation resolving silently.
  assert.ok(RANGES.size >= 12, `found only ${RANGES.size} PART banners in the pinned grammar`)
  assert.ok(clauseExists(9, '1'), 'PART 9 §1 did not resolve, so clause lookup is broken')
  assert.ok(clauseExists(11, '10c'), 'PART 11 §10c did not resolve, so clause lookup is broken')
  // Both halves of markup-carve/carve#1213's withdrawal, pinned as ABSENT. If a
  // future pin brings either back, this says so at the one place that explains
  // why the repo talks about them in the past tense.
  assert.ok(!clauseExists(9, '4a'), 'PART 9 §4a resolved, but it was withdrawn by markup-carve/carve#1213')
  assert.ok(!clauseExists(11, '10d'), 'PART 11 §10d resolved, but it was withdrawn by markup-carve/carve#1213')
})

test('every spec clause this repo cites still exists', () => {
  const dangling = []
  for (const c of scan()) {
    if (clauseExists(c.part, c.label)) continue
    if (exempt(c.file, c.cite)) continue
    dangling.push(`${c.file}:${c.line}  ${c.cite}`)
  }
  assert.deepEqual(
    dangling,
    [],
    `citations that resolve to no clause in the pinned spec:\n${dangling.join('\n')}\n\n` +
      'Either the PART number is wrong, or the clause was withdrawn and the sentence around it needs rewriting ' +
      'rather than repointing. A deliberate reference to a withdrawn clause goes in WITHDRAWN above, with its reason.',
  )
})

test('no WITHDRAWN exemption outlived the withdrawal it records', () => {
  const returned = []
  for (const [file, clauses] of WITHDRAWN) {
    for (const cite of clauses.keys()) {
      const m = /^PART (\d+) §(\d+[a-z]?)$/.exec(cite)
      assert.ok(m, `WITHDRAWN key ${cite} in ${file} is not a citation`)
      if (clauseExists(Number(m[1]), m[2])) returned.push(`${file}: ${cite}`)
    }
  }
  assert.deepEqual(
    returned,
    [],
    `these clauses are exempted as withdrawn but the pinned spec carries them again:\n${returned.join('\n')}`,
  )
})

test('every WITHDRAWN exemption is still used by the file it names', () => {
  // An exemption nobody needs is a hole waiting for an unrelated citation to
  // fall into. When the last historical mention goes, so does its licence.
  const found = scan()
  const unused = []
  for (const [file, clauses] of WITHDRAWN) {
    for (const cite of clauses.keys()) {
      if (!found.some((c) => c.file === file && c.cite === cite)) unused.push(`${file}: ${cite}`)
    }
  }
  assert.deepEqual(unused, [], `WITHDRAWN exemptions no site uses any more:\n${unused.join('\n')}`)
})
