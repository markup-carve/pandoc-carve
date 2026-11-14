# Test port to Carve 0.2

This is the observed case census from running each of the 58 old files alone on `next2` before edits. Dynamic test loops count as executed cases. `url-scheme.test.mjs` aborted during its top-level 0.1 private-module import, so its observed count is one file failure; it declares 14 tests. The pending column is work still required, not a dropped case.

| File | Cases | Ported | Dropped with reason | Skipped with finding | Pending |
| --- | ---: | ---: | --- | ---: | ---: |
| ast-json.test.mjs | 22 | 16 | 1: 0.1 pre-split node normalization; 1: 0.1 runtime serializer mapping; 1: 0.1 normalization API; 1: 0.1 mixed runtime and wire definition entries; 1: 0.1 malformed-entry repair; 1: 0.1 parseCarveAst wrapper | 0 | 0 |
| ast-structure-preservation.test.mjs | 6 | 5 | 1: 0.1 legacySpaceSentinels import option | 0 | 0 |
| attribute-case-fold.test.mjs | 8 | 8 | 0 | 0 | 0 |
| attribute-sanitize.test.mjs | 5 | 5 | 0 | 0 | 0 |
| bidi-controls.test.mjs | 3 | 3 | 0 | 0 | 0 |
| block-cells.test.mjs | 14 | 10 | 1: 0.1 listTable source round trip for block cells; 1: 0.1 listTable local header-row syntax; 1: 0.1 listTable list tightness encoding; 1: 0.1 listTable header-cols source key | 0 | 0 |
| caption-blocks.test.mjs | 4 | 4 | 0 | 0 | 0 |
| cell-attrs.test.mjs | 11 | 11 | 0 | 0 | 0 |
| citations.test.mjs | 27 | 25 | 1: 0.1 citeproc bibliography metadata diagnostic; 1: 0.1 CSL-entry Div mapping for citation definitions | 0 | 0 |
| cli.test.mjs | 24 | 11 | 10: 0.1 include expansion and include diagnostics; 3: 0.1 structured migration-report format | 0 | 0 |
| conversion-correctness.test.mjs | 4 | 4 | 0 | 0 | 0 |
| corpus-census.test.mjs | 1 | 1 | 0 | 0 | 0 |
| corpus-link-targets.test.mjs | 9 | 7 | 2: 0.1 spec-corpus divergent allowlist | 0 | 0 |
| corpus.test.mjs | 10 | 10 | 0 | 0 | 0 |
| diagnostic-code-coverage.test.mjs | 22 | 17 | 2: 0.1 listTable extension; 1: 0.1 structured diagnostic classifier | 2: F-001 general Pandoc metadata has no 0.2 tree slot | 0 |
| diagnostics-v2.test.mjs | 1 | 1 | 0 | 0 | 0 |
| djot-reader-and-inline-attrs.test.mjs | 31 | 24 | 3: 0.1 inserted/deleted class aliases; 1: 0.1 emoji class import heuristic; 1: 0.1 bridge symbols option; 1: 0.1 wrapper-key marker; 1: 0.1 Djot symbol-name inference | 0 | 0 |
| empty-list-item.test.mjs | 8 | 8 | 0 | 0 | 0 |
| equivalence.test.mjs | 41 | 41 | 0 | 0 | 0 |
| examples.test.mjs | 11 | 11 | 0 | 0 | 0 |
| figure-boundaries.test.mjs | 2 | 2 | 0 | 0 | 0 |
| figure-groups.test.mjs | 15 | 15 | 0 | 0 | 0 |
| heading-ids.test.mjs | 3 | 2 | 1: 0.1 corpus heading oracle | 0 | 0 |
| html-equivalence.test.mjs | 3 | 3 | 0 | 0 | 0 |
| import-limits.test.mjs | 1 | 1 | 0 | 0 | 0 |
| import.test.mjs | 5 | 5 | 0 | 0 | 0 |
| includes.test.mjs | 9 | 1 | 8: 0.1 file-backed include expansion API | 0 | 0 |
| inline-literal.test.mjs | 5 | 3 | 2: 0.1 unclosed literal crossed a line boundary | 0 | 0 |
| loss-audit.test.mjs | 7 | 4 | 1: 0.1 roundtrip mode flag; 2: 0.1 listTable source fallback | 0 | 0 |
| metadata-yaml12.test.mjs | 1 | 0 | 0 | 1: F-001 general Pandoc metadata has no 0.2 tree slot | 0 |
| metadata.test.mjs | 26 | 0 | 1: 0.1 malformed-frontmatter line diagnostic; 1: 0.1 nested-YAML recovery diagnostic; 1: 0.1 TOML frontmatter rejection | 23: F-001 general Pandoc metadata has no 0.2 tree slot | 0 |
| model-limits.test.mjs | 4 | 4 | 0 | 0 | 0 |
| new-ast-nodes.test.mjs | 17 | 17 | 0 | 0 | 0 |
| new-task-states.test.mjs | 6 | 3 | 3: 0.1 provenance-envelope diagnostic | 0 | 0 |
| no-git-dependencies.test.mjs | 66 | 66 | 0 | 0 | 0 |
| packaging.test.mjs | 4 | 4 | 0 | 0 | 0 |
| parity.test.mjs | 11 | 11 | 0 | 0 | 0 |
| participants.test.mjs | 4 | 4 | 0 | 0 | 0 |
| policy.test.mjs | 20 | 16 | 4: 0.1 `.smallcaps` source-class import alias | 0 | 0 |
| provenance.test.mjs | 8 | 5 | 2: 0.1 opaque unknown-node provenance; 1: 0.1 structured bridge diagnostics API | 0 | 0 |
| raw-block-payload.test.mjs | 7 | 7 | 0 | 0 | 0 |
| reverse-edge-cases.test.mjs | 8 | 8 | 0 | 0 | 0 |
| reverse.test.mjs | 36 | 34 | 1: 0.1 private `wrapper=1` Div attribute lifting; 1: 0.1 private `wrapper=1` Span attribute lifting | 0 | 0 |
| roundtrip-corpus.test.mjs | 5 | 5 | 0 | 0 | 0 |
| roundtrip-fidelity.test.mjs | 13 | 13 | 0 | 0 | 0 |
| roundtrip.test.mjs | 9 | 9 | 0 | 0 | 0 |
| row-groups.test.mjs | 44 | 28 | 1: 0.1 implicit rowGroups run split; 3: 0.1 flat rowGroups count validation; 1: 0.1 source writer's full positional partition spelling; 2: 0.1 row-head column inference from marked cells; 2: 0.1 declared-partition row-header inference; 2: 0.1 body-header-cols source key under a foot; 1: 0.1 single-body row-head count disagreement warning; 1: 0.1 leading body-header-cols source guard; 1: 0.1 derived count collapse; 2: 0.1 listTable extension | 0 | 0 |
| smart-punctuation.test.mjs | 2 | 2 | 0 | 0 | 0 |
| spec-citations.test.mjs | 5 | 0 | 5: 0.1 PART/section grammar citation system | 0 | 0 |
| spec-corpus.test.mjs | 6 | 6 | 0 | 0 | 0 |
| substitution.test.mjs | 3 | 2 | 1: 0.1 renderer compatibility string view for substitution node | 0 | 0 |
| table-body-structure.test.mjs | 6 | 0 | 2: 0.1 positional body-key corpus contract; 3: 0.1.17 engine-lag waiver; 1: 0.1 corpus submodule fixture | 0 | 0 |
| table-reader-regressions.test.mjs | 14 | 13 | 1: 0.1 Figure/Div wrapper attributes collapsed into a table | 0 | 0 |
| table-section-attributes.test.mjs | 3 | 3 | 0 | 0 | 0 |
| task-states.test.mjs | 16 | 15 | 1: 0.1 checked plus taskState conflict model | 0 | 0 |
| unit.test.mjs | 64 | 60 | 3: 0.1 listTable extension implementation; 1: 0.1 parsed inline div label | 0 | 0 |
| url-scheme.test.mjs | 1 | 1 | 0 | 0 | 0 |
| wrapper-marker.test.mjs | 9 | 2 | 7: 0.1 private `wrapperMarker` option and `wrapper=1` carrier | 0 | 0 |

| Total | 730 | 596 | 108 | 26 | 0 |

The 596 ported cases are in the current `npm test` gate. The corpus-link rewrite adds one 0.2 nested-link regression check. The import-limits rewrite expands its one observed top-level failure into four active 0.2 checks. The row-groups rewrite adds three 0.2-specific checks, the table-body rewrite adds two checks, and the metadata rewrites add three checks for verbatim frontmatter and typed metadata. The stated drop reasons are the only intentional removals. The 26 skipped cases name finding F-001 in `_FINDINGS.md` at the workspace root. All 58 original files have now been reviewed and the pending count is zero.

The removed `substitution.test.mjs` case “an older installed renderer receives its temporary string view” depended on the 0.1 substitution node's compatibility string view, which is gone after the 0.2 delete/insert split.

The three removed `loss-audit.test.mjs` cases, each with its 0.1 feature reason:

- “ragged-table padding fails the loss gate with roundtrip=true”: the 0.1 `roundtrip` conversion mode is gone; the normal 0.2 path preserves ragged rows.
- “list-table-body-groups-merged reports degraded fidelity and fails the CLI loss gate”: the 0.1 `listTable` source fallback is gone.
- “list-table-row-heads-normalized reports degraded fidelity and fails the CLI loss gate”: the 0.1 `listTable` source fallback is gone.

The eight removed `includes.test.mjs` cases, each with its 0.1 feature reason:

- “file-backed conversion expands nested includes and returns dependencies”: 0.1 file-backed include expansion API is absent from the 0.2 engine.
- “file-backed conversion reports warnings suppressed by the engine cap”: 0.1 include expansion warning cap is absent from the 0.2 engine.
- “the file-backed path does not change a document without directives”: 0.1 file-backed include expansion API is absent from the 0.2 engine.
- “containment failures stay literal and return a stable warning”: 0.1 include resolver containment API is absent from the 0.2 engine.
- “nested cycles warn instead of recursing”: 0.1 recursive include expansion is absent from the 0.2 engine.
- “a symlink cannot escape the containment root”: 0.1 file-system include resolver is absent from the 0.2 engine.
- “include root and source path must be absolute and contained”: 0.1 file-backed include expansion API is absent from the 0.2 engine.
- “a region include brings only the named region”: 0.1 region include expansion is absent from the 0.2 engine.

The three removed `diagnostic-code-coverage.test.mjs` cases, each with its 0.1 feature reason:

- “a list-table with a short caption produces list-table-short-caption-dropped”: the 0.1 `listTable` extension is gone.
- “a list-table rowspan across the head produces list-table-rowspan-clipped”: the 0.1 `listTable` extension is gone.
- “the removed cell-flattening rule no longer claims its old code”: the 0.1 structured diagnostic classifier is gone.

The 13 removed `cli.test.mjs` cases, each with its 0.1 feature reason:

- “stdin includes are opt-in through an absolute root”: 0.1 include expansion is absent from the 0.2 engine.
- “named files expand from their directory and --no-includes opts out”: 0.1 include expansion is absent from the 0.2 engine.
- “include warnings expose no absolute containment path”: 0.1 include expansion diagnostics are absent from the 0.2 engine.
- “include warnings remain contained when the root is a symlink”: 0.1 include expansion diagnostics are absent from the 0.2 engine.
- “include failures participate in structured diagnostics and fail-on-loss”: 0.1 include expansion diagnostics are absent from the 0.2 engine.
- “normalized include renames do not fail on loss”: 0.1 include ID rewriting is absent from the 0.2 engine.
- “stdin include diagnostics omit an unknown file identity”: 0.1 include expansion diagnostics are absent from the 0.2 engine.
- “reports the count of suppressed include warnings”: 0.1 include expansion warning cap is absent from the 0.2 engine.
- “-f carve-json rejects source-only include options”: 0.1 include expansion CLI options are absent from the 0.2 engine.
- “Pandoc readers reject source-only include options”: 0.1 include expansion CLI options are absent from the 0.2 engine.
- “structured diagnostics stay separate from converted output”: 0.1 structured migration-report format is absent from the 0.2 bridge.
- “inbound diagnostics name the original source format”: 0.1 structured migration-report format is absent from the 0.2 bridge.
- “replays every shared Pandoc fidelity fixture”: 0.1 structured migration-report fixtures are absent from the 0.2 bridge.

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

The six removed `table-body-structure.test.mjs` cases, each with its 0.1 feature reason:

- “the spec corpus submodule is checked out”: the 0.1 `spec/tests/corpus` submodule fixture is replaced by the 0.2 reference checkout.
- “both arms of the check ran over real documents”: the 0.1 positional `body-rows` corpus contract no longer defines 0.2 partitions.
- “every corpus table has the body split its source states”: the 0.1 positional `body-rows` source split is gone.
- “the waiver is keyed to the engine pin and expires with it”: the 0.1.17 engine-lag waiver is obsolete for the vendored 0.2 engine.
- “the waiver holds no document that already matches”: the 0.1.17 engine-lag waiver is obsolete for the vendored 0.2 engine.
- “every waiver entry names a document the corpus still has”: the 0.1.17 engine-lag waiver is obsolete for the vendored 0.2 engine.

The two removed `citations.test.mjs` cases, each with its 0.1 feature reason:

- “citations: the bibliography diagnostic fires once per document”: the 0.1 bridge imported CSL bibliography entries from Pandoc metadata; the 0.2 citation definition uses a typed tree field and a raw JSON carrier.
- “citations: the entry survives pandoc's own writer and reader”: the 0.1 bridge represented citation definitions as `csl-entry` Divs; the 0.2 bridge carries the definition tree in a raw Pandoc block.

The three removed `metadata.test.mjs` cases, each with its 0.1 feature reason:

- “a line that fits no shape is still reported and skipped”: the 0.1 bridge's handwritten YAML metadata parser and its line diagnostic are gone.
- “a malformed deeper line terminates instead of spinning”: the 0.1 bridge's handwritten nested-YAML recovery loop is gone.
- “a non-yaml frontmatter format is still refused”: the 0.1 bridge rejected non-YAML frontmatter; the 0.2 tree keeps the format and value verbatim.

The five removed `spec-citations.test.mjs` cases, each with its 0.1 feature reason:

- “the citation scan actually reads this repo”: it scanned 0.1 `PART N §M` citations, which the 0.2 spec replaced with `C2` identifiers.
- “the grammar splits into PARTs the way this test assumes”: the 0.1 `grammar.ebnf` PART banners are absent from the 0.2 spec.
- “every spec clause this repo cites still exists”: the 0.1 PART/section clause resolver has no 0.2 clause source.
- “no WITHDRAWN exemption outlived the withdrawal it records”: the 0.1 withdrawn PART clause ledger is obsolete under 0.2 clause identifiers.
- “every WITHDRAWN exemption is still used by the file it names”: the 0.1 withdrawn PART clause ledger is obsolete under 0.2 clause identifiers.

The two removed `reverse.test.mjs` cases, each with its 0.1 feature reason:

- “pandoc's wrapper=1 Div restores its attrs onto the inner block”: 0.1 treated the private `wrapper=1` key as an instruction to lift a Div's attributes onto its child.
- “pandoc's wrapper=1 Span puts its attrs on the inline it wraps”: 0.1 treated the private `wrapper=1` key as an instruction to lift a Span's attributes onto its child.

The four removed `policy.test.mjs` cases, each with its 0.1 feature reason:

- “the .smallcaps span exports back to SmallCaps, so the degradation round-trips”: the 0.1 `.smallcaps` source-class import alias is gone.
- “a .smallcaps span keeps its other attributes around the SmallCaps”: the 0.1 `.smallcaps` source-class import alias is gone; typed `small_caps` attributes are tested instead.
- “the class is matched case-sensitively, as pandoc matches it”: the 0.1 `.smallcaps` source-class import alias is gone.
- “pandoc and the bridge agree on what a .smallcaps span means”: the 0.1 `.smallcaps` source-class import alias is gone.

The seven removed `wrapper-marker.test.mjs` cases, each with its 0.1 feature reason:

- “leads the key-values of a Para, BlockQuote, list or rule wrapper”: the 0.1 `wrapperMarker` option inserted the private `wrapper=1` carrier.
- “a Plain stays unmarked”: the 0.1 `wrapperMarker` option distinguished Plain from Para for its private marker.
- “roundtrip turns it on and keeps carve-block last”: the 0.1 roundtrip option ordered `wrapper=1` and `carve-block` private carriers.
- “import restores the attributes, an authored wrapper key included”: the 0.1 `wrapper=1` import rule lifted attributes from a Pandoc wrapper.
- “pandoc HTML puts the attributes where Carve does”: the 0.1 `wrapper=1` marker was written to guide Pandoc HTML attribute placement.
- “a Djot round trip through pandoc keeps the attributes”: the 0.1 `wrapper=1` marker was written for Pandoc's Djot writer and reader.
- “the CLI flag”: the 0.1 `--wrapper-marker` CLI option is gone.

The three removed `provenance.test.mjs` cases, each with its 0.1 feature reason:

- “unknown inline and block nodes survive as versioned opaque data”: the 0.1 opaque provenance envelope for unknown node types is gone; the 0.2 tree validates its node types.
- “normal unknown nodes remain readable and diagnosed”: the 0.1 unknown-node fallback and diagnostic are gone; the 0.2 tree rejects unknown node types.
- “every emitted warning has a structured counterpart”: the 0.1 bridge's structured diagnostic object API is gone.

The two removed `corpus-link-targets.test.mjs` cases, each with its 0.1 feature reason:

- “the ledger holds no document that already agrees”: the 0.1 spec-corpus divergent allowlist is replaced by the vendored 0.2 example oracle.
- “every ledger entry names a document the corpus still has”: the 0.1 spec-corpus divergent allowlist is replaced by the vendored 0.2 example oracle.

A full `node --test test/*.test.mjs` run after the initial port reported 783 cases, 376 passes, and 407 failures. This run includes the legacy test files, the new 0.2 tests, and the new end-to-end tests. The failures are concentrated in 0.1 AST spellings, old CLI and diagnostics, table and citation mapping assumptions, and 0.1 source fixtures. Each pending failure needs a 0.2 rewrite or a one-line removal reason before the old implementation can be removed.
