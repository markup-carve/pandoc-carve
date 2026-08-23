/*
 * SMART PUNCTUATION REACHES PANDOC AS ITS GLYPH, FOR EVERY KIND.
 *
 * The engine resolves `<--` to a `smart_punctuation` node carrying a `kind`,
 * and the bridge turns the kind into the glyph, because pandoc applies its own
 * smart punctuation when READING markdown and not when consuming a JSON AST.
 *
 * The glyph table used to be COPIED into src/convert.ts, because the engine
 * exported it from `ast.ts` and not from the package root (carve#355). The copy
 * then drifted, exactly as a copy does: it was two entries short, so `<==` and
 * `<=>` fell through the `??` to the author's literal source run, and the
 * reverse writer - correctly, for what it was handed - escaped the leading `<`
 * of a run it had every reason to read as text. The rendered document then said
 * `&lt;==` where the source said `⇐`.
 *
 * carve#355 is closed and the export landed, so the table is imported and the
 * whole drift class is gone. The first test is what would have caught the
 * drift while the copy still existed, and is what will catch the engine adding
 * a seventeenth kind.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMART_PUNCTUATION_GLYPHS, carveToHtml, parse } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

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

test('every smart-punctuation kind the engine knows resolves to a glyph, none to its source run', () => {
	// The source runs that produce each kind. Written out rather than derived,
	// so a kind the engine adds without a spelling here shows up as a gap in
	// the coverage assertion below instead of passing silently.
	const spellings = {
		ellipsis: '...',
		em_dash: '---',
		en_dash: '--',
		left_right_arrow: '<-->',
		rightwards_arrow: '-->',
		leftwards_arrow: '<--',
		rightwards_double_arrow: '==>',
		leftwards_double_arrow: '<==',
		left_right_double_arrow: '<=>',
		less_than_or_equal: '<=',
		greater_than_or_equal: '>=',
		not_equal: '!=',
		plus_minus: '+-',
		copyright: '(c)',
		registered: '(r)',
		trademark: '(tm)',
	};

	// ANTI-VACUITY: the engine's table is the population under test, so an
	// empty or shrunken one must fail rather than pass over nothing.
	const kinds = Object.keys(SMART_PUNCTUATION_GLYPHS);
	assert.ok(kinds.length >= 16, `expected the engine's full glyph table, got ${kinds.length} kind(s)`);
	assert.deepEqual(
		kinds.filter((kind) => !(kind in spellings)),
		[],
		'the engine knows a kind this test has no source spelling for - add it here',
	);

	const unresolved = [];
	for (const [kind, run] of Object.entries(spellings)) {
		const glyph = SMART_PUNCTUATION_GLYPHS[kind];
		if (glyph === undefined) continue;
		// Confirm the run really produces this kind on this engine before
		// asserting anything about the conversion of it.
		const node = parse(`x ${run} y\n`).children[0].children.find((c) => c.type === 'smart_punctuation');
		if (node?.kind !== kind) {
			unresolved.push(`${kind}: source run ${run} parsed as ${node?.kind ?? 'no smart_punctuation'}`);
			continue;
		}
		const produced = strings(carveToPandoc(`x ${run} y\n`).doc.blocks);
		if (!produced.includes(glyph)) {
			unresolved.push(`${kind}: expected ${glyph}, pandoc got ${JSON.stringify(produced)}`);
		}
	}
	assert.deepEqual(unresolved, [], unresolved.join('\n'));
});

test('the double arrows survive the round trip instead of coming back escaped', () => {
	// Corpus `386-the-doubled-run-is-the-canonical-arrow-in-both-families`,
	// reduced to the two runs the copied table was missing.
	const src = 'Canonical: <== ==> <=>\n';
	const back = pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;
	assert.ok(!back.includes('\\<'), `no run came back escaped: ${JSON.stringify(back)}`);
	assert.equal(carveToHtml(back), carveToHtml(src));
});
