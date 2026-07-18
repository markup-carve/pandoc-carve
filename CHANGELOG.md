# Changelog

## Unreleased

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
- Reverse direction: `pandocToCarve()` converts a Pandoc document to Carve
  source (serialized by carve's `renderCarve`), and the CLI imports anything
  pandoc reads: `pandoc-carve report.docx -f docx -o report.crv`. Round-trips
  (carve -> pandoc AST -> carve) are gated on HTML equivalence in the tests.
