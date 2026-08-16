# pandoc-carve

Bidirectional [Carve](https://github.com/markup-carve/carve) ↔ Pandoc bridge.

**Export:** converts Carve markup to Pandoc's JSON AST, unlocking every pandoc
output format for Carve documents: LaTeX, Typst, DOCX, PDF, RST, JATS, EPUB,
and dozens more. **Import:** converts anything pandoc reads (DOCX, LaTeX, RST,
Org, MediaWiki, HTML, Markdown, ...) into Carve source.

```
.crv ──parse──▶ Carve AST ──carveToPandoc()──▶ Pandoc JSON ──pandoc -f json -t X──▶ .tex / .typ / .docx / …
.docx / .tex / … ──pandoc -t json──▶ Pandoc JSON ──pandocToCarve()──▶ Carve AST ──renderCarve──▶ .crv
```

The bridge maps the parsed Carve AST node-by-node, so emphasis, admonitions,
tables with spans, footnotes, math, and raw passthrough all arrive correctly.
It also makes Carve's target-routed raw spans finally fire:
`` `\alpha`{=latex} `` becomes a Pandoc `RawInline` that the LaTeX writer emits
and every other writer drops - exactly the pandoc-Markdown semantics the syntax
was born from.

## Install

```bash
npm install @markup-carve/pandoc-carve
```

The CLI shells out to a `pandoc` executable on your PATH (3.x; tested against
3.5). Pandoc is not bundled - install it from [pandoc.org](https://pandoc.org)
or your package manager. Emitting plain JSON (`-t json`) needs no pandoc at all.

## CLI

```bash
# Carve -> LaTeX
pandoc-carve doc.crv -t latex -o doc.tex

# Carve -> Typst, PDF, DOCX ... any pandoc writer
pandoc-carve doc.crv -t typst -o doc.typ
pandoc-carve doc.crv -t pdf -o doc.pdf
pandoc-carve doc.crv -t docx -o doc.docx

# Standalone document (pandoc templates)
pandoc-carve doc.crv -t latex -s -o doc.tex

# Just the Pandoc JSON AST (no pandoc needed)
pandoc-carve doc.crv -t json

# Read from stdin, pass extra args through to pandoc after --
cat doc.crv | pandoc-carve - -t latex -- --toc

# IMPORT: anything pandoc reads -> Carve
pandoc-carve report.docx -f docx -o report.crv
pandoc-carve paper.tex -f latex -o paper.crv
pandoc-carve README.md -f markdown -o README.crv

# Import from a pre-made pandoc JSON AST (no pandoc needed)
pandoc -f rst -t json doc.rst | pandoc-carve - -f json

# From a SERIALIZED Carve AST (spec PART 12) - from any engine, not just carve-js
carve doc.crv --to-json | pandoc-carve - -f carve-json -t latex
```

Anything Carve cannot map faithfully is reported on stderr as a
`pandoc-carve: degraded ...` warning - nothing degrades silently.

## API

```js
import { carveToPandoc, carveToPandocJson } from '@markup-carve/pandoc-carve';

const { doc, warnings } = carveToPandoc('Hello /world/!');
// doc = { 'pandoc-api-version': [1, 23, 1], meta: {...}, blocks: [...] }
// warnings = ['degraded: ...'] for lossy constructs

const json = carveToPandocJson('Hello /world/!'); // stringified doc
```

What the converter reads is the **serialized AST of the Carve spec's PART 12**
(the shape `resources/ast-schema.json` pins), not any implementation's runtime
tree - so a document another engine already parsed converts the same way,
whether it arrives as an object or as JSON text:

```js
import { carveAstToPandoc, carveToCarveAst } from '@markup-carve/pandoc-carve';

// A tree from carve-rs, carve-php, carve-go ... or `carve doc.crv --to-json`
const { doc, warnings } = carveAstToPandoc(serializedAstJson);

// The same exchange format, produced from source here
const ast = carveToCarveAst('Hello /world/!');
```

The reverse direction takes a Pandoc document (object or JSON string) and
returns Carve source, serialized by carve's own `renderCarve` (the `carve fmt`
serializer), so output formatting carries fmt's guarantees:

```js
import { pandocToCarve, pandocToCarveAst } from '@markup-carve/pandoc-carve';

const { carve, warnings } = pandocToCarve(pandocJsonString);

// Preserve structured fields that Carve 0.1 source cannot spell, including
// Pandoc's optional short figure/table caption.
const { ast, warnings: astWarnings } = pandocToCarveAst(pandocJsonString);
```

Round-trips are tested as a hard gate: `carve -> pandoc AST -> carve` must
render byte-identical HTML to the original source across the test corpus.
For exact restoration of attribute placement (`{.lead}` on a paragraph or
list), export with `carveToPandoc(src, { roundtrip: true })` or the CLI's
`--roundtrip` flag - it stamps wrapper divs with a `carve-block` marker the
importer uses, at the cost of that marker being visible in writer output.

Pipe the JSON to pandoc yourself:

```bash
node -e "import('@markup-carve/pandoc-carve').then(m => process.stdout.write(m.carveToPandocJson(require('fs').readFileSync('doc.crv','utf8'))))" \
  | pandoc -f json -t latex
```

## What maps to what

| Carve | Pandoc |
|-------|--------|
| `/italic/`, `*bold*`, `/*both*/` | Emph, Strong, Strong+Emph |
| `_underline_`, `~strike~`, `=highlight=` | Underline, Strikeout, Span `.mark` |
| `{^sup^}`, `{,sub,}` | Superscript, Subscript |
| Headings + `{#id .class}` attributes | Header with Attr |
| Tables incl. rowspan/colspan and captions | Table (spans inverted to pandoc's origin-cell model) |
| `table.rowGroups` counts (PART 12 section 15) | TableHead, one TableBody per group with its RowHeadColumns and intermediate header rows, TableFoot |
| Cell attributes `\|{#id .cls k=v} text`, row attributes `\| a \|{.cls}` | the `Attr` pandoc's Cell and Row already carry |
| Footnotes (reference and inline `^[..]`) | Note |
| Math `` $`..` `` / `` $$`..` `` | Math Inline / Display |
| Images/quotes with `^ caption` lines | Figure |
| A bare `::: figure` composite (PART 9 section 4c) | Figure of nested Figures - pandoc's subfigure model - with the group caption on the outer one. An opener carrying a title or a `[label]` is not this production and stays a Div |
| `::: note` admonitions | Div `.admonition .note` (+ title paragraph) |
| Tabs / code-group panels, grouping `[label]` | Div; each `[label]` becomes a bold caption so panels stay distinguishable (graceful degradation) |
| `` `x`{=latex} `` / ```` ```=latex ```` | RawInline / RawBlock (target-routed by pandoc) |
| Citations `[@key]`, `[+@key]`, `[-@key, p. 33]` | Cite with one Citation per key (AuthorInText / SuppressAuthor / NormalCitation), the locator in the citation suffix, the verbatim source as the Cite content |
| `@mention`, `#tag`, `:ext[..]`, critic markup | classed Spans (documented degradation) |
| `[text]{.smallcaps}` | SmallCaps (pandoc's own class convention, both directions) |
| Frontmatter, nested: maps, block and flow sequences, sequences of maps | Meta, to the depth pandoc's own reader gives it |
| `::: \|` line blocks (verse) | LineBlock, one entry per line, an empty entry per stanza break |
| Ordered markers `1.` / `1)` / `a.` / `iv.` | OrderedList with the matching style and delimiter. Pandoc's example list `(@)` and its `(1)` marker have no Carve form and are reported |
| A no-break space the parser resolved (`\ `) | U+00A0 (the engines publish a private-use sentinel for it) |

The complete node-by-node contract lives in the test goldens. Worked
input/output pairs in both directions - including how interactive constructs
degrade for print formats - are in [`examples/`](examples/README.md).

## Why a bridge, not a pandoc reader?

A native `Text.Pandoc.Readers.Carve` upstream would be a fourth full Carve
parser, written in Haskell, outside the conformance loop that keeps the three
official implementations byte-identical against the shared corpus. While the
spec is on its 0.x line and still moving, that reader would drift on pandoc's
release cadence and ship stale behavior. The bridge reuses the canonical,
conformance-tested `@markup-carve/carve` parser instead - correct by
construction, and it iterates in lockstep with the spec.

A pandoc custom Lua reader has the same drift problem (it would reimplement
the parser in Lua). Once the spec reaches 1.0 and stabilizes, contributing an
upstream reader becomes attractive - with this bridge's node map and the
conformance corpus as the oracle any port has to pass.

## Options

```js
carveToPandoc(src, {
  roundtrip: true,               // stamp attr wrappers for exact re-import
  listTable: true,               // ::: list-table -> real Table (full block cells)
  symbols: { heart: '♥' },       // resolve :name: symbols like the renderer would
});
```

CLI equivalents: `--roundtrip`, `--list-table`, `--symbols map.json`.

## Limitations

- A `table.rowGroups` partition whose counts do not add up to the table's row
  count is refused with a warning and the table converts with the implicit
  head/body split instead. PART 12 section 15 requires the sum as a MUST, and
  JSON Schema cannot express a cross-field sum, so a document that validates
  against `resources/ast-schema.json` can still be incoherent - the bridge
  checks it itself rather than trusting a green validator.
- A pandoc table with block content in a cell (a list, two paragraphs, a code
  block) is imported as `::: list-table` rather than a pipe table. PART 9 §16's
  pipe-table cell holds inlines, so there is no pipe form for it, and the
  extension's cells are list items that hold full blocks. Structure is
  preserved; three things the extension does not spell are reported instead -
  per-column alignment, a foot, and a body group's intermediate header rows.
  Convert back with `listTable: true` to get the pandoc table again.
- Pandoc `SmallCaps` has no Carve node and is not getting one: it imports as a
  `[text]{.smallcaps}` span, with a warning saying so. The span is not a dead
  end, though - the export direction reads that class back as `SmallCaps`, the
  same convention pandoc's own markdown reader uses, so small caps survive
  Pandoc -> Carve -> Pandoc and still reach the LaTeX, Typst and DOCX writers.
  Other attributes on the span are preserved around it, exactly as pandoc does.
- Pandoc `Quoted` imports as literal curly quote characters (`“…”` / `‘…’`).
  Carve has no quote node, and the characters are what an author would have
  typed. This one is genuinely one-way: the text re-exports as `Str`, so the
  quote kind and pandoc's locale-aware quoting are gone. Reported once per
  document.
- A `ColSpec`'s `ColWidth` is dropped. Carve's table model has no width slot at
  any level and pipe-table source cannot spell one, so there is nowhere to put
  the number and no syntax that would reproduce it - a wontfix rather than a
  gap. The drop is silent on purpose: pandoc derives a `ColWidth` for every
  grid and multiline table from the ASCII column widths, so a diagnostic would
  fire on the ordinary case and report a value the author never chose. Column
  ALIGNMENT is carried in both directions; tables leaving the bridge always
  carry `ColWidthDefault`, which pandoc's writers size themselves.
- A rowspan that starts in a header row and continues into the body is clipped
  to an empty body cell, with a warning. Carve is the richer model here: its
  rows are one flat list, while pandoc's `TableHead` and `TableBody` hold
  separate row lists and confine a cell's `rowSpan` to its own section. Moving
  the head/body boundary to make the span fit would silently reclassify a row,
  and duplicating the origin's content would invent a cell the author never
  wrote, so the grid keeps its shape and the diagnostic reports the loss.
- Reverse conversion keeps flattening for display targets: `pandocToCarve`
  serializes through Carve 0.1 source, which has no spelling for row groups or
  a short caption, so those fields survive only on the `pandocToCarveAst` path.
- Citations cross as pandoc's own citeproc convention, which is lossy in one
  respect: pandoc's `Citation` has no locator field, so Carve's typed
  `locatorLabel`/`locatorValue` pair is serialized into `citationSuffix` behind
  a `, ` and citeproc re-derives it from there. The bridge does not rebuild
  those two fields on the way back - the label table is section 4.2's, it lives
  in the engine, and a second copy here would drift. The locator TEXT round-
  trips byte for byte, so re-parsing the emitted source with the citations
  extension restores the typed pair. A group whose items mix `AuthorInText` and
  `NormalCitation` cannot be spelled in Carve (the integral `+` is a property of
  the whole cluster) and is imported as integral with a warning.
- Pandoc keeps its bibliography in document metadata, not in the AST, so
  importing a `Cite` emits no `[@key]:` definition lines. Carve renders a group
  with an undefined key verbatim; the import warns once per document.
- Block content inside metadata (pandoc's `MetaBlocks`, e.g. `abstract: |`) is
  skipped with a warning on import, deliberately. It has no honest YAML string
  form: flattening it to one scalar throws away the paragraph structure, and
  writing Carve source into a YAML value makes the frontmatter carry markup that
  nothing on the reading side parses. Every other `Meta` shape - maps, lists,
  lists of maps, scalars, booleans - round-trips.
- A `rowGroups` partition (a foot, several body groups, a body's own header
  rows or row-head columns) survives into the exchange AST, so
  `pandocToCarveAst` hands it on whole - but PART 9 section 16's pipe table
  spells only a leading run of header rows, so `pandocToCarve` flattens it into
  body rows and says so. Use the AST entry point, or the `::: list-table`
  fallback a block cell already triggers, when that structure has to survive.
- Column alignment needs a header row to live on (`|=> Name |`). A headerless
  pandoc table's column alignment is written onto each cell instead, which
  renders the same; the move is reported.
- The frontmatter reader covers the YAML subset frontmatter uses, not YAML.
  Anchors, tags, multi-document streams, block scalars and flow maps are out; a
  line that fits no shape is reported and skipped rather than guessed at.
- Scalars are typed the way pandoc's own frontmatter reader types them: an
  unquoted `true`, `yes`, `on` or `y` (and their negatives) is a `MetaBool`, a
  quoted `"true"` stays text, a null scalar keeps its key as an empty
  `MetaString`, and a number stays text because `Meta` has no number type. This
  matters beyond tidiness - a boolean read as text is not a near miss but an
  inversion, since a pandoc template testing `draft` sees any non-empty string
  as true.
- Attribute order inside `{...}` is normalized to `#id .class key=val` on
  round-trip - pandoc's Attr has fixed slots, so the author's original order
  is not representable. Semantics are unchanged.
- Import fidelity is bounded by `renderCarve` (carve fmt): the bridge hands it
  a byte-exact AST, but known fmt issues (e.g. trailing whitespace inside code
  blocks, carve-js issue 340) surface in the serialized output.
- The pinned engine bounds what the source path can produce. The current git
  pin exports `toAstJson`, so the engine's own exchange serializer is used;
  with an older engine (any published release up to `0.1.3`),
  `src/ast-json.ts` performs the PART 12 section 7 mapping instead, and a pin
  that exports `toAstJson` takes over automatically.
- Tier-3 visual extensions (mermaid, chart, code-group) arrive as their
  degraded block forms (code blocks / divs), same as Carve's static mode.
  `list-table` is the exception: opt in with `listTable: true` / `--list-table`
  to get a real Pandoc table with full block content per cell.

## Development

The test suite converts the whole shared spec corpus, which arrives as a
submodule:

```sh
git clone --recurse-submodules https://github.com/markup-carve/pandoc-carve
# or, in an existing clone:
git submodule update --init
npm ci && npm test
```

Without the submodule the corpus tests FAIL rather than skip - a skipped corpus
reads like a converted one, which is how a stack overflow reachable from a
two-word document stayed live on the published package.

## License

MIT
