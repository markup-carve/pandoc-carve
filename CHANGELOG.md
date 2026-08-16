# Changelog

## Unreleased

### Changed

- **The pinned engine moved to current carve-js main.** Emitted Carve now
  follows the spec's section 6e table padding: every cell's content is
  separated from its markers by a space, so a header cell reads `|= A |`
  instead of `|=A|`. Anything diffing the reverse direction's output against
  the old unpadded form has to re-baseline.

### Fixed

- **An ordered-list marker Carve cannot spell is reported.** Pandoc's
  example-list style (`(@)`) became an ordinary decimal list in silence. The
  numbers themselves survive - pandoc resolves its document-wide counter into
  the list's `start` before the bridge sees it - but the counter does not, so
  the lists no longer renumber each other, and the marker becomes `1)`. A `(1)`
  marker on any other style was likewise emitted as `1)` with the opening
  parenthesis dropped and nothing said. Both now warn; `1)`, `1.` and the
  alpha/roman styles are unaffected.

- **A dropped comment is reported, not silent**
  (markup-carve/pandoc-carve#75). Pandoc's AST has no comment node, so
  dropping is the conversion - but the bridge's contract is to report what
  it could not carry. Block and inline comments now emit a warning naming
  the dropped content, the same way an unmapped symbol already does.

### Added

- **A composite figure crosses as pandoc's subfigure model, both ways.** A bare
  `::: figure` container (PART 9 section 4c) is one figure of ordered panels,
  and pandoc has that natively: the group becomes a `Figure` whose blocks are
  the converted children, with the panels - the direct `figure` and `table`
  children - as nested `Figure`s and `Table`s. Stray content stays in place
  between them. Going the other way, a `Figure` holding nested `Figure`/`Table`
  blocks used to hit the "general figure content unwrapped" path, which dropped
  the grouping and turned the caption into a trailing paragraph; it now imports
  as a `figure_group`. A single-target `Figure` keeps its plain `figure`
  mapping.

  Numbering follows section 4c rather than source order: the group draws one
  number at its OPENING fence, a panel draws none (and neither does anything a
  panel contains, so its `#` prints as written), and a panel id resolves
  `</#id>` as the group's number plus a letter - "Figure 2a". A captioned quote
  among the children is a panel like any other captioned host: "the quote is
  not a special host inside the group either".

  **This replaces the `Div ["admonition","figure"]` a `::: figure` used to
  cross as.** A filter keyed on that Div has to key on the Figure nesting
  instead. An opener carrying a quoted title or a `[label]` is a different
  production and is unaffected - it still crosses as that same Div.

  The engine dependency is a git pin for now: no published
  `@markup-carve/carve` carries the node yet, and `0.1.3` parses `::: figure`
  as a generic container. It returns to a version range at the next engine
  release.

- **Citations cross the bridge in both directions.** A `citation_group` becomes
  a native pandoc `Cite`: one `Citation` per key, carrying the prefix, the mode
  (Carve's cluster-level integral `+` maps to `AuthorInText`, an item's own `-`
  to `SuppressAuthor`), and the locator serialized into `citationSuffix` behind
  citeproc's own `, ` separator - so `pandoc --citeproc` resolves the key and
  prints the page. The Cite's content is the verbatim `[...]` source, which is
  what every non-citeproc writer prints. In reverse, a `Cite` becomes a
  `citation_group` instead of literal text, rebuilding Carve source for a
  foreign Cite whose content is rendered prose.

  Two things are reported rather than lost quietly: a typed locator flattening
  into the suffix, and a suppressed author inside an integral group (pandoc's
  mode is per item, so the narrower one wins). The locator text round-trips
  byte for byte, so re-parsing restores `locatorLabel`/`locatorValue`; the
  bridge deliberately keeps no second copy of the section 4.2 label table.

- **A pandoc `LineBlock` imports as the `line_block` node, not a
  `{.line-block}` div.** The node is what PART 9 section 23 calls this and what
  the engine's own parser produces for `::: |`; the div was a stand-in because
  `0.1.2`'s writer threw on the node. The engine floor is now `^0.1.3`, which
  writes it, so the exchange AST carries the canonical shape and the emitted
  source is `::: |`.

- **Frontmatter crosses at the depth pandoc's `Meta` has.** The reader took one
  flat `key: value` line at a time, so a nested map or a block sequence produced
  one "line not understood" per child line and left the parent key as an EMPTY
  value - present, carrying nothing, with nothing said about the emptying. It
  now reads nested maps, block and flow sequences, and sequences of maps
  (`author: [ - name:, affiliation: ]`), and its result matches what pandoc's
  own YAML parser makes of the same frontmatter. Going the other way, `MetaMap`
  and a `MetaList` of maps used to be dropped with a warning and are now written
  as nested YAML that pandoc reads back identically.

  `MetaBlocks` keeps its skip-with-warn on purpose: block content in metadata
  has no honest YAML string form, and the warning is the honest outcome.

- **A pandoc table with block content in a cell imports as `::: list-table`.**
  Real docx and LaTeX tables hold lists and paragraphs in cells; Carve's
  pipe-table cell holds inlines, so there was no form for them. What happened
  was worse than flattening: a `BulletList` cell emitted nothing at all while
  the warning said "flattened to text", and a two-paragraph cell put a literal
  newline inside the pipe row, so a two-row table re-parsed as a one-row table
  plus a stray paragraph. Such a table is now emitted as a `::: list-table`,
  whose cells are list items and therefore hold full block content, with the
  caption as the quoted title, `header-rows`/`header-cols` for the head and the
  same `^`/`<` span markers. Per-column alignment, a foot and a body group's
  intermediate header rows have no list-table spelling and are reported, as are
  merged body groups and their attributes.

- **`header-cols` on a `::: list-table` now reaches pandoc's `RowHeadColumns`.**
  The key is part of the extension (promoting the first N cells of every row to
  row headers) and pandoc has the matching slot, but the reader ignored it: the
  row-header semantics were lost and the key was left behind as an ordinary
  table attribute.

- **A cell's and a row's attribute block reach pandoc's own `Attr`.** Carve
  spells them glued to the opening pipe (`|{#id .cls k=v} text`) and after the
  closing one (`| a | b |{.cls}`); pandoc's `Cell` and `Row` each have an `Attr`
  slot, so neither is a degradation. Both were dropped in both directions with
  no warning. They now survive the crossing, compose with a `rowGroups`
  partition, and come back on import - including from a table pandoc read out of
  HTML, which is the shape a Word or Docs export takes. Attributes on a
  continuation cell are the one lossy case and are reported: pandoc omits
  covered positions, so there is no node left to hang them on.

- **A table's head, body groups, foot and row-head columns survive in both
  directions.** The bridge used to emit one body, no foot and zero row-head
  columns whatever the table said. It now reads the optional `table.rowGroups`
  counts of PART 12 section 15 (markup-carve/carve#1186) and lays them out as
  pandoc's `TableHead`, a list of `TableBody` - each with its own
  `RowHeadColumns` and intermediate header rows - and `TableFoot`; the reverse
  direction reads those back as counts, and imports a body's intermediate
  header row as header cells. A partition is emitted only when it says
  something the flat rows cannot.

  The counts must account for every row exactly once. That is a cross-field sum
  no JSON Schema can express, so a partition that disagrees with `rows`
  validates upstream: the bridge checks it here, and a table whose counts do
  not add up converts with the implicit head/body split plus a warning naming
  both numbers.

- **The bridge converts the serialized AST the Carve spec defines (PART 12), not
  carve-js's runtime tree.** Every node type and field name the converter reads
  is now spec surface, pinned by `resources/ast-schema.json`, so a document
  parsed by carve-rs, carve-php or carve-go converts exactly like one parsed by
  carve-js. `carveToPandoc` keeps its signature and its output.
- `carveAstToPandoc(ast)` converts an already-serialized Carve AST - an object
  or JSON text - and `carveToCarveAst(source)` produces that exchange format
  from source. On the CLI, `-f carve-json` reads a tree any engine wrote:

  ```bash
  carve doc.crv --to-json | pandoc-carve - -f carve-json -t latex
  ```

- Arms for three AST node types that previously fell through to the unknown-node
  fallback (carve#355):

  - `smart_punctuation` now emits the **resolved glyph** rather than the
    author's source run. Pandoc applies its own smart punctuation when reading
    markdown, not when consuming a JSON AST, so emitting `--` put a literal
    double hyphen into the LaTeX or DOCX. Carve already made the decision.
  - `escaped_text` (carve#350) emits the character the author escaped. It stays
    literal downstream, which is what the escape asked for.
  - `line_block` (carve#359) maps to pandoc's native `LineBlock`, so the line
    structure survives instead of collapsing into a paragraph.

- **Small caps make the return trip.** A `[text]{.smallcaps}` span exports as a
  pandoc `SmallCaps` instead of a bare classed `Span`. That is the exact inverse
  of the degradation the import direction already performed, and it is pandoc's
  own convention: its markdown reader reads the same class the same way, strips
  it, and keeps any remaining attributes on a wrapping `Span`. Until now a
  small-capped phrase reached the LaTeX writer as `{text}` and lost the small
  caps entirely; only the HTML writer happened to preserve it, by writing the
  class back out.

### Fixed

- **A pandoc `Figure` wrapping a single `Table` keeps the wrapper's
  attributes.** The two collapse into one Carve `table`, and the Figure's Attr
  was going nowhere - but pandoc's readers put the label on the Figure rather
  than on the Table it wraps, so the id a cross-reference resolves against was
  being dropped with the wrapper. They merge now: the outer id wins, classes
  union, key/values merge with the outer taking precedence.

- **A pandoc `Quoted` says that it degrades.** The quotation was rewritten to
  literal curly quote characters with nothing reported, and the text re-exports
  as a plain `Str`, so the quote kind and pandoc's locale-aware quoting left the
  document silently. The characters stay - they are what an author would have
  typed, and Carve has no quote node - but the conversion now reports the loss,
  once per document however many quotations it holds.
- **A single-host `Figure` imports as a `figure`, whatever the host is.** Only
  an image and a table were read back as one; a `Figure` wrapping a quote, a
  code block or a paragraph hit the "general figure content unwrapped" path,
  which dropped the wrapper and left the caption as a trailing paragraph. That
  is the exact shape the forward direction emits for a captioned quote,
  listing or display-math block, so a document could not survive a round trip
  through pandoc. The host list is `figure.target`'s own list from
  `resources/ast-schema.json`, and it is no longer consulted only for a
  section 4c panel. A host that carries its own attributes crosses inside a
  `Div`, because pandoc's `BlockQuote`, `Para` and `CodeBlock` have no
  attribute slot; that wrapper is unwrapped on the way back and its attributes
  stay on the target, since a `div` is not a legal figure target in the first
  place.
- **Line blocks actually reach `LineBlock` now.** The arm for the `line_block`
  node type has been here since the smart-punctuation change, and no document
  could reach it: the PINNED published engine models `::: |` as a div carrying
  the `line-block` class, and only carve-js main emits the node type. Every line
  block a user could write fell through to the Div branch and reached the writers
  as a classed paragraph. Both spellings are handled now, and a STANZA break is
  an empty line entry rather than two stanzas run together.
- **A `LineBlock` on the way IN is a line block, not a flattened paragraph.** The
  reverse direction warned "LineBlock has no Carve form" - it has one, PART 9
  SS23 - and joined the verse with hard breaks. A test pinned that warning.
- **The resolved no-break space stops leaking.** The engines publish U+E000, a
  PRIVATE-USE codepoint, for a no-break space the parser resolved from an escaped
  space or from a line block's preserved indentation (markup-carve/carve#721).
  It was passed straight through, so every writer downstream - docx, LaTeX, HTML -
  rendered a tofu box where a no-break space belonged, with no warning. It now
  maps to U+00A0.
- **No more warning per substitution.** Each of the three hit the `default:`
  arm, which warns, so a document with ordinary prose punctuation produced a
  warning for every quote, dash and ellipsis in it.
- **A crossref to a numbered figure or table resolves to "Figure 1", not the
  raw id.** The pass-1 crossref target map was built from heading ids only, so
  `</#fig-sun>` to a captioned figure or table always missed and fell back to
  the "unresolved target" warning with the raw id as link text - even though
  the caption's own number already rendered correctly next to it. The target
  map now also carries every numbered figure/table caption's computed
  "Label N" text, keyed by its own `{#id}`, resolved regardless of whether the
  crossref precedes or follows its target in the source.


- Initial implementation: `carveToPandoc()` / `carveToPandocJson()` mapping the
  full Carve AST (43 node types) to Pandoc's JSON AST (api version 1.23.1),
  with explicit degradation warnings for lossy constructs.
- `pandoc-carve` CLI: `pandoc-carve doc.crv -t latex -o out.tex` (shells out to
  a `pandoc` found on PATH; `-t json` emits the Pandoc AST without pandoc).
- Convert options: `listTable` renders `::: list-table` blocks as real Pandoc
  tables (multi-block cells, header-rows, span markers), `symbols` resolves
  `:name:` symbols to text, `roundtrip` stamps attr wrappers for exact
  re-import. CLI: `--list-table`, `--symbols map.json`, `--roundtrip`.
- Fixed 2D table spans (a block covering both rows and columns) over-counting
  rowSpan on export and being clipped on import - both directions now
  represent the block exactly.
- Graceful degradation: an unconsumed grouping `[label]` on a fenced div (tab and
  code-group panels) now renders as a bold caption instead of being dropped, so
  panels stay distinguishable in LaTeX/Typst/DOCX output - matching the reference
  `carveToHtml` `div-label` behavior.
- Added `examples/` with worked input/output pairs in both directions
  (Markdown, LaTeX, Typst, RST, plain text, native, JSON), regenerated by
  `npm run examples:build` and pinned by a golden test. Includes `interactive.crv`
  (how tabs, code-group, spoiler, mermaid, and math degrade for print formats),
  `spans.crv` (row/col spans surviving as LaTeX `\multicolumn`/`\multirow`), and
  import examples from LaTeX, RST, HTML, and DOCX (the DOCX one driven from an
  in-memory seed so the repo stays all-text).
- Reverse direction: `pandocToCarve()` converts a Pandoc document to Carve
  source (serialized by carve's `renderCarve`), and the CLI imports anything
  pandoc reads: `pandoc-carve report.docx -f docx -o report.crv`. Round-trips
  (carve -> pandoc AST -> carve) are gated on HTML equivalence in the tests.
- Inline literal support (`` !`...` ``, the `literal_inline` node): mapped to
  ordinary prose inlines, or to a `Span` when it carries attributes. It is
  deliberately not mapped to `Code`, which would imply monospace - the exact
  styling the construct exists to avoid. Without this the node hit the
  fall-through and vanished entirely, because `plainText()` reads only
  `value`/`children` and a literal carries `content`; that also silently broke
  crossrefs to any heading containing one, so `plainText()` now folds the
  literal's content in. Runs of spaces inside a literal are preserved rather
  than collapsed to a single `Space`, since the content is verbatim - ordinary
  prose still collapses as before.
- TEMPORARY: `@markup-carve/carve` is pinned to an exact carve-js commit
  (`3f79966`) rather than a published range. The published 0.1.1 still ships the
  old kebab-case node vocabulary, while this package has already migrated to the
  snake_case spec vocabulary - the mismatch left `main` failing 49 of 136 tests.
  Restore a semver range once carve-js 0.1.2 is published.
