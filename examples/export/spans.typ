= Table spans
Carve tables carry cell spans with two markers: `<` merges a cell into
its left neighbor (colspan) and `^` merges a cell into the one above it
(rowspan). pandoc-carve rewrites these into Pandoc's origin-cell span
model (the origin cell holds the width/height; covered cells are
omitted), so the merged regions survive into LaTeX
`\multicolumn`/`\multirow`, DOCX merged cells, Typst, and the rest - not
just HTML.

#figure(
  align(center)[#table(
    columns: 3,
    align: (auto,auto,auto,),
    table.header([Region], [2024], [2025],),
    table.hline(),
    [North], table.cell(colspan: 2)[100],
    table.cell(rowspan: 2)[South], [40], [60],
    [30], [50],
  )]
  , caption: [Sales by region (North 2024 spans both years; South spans
  two rows)]
  , kind: table
  )
