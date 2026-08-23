/*
 * WHAT PANDOC'S MODEL CANNOT HOLD IS REPORTED, NOT DROPPED IN SILENCE.
 *
 * Two constructs have nowhere to go on the way out, and until now both went
 * nowhere quietly. A silent drop is the worst shape a loss can take here: the
 * round trip compares rendered HTML, so a loss that both directions agree to
 * make cancels out and the gate stays green over it - which is exactly how
 * these two rode along unnoticed while the corpus was being checked against an
 * engine too old to produce the shapes at all.
 *
 * Neither warning is a fix. There is no slot to map into, and inventing one -
 * or leaking the value onto a neighbouring node - would be worse than losing
 * it. Saying so out loud is the whole of what can be done.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc } from '../dist/index.js';

const codes = (src) => carveToPandoc(src, { roundtrip: true }).diagnostics.map((d) => d.code);

test('a row header outside the leading run is reported', () => {
	// `RowHeadColumns` counts a row's FIRST cells, so a data cell followed by a
	// row header cannot be said. Corpus `256-...-18`: the padding rule makes
	// `|=h|` the literal text `=h`, leaving only the second cell a header.
	const result = carveToPandoc('|=h|=  i |\n|a|  b  |\n', { roundtrip: true });
	assert.deepEqual(result.diagnostics.map((d) => d.code), ['table-row-head-outside-leading-run']);
	assert.equal(result.diagnostics[0].severity, 'lossy');
	assert.match(result.warnings[0], /RowHeadColumns/);
});

test('and a row header IN the leading run is not, because it survives', () => {
	// The counterpart that keeps the check honest: a warning on every row-head
	// table would be noise, and would say nothing about what was lost.
	assert.deepEqual(codes('| a |\n|= b |\n+ c |\n'), []);
	assert.deepEqual(codes('|= A |= B |\n|---|---|\n| x | y |\n'), []);
});

test('attributes on a math span are reported', () => {
	// Pandoc's `Math` is `Math MathType Text` - two children, no `Attr`. Corpus
	// `393-...-5`, where the lost attribute is an accessible name.
	const result = carveToPandoc('An inline $`x = 1` and a named $`y`{aria-label="why"} one.\n', { roundtrip: true });
	assert.deepEqual(result.diagnostics.map((d) => d.code), ['math-attributes-dropped']);
	assert.equal(result.diagnostics[0].severity, 'lossy');
});

test('and a math span with no attributes is not', () => {
	assert.deepEqual(codes('Plain $`x` only.\n'), []);
	assert.deepEqual(codes('Display:\n\n$$`x = 1`\n'), []);
});
