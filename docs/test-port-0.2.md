# Test port to Carve 0.2

This is the observed case census from running each of the 58 old files alone on `next2` before edits. Dynamic test loops count as executed cases. `url-scheme.test.mjs` aborted during its top-level 0.1 private-module import, so its observed count is one file failure; it declares 14 tests. The pending column is work still required, not a dropped case.

| File | Cases | Ported | Dropped with reason | Pending |
| --- | ---: | ---: | --- | ---: |
| ast-json.test.mjs | 22 | 0 | 0 | 22 |
| ast-structure-preservation.test.mjs | 6 | 0 | 0 | 6 |
| attribute-case-fold.test.mjs | 8 | 0 | 0 | 8 |
| attribute-sanitize.test.mjs | 5 | 5 | 0 | 0 |
| bidi-controls.test.mjs | 3 | 3 | 0 | 0 |
| block-cells.test.mjs | 14 | 0 | 0 | 14 |
| caption-blocks.test.mjs | 4 | 0 | 0 | 4 |
| cell-attrs.test.mjs | 11 | 0 | 0 | 11 |
| citations.test.mjs | 27 | 0 | 0 | 27 |
| cli.test.mjs | 24 | 0 | 0 | 24 |
| conversion-correctness.test.mjs | 4 | 4 | 0 | 0 |
| corpus-census.test.mjs | 1 | 0 | 0 | 1 |
| corpus-link-targets.test.mjs | 9 | 0 | 0 | 9 |
| corpus.test.mjs | 10 | 0 | 0 | 10 |
| diagnostic-code-coverage.test.mjs | 22 | 0 | 0 | 22 |
| diagnostics-v2.test.mjs | 1 | 0 | 0 | 1 |
| djot-reader-and-inline-attrs.test.mjs | 31 | 0 | 0 | 31 |
| empty-list-item.test.mjs | 8 | 0 | 0 | 8 |
| equivalence.test.mjs | 41 | 0 | 0 | 41 |
| examples.test.mjs | 11 | 0 | 0 | 11 |
| figure-boundaries.test.mjs | 2 | 0 | 0 | 2 |
| figure-groups.test.mjs | 15 | 0 | 0 | 15 |
| heading-ids.test.mjs | 3 | 2 | 1: 0.1 corpus heading oracle | 0 |
| html-equivalence.test.mjs | 3 | 3 | 0 | 0 |
| import-limits.test.mjs | 1 | 0 | 0 | 1 |
| import.test.mjs | 5 | 0 | 0 | 5 |
| includes.test.mjs | 9 | 0 | 0 | 9 |
| inline-literal.test.mjs | 5 | 3 | 2: 0.1 unclosed literal crossed a line boundary | 0 |
| loss-audit.test.mjs | 7 | 0 | 0 | 7 |
| metadata-yaml12.test.mjs | 1 | 0 | 0 | 1 |
| metadata.test.mjs | 26 | 0 | 0 | 26 |
| model-limits.test.mjs | 4 | 0 | 0 | 4 |
| new-ast-nodes.test.mjs | 17 | 0 | 0 | 17 |
| new-task-states.test.mjs | 6 | 3 | 3: 0.1 provenance-envelope diagnostic | 0 |
| no-git-dependencies.test.mjs | 66 | 66 | 0 | 0 |
| packaging.test.mjs | 4 | 4 | 0 | 0 |
| parity.test.mjs | 11 | 0 | 0 | 11 |
| participants.test.mjs | 4 | 0 | 0 | 4 |
| policy.test.mjs | 20 | 0 | 0 | 20 |
| provenance.test.mjs | 8 | 0 | 0 | 8 |
| raw-block-payload.test.mjs | 7 | 0 | 0 | 7 |
| reverse-edge-cases.test.mjs | 8 | 0 | 0 | 8 |
| reverse.test.mjs | 36 | 0 | 0 | 36 |
| roundtrip-corpus.test.mjs | 5 | 0 | 0 | 5 |
| roundtrip-fidelity.test.mjs | 13 | 0 | 0 | 13 |
| roundtrip.test.mjs | 9 | 0 | 0 | 9 |
| row-groups.test.mjs | 44 | 0 | 0 | 44 |
| smart-punctuation.test.mjs | 2 | 2 | 0 | 0 |
| spec-citations.test.mjs | 5 | 0 | 0 | 5 |
| spec-corpus.test.mjs | 6 | 0 | 0 | 6 |
| substitution.test.mjs | 3 | 0 | 0 | 3 |
| table-body-structure.test.mjs | 6 | 0 | 0 | 6 |
| table-reader-regressions.test.mjs | 14 | 0 | 0 | 14 |
| table-section-attributes.test.mjs | 3 | 0 | 0 | 3 |
| task-states.test.mjs | 16 | 0 | 0 | 16 |
| unit.test.mjs | 64 | 0 | 0 | 64 |
| url-scheme.test.mjs | 1 | 1 | 0 | 0 |
| wrapper-marker.test.mjs | 9 | 0 | 0 | 9 |

| Total | 730 | 96 | 6 | 628 |

The 96 ported cases are in the current `npm test` gate. The three drop reasons above are the only intentional removals. The remaining files continue to test the old API, 0.1 syntax, or 0.1 internal tree and diagnostic shapes; their passing cases in the ungated full run do not yet count as 0.2 coverage.

A full `node --test test/*.test.mjs` run after the initial port reported 783 cases, 376 passes, and 407 failures. This run includes the legacy test files, the new 0.2 tests, and the new end-to-end tests. The failures are concentrated in 0.1 AST spellings, old CLI and diagnostics, table and citation mapping assumptions, and 0.1 source fixtures. Each pending failure needs a 0.2 rewrite or a one-line removal reason before the old implementation can be removed.
