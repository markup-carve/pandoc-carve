# pandoc-carve reference for Carve 0.2

This branch uses the vendored Carve 0.2 engine and Pandoc 3.14. The bridge accepts Carve source, a validated 2.0 tree, or Pandoc JSON. It converts in both directions. Its JavaScript API returns warning strings when a value cannot be represented or written exactly.

## Command line

```bash
pandoc-carve doc.crv -t json
pandoc-carve doc.crv -t latex -o doc.tex
pandoc-carve doc.crv -t docx -o doc.docx
pandoc-carve report.docx -f docx -o report.crv
pandoc-carve - -f json < report.json
pandoc-carve - -f carve-json -t json < document-tree.json
```

With Carve input, the default output is Pandoc JSON. With Pandoc input, the default output is Carve source. Use `-` for stdin, `-o` for a file, `-f` to select an input format, and `-t` to select an output format. Formats other than JSON require the `pandoc` executable. `--fail-on-loss` exits with code 3 if the bridge reports a warning; converted output is still written. A missing Pandoc executable exits with code 2. `--help` prints the option summary.

Carve 0.2 recognizes `{{ path }}` as an `include` tree node. This bridge keeps that node unresolved and reports a warning; it does not read files from an include directive.

## JavaScript API

```js
import {
  carveToCarveAst,
  carveToPandoc,
  carveAstToPandoc,
  pandocToCarveAst,
  pandocToCarve,
} from '@markup-carve/pandoc-carve';

const { doc, warnings: exportWarnings } = carveToPandoc('= Heading\n');
const tree = carveToCarveAst('= Heading\n');
const fromTree = carveAstToPandoc(tree);
const { ast, warnings: importWarnings } = pandocToCarveAst(doc);
const { carve, warnings: sourceWarnings } = pandocToCarve(doc);
```

`carveAstToPandoc` accepts a 2.0 document tree object or its JSON text and validates it against the engine's tree contract. `pandocToCarveAst` accepts a Pandoc JSON object or string. The source writer used by `pandocToCarve` may report an additional warning when the 2.0 tree contains a shape it cannot spell in Carve source.

The document's typed title, subtitle, authors, date, and bibliography fields map to Pandoc metadata. General Pandoc metadata fields have no 0.2 tree slot and produce warnings on import. The full limitation is recorded as F-001 in the checkout's `_FINDINGS.md`.

## Mapping and limits

| Carve 0.2 | Pandoc JSON |
| --- | --- |
| `heading`, `paragraph`, `block_quote`, `line_block` | `Header`, `Para`, `BlockQuote`, `LineBlock` |
| `emphasis`, `strong`, `underline`, `strike`, `highlight` | `Emph`, `Strong`, `Underline`, `Strikeout`, marked `Span` |
| `delete` followed by `insert` | Two classed `Span` nodes |
| `link`, `image`, `xref`, `autolink` | `Link` or `Image` with bridge attributes where needed |
| `list`, `definition_list`, `table` | `BulletList` or `OrderedList`, `DefinitionList`, `Table` |
| captioned `paragraph` (image or math), `block_quote`, `code_block`, `include`; `figure_group`, `caption` | `Figure` around the block and its caption, with a carrier for 0.2 details. A Pandoc `Figure` around one such block comes back as that block with its caption; any other `Figure` becomes a `figure_group` |
| `table_body` | `TableBody`. A body's header rows are body rows of header cells; Pandoc's intermediate head rows come back the same way |
| `footnote_ref`, `inline_footnote` | `Note`, with a carrier for reference identity |
| `frontmatter`, `include`, source definitions | Raw or classed carriers in Pandoc JSON |

The bridge rejects Pandoc JSON nested beyond its import limit before recursive conversion. It also bounds list depth. The 0.2 example corpus includes 200 nested superscripts and passes these guards.

Some Pandoc writers remove bridge attributes or change structure. The [round trip matrix](roundtrip-0.2.md) measures 99 source probes across 17 formats and records the first difference for each cell. The [test port tracker](test-port-0.2.md) records every original test file's 0.2 disposition.
