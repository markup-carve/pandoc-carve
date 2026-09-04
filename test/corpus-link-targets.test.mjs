/*
 * THE PARSE, CHECKED AGAINST AN ORACLE OUTSIDE THE ENGINE.
 *
 * Every other corpus gate here can be satisfied by a uniformly wrong parse:
 *
 *   - test/spec-corpus.test.mjs asks that a document CONVERTS, that its AST
 *     validates against the spec schema, and that no node type is unknown. A
 *     document parsed into the wrong shape does all three.
 *   - test/roundtrip-corpus.test.mjs compares Carve -> pandoc -> Carve, which
 *     is the ENGINE AGAINST ITSELF. A misparse that survives the trip
 *     unchanged - and a misparse usually does, because both directions read
 *     the same wrong tree - passes.
 *
 * So nothing here reads the corpus's `.html` sidecar, which is the one
 * artifact in the checkout that the engine did not produce: it is the spec's
 * own statement of what the document means. #155 is what that gap costs. A
 * corpus section arrived pinning where a list marker folds into an open item's
 * lead text; the pinned engine read the fold window as a fixed column and
 * converted six of its nine documents from a parse the spec rules against;
 * every gate stayed green, and the divergence was visible only from the spec's
 * upstream ledger.
 *
 * WHAT IS COMPARED, and why it is this and not the whole rendering. Pandoc's
 * HTML writer is not Carve's, so a full comparison would be measuring two
 * writers rather than one parse. What both sides state the same way is WHERE A
 * LINK POINTS: `<a href>` and `<img src>` in the sidecar, `Link` and `Image`
 * targets in the Pandoc AST. That projection is narrow, but it is exactly the
 * axis a structural misparse moves - a definition that lands inside an item
 * instead of beside it stops being collected, and a reference call that should
 * resolve stays literal text. All six of #155's documents show up in it.
 *
 * FRAGMENT TARGETS ARE EXCLUDED. A `#...` href is where the two models
 * genuinely disagree: Carve's HTML writer renders a footnote call as an anchor
 * pair, pandoc has a `Note` node holding the content, and heading anchors and
 * section links differ the same way. Measured on the pinned engine over the
 * whole corpus: 19 documents diverge with fragments excluded, 141 with them
 * included. Keeping them would bury the six in a ledger of model differences
 * five times its size - a ledger nobody reads is a gate nobody has.
 *
 * TARGETS ARE COMPARED AS A SORTED MULTISET rather than in document order.
 * Order differences between the two writers are a writer question; whether a
 * reference resolved at all is the parse question this file is asking.
 *
 * THE LEDGER IS A LEDGER, NOT A SETTING - the same contract KNOWN_LOSSY holds
 * in test/roundtrip-corpus.test.mjs. Every entry carries the reason it is
 * there, and a document that starts agreeing must come OFF it, which the
 * stale-entry test below enforces. That arm is what makes the `pin:` entries
 * self-clearing: when the engine publishes the fix, those six start agreeing
 * and the gate goes red until they are removed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carveToPandoc } from '../dist/index.js';
import { declaredCorpusSize } from './helpers.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(repo, 'spec', 'tests', 'corpus');

test('the spec corpus submodule is checked out', () => {
  assert.ok(
    existsSync(corpusDir),
    corpusDir + ' is missing. Run "git submodule update --init". A failure ' +
      'rather than a skip: a skipped corpus and a clean one read the same.',
  );
});

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * An attribute value as the author wrote it, character references resolved.
 *
 * The writer escapes an attribute and the AST does not, so `/a?x=1&y=2` is
 * `href="/a?x=1&amp;y=2"` in the sidecar and `/a?x=1&y=2` in the Pandoc target.
 * Comparing those raw reports a divergence on a URL both sides agree about, and
 * a gate with false entries in it is a gate that gets switched off. One pass
 * rather than successive replacements, so `&amp;lt;` resolves to `&lt;` and not
 * to `<`.
 */
function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (whole, body) => {
    if (body[0] !== '#') return NAMED[body.toLowerCase()] ?? whole;
    const code = body[1] === 'x' || body[1] === 'X'
      ? Number.parseInt(body.slice(2), 16)
      : Number.parseInt(body.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/**
 * The link and image targets a corpus sidecar states, fragments dropped.
 *
 * A regex over the sidecar rather than a parse: these files are generated,
 * one tag per construct, and adding an HTML parser to read them would put a
 * second model between the gate and the spec's own words.
 */
export function htmlTargets(html) {
  const found = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) found.push(decodeEntities(m[1]));
  for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)) found.push(decodeEntities(m[1]));
  return found.filter((target) => !target.startsWith('#')).sort();
}

/** The same list, read off a Pandoc document. */
export function pandocTargets(node, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) pandocTargets(child, found);
    return found;
  }
  if (node && typeof node === 'object') {
    if ((node.t === 'Link' || node.t === 'Image') && Array.isArray(node.c)) {
      const target = node.c[2]?.[0];
      if (typeof target === 'string' && !target.startsWith('#')) found.push(target);
    }
    for (const value of Object.values(node)) pandocTargets(value, found);
  }
  return found;
}

/** @returns {string | null} how the conversion disagreed with the sidecar, or null */
export function disagreement(source, html) {
  const expected = htmlTargets(html);
  let actual;
  try {
    actual = pandocTargets(carveToPandoc(source).doc).sort();
  } catch (error) {
    return `threw: ${String(error.message).split('\n')[0]}`;
  }
  if (JSON.stringify(expected) === JSON.stringify(actual)) return null;
  return `expected ${JSON.stringify(expected)}, converted to ${JSON.stringify(actual)}`;
}

/*
 * THE DEAD READER PROBE, and why it runs before any count is believed.
 *
 * A comparison whose two halves both answer "nothing" agrees with itself
 * perfectly - a reader wired to a missing field, a traversal that never
 * matches, an extractor whose regex stopped matching a changed sidecar format.
 * Every one of those reports a clean sweep, which is markup-carve/carve#755's
 * shape and the reason this file is being added at all. So each half is
 * exercised on a pair BUILT to disagree, in the direction that half owns, plus
 * one built to agree so a comparison stuck at always-red is caught too.
 */
const PROBES = [
  // The AST half must be able to report a target the sidecar does not have.
  // A traversal that finds nothing reports agreement here.
  ['the AST reader sees a target the sidecar does not', '[t](/probe)\n', '<p>t</p>\n', true],
  // The sidecar half must be able to report a target the AST does not have.
  // An extractor that finds nothing reports agreement here.
  ['the sidecar reader sees a target the AST does not', 'plain\n', '<p><a href="/probe">t</a></p>\n', true],
  // And a pair that genuinely agrees must not be reported, or the gate is
  // red on everything and its ledger means nothing.
  ['a matching pair is not reported', '[t](/probe)\n', '<p><a href="/probe">t</a></p>\n', false],
  // The escaped attribute the writer produces is the same target the AST
  // carries. No corpus document exercises it today, which is exactly why it is
  // asserted here rather than left to be discovered as a false ledger entry.
  ['an escaped attribute is the target it decodes to', '[t](/a?x=1&y=2)\n', '<p><a href="/a?x=1&amp;y=2">t</a></p>\n', false],
];

for (const [what, source, html, shouldDisagree] of PROBES) {
  test(`dead reader probe: ${what}`, () => {
    const found = disagreement(source, html);
    if (shouldDisagree) {
      assert.notEqual(
        found,
        null,
        'the comparison reported agreement on a pair built to disagree, so a ' +
          'clean sweep below would prove nothing: one half of it is reading ' +
          'nothing at all.',
      );
    } else {
      assert.equal(found, null, `the comparison reported a disagreement on a matching pair: ${found}`);
    }
  });
}

const corpus = existsSync(corpusDir)
  ? readdirSync(corpusDir)
      .filter((file) => file.endsWith('.crv'))
      .sort()
      .map((file) => ({
        name: file,
        source: readFileSync(join(corpusDir, file), 'utf8'),
        html: readFileSync(join(corpusDir, file.replace(/\.crv$/, '.html')), 'utf8'),
      }))
  : [];

/*
 * The ledger. Two kinds of entry, and they behave differently over time.
 *
 * `model:` is a difference between Carve's HTML writer and the AST the bridge
 * reads. It does not clear on an engine bump, because neither side is wrong -
 * the writer flattens or blanks something the AST still carries.
 *
 * `pin:` is engine drift: the published engine parses the document against a
 * clause the spec has since ruled the other way. Each one names the upstream
 * entry in spec/resources/engine-pin-drift.txt that declares it, and each
 * clears - loudly, through the stale-entry test - when the pin moves past the
 * fix.
 */
const KNOWN_DIVERGENT = new Map([
  // model: LINKS NEVER NEST IN OUTPUT. The engine's AST keeps a link inside a
  // link's label (measured: `parse('[[x](y)](z)')` returns a link inside a
  // link); Carve's HTML writer unwraps the inner one to text. The bridge reads
  // the AST, so the inner target survives into pandoc and the sidecar has only
  // the outer.
  ['03-links-11.crv', 'model: a link nested in a link label survives in the AST, flattened by the HTML writer'],
  ['313-a-reference-link-s-text-survives-its-own-frame-2.crv', 'model: as 03-links-11, through a reference call in the label'],
  ['313-a-reference-link-s-text-survives-its-own-frame-3.crv', 'model: as 03-links-11, through a reference call in the label'],
  // model: the same shape with an autolink rather than an explicit link in the
  // label, and - for 275 and 288 - through a collapsed reference whose label
  // text repeats the heading's own inline content.
  ['03-links-12.crv', 'model: an autolink inside a link label survives in the AST, flattened by the HTML writer'],
  ['275-a-collapsed-reference-reaches-a-heading-by-the-heading-s-rendered-text-5.crv', 'model: a collapsed reference repeats the heading label, so its inner link appears twice in the AST and once in the writer output'],
  ['288-heading-index-plain-text-covers-visible-leaves-and-rejects-an-empty-key.crv', 'model: as 275-...-5, with an autolink in the heading'],
  // pin: THE SIX #155 DOCUMENTS. carve#1906 pins the marker fold window - a
  // marker folds into an open item's lead text only STRICTLY between the item's
  // base and content column - and the published engine reads that window as a
  // fixed column. Four are a definition that should register and does not, two
  // are a definition that registers and should have stayed lead text. Fixed on
  // carve-js main by markup-carve/carve-js#1601; these clear when the pin moves
  // past it. Declared upstream in spec/resources/engine-pin-drift.txt.
  ['442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-3.crv', 'pin: marker fold window read as a fixed column (carve-js#1601)'],
  ['442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-4.crv', 'pin: marker fold window read as a fixed column (carve-js#1601)'],
  ['442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-5.crv', 'pin: marker fold window read as a fixed column (carve-js#1601)'],
  ['442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-7.crv', 'pin: marker fold window read as a fixed column (carve-js#1601)'],
  ['442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-8.crv', 'pin: marker fold window read as a fixed column (carve-js#1601)'],
  ['442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-9.crv', 'pin: marker fold window read as a fixed column (carve-js#1601)'],
]);

test('the sidecar comparison runs over the whole corpus, not a sample', () => {
  // Equality against the size the spec pages declare, for the reason
  // test/roundtrip-corpus.test.mjs states at length: a floor cannot tell a
  // whole corpus from a truncated one, and the ledger below is only meaningful
  // against the corpus it was written against.
  const declared = declaredCorpusSize(repo);
  assert.ok(declared > 0, 'the corpus source pages declare no ::: compare blocks at all.');
  assert.equal(
    corpus.length,
    declared,
    'expected the full corpus: spec/resources/examples declares ' + declared +
      ' documents, spec/tests/corpus holds ' + corpus.length + '.',
  );
});

const divergent = new Map();
for (const { name, source, html } of corpus) {
  const found = disagreement(source, html);
  if (found !== null) divergent.set(name, found);
}

test("every corpus document's link targets match the sidecar, except the ledger", () => {
  const unexpected = [...divergent]
    .filter(([name]) => !KNOWN_DIVERGENT.has(name))
    .map(([name, found]) => `${name}: ${found}`);
  assert.deepEqual(
    unexpected,
    [],
    'document(s) whose conversion points somewhere the spec\'s own expected HTML ' +
      'does not. Either the bridge lost a reference, or the pinned engine parses ' +
      'the document against a clause the spec rules the other way - in which case ' +
      'add it to KNOWN_DIVERGENT with a "pin:" reason naming the upstream fix:\n  ' +
      unexpected.join('\n  '),
  );
});

test('the ledger holds no document that already agrees', () => {
  // The self-clearing arm. A stale entry reads as a known difference and
  // silently accepts a real regression on that document forever - and it is
  // how the `pin:` rows announce that the engine bump has landed.
  const agreeing = [...KNOWN_DIVERGENT.keys()].filter((name) => !divergent.has(name));
  assert.deepEqual(
    agreeing,
    [],
    'these documents agree with their sidecar now and must come OFF ' +
      'KNOWN_DIVERGENT. A "pin:" row here means the engine bump has landed and ' +
      'the drift it recorded is cleared:\n  ' + agreeing.join('\n  '),
  );
});

test('every ledger entry names a document the corpus still has', () => {
  // A renamed or removed corpus document leaves an entry that can never go
  // stale, because it can never be measured - the ledger would quietly stop
  // covering it while still looking full.
  const names = new Set(corpus.map(({ name }) => name));
  const missing = [...KNOWN_DIVERGENT.keys()].filter((name) => !names.has(name));
  assert.deepEqual(
    missing,
    [],
    'KNOWN_DIVERGENT names document(s) the corpus no longer holds:\n  ' + missing.join('\n  '),
  );
});
