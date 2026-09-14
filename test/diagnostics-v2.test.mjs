import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnostic } from '../dist/diagnostics.js';

const cases = [
  ['frontmatter: block content under "abstract" needs a Carve parser to read - use carveToPandoc / carveAstToPandoc, which supply one; skipped', 'frontmatter-block-content-dropped', 'dropped'],
  ['table: 1 row(s) shorter than the widest (2 cells) are padded with empty cells', 'table-groups-normalized', 'normalized'],
  ['table: a cell holds block content, which a pipe table cannot spell - emitted as a `::: list-table` (structure preserved)', 'table-groups-normalized', 'normalized'],
  ['table: invalid rowGroups - converted with the implicit head/body split instead', 'table-row-groups-invalid', 'degraded'],
  ['table: 2 body groups - preserved in the Carve AST as `rowGroups`, but source flattens them', 'table-groups-flattened', 'degraded'],
  ["table: a foot row's row header is dropped - pandoc has no slot", 'table-foot-row-header-dropped', 'dropped'],
  ['table: the body rows disagree on how many leading cells are row headers', 'table-row-heads-degraded', 'degraded'],
  ['table: the rows of a declared body group disagree on how many leading cells are row headers', 'table-row-heads-degraded', 'degraded'],
  ['table: future diagnostic form', 'table-unclassified-loss', 'dropped'],
];

test('every emitted table diagnostic classifies explicitly and the fallback fails closed', () => {
  for (const [message, code, fidelity] of cases) {
    const row = diagnostic('carve-to-pandoc', message);
    assert.equal(row.code, code, message);
    assert.equal(row.fidelity, fidelity, message);
    assert.equal(row.severity, fidelity === 'normalized' ? 'info' : fidelity === 'degraded' ? 'warning' : 'error', message);
    assert.equal(row.confidence, 'inferred', message);
  }
});
