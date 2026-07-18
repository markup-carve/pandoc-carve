# Changelog

## Unreleased

- Initial implementation: `carveToPandoc()` / `carveToPandocJson()` mapping the
  full Carve AST (43 node types) to Pandoc's JSON AST (api version 1.23.1),
  with explicit degradation warnings for lossy constructs.
- `pandoc-carve` CLI: `pandoc-carve doc.crv -t latex -o out.tex` (shells out to
  a `pandoc` found on PATH; `-t json` emits the Pandoc AST without pandoc).
