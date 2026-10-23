/* A row header outside the leading run has no Pandoc table slot. */
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
	assert.equal(result.diagnostics[0].class, 'lossy');
	assert.equal(result.diagnostics[0].severity, 'error');
	assert.match(result.warnings[0], /RowHeadColumns/);
});

test('and a row header IN the leading run is not, because it survives', () => {
	// The counterpart that keeps the check honest: a warning on every row-head
	// table would be noise, and would say nothing about what was lost.
	assert.deepEqual(codes('| a |\n|= b |\n+ c |\n'), []);
	assert.deepEqual(codes('|= A |= B |\n|---|---|\n| x | y |\n'), []);
});

test('attributes on a math span ride on a Span', () => {
	const result = carveToPandoc('An inline $`x = 1` and a named $`y`{aria-label="why"} one.\n', { roundtrip: true });
	assert.deepEqual(result.diagnostics.map((d) => d.code), []);
	const wrapper = result.doc.blocks[0].c.find((n) => n.t === 'Span');
	assert.equal(wrapper.c[1][0].t, 'Math');
	assert.deepEqual(wrapper.c[0][2], [['wrapper', '1'], ['aria-label', 'why']]);
});

test('and a math span with no attributes is not', () => {
	assert.deepEqual(codes('Plain $`x` only.\n'), []);
	assert.deepEqual(codes('Display:\n\n$$`x = 1`\n'), []);
});
