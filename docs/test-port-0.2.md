# Test port to Carve 0.2

This is the observed case census from running each of the 58 old files alone on `next2` before edits. Dynamic test loops count as executed cases. `url-scheme.test.mjs` aborted during its top-level 0.1 private-module import, so its observed count is one file failure; it declares 14 tests. The pending column is work still required, not a dropped case.

| File | Cases | Ported | Dropped with reason | Pending |
| --- | ---: | ---: | --- | ---: |
| ast-json.test.mjs | 22 | 16 | 1: 0.1 pre-split node normalization; 1: 0.1 runtime serializer mapping; 1: 0.1 normalization API; 1: 0.1 mixed runtime and wire definition entries; 1: 0.1 malformed-entry repair; 1: 0.1 parseCarveAst wrapper | 0 |
| ast-structure-preservation.test.mjs | 6 | 5 | 1: 0.1 legacySpaceSentinels import option | 0 |
| attribute-case-fold.test.mjs | 8 | 8 | 0 | 0 |
| attribute-sanitize.test.mjs | 5 | 5 | 0 | 0 |
| bidi-controls.test.mjs | 3 | 3 | 0 | 0 |
| block-cells.test.mjs | 14 | 10 | 1: 0.1 listTable source round trip for block cells; 1: 0.1 listTable local header-row syntax; 1: 0.1 listTable list tightness encoding; 1: 0.1 listTable header-cols source key | 0 |
| caption-blocks.test.mjs | 4 | 0 | 0 | 4 |
| cell-attrs.test.mjs | 11 | 11 | 0 | 0 |
| citations.test.mjs | 27 | 0 | 0 | 27 |
| cli.test.mjs | 24 | 0 | 0 | 24 |
| conversion-correctness.test.mjs | 4 | 4 | 0 | 0 |
| corpus-census.test.mjs | 1 | 0 | 0 | 1 |
| corpus-link-targets.test.mjs | 9 | 0 | 0 | 9 |
| corpus.test.mjs | 10 | 0 | 0 | 10 |
| diagnostic-code-coverage.test.mjs | 22 | 0 | 0 | 22 |
| diagnostics-v2.test.mjs | 1 | 0 | 0 | 1 |
| djot-reader-and-inline-attrs.test.mjs | 31 | 24 | 3: 0.1 inserted/deleted class aliases; 1: 0.1 emoji class import heuristic; 1: 0.1 bridge symbols option; 1: 0.1 wrapper-key marker; 1: 0.1 Djot symbol-name inference | 0 |
| empty-list-item.test.mjs | 8 | 8 | 0 | 0 |
| equivalence.test.mjs | 41 | 41 | 0 | 0 |
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
| model-limits.test.mjs | 4 | 4 | 0 | 0 |
| new-ast-nodes.test.mjs | 17 | 17 | 0 | 0 |
| new-task-states.test.mjs | 6 | 3 | 3: 0.1 provenance-envelope diagnostic | 0 |
| no-git-dependencies.test.mjs | 66 | 66 | 0 | 0 |
| packaging.test.mjs | 4 | 4 | 0 | 0 |
| parity.test.mjs | 11 | 11 | 0 | 0 |
| participants.test.mjs | 4 | 0 | 0 | 4 |
| policy.test.mjs | 20 | 0 | 0 | 20 |
| provenance.test.mjs | 8 | 0 | 0 | 8 |
| raw-block-payload.test.mjs | 7 | 0 | 0 | 7 |
| reverse-edge-cases.test.mjs | 8 | 0 | 0 | 8 |
| reverse.test.mjs | 36 | 0 | 0 | 36 |
| roundtrip-corpus.test.mjs | 5 | 0 | 0 | 5 |
| roundtrip-fidelity.test.mjs | 13 | 0 | 0 | 13 |
| roundtrip.test.mjs | 9 | 0 | 0 | 9 |
| row-groups.test.mjs | 44 | 28 | 1: 0.1 implicit rowGroups run split; 3: 0.1 flat rowGroups count validation; 1: 0.1 source writer's full positional partition spelling; 2: 0.1 row-head column inference from marked cells; 2: 0.1 declared-partition row-header inference; 2: 0.1 body-header-cols source key under a foot; 1: 0.1 single-body row-head count disagreement warning; 1: 0.1 leading body-header-cols source guard; 1: 0.1 derived count collapse; 2: 0.1 listTable extension | 0 |
| smart-punctuation.test.mjs | 2 | 2 | 0 | 0 |
| spec-citations.test.mjs | 5 | 0 | 0 | 5 |
| spec-corpus.test.mjs | 6 | 0 | 0 | 6 |
| substitution.test.mjs | 3 | 0 | 0 | 3 |
| table-body-structure.test.mjs | 6 | 0 | 0 | 6 |
| table-reader-regressions.test.mjs | 14 | 13 | 1: 0.1 Figure/Div wrapper attributes collapsed into a table | 0 |
| table-section-attributes.test.mjs | 3 | 0 | 0 | 3 |
| task-states.test.mjs | 16 | 15 | 1: 0.1 checked plus taskState conflict model | 0 |
| unit.test.mjs | 64 | 60 | 3: 0.1 listTable extension implementation; 1: 0.1 parsed inline div label | 0 |
| url-scheme.test.mjs | 1 | 1 | 0 | 0 |
| wrapper-marker.test.mjs | 9 | 0 | 0 | 9 |

| Total | 730 | 367 | 46 | 317 |

The 367 ported cases are in the current `npm test` gate. The row-groups rewrite also adds three 0.2-specific checks for explicit zero head rows, body header cell flags, and source diagnostics. The stated drop reasons are the only intentional removals. The remaining files continue to test the old API, 0.1 syntax, or 0.1 internal tree and diagnostic shapes; their passing cases in the ungated full run do not yet count as 0.2 coverage.

The 16 removed `row-groups.test.mjs` cases, each with its 0.1 feature reason:

- “control: without the field the implicit split follows the rows themselves”: 0.1 inferred body groups from a missing flat `rowGroups` count object.
- “a partition whose counts do not sum is refused, with the numbers said out loud”: 0.1 flat `rowGroups` could have an inconsistent count sum.
- “a partition that over-counts is refused the same way”: 0.1 flat `rowGroups` could over-count rows.
- “a count that is not a count is refused before the sum is reached”: 0.1 flat `rowGroups` had scalar count fields.
- “the source writer states the whole partition, so it reports no loss”: 0.1 positional `body-rows` and `body-header-rows` source keys spelled a full partition.
- “row-head columns are marked on the cells and stay a pipe table”: 0.1 source writer inferred `RowHeadColumns` from marked cells.
- “and pandoc gets its RowHeadColumns back from those cells”: 0.1 reader inferred `RowHeadColumns` from marked source cells.
- “a stated partition does not swallow the row headers under it”: 0.1 declared positional partitions inferred row-head counts from cell markers.
- “a stray row header under a stated partition is reported, not dropped quietly”: 0.1 declared positional partitions reported stray row-head markers.
- “a foot over disagreeing row-head runs keeps both counts and reports nothing”: 0.1 `body-header-cols` source key spelled each body's count under a foot.
- “control: runs that agree under a foot are not reported and are not lost”: 0.1 foot partition reader derived a body count from cell markers.
- “and a body whose rows disagree reports it instead of picking a count”: 0.1 one-body count inference reported disagreement among marked rows.
- “a leading row-head run that fills the row is stated, or it becomes the head”: 0.1 `body-header-cols` source key overrode leading header-row inference.
- “control: counts that alternate over more than one column still collapse”: 0.1 source writer collapsed body count runs inferred from marked cells.
- “a forced list-table reports the row headers the disagreement invents”: 0.1 `listTable` extension had one table-wide `header-cols` count.
- “the AST path says the same thing, because the warning names where it survives”: 0.1 `listTable` extension emitted a source-only row-head widening warning.

The four removed `block-cells.test.mjs` cases, each with its 0.1 feature reason:

- “block cells: the block content survives the whole loop back to pandoc”: 0.1 `listTable` source could spell full block cells; 0.2 source cannot.
- “list-table: local header rows become separate pandoc body groups”: 0.1 `listTable` local `header-row` syntax is gone.
- “block cells: the emitted tight flags match what the emitted source parses to”: 0.1 `listTable` used list item tightness to encode cells.
- “block cells: row-head columns survive the list-table loop”: 0.1 `listTable` used a table-wide `header-cols` key.

The removed `table-reader-regressions.test.mjs` case “Figure and alignment-Div attributes merge into the table with the caption” depended on the 0.1 wrapper-collapse rule, which discarded the Figure and Div nodes and merged their attributes into the table. Carve 0.2 keeps those nodes.

A full `node --test test/*.test.mjs` run after the initial port reported 783 cases, 376 passes, and 407 failures. This run includes the legacy test files, the new 0.2 tests, and the new end-to-end tests. The failures are concentrated in 0.1 AST spellings, old CLI and diagnostics, table and citation mapping assumptions, and 0.1 source fixtures. Each pending failure needs a 0.2 rewrite or a one-line removal reason before the old implementation can be removed.
