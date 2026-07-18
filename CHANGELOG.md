# Changelog

## Unreleased

- Initial implementation: `carveToPandoc()` / `carveToPandocJson()` mapping the
  full Carve AST (43 node types) to Pandoc's JSON AST (api version 1.23.1),
  with explicit degradation warnings for lossy constructs.
- `pandoc-carve` CLI: `pandoc-carve doc.crv -t latex -o out.tex` (shells out to
  a `pandoc` found on PATH; `-t json` emits the Pandoc AST without pandoc).
- Reverse direction: `pandocToCarve()` converts a Pandoc document to Carve
  source (serialized by carve's `renderCarve`), and the CLI imports anything
  pandoc reads: `pandoc-carve report.docx -f docx -o report.crv`. Round-trips
  (carve -> pandoc AST -> carve) are gated on HTML equivalence in the tests.
