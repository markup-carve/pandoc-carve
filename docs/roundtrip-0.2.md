# Carve 0.2 format round trips

pandoc 3.14. 99 Carve probes × 17 readable formats; 66 Pandoc rich/degraded pairs in the reverse direction.

## Verdict ladder

The first true rung wins: **exact** uses the vendored engine’s `treesEqual`; **same-meaning** applies only the source/provenance rules below; **same-rendering** compares vendored HTML after collapsing whitespace between tags and dropping generated heading IDs; **same-text** compares plain text block by block; **lossy** names the first differing block; **error** records the failing stage.

The same-meaning rules, in script order, are:

1. generated/authored heading id with the same value.
2. autolink/link with destination as text.
3. bullet glyph and ordered-list delimiter.
4. smart punctuation/text with the same character.
5. comments of any form.
6. literal inline/code span.
7. reference/inline link with the same destination.
8. absent/empty tooltip.
9. span marks with equal resolved counts.
10. explicit zero head rows/none.
11. attribute order.
12. unreferenced definitions with equal resolved targets.

These rules do not remove text, block structure, emphasis family, link destinations, images, table cells, math, code content or language, footnote content, task state, attribute values, or classes. The vendored engine’s equality already ignores positions and computed resolution fields.

## Per-format summary

| Format | Exact | Same meaning | Same rendering | Same text | Lossy | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| docx | 24 | 8 | 5 | 42 | 20 | 0 |
| odt | 16 | 9 | 3 | 40 | 31 | 0 |
| epub | 60 | 3 | 4 | 23 | 9 | 0 |
| html | 74 | 3 | 3 | 10 | 9 | 0 |
| latex | 19 | 4 | 4 | 42 | 30 | 0 |
| typst | 20 | 9 | 4 | 44 | 22 | 0 |
| jats | 16 | 6 | 5 | 51 | 21 | 0 |
| docbook | 21 | 10 | 4 | 43 | 21 | 0 |
| rst | 27 | 6 | 5 | 43 | 18 | 0 |
| org | 29 | 8 | 4 | 32 | 26 | 0 |
| asciidoc | 22 | 6 | 3 | 41 | 27 | 0 |
| mediawiki | 22 | 6 | 4 | 13 | 54 | 0 |
| ipynb | 18 | 5 | 6 | 22 | 48 | 0 |
| markdown | 72 | 0 | 0 | 12 | 15 | 0 |
| gfm | 20 | 3 | 5 | 13 | 58 | 0 |
| commonmark_x | 64 | 0 | 1 | 9 | 25 | 0 |
| djot | 72 | 2 | 3 | 14 | 8 | 0 |

## Carve-to-format grid

E = exact; M = same meaning; R = same rendering; T = same text; L = lossy; ! = error. First differing block, degraded feature names, attribution, and Pandoc snapshots are in [the data](roundtrip-0.2-data.json).

| Probe | docx | odt | epub | html | latex | typst | jats | docbook | rst | org | asciidoc | mediawiki | ipynb | markdown | gfm | commonmark_x | djot |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| [abbreviation](../test/fixtures/probes-0.2/abbreviation.crv) | L | L | R | R | L | L | L | L | L | L | T | L | L | E | L | L | E |
| [admonition](../test/fixtures/probes-0.2/admonition.crv) | T | T | E | E | T | T | T | T | T | L | T | L | T | E | L | E | E |
| [admonition_label](../test/fixtures/probes-0.2/admonition_label.crv) | T | T | E | E | T | T | T | T | T | L | T | L | T | E | L | E | E |
| [admonition_title](../test/fixtures/probes-0.2/admonition_title.crv) | L | L | E | E | L | L | L | L | L | L | L | L | L | E | L | L | E |
| [autolink](../test/fixtures/probes-0.2/autolink.crv) | M | M | E | E | T | M | T | M | M | M | M | M | L | E | L | E | T |
| [autolink_attrs](../test/fixtures/probes-0.2/autolink_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | T | L | E | L | E | T |
| [block_quote](../test/fixtures/probes-0.2/block_quote.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [block_quote_attrs](../test/fixtures/probes-0.2/block_quote_attrs.crv) | T | T | T | E | L | L | T | T | T | L | T | L | T | E | L | E | E |
| [block_quote_caption](../test/fixtures/probes-0.2/block_quote_caption.crv) | T | L | E | E | E | E | E | E | L | L | L | L | L | L | L | L | L |
| [code_block](../test/fixtures/probes-0.2/code_block.crv) | T | T | T | T | T | T | T | T | T | E | E | T | T | T | T | T | E |
| [code_block_attrs](../test/fixtures/probes-0.2/code_block_attrs.crv) | T | L | T | T | L | T | T | T | T | T | T | T | T | T | T | T | E |
| [code_block_caption](../test/fixtures/probes-0.2/code_block_caption.crv) | T | L | T | T | L | T | L | T | L | T | L | L | L | L | L | L | L |
| [code_block_language](../test/fixtures/probes-0.2/code_block_language.crv) | T | L | T | T | L | T | T | T | T | T | T | T | T | T | T | T | E |
| [code_block_title](../test/fixtures/probes-0.2/code_block_title.crv) | L | L | L | L | L | L | L | L | L | T | L | L | L | T | L | L | E |
| [code_inline](../test/fixtures/probes-0.2/code_inline.crv) | E | E | E | E | L | E | E | E | E | E | T | E | E | E | E | E | E |
| [code_inline_attrs](../test/fixtures/probes-0.2/code_inline_attrs.crv) | T | T | T | T | L | T | T | T | T | T | T | T | T | E | T | E | E |
| [comment_block](../test/fixtures/probes-0.2/comment_block.crv) | M | M | M | M | M | M | M | M | E | M | M | M | M | E | M | L | M |
| [comment_braced](../test/fixtures/probes-0.2/comment_braced.crv) | L | L | L | L | L | L | L | L | L | L | L | L | L | E | L | L | E |
| [comment_line](../test/fixtures/probes-0.2/comment_line.crv) | M | M | M | M | M | M | M | M | E | M | M | M | M | E | M | L | M |
| [deletion](../test/fixtures/probes-0.2/deletion.crv) | T | T | E | E | T | T | T | T | T | T | E | L | L | E | L | E | E |
| [description_list](../test/fixtures/probes-0.2/description_list.crv) | E | L | E | E | E | E | E | E | E | E | E | E | L | E | L | E | E |
| [description_multiple](../test/fixtures/probes-0.2/description_multiple.crv) | T | L | E | E | T | T | T | T | T | T | L | E | L | E | L | E | T |
| [directive](../test/fixtures/probes-0.2/directive.crv) | T | T | E | E | T | T | T | T | T | T | T | L | T | E | L | E | E |
| [div](../test/fixtures/probes-0.2/div.crv) | T | T | E | E | T | T | T | T | T | T | T | L | T | E | L | E | E |
| [div_attrs](../test/fixtures/probes-0.2/div_attrs.crv) | T | T | T | E | L | L | T | T | T | L | T | L | T | E | L | E | E |
| [div_title](../test/fixtures/probes-0.2/div_title.crv) | L | L | E | E | L | L | L | L | L | L | L | L | L | E | L | L | E |
| [editorial_comment](../test/fixtures/probes-0.2/editorial_comment.crv) | L | L | L | L | L | L | L | L | L | L | L | L | L | L | L | L | E |
| [emphasis](../test/fixtures/probes-0.2/emphasis.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [emphasis_attrs](../test/fixtures/probes-0.2/emphasis_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | L | L | E | L | E | E |
| [figure_caption](../test/fixtures/probes-0.2/figure_caption.crv) | T | L | T | E | T | T | T | T | L | L | L | L | L | L | L | L | L |
| [figure_group](../test/fixtures/probes-0.2/figure_group.crv) | L | L | T | E | L | L | L | L | L | L | L | L | L | L | L | L | L |
| [footnote](../test/fixtures/probes-0.2/footnote.crv) | R | R | L | L | L | R | L | R | R | R | L | L | L | E | L | L | E |
| [frontmatter](../test/fixtures/probes-0.2/frontmatter.crv) | R | R | R | R | R | R | R | R | R | R | R | R | R | L | R | L | E |
| [hard_break](../test/fixtures/probes-0.2/hard_break.crv) | E | E | E | E | E | E | L | L | L | E | E | E | E | E | E | E | E |
| [heading](../test/fixtures/probes-0.2/heading.crv) | R | T | E | E | M | M | M | M | M | E | M | R | R | E | R | E | T |
| [heading_attrs](../test/fixtures/probes-0.2/heading_attrs.crv) | T | T | T | E | T | T | T | T | T | E | T | L | T | E | T | E | T |
| [heading_authored_id](../test/fixtures/probes-0.2/heading_authored_id.crv) | T | T | T | E | E | E | E | E | E | E | E | L | T | E | T | E | T |
| [heading_level_6](../test/fixtures/probes-0.2/heading_level_6.crv) | R | T | T | E | T | M | T | T | T | T | L | L | R | E | R | E | T |
| [highlight](../test/fixtures/probes-0.2/highlight.crv) | E | T | E | E | E | E | T | T | E | T | E | L | L | E | L | E | E |
| [image](../test/fixtures/probes-0.2/image.crv) | T | L | T | E | T | T | T | T | T | L | T | L | T | L | L | E | E |
| [image_attrs](../test/fixtures/probes-0.2/image_attrs.crv) | T | L | T | E | T | T | T | T | T | L | T | L | L | L | L | E | E |
| [image_reference](../test/fixtures/probes-0.2/image_reference.crv) | T | L | T | T | T | T | T | T | T | L | T | L | L | L | L | L | E |
| [image_title](../test/fixtures/probes-0.2/image_title.crv) | T | L | T | E | T | T | T | T | T | L | T | L | T | L | L | E | R |
| [inline_footnote](../test/fixtures/probes-0.2/inline_footnote.crv) | E | E | E | E | E | E | L | E | E | E | E | L | L | E | E | E | E |
| [inline_footnote_attrs](../test/fixtures/probes-0.2/inline_footnote_attrs.crv) | T | T | E | E | T | T | L | T | T | T | T | L | L | E | L | E | E |
| [insertion](../test/fixtures/probes-0.2/insertion.crv) | T | T | E | E | T | T | T | T | T | T | E | L | L | E | L | E | E |
| [line_block](../test/fixtures/probes-0.2/line_block.crv) | L | L | R | E | L | L | L | L | E | E | L | L | L | E | L | L | L |
| [link](../test/fixtures/probes-0.2/link.crv) | E | E | E | E | E | E | T | E | E | E | E | E | E | E | E | E | E |
| [link_attrs](../test/fixtures/probes-0.2/link_attrs.crv) | T | T | T | E | T | T | T | T | T | T | T | T | L | E | L | E | E |
| [link_reference](../test/fixtures/probes-0.2/link_reference.crv) | L | L | L | L | L | L | L | L | T | L | L | L | L | E | L | L | E |
| [link_reference_collapsed](../test/fixtures/probes-0.2/link_reference_collapsed.crv) | M | M | T | T | M | M | T | M | R | M | M | M | L | E | L | L | E |
| [link_title](../test/fixtures/probes-0.2/link_title.crv) | E | T | E | E | T | T | T | T | T | T | T | T | E | E | E | E | R |
| [list_bullet_dash](../test/fixtures/probes-0.2/list_bullet_dash.crv) | E | E | E | E | T | T | T | E | E | E | T | E | E | E | E | E | E |
| [list_bullet_star](../test/fixtures/probes-0.2/list_bullet_star.crv) | M | M | E | E | T | T | T | M | T | M | T | L | M | E | L | E | E |
| [list_loose](../test/fixtures/probes-0.2/list_loose.crv) | E | T | E | E | E | E | E | E | T | E | E | T | E | E | E | E | E |
| [list_nested](../test/fixtures/probes-0.2/list_nested.crv) | E | T | E | E | T | T | T | E | E | E | T | E | E | E | E | E | E |
| [list_ordered_alpha](../test/fixtures/probes-0.2/list_ordered_alpha.crv) | E | E | M | M | T | T | T | M | E | T | T | T | T | E | T | E | E |
| [list_ordered_decimal](../test/fixtures/probes-0.2/list_ordered_decimal.crv) | E | E | E | E | T | T | T | E | E | E | T | E | E | E | E | E | E |
| [list_ordered_roman](../test/fixtures/probes-0.2/list_ordered_roman.crv) | E | E | E | E | T | T | T | E | E | T | T | T | T | E | T | E | E |
| [list_ordered_start](../test/fixtures/probes-0.2/list_ordered_start.crv) | E | T | E | E | T | T | T | E | E | E | T | E | T | E | E | E | E |
| [literal_inline](../test/fixtures/probes-0.2/literal_inline.crv) | M | M | E | E | L | M | M | M | M | T | T | M | M | E | M | E | E |
| [math_attrs](../test/fixtures/probes-0.2/math_attrs.crv) | L | L | E | E | T | L | T | L | T | T | T | L | L | E | L | E | E |
| [math_caption](../test/fixtures/probes-0.2/math_caption.crv) | L | L | E | E | R | L | R | L | L | L | L | L | L | L | L | L | L |
| [math_display](../test/fixtures/probes-0.2/math_display.crv) | L | L | E | E | R | L | R | L | T | R | L | L | R | E | L | E | E |
| [math_inline](../test/fixtures/probes-0.2/math_inline.crv) | L | L | E | E | E | L | E | L | E | E | E | E | E | E | E | E | E |
| [mention](../test/fixtures/probes-0.2/mention.crv) | L | L | E | E | L | L | L | L | L | L | T | L | L | E | L | E | E |
| [non_breaking_space](../test/fixtures/probes-0.2/non_breaking_space.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [paragraph](../test/fixtures/probes-0.2/paragraph.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [paragraph_attrs](../test/fixtures/probes-0.2/paragraph_attrs.crv) | T | T | T | E | L | L | T | T | T | L | T | L | T | E | L | E | E |
| [raw_block](../test/fixtures/probes-0.2/raw_block.crv) | L | L | L | L | L | L | L | L | L | E | L | L | L | L | L | L | E |
| [raw_inline](../test/fixtures/probes-0.2/raw_inline.crv) | L | L | L | L | L | L | L | L | L | L | L | R | R | E | R | E | E |
| [replacement](../test/fixtures/probes-0.2/replacement.crv) | T | T | E | E | T | T | T | T | T | T | E | L | L | E | L | E | E |
| [smart_dash](../test/fixtures/probes-0.2/smart_dash.crv) | M | M | E | E | T | M | M | M | M | M | L | L | L | E | L | E | E |
| [smart_quotes](../test/fixtures/probes-0.2/smart_quotes.crv) | M | M | E | E | T | M | M | M | M | M | L | L | L | E | L | L | E |
| [soft_break](../test/fixtures/probes-0.2/soft_break.crv) | T | T | T | E | E | E | E | T | E | E | E | E | E | E | E | E | E |
| [span_attrs](../test/fixtures/probes-0.2/span_attrs.crv) | T | T | T | T | T | L | T | T | T | T | T | L | L | E | L | E | E |
| [strike](../test/fixtures/probes-0.2/strike.crv) | E | E | E | E | E | E | E | E | L | E | T | L | E | E | E | E | T |
| [strong](../test/fixtures/probes-0.2/strong.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [strong_attrs](../test/fixtures/probes-0.2/strong_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | L | L | E | L | E | E |
| [subscript](../test/fixtures/probes-0.2/subscript.crv) | E | E | E | E | E | E | E | E | E | E | E | E | L | E | L | E | E |
| [superscript](../test/fixtures/probes-0.2/superscript.crv) | E | E | E | E | E | E | E | E | E | E | E | E | L | E | L | E | E |
| [symbol](../test/fixtures/probes-0.2/symbol.crv) | R | R | T | T | L | R | R | R | R | R | T | L | L | E | L | E | E |
| [table_alignment](../test/fixtures/probes-0.2/table_alignment.crv) | T | T | R | R | T | T | T | T | T | T | R | R | R | T | R | R | R |
| [table_attrs](../test/fixtures/probes-0.2/table_attrs.crv) | T | T | E | E | L | L | T | T | T | T | T | T | T | T | T | T | E |
| [table_body_partition](../test/fixtures/probes-0.2/table_body_partition.crv) | T | M | E | E | T | T | T | T | M | M | M | M | M | T | T | T | T |
| [table_caption](../test/fixtures/probes-0.2/table_caption.crv) | T | T | E | E | L | T | T | T | E | L | E | E | L | T | L | L | E |
| [table_cell_attrs](../test/fixtures/probes-0.2/table_cell_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | E | T | T | T | T | T |
| [table_colspan](../test/fixtures/probes-0.2/table_colspan.crv) | L | L | L | L | L | T | L | L | T | L | L | L | L | L | L | L | L |
| [table_column_width](../test/fixtures/probes-0.2/table_column_width.crv) | T | T | E | E | L | T | T | T | T | T | T | T | T | T | T | T | T |
| [table_footer](../test/fixtures/probes-0.2/table_footer.crv) | T | T | E | E | L | T | T | T | T | T | T | T | T | T | T | T | T |
| [table_rowspan](../test/fixtures/probes-0.2/table_rowspan.crv) | L | L | L | L | L | T | L | L | L | L | L | L | L | L | L | L | L |
| [table_simple](../test/fixtures/probes-0.2/table_simple.crv) | T | T | E | E | T | T | T | T | E | E | E | E | E | T | E | E | E |
| [tag](../test/fixtures/probes-0.2/tag.crv) | L | L | T | T | L | L | L | L | L | L | L | L | L | E | L | E | E |
| [task_done](../test/fixtures/probes-0.2/task_done.crv) | T | T | E | E | T | T | T | T | T | T | L | L | L | E | L | E | E |
| [task_mixed](../test/fixtures/probes-0.2/task_mixed.crv) | T | T | E | E | T | T | T | T | T | T | L | L | L | L | L | L | E |
| [task_other](../test/fixtures/probes-0.2/task_other.crv) | T | T | E | E | T | T | T | T | T | T | L | L | L | E | L | E | E |
| [thematic_break](../test/fixtures/probes-0.2/thematic_break.crv) | E | T | E | E | T | E | L | L | E | E | L | E | E | E | E | E | E |
| [underline](../test/fixtures/probes-0.2/underline.crv) | E | T | E | E | E | E | E | E | T | E | T | L | L | E | L | T | T |
| [xref](../test/fixtures/probes-0.2/xref.crv) | L | L | E | E | R | R | R | R | R | L | R | L | L | E | L | E | T |

## Features in Carve sources

For each feature, the table lists the *worst* rung among probes whose source tree contains that feature. A format appears under the best rung it guarantees across those probes. Lossy formats are omitted; this is deliberately stricter than finding one successful example.

| Feature | Exact | Same meaning | Same rendering | Same text |
| --- | --- | --- | --- | --- |
| inline role (28 probes) | — | — | — | — |
| attribute (19 probes) | — | — | — | epub, html, djot |
| table structure (10 probes) | — | — | — | — |
| table alignment (1 probe) | epub, html | — | — | docx, odt, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot |
| caption (6 probes) | — | — | — | epub, html |
| footnote (3 probes) | markdown, djot | — | — | docx, odt, typst, docbook, rst, org |
| math (4 probes) | epub, html | — | — | latex, jats |
| code language (5 probes) | — | — | — | org |
| raw content (2 probes) | djot | — | — | — |
| link target (8 probes) | markdown | — | — | rst, djot |
| image (6 probes) | — | — | — | epub, html |
| list structure (11 probes) | djot | epub, html | — | docx, odt, latex, typst, jats, docbook, rst, org |
| task state (3 probes) | epub, html, djot | — | — | docx, odt, latex, typst, jats, docbook, rst, org |
| container role (14 probes) | — | — | — | epub, html |
| heading level or id (5 probes) | html, markdown, commonmark_x | — | — | epub, latex, typst, jats, docbook, rst, djot |
| frontmatter (1 probe) | djot | — | docx, odt, epub, html, latex, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, gfm | — |
| comment (4 probes) | — | djot | — | — |

## Attribution

The data records bridge on export, Pandoc writer, Pandoc reader, bridge on import, or tree comparison for every nonexact cell. For text formats, the original and observed degraded tree are both written with the same Pandoc options; identical output supports writer loss, different output supports reader loss. For binary formats, the writer/reader split remains undetermined. This differential is evidence about the observed degradation, not a claim that every intermediate difference has one cause.

## Pandoc-to-Carve result

Direct means Pandoc JSON → validated Carve tree → Pandoc JSON. **typed** requires the pair’s distinction in a typed tree field/node and the rich Pandoc AST to come back; **data** means it comes back solely through opaque data or a marker attribute; **dropped** means it does not come back; **refused** means the bridge or validator rejected it. Format cells compare real-file rich and degraded imports: **S** = same tree as direct rich import, **K** = distinction survives in a changed tree, **L** = distinction lost in the tree, **!** = error. A trailing **+** means Pandoc’s reader still distinguishes rich from degraded; **−** means the format erased that distinction. Thus S+ beside a dropped direct result means the format carries the feature but the tree already lacks it.

| Pandoc probe | Direct | docx | odt | epub | html | latex | typst | jats | docbook | rst | org | asciidoc | mediawiki | ipynb | markdown | gfm | commonmark_x | djot |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| emph | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| strong | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| underline | typed | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ |
| strikeout | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ | K+ |
| superscript | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ |
| subscript | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ |
| smallcaps | typed | S+ | L− | S+ | S+ | S+ | S+ | S+ | K+ | L− | L− | K+ | L− | K+ | S+ | K+ | K+ | K+ |
| quoted_double | dropped | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| quoted_single | dropped | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| code_inline | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| code_inline_attrs | typed | L− | L− | K+ | K+ | K+ | L− | K+ | L− | L− | L− | L− | L− | L− | S+ | L− | S+ | S+ |
| math_inline | typed | K+ | K+ | S+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| math_display | typed | K+ | L− | S+ | S+ | S+ | K+ | S+ | L− | S+ | S+ | K+ | L− | S+ | S+ | S+ | S+ | S+ |
| rawinline_html | typed | L− | L− | K+ | K+ | L− | L− | L− | K+ | L− | L− | L− | K+ | K+ | S+ | K+ | S+ | S+ |
| rawinline_tex | typed | L− | L− | L− | L− | K+ | L− | L− | L− | K+ | S+ | L− | L− | L− | S+ | L− | S+ | S+ |
| linebreak | typed | S+ | S+ | S+ | S+ | S+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| softbreak | typed | L− | L− | L− | S+ | S+ | S+ | S+ | L− | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| span_attrs | typed | L− | K+ | K+ | S+ | K+ | K+ | L− | K+ | L− | L− | K+ | K+ | K+ | S+ | K+ | S+ | S+ |
| note | typed | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ |
| cite | typed | L− | L− | K+ | K+ | L− | K+ | L− | L− | L− | K+ | L− | L− | L− | S+ | L− | L− | L− |
| link | typed | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| link_title | typed | S+ | L− | S+ | S+ | L− | L− | L− | L− | L− | L− | L− | L− | S+ | S+ | S+ | S+ | K+ |
| link_attrs | typed | L− | L− | K+ | S+ | K+ | L− | K+ | K+ | L− | L− | L− | L− | K+ | S+ | K+ | S+ | S+ |
| image | typed | K+ | K+ | K+ | S+ | S+ | K+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ |
| image_title | typed | K+ | L− | K+ | S+ | L− | L− | S+ | S+ | L− | L− | K+ | L− | K+ | S+ | S+ | S+ | K+ |
| image_size | typed | K+ | L− | K+ | K+ | K+ | K+ | L− | K+ | K+ | L− | K+ | L− | K+ | S+ | K+ | S+ | S+ |
| header | typed | K+ | K+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ |
| header_level | typed | K+ | K+ | K+ | K+ | K+ | S+ | L− | L− | L− | K+ | L− | K+ | K+ | K+ | K+ | K+ | K+ |
| header_attrs | typed | L− | L− | K+ | S+ | L− | L− | L− | L− | L− | S+ | L− | L− | L− | S+ | L− | S+ | K+ |
| blockquote | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| codeblock | typed | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ |
| codeblock_lang | typed | L− | K+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ |
| codeblock_attrs | typed | L− | L− | K+ | K+ | K+ | L− | K+ | L− | L− | K+ | L− | L− | L− | S+ | L− | S+ | K+ |
| rawblock_html | typed | L− | L− | K+ | K+ | L− | L− | L− | L− | S+ | K+ | L− | S+ | S+ | S+ | K+ | K+ | K+ |
| rawblock_tex | typed | L− | L− | L− | L− | L− | L− | L− | L− | S+ | K+ | L− | L− | L− | K+ | L− | K+ | K+ |
| hrule | typed | S+ | K+ | S+ | S+ | K+ | S+ | L− | L− | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| lineblock | typed | K+ | K+ | K+ | S+ | K+ | K+ | L− | S+ | S+ | S+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ |
| div_attrs | typed | L− | K+ | K+ | S+ | K+ | K+ | L− | L− | K+ | K+ | K+ | K+ | L− | S+ | K+ | S+ | S+ |
| bulletlist | typed | S+ | S+ | S+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| orderedlist | typed | S+ | S+ | S+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| ol_start | typed | S+ | L− | S+ | S+ | L− | K+ | L− | S+ | S+ | S+ | K+ | S+ | L− | S+ | S+ | S+ | S+ |
| ol_style_roman | typed | S+ | S+ | S+ | S+ | L− | K+ | K+ | S+ | S+ | L− | K+ | L− | L− | S+ | L− | K+ | S+ |
| ol_style_alpha | typed | S+ | S+ | S+ | S+ | L− | K+ | K+ | S+ | S+ | L− | K+ | L− | L− | S+ | L− | S+ | S+ |
| ol_delim_paren | typed | S+ | S+ | L− | L− | L− | K+ | L− | L− | S+ | L− | L− | L− | L− | S+ | S+ | S+ | S+ |
| ol_example | dropped | L− | L− | L− | L− | L− | L+ | L− | L− | L− | L− | L+ | L− | L− | L− | L− | L− | L− |
| list_nested | typed | S+ | K+ | S+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| list_loose | typed | S+ | L− | S+ | S+ | L− | L− | L− | S+ | L− | S+ | L− | L− | S+ | S+ | S+ | S+ | S+ |
| deflist | typed | S+ | K+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ |
| figure | typed | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | S+ | K+ | K+ | K+ |
| figure_attrs | typed | L− | L− | K+ | S+ | K+ | K+ | K+ | L− | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ |
| table | typed | K+ | S+ | S+ | S+ | K+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ | K+ | K+ | K+ |
| table_head | typed | K+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ |
| table_caption | typed | K+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | S+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | K+ |
| table_foot | typed | K+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ |
| table_colspan | typed | K+ | S+ | S+ | S+ | K+ | K+ | K+ | L− | S+ | L− | S+ | S+ | K+ | K+ | K+ | K+ | L− |
| table_rowspan | typed | K+ | S+ | S+ | S+ | K+ | K+ | K+ | L− | K+ | L− | S+ | S+ | K+ | K+ | K+ | K+ | L− |
| table_align | typed | K+ | L− | K+ | K+ | S+ | K+ | K+ | S+ | L− | L− | S+ | K+ | S+ | S+ | K+ | K+ | K+ |
| table_colwidth | typed | K+ | L− | S+ | S+ | L− | L− | L− | K+ | S+ | L− | K+ | L− | L− | K+ | L− | L− | L− |
| table_attrs | typed | L− | L− | S+ | S+ | K+ | K+ | L− | L− | L− | L− | L− | L− | K+ | K+ | K+ | K+ | K+ |
| table_attrs_nocaption | typed | L− | L− | S+ | S+ | K+ | K+ | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | K+ |
| table_cell_attrs | typed | L− | L− | S+ | S+ | L− | L− | L− | L− | L− | L− | L− | S+ | L− | L− | L− | L− | L− |
| table_cell_align | typed | K+ | L− | K+ | K+ | L− | K+ | K+ | L− | L− | L− | S+ | K+ | L− | L− | L− | L− | L− |
| table_row_attrs | typed | L− | L− | S+ | S+ | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− |
| table_block_cell | typed | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | K+ |
| table_rowheadcols | typed | L− | K+ | S+ | S+ | L− | L− | L− | L− | L− | L− | L− | K+ | L− | L− | L− | L− | L− |
| table_multibody | typed | L− | L− | S+ | S+ | L− | L− | K+ | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− |

## Pandoc features without a typed round trip

Ranked by the number of these formats whose Pandoc writer/reader can carry the rich/degraded distinction. The need names the tree location or standard namespace; it does not imply a specification change is already approved.

| Probe | Direct | Formats carrying it | Need |
| --- | --- | ---: | --- |
| quoted_double | dropped | 17: docx, odt, epub, html, latex, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot | quote kind and quoted span on an inline node |
| quoted_single | dropped | 17: docx, odt, epub, html, latex, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot | quote kind and quoted span on an inline node |
| ol_example | dropped | 2: typst, asciidoc | ordered-list Example style on list.marker |

## Reproduce

`npm run build && node scripts/roundtrip-formats.mjs && node scripts/report-roundtrip-0.2.mjs` with Pandoc 3.14 on PATH. The fidelity pairs and their image resource were copied from `pandoc-format-fidelity/results/probes.json` and `fixtures/i.png` at commit `480beefd3e9a6227e8564dd8bfebf7528b659df8`; see that project’s README and `src/probes.py`, `src/run_matrix.py`, and `src/run_roundtrip.py` for the pair method.
