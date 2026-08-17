# Changelog

## Unreleased

### Fixed

- **Six silent losses on the way back out of pandoc.** Found by running the
  whole spec corpus through `carve -> pandoc -> carve` and comparing rendered
  HTML, which nothing did: 89 of 1143 documents came back rendering
  differently, with every check green.

  - A node that renders NOTHING where it sits - a link reference definition, an
    abbreviation definition - had its emptiness wrapped in a Div to carry its
    attrs, so `[a]: /u {.c}` came back as a visible `<div class="c"></div>`.
  - A RAGGED table lost cells. The ColSpec list defines a pandoc table's width
    and was sized from the first row, so `| ~x~ |` above `| a | b |` declared
    one column and `b` was dropped. The width is the widest row now; padding
    the short rows is reported.
  - An autolink lost its attributes in both directions
    (`<https://example.com>{.ext}`).
  - ROW HEADERS were lost. A body row opening `|= Mercury |` is pandoc's
    `RowHeadColumns`, and the count was only ever read from an explicit
    `rowGroups`. It is derived now - and row-head columns no longer detour
    through `::: list-table` on the way out, because the pipe table spells them
    directly.
  - A COLLAPSED reference to a heading (`[Some Heading][]`, matched on rendered
    text, case-insensitively) was reported as a missing definition and emitted
    as literal source, so the link was gone.
  - A crossref to a NUMBERED CAPTION died on the way back: the caption's `#`
    placeholder must become a literal number for pandoc, after which the
    caption is no longer numbered and `</#fig-sun>` resolved to nothing. It is
    written as a plain link to the same id, which renders identically and is
    stable. Crossrefs to headings still round-trip as `</#id>`.

  Corpus divergence 89 -> 63. The remainder is pinned as a ledger by the new
  round-trip gate, and may only shrink.

## 0.1.0 - 2026-08-17

### Changed

- **Reading Carve now enables what writing Carve emits.** `listTable` and the
  citations extension default ON, and `carveToPandoc` takes the parse options
  (`citations`, `extensions`) it never had. The bridge was choosing constructs
  on the way out that it could not recognize on the way back, which is
  round-trip loss it inflicted on itself and could not see: a table it wrote as
  `::: list-table` returned as a `Div` of nested lists, and - worse, because it
  changes meaning rather than shape - `[@doe1990]` came back as `[`, a
  `.mention` span, `]`, so every key of an imported bibliography silently
  became a mention. Pass `listTable: false` / `citations: false` (CLI:
  `--no-list-table`, `--no-citations`) for what a processor with neither
  extension enabled would render.

### Added

- **A quotation survives the crossing.** Pandoc's `Quoted` used to be written
  as literal curly glyphs, and a literal `“` in the source is ordinary text to
  the parser, so a quotation came back as `Str "“alpha”"` and any document that
  quoted anything could not round-trip. The note explaining that as policy was
  wrong about its own premise: Carve does have a node here - `"` and `'`
  resolve to `smart_punctuation` carrying the mark's KIND - so the marks are
  written as the `"` an author types and the pair rebuilds pandoc's wrapping
  `Quoted`. It is unambiguous because the writer already escapes a quote
  character that is ordinary text (`it\'s`). An apostrophe, an unclosed mark
  and a quotation crossing an emphasis boundary are deliberately NOT promoted.
  Downstream this is what makes quoting locale-correct: the LaTeX and Typst
  writers now emit their own quote form instead of frozen English glyphs.

- **Block content in metadata round-trips.** `MetaBlocks` (`abstract: |`) was
  skipped with a warning, on the reasoning that writing Carve source into a
  YAML value "makes the frontmatter carry markup that nothing on the reading
  side parses". Something does now: the value is written as a YAML literal
  block scalar - the same spelling pandoc's own markdown writer emits and its
  reader turns back into `MetaBlocks` - and read back through the same parser.
  The scalar keeps every line and every blank line, so paragraph structure
  survives rather than flattening. Read by the FORM, not the key name, so any
  key can carry block content. This completes metadata: all ten shapes the
  conformance probes cover now cross unchanged in both directions.

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

- Initial implementation: `carveToPandoc()` / `carveToPandocJson()` mapping the
  full Carve AST (every node type the exchange schema defines) to Pandoc's JSON AST (api version 1.23.1),
  with explicit degradation warnings for lossy constructs.

- `pandoc-carve` CLI: `pandoc-carve doc.crv -t latex -o out.tex` (shells out to
  a `pandoc` found on PATH; `-t json` emits the Pandoc AST without pandoc).

- Convert options: `listTable` renders `::: list-table` blocks as real Pandoc
  tables (multi-block cells, header-rows, span markers), `citations` reads
  `[@key]` as a citation rather than an `@mention` - both on by default -
  `symbols` resolves `:name:` symbols to text, and `roundtrip` stamps attr
  wrappers for exact re-import. CLI: `--no-list-table`, `--no-citations`,
  `--symbols map.json`, `--roundtrip`.

- Fixed 2D table spans (a block covering both rows and columns) over-counting
  rowSpan on export and being clipped on import - both directions now
  represent the block exactly.

- Graceful degradation: an unconsumed grouping `[label]` on a fenced div (tab and
  code-group panels) now renders as a bold caption instead of being dropped, so
  panels stay distinguishable in LaTeX/Typst/DOCX output - matching the reference
  `carveToHtml` `div-label` behavior.

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

### Fixed

- **A `[@key]:` bibliography definition reaches pandoc as a bibliography
  entry.** The forward direction had no arm for `citation_definition` (PART 12
  section 18), so it fell to the generic "unknown node type" fallback and left
  as a paragraph of its text: the entry PRINTED in the body of the document,
  where Carve renders nothing, and the key binding it to its citations was
  dropped. It now becomes `Div ("ref-<key>", ["csl-entry"], ...)` - what
  `pandoc --citeproc` writes for a resolved entry and what pandoc's markdown
  reader reads back - so a filter or template that styles a bibliography finds
  one. The `{author= year=}` metadata rides along as the Div's key-values.

- **A citation crosses back unchanged.** `citationNoteNum` left the bridge as a
  hard-coded 0, the one field standing between a `Cite` and an exact
  `pandoc -> Carve -> pandoc` round trip. Pandoc's markdown reader does not use
  0 for a citation in running text: it counts the notes CLOSED so far and
  stamps that plus one, so a citation before any note carries 1 and one inside
  a note carries that note's own number. The converter reproduces the counter,
  pinned against pandoc's reader rather than against numbers written down here.

- **Row-head columns reach the source layer.** `header-cols=N` on a
  `::: list-table` is exactly pandoc's `RowHeadColumns`, but a table carrying
  them was written as a pipe table, which cannot say it, and the row headers
  were flattened to ordinary cells. Such a table now takes the list-table form
  on the source path - and only when every body group agrees on the count,
  because `header-cols` is one number for the whole table and a table whose
  bodies differ would otherwise come back with row headers ADDED to the rows
  that had none. Inventing a heading is worse than dropping one, so that table
  keeps the pipe form and the loss stays reported. The AST path is unchanged:
  `rowGroups` carries the whole partition there and nothing has to be traded.

- **The pinned engine moved to current carve-js main.** Emitted Carve now
  follows the spec's section 6e table padding: every cell's content is
  separated from its markers by a space, so a header cell reads `|= A |`
  instead of `|=A|`. Anything diffing the reverse direction's output against
  the old unpadded form has to re-baseline.

- **A body cell's alignment marker aligns that cell alone.** Column alignment
  was read off the first row whatever that row was, so a table whose first row
  is a body row exported with that row's markers as the ColSpec - and since a
  pandoc cell carrying `AlignDefault` inherits its ColSpec, every other cell in
  the column came out aligned in every writer. Measured on the engine,
  `|>a| b |` styles `a` alone and leaves the cell below it untouched. The
  column is read only from a head row, and a head cell's marker MOVES to the
  ColSpec instead of being copied there, which is pandoc's own model and makes
  the crossing exact in both directions.

- **The pipe-table writer reports the structure it flattens.** A `rowGroups`
  partition reaches the exchange AST intact, but the source writer spells only
  a leading run of header rows - so a foot, a second body group, a body's own
  intermediate header rows, its row-head columns and its attributes all came
  out as ordinary body rows, silently. PART 12 section 15 asks for that loss to
  be reported ("a canonical Carve writer loses it"), and the list-table path
  already reported its own version of the same facts; the pipe path was the
  half that said nothing. One warning now names everything the partition says
  and the source cannot, and says where the value does survive.

- **Column alignment on a headerless table survives the crossing.** Carve
  spells column alignment on the header cell marker (`|=> Name |`), and the
  alignment was copied onto header cells only - so for a pandoc grid table with
  no header row, which is legal and carries alignment all the same, it went
  nowhere. It is written onto each cell of the column instead, which renders
  the same, and the move from a column-level fact to a per-cell one is
  reported.

- **A frontmatter boolean crosses as a `MetaBool`, not as the text "true"**.
  The reader typed every unquoted scalar as `MetaInlines`, so `draft: false`
  arrived as a non-empty string - and since every pandoc template and filter
  tests metadata for truthiness, a non-empty string is true. The flag did not
  degrade, it inverted. Booleans now resolve with the same spellings pandoc's
  own frontmatter reader accepts (`true`/`yes`/`on`/`y` and their negatives,
  in each case), a quoted `"true"` stays text, a null scalar keeps its key as
  an empty `MetaString`, and flow-list items are typed one by one. A test
  holds the whole reading against pandoc's own.

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

- **A pandoc `Figure` wrapping a single `Table` keeps the wrapper's
  attributes.** The two collapse into one Carve `table`, and the Figure's Attr
  was going nowhere - but pandoc's readers put the label on the Figure rather
  than on the Table it wraps, so the id a cross-reference resolves against was
  being dropped with the wrapper. They merge now: the outer id wins, classes
  union, key/values merge with the outer taking precedence.

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
