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
pandoc-carve - -f carve-ast-json -t docx -o out.docx < document-tree.json
```

With Carve input, the default output is Pandoc JSON. With Pandoc input, the default output is Carve source. Use `-` for stdin, `-o` for a file, `-f` to select an input format, and `-t` to select an output format. Formats other than JSON require the `pandoc` executable; `--pandoc PATH` names it (default `$PANDOC`, then `pandoc`). `-s` asks Pandoc for a standalone document, and every argument after `--` goes to Pandoc verbatim, in both directions:

```bash
pandoc-carve doc.crv -t html -s -o doc.html
pandoc-carve doc.crv -t latex -s -- --toc --template=paper.tex
```

`--fail-on-loss` exits with code 3 if the bridge reports a warning or an include fails; converted output is still written. A missing Pandoc executable exits with code 2. An unknown option is an error. `--help` prints the option summary.

`-f carve-ast-json` accepts a bare 2.0 document or a 2.0 interchange envelope and validates it against the vendored tree schema. The older `-f carve-json` spelling remains available. A thematic break with the `page-break` class becomes a page break in DOCX, ODT, and LaTeX/PDF. The ODT writer adds a hard page break paragraph style to the archive. Other writers receive a plain thematic break. Pandoc JSON retains a `carve-page-break` carrier so the bridge can round trip the class. Pandoc's DOCX reader does not restore the original Carve class after a page break has been written to DOCX.

### Offline conversion

`--offline` enables Pandoc's sandbox and prevents remote image fetching. Images may already be embedded as base64 data URIs; otherwise each image must be supplied by `--resource-root DIR` or, in the Node API, by a `resolveImage` callback. The root must be absolute; URL-encoded image paths are decoded before containment checks, and paths cannot escape the root, including through symlinks. The bridge embeds image bytes as data URIs before Pandoc runs. A missing image fails conversion. `--offline` rejects Pandoc passthrough arguments because they can invoke external filters or override the sandbox. The option also rejects remote input filenames. Sandboxed Pandoc may require a build with embedded data files for some writers.

```js
import { carveToPandoc } from '@markup-carve/pandoc-carve';
import { preparePandocForWriter } from '@markup-carve/pandoc-carve/node';

const { doc } = carveToPandoc('![Chart](chart.png)');
const ready = preparePandocForWriter(doc, 'docx', {
  offline: true,
  resolveImage: (source) => source === 'chart.png'
    ? { bytes: chartPngBytes, mimeType: 'image/png' } : undefined,
});
```

The library prepares Pandoc JSON and does not start Pandoc. The host must invoke Pandoc with `--sandbox` when using this option. Pandoc's sandbox does not cover external PDF engines or filters, so an offline PDF service must also constrain its PDF engine outside this package.

### Includes

A named Carve file expands its `{{ path }}` includes through the carve-js include resolver, from the file's folder. No include reads a file outside the containment root, which is the input file's folder unless `--include-root DIR` names another absolute directory. Stdin expands includes only with `--include-root`. `--no-includes` leaves every include as an unresolved `carve-include` div with a warning. An include that cannot be read stays unresolved and is reported on stderr with its `include-*` code and the file relative to the root (`[include-root]/part.crv`). The include options apply to Carve source only.

The string API (`carveToPandoc`) never reads files. `carveToPandocWithIncludes(source, { includeRoot, sourcePath })` from `@markup-carve/pandoc-carve/node` is the CLI path; it returns `doc`, `warnings`, `includeDiagnostics`, `suppressedIncludeDiagnostics` and `dependencies`. An included file's frontmatter is not part of the host document.

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

The document's typed title, subtitle, authors, date, and bibliography fields map to Pandoc metadata. General Pandoc metadata fields have no 0.2 tree slot and produce warnings on import. This limitation is F-001, the reason the metadata tests that need a general Meta slot are skipped.

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

### Track changes and comments

Pandoc's docx reader with `--track-changes=all`, and its docx writer, use `Span` nodes of class `insertion`, `deletion`, `comment-start` and `comment-end`, with the keys `author` and `date`. The bridge maps them to Carve's revision keys `author` and `datetime` (carve#6788):

| Carve 0.2 | Pandoc JSON |
| --- | --- |
| `{+12+}{author=Ann datetime=2026-11-20T10:00Z}` | `Span` of class `insertion` with `author` and `date` |
| `{-10-}{author=Ann datetime=2026-11-20T10:00Z}` | `Span` of class `deletion` with `author` and `date` |
| `{# check #}{author=Bob datetime=2026-11-21T09:30Z}` | a `comment-start` `Span` holding the comment text, then an empty `comment-end` `Span` with the same `comment-id` |

An insert or delete with neither `author` nor `datetime`, and an editorial comment without `author`, keep their bridge carriers: Pandoc's docx writer drops a comment that names no author. A revision with only `datetime` becomes a native span, and Pandoc's docx writer adds `author=unknown` to it. A Carve comment is a point, while a Word comment covers a range: the bridge writes a ranged comment where its `comment-end` stands and reports the lost range with `import-structure-repaired`. A comment body with formatting or several paragraphs becomes its plain text, also reported.

The pinned carve-js does not read an attribute block on an editorial comment yet, so Carve source output reports `field-unspellable` for those attributes; the AST JSON output keeps them.

```bash
node dist/cli.js review.docx -f docx -o review.crv -- --track-changes=all
```
