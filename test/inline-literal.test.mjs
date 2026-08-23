/*
 * AN INLINE LITERAL SURVIVES THE ROUND TRIP AS A LITERAL.
 *
 * `!` + a code span (PART 9 §27) captures its content VERBATIM and renders it
 * as ordinary prose - no `<code>` wrapper, which is the whole point of the
 * construct. The bridge therefore cannot map it to pandoc `Code`, and used to
 * emit plain text instead. Two things went wrong with that:
 *
 *   - The CAPTURE was gone. A literal may span a line break, and the newline
 *     was left sitting inside a `Str` - a shape pandoc's model does not admit,
 *     since a `Str` holds no whitespace and breaks are their own nodes. The
 *     reverse writer then wrote a bare newline, and inside a line block that is
 *     a hard break the source did not have.
 *   - A literal of nothing but SPACES came back empty, because bare `Space`
 *     nodes are all that was left of it and prose collapses them.
 *
 * In roundtrip mode the node now travels in a provenance Span - the mechanism
 * comments, unknown nodes and citations already use - with the text still
 * visible inside it, so a consumer that is not round-tripping reads exactly
 * what it read before.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

const roundTrip = (src) => pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;

/** Every Str the conversion produced, flattened. */
function strings(blocks) {
	const out = [];
	const walk = (node) => {
		if (Array.isArray(node)) return node.forEach(walk);
		if (!node || typeof node !== 'object') return;
		if (node.t === 'Str') out.push(node.c);
		walk(node.c);
	};
	walk(blocks);
	return out;
}

test('a literal spanning a line break puts no newline inside a Str', () => {
	// Corpus `377-an-unclosed-inline-literal-reaches-the-end-of-its-block-2`.
	// An unclosed literal reaches the end of its block, so it swallows the line
	// break, and the line block must not regain one.
	const src = '::: |\na !`b\nc d\n:::\n';
	const offenders = strings(carveToPandoc(src, { roundtrip: true }).doc.blocks)
		.filter((s) => /[\n\r\t]/.test(s));
	assert.deepEqual(offenders, [], 'a Str holds no whitespace in pandoc"s model');
});

test('and the line block does not regain a hard break through the trip', () => {
	const src = '::: |\na !`b\nc d\n:::\n';
	const back = roundTrip(src);
	assert.ok(!carveToHtml(back).includes('<br'), `no break was added: ${JSON.stringify(back)}`);
	assert.equal(carveToHtml(back), carveToHtml(src));
});

test('a literal of nothing but spaces survives instead of collapsing', () => {
	// Corpus `141-trailing-whitespace-boundaries`, which sat on KNOWN_LOSSY
	// until the literal itself started making the trip.
	const src = '!`  `\n';
	assert.equal(carveToHtml(roundTrip(src)), carveToHtml(src));
});

test('and a literal beside an ordinary code span keeps them apart', () => {
	// Corpus `268-trailing-whitespace-on-a-content-line-is-dropped-10`: the
	// `code` keeps its `<code>` wrapper, the literal keeps none, and the
	// trailing space inside each is verbatim.
	const src = '`x ` and !`y `\n';
	const back = roundTrip(src);
	assert.equal(carveToHtml(back), carveToHtml(src));
	assert.ok(back.includes('!`'), `the literal is still a literal: ${JSON.stringify(back)}`);
});

test('outside roundtrip mode the text is still plain, not a code span', () => {
	// The construct exists to AVOID monospace styling, so a consumer that is
	// not round-tripping must not suddenly receive `Code`.
	const blocks = carveToPandoc('a !`b` c\n').doc.blocks;
	const seen = [];
	const walk = (node) => {
		if (Array.isArray(node)) return node.forEach(walk);
		if (!node || typeof node !== 'object') return;
		if (typeof node.t === 'string') seen.push(node.t);
		walk(node.c);
	};
	walk(blocks);
	assert.ok(!seen.includes('Code'), `no Code node: ${seen.join(', ')}`);
	assert.ok(strings(blocks).includes('b'), 'the text is still there');
});
