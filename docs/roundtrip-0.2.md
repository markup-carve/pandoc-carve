# Carve 0.2 format round trips

pandoc 3.14. 99 Carve probes × 17 readable formats; 66 Pandoc rich/degraded pairs in the reverse direction.

## Verdict ladder

The first true rung wins: **exact** uses the engine’s `treesEqual`; **same-meaning** applies only the source/provenance rules below; **same-rendering** compares vendored HTML after collapsing whitespace between tags and dropping generated heading IDs; **same-text** compares plain text block by block; **lossy-by-nature** retains readable words and critical content facts while the target loses a source role or attribute; **lossy** loses words or critical content; **error** records the failing stage.

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

| Format | Exact | Same meaning | Same rendering | Same text | Lossy by nature | Lossy | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| docx | 26 | 7 | 6 | 31 | 8 | 21 | 0 |
| odt | 18 | 8 | 4 | 38 | 12 | 19 | 0 |
| epub | 58 | 4 | 4 | 12 | 10 | 11 | 0 |
| html | 75 | 4 | 3 | 4 | 6 | 7 | 0 |
| latex | 21 | 4 | 5 | 40 | 14 | 15 | 0 |
| typst | 20 | 8 | 5 | 38 | 15 | 13 | 0 |
| jats | 17 | 5 | 6 | 41 | 10 | 20 | 0 |
| docbook | 25 | 8 | 5 | 38 | 13 | 10 | 0 |
| rst | 29 | 5 | 7 | 36 | 11 | 11 | 0 |
| org | 31 | 8 | 5 | 32 | 13 | 10 | 0 |
| asciidoc | 23 | 6 | 5 | 37 | 15 | 13 | 0 |
| mediawiki | 22 | 6 | 6 | 10 | 40 | 15 | 0 |
| ipynb | 18 | 5 | 6 | 18 | 32 | 20 | 0 |
| markdown | 73 | 0 | 0 | 8 | 7 | 11 | 0 |
| gfm | 20 | 3 | 5 | 9 | 40 | 22 | 0 |
| commonmark_x | 64 | 0 | 1 | 6 | 5 | 23 | 0 |
| djot | 72 | 2 | 3 | 13 | 8 | 1 | 0 |

## Carve-to-format grid

E = exact; M = same meaning; R = same rendering; T = same text; N = lossy by nature; L = lossy; ! = error. First differing block, degraded feature names, attribution, and Pandoc snapshots are in [the data](roundtrip-0.2-data.json).

| Probe | docx | odt | epub | html | latex | typst | jats | docbook | rst | org | asciidoc | mediawiki | ipynb | markdown | gfm | commonmark_x | djot |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| [abbreviation](../test/fixtures/probes-0.2/abbreviation.crv) | N | N | R | R | N | N | N | N | N | N | T | N | N | E | N | L | E |
| [admonition](../test/fixtures/probes-0.2/admonition.crv) | T | T | E | E | T | T | T | T | T | N | T | N | T | E | N | E | E |
| [admonition_label](../test/fixtures/probes-0.2/admonition_label.crv) | N | N | E | E | N | N | N | N | N | N | N | N | N | E | N | E | E |
| [admonition_title](../test/fixtures/probes-0.2/admonition_title.crv) | T | T | E | E | T | T | T | T | T | L | T | L | T | E | L | L | E |
| [autolink](../test/fixtures/probes-0.2/autolink.crv) | M | M | E | E | T | M | L | M | M | M | M | M | L | E | L | E | T |
| [autolink_attrs](../test/fixtures/probes-0.2/autolink_attrs.crv) | T | T | E | E | T | T | L | T | T | T | T | T | L | E | L | E | T |
| [block_quote](../test/fixtures/probes-0.2/block_quote.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [block_quote_attrs](../test/fixtures/probes-0.2/block_quote_attrs.crv) | T | T | T | E | N | N | T | T | T | N | T | N | T | E | N | E | E |
| [block_quote_caption](../test/fixtures/probes-0.2/block_quote_caption.crv) | L | N | E | E | E | E | E | E | L | L | L | L | N | N | N | N | N |
| [code_block](../test/fixtures/probes-0.2/code_block.crv) | L | L | L | L | L | L | L | L | L | E | E | L | L | L | L | L | E |
| [code_block_attrs](../test/fixtures/probes-0.2/code_block_attrs.crv) | L | L | L | L | L | L | L | L | L | T | L | L | L | L | L | L | E |
| [code_block_caption](../test/fixtures/probes-0.2/code_block_caption.crv) | L | L | L | L | L | L | L | L | L | T | L | L | L | L | L | L | N |
| [code_block_language](../test/fixtures/probes-0.2/code_block_language.crv) | L | L | L | L | L | L | L | L | L | T | L | L | L | L | L | L | E |
| [code_block_title](../test/fixtures/probes-0.2/code_block_title.crv) | L | L | L | L | L | L | L | L | L | T | L | L | L | L | L | L | E |
| [code_inline](../test/fixtures/probes-0.2/code_inline.crv) | E | E | E | E | L | E | E | E | E | E | L | E | E | E | E | E | E |
| [code_inline_attrs](../test/fixtures/probes-0.2/code_inline_attrs.crv) | T | T | T | T | L | T | T | T | T | T | T | T | T | E | T | E | E |
| [comment_block](../test/fixtures/probes-0.2/comment_block.crv) | M | M | M | M | M | M | M | M | E | M | M | M | M | E | M | L | M |
| [comment_braced](../test/fixtures/probes-0.2/comment_braced.crv) | N | N | N | N | N | N | N | N | N | N | N | N | N | E | N | L | E |
| [comment_line](../test/fixtures/probes-0.2/comment_line.crv) | M | M | M | M | M | M | M | M | E | M | M | M | M | E | M | L | M |
| [deletion](../test/fixtures/probes-0.2/deletion.crv) | T | T | E | E | T | T | T | T | T | T | E | N | N | E | N | E | E |
| [description_list](../test/fixtures/probes-0.2/description_list.crv) | E | N | E | E | E | E | E | E | E | E | E | E | N | E | N | E | E |
| [description_multiple](../test/fixtures/probes-0.2/description_multiple.crv) | T | N | E | E | T | T | T | T | T | T | N | E | N | E | N | E | T |
| [directive](../test/fixtures/probes-0.2/directive.crv) | T | T | E | E | T | T | T | T | T | T | T | N | T | E | N | E | E |
| [div](../test/fixtures/probes-0.2/div.crv) | T | T | E | E | T | T | T | T | T | T | T | N | T | E | N | E | E |
| [div_attrs](../test/fixtures/probes-0.2/div_attrs.crv) | T | T | T | E | N | N | T | T | T | N | T | N | T | E | N | E | E |
| [div_title](../test/fixtures/probes-0.2/div_title.crv) | T | T | E | E | T | T | T | T | T | T | T | L | T | E | L | L | E |
| [editorial_comment](../test/fixtures/probes-0.2/editorial_comment.crv) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | L | E |
| [emphasis](../test/fixtures/probes-0.2/emphasis.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [emphasis_attrs](../test/fixtures/probes-0.2/emphasis_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | N | N | E | N | E | E |
| [figure_caption](../test/fixtures/probes-0.2/figure_caption.crv) | L | L | L | E | E | T | E | E | L | L | L | L | L | L | L | L | N |
| [figure_group](../test/fixtures/probes-0.2/figure_group.crv) | L | L | L | E | R | N | L | N | L | L | L | L | L | L | L | L | L |
| [footnote](../test/fixtures/probes-0.2/footnote.crv) | R | R | N | N | N | R | L | R | R | R | N | N | N | E | N | L | E |
| [frontmatter](../test/fixtures/probes-0.2/frontmatter.crv) | R | R | R | R | R | R | R | R | R | R | R | R | R | L | R | L | E |
| [hard_break](../test/fixtures/probes-0.2/hard_break.crv) | E | E | E | E | E | E | N | N | N | E | E | E | E | E | E | E | E |
| [heading](../test/fixtures/probes-0.2/heading.crv) | R | T | E | E | M | M | M | M | M | E | M | R | R | E | R | E | T |
| [heading_attrs](../test/fixtures/probes-0.2/heading_attrs.crv) | T | T | T | E | T | T | T | T | T | E | T | N | T | E | T | E | T |
| [heading_authored_id](../test/fixtures/probes-0.2/heading_authored_id.crv) | T | T | T | E | E | E | E | E | E | E | E | N | T | E | T | E | T |
| [heading_level_6](../test/fixtures/probes-0.2/heading_level_6.crv) | R | T | T | E | T | M | T | T | T | T | N | N | R | E | R | E | T |
| [highlight](../test/fixtures/probes-0.2/highlight.crv) | E | T | E | E | E | E | T | T | E | T | E | N | N | E | N | E | E |
| [image](../test/fixtures/probes-0.2/image.crv) | L | L | L | E | T | T | T | T | T | L | T | L | L | N | N | E | E |
| [image_attrs](../test/fixtures/probes-0.2/image_attrs.crv) | L | L | L | E | T | T | T | T | T | L | T | L | L | N | L | E | E |
| [image_reference](../test/fixtures/probes-0.2/image_reference.crv) | L | L | L | N | N | N | N | N | N | L | N | L | L | N | L | L | E |
| [image_title](../test/fixtures/probes-0.2/image_title.crv) | L | L | L | E | T | T | T | T | T | L | T | L | L | N | N | E | R |
| [inline_footnote](../test/fixtures/probes-0.2/inline_footnote.crv) | E | E | E | E | E | E | L | E | E | E | E | N | N | E | E | E | E |
| [inline_footnote_attrs](../test/fixtures/probes-0.2/inline_footnote_attrs.crv) | T | T | E | E | T | T | L | T | T | T | T | N | N | E | N | E | E |
| [insertion](../test/fixtures/probes-0.2/insertion.crv) | T | T | E | E | T | T | T | T | T | T | E | N | N | E | N | E | E |
| [line_block](../test/fixtures/probes-0.2/line_block.crv) | N | N | R | E | N | N | N | N | E | E | N | N | N | E | N | N | N |
| [link](../test/fixtures/probes-0.2/link.crv) | E | E | E | E | E | E | L | E | E | E | E | E | E | E | E | E | E |
| [link_attrs](../test/fixtures/probes-0.2/link_attrs.crv) | T | T | T | E | T | T | L | T | T | T | T | T | L | E | L | E | E |
| [link_reference](../test/fixtures/probes-0.2/link_reference.crv) | N | N | N | N | N | N | L | N | N | N | N | N | L | E | L | L | E |
| [link_reference_collapsed](../test/fixtures/probes-0.2/link_reference_collapsed.crv) | M | M | N | N | M | M | L | M | R | M | M | M | L | E | L | L | E |
| [link_title](../test/fixtures/probes-0.2/link_title.crv) | E | T | E | E | T | T | L | T | T | T | T | T | E | E | E | E | R |
| [list_bullet_dash](../test/fixtures/probes-0.2/list_bullet_dash.crv) | E | E | E | E | T | T | T | E | E | E | T | E | E | E | E | E | E |
| [list_bullet_star](../test/fixtures/probes-0.2/list_bullet_star.crv) | M | M | E | E | T | T | T | M | T | M | T | N | M | E | N | E | E |
| [list_loose](../test/fixtures/probes-0.2/list_loose.crv) | E | T | E | E | E | E | E | E | T | E | E | T | E | E | E | E | E |
| [list_nested](../test/fixtures/probes-0.2/list_nested.crv) | E | T | E | E | T | T | T | E | E | E | T | E | E | E | E | E | E |
| [list_ordered_alpha](../test/fixtures/probes-0.2/list_ordered_alpha.crv) | E | E | M | M | T | T | T | M | E | T | T | T | T | E | T | E | E |
| [list_ordered_decimal](../test/fixtures/probes-0.2/list_ordered_decimal.crv) | E | E | E | E | T | T | T | E | E | E | T | E | E | E | E | E | E |
| [list_ordered_roman](../test/fixtures/probes-0.2/list_ordered_roman.crv) | E | E | E | E | T | T | T | E | E | T | T | T | T | E | T | E | E |
| [list_ordered_start](../test/fixtures/probes-0.2/list_ordered_start.crv) | E | T | E | E | T | T | T | E | E | E | T | E | T | E | E | E | E |
| [literal_inline](../test/fixtures/probes-0.2/literal_inline.crv) | R | R | E | E | T | R | R | R | R | R | L | N | N | E | N | N | E |
| [math_attrs](../test/fixtures/probes-0.2/math_attrs.crv) | L | L | E | E | T | L | T | L | T | T | T | N | N | E | N | E | E |
| [math_caption](../test/fixtures/probes-0.2/math_caption.crv) | L | L | E | E | R | L | R | L | L | L | L | L | L | L | L | L | N |
| [math_display](../test/fixtures/probes-0.2/math_display.crv) | L | L | E | E | R | L | R | L | T | R | L | N | R | E | N | E | E |
| [math_inline](../test/fixtures/probes-0.2/math_inline.crv) | L | L | E | E | E | L | E | L | E | E | E | E | E | E | E | E | E |
| [mention](../test/fixtures/probes-0.2/mention.crv) | N | N | E | E | N | N | N | N | N | N | T | N | N | E | N | E | E |
| [non_breaking_space](../test/fixtures/probes-0.2/non_breaking_space.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [paragraph](../test/fixtures/probes-0.2/paragraph.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [paragraph_attrs](../test/fixtures/probes-0.2/paragraph_attrs.crv) | T | T | T | E | N | N | T | T | T | N | T | N | T | E | N | E | E |
| [raw_block](../test/fixtures/probes-0.2/raw_block.crv) | L | L | N | L | L | L | L | L | N | E | L | N | N | N | L | N | E |
| [raw_inline](../test/fixtures/probes-0.2/raw_inline.crv) | L | L | N | L | L | L | L | N | L | L | L | R | R | E | R | E | E |
| [replacement](../test/fixtures/probes-0.2/replacement.crv) | T | T | E | E | T | T | T | T | T | T | E | N | N | E | N | E | E |
| [smart_dash](../test/fixtures/probes-0.2/smart_dash.crv) | M | M | E | E | T | M | M | M | M | M | N | N | N | E | N | E | E |
| [smart_quotes](../test/fixtures/probes-0.2/smart_quotes.crv) | M | M | M | M | E | M | M | E | M | M | E | M | M | E | M | E | E |
| [soft_break](../test/fixtures/probes-0.2/soft_break.crv) | T | T | T | E | E | E | E | T | E | E | E | E | E | E | E | E | E |
| [span_attrs](../test/fixtures/probes-0.2/span_attrs.crv) | T | T | T | T | T | N | T | T | T | T | T | N | N | E | N | E | E |
| [strike](../test/fixtures/probes-0.2/strike.crv) | E | E | E | E | E | E | E | E | N | E | T | N | E | E | E | E | T |
| [strong](../test/fixtures/probes-0.2/strong.crv) | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| [strong_attrs](../test/fixtures/probes-0.2/strong_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | N | N | E | N | E | E |
| [subscript](../test/fixtures/probes-0.2/subscript.crv) | E | E | E | E | E | E | E | E | E | E | E | E | N | E | N | E | E |
| [superscript](../test/fixtures/probes-0.2/superscript.crv) | E | E | E | E | E | E | E | E | E | E | E | E | N | E | N | E | E |
| [symbol](../test/fixtures/probes-0.2/symbol.crv) | R | R | T | T | N | R | R | R | R | R | T | N | N | E | N | E | E |
| [table_alignment](../test/fixtures/probes-0.2/table_alignment.crv) | T | T | R | R | T | T | T | T | T | T | R | R | R | T | R | R | R |
| [table_attrs](../test/fixtures/probes-0.2/table_attrs.crv) | T | T | E | E | L | N | T | T | T | T | T | T | T | T | T | T | E |
| [table_body_partition](../test/fixtures/probes-0.2/table_body_partition.crv) | T | M | E | E | T | T | T | T | M | M | M | M | M | T | L | L | T |
| [table_caption](../test/fixtures/probes-0.2/table_caption.crv) | T | T | E | E | L | T | T | T | E | N | E | E | N | T | N | N | E |
| [table_cell_attrs](../test/fixtures/probes-0.2/table_cell_attrs.crv) | T | T | E | E | T | T | T | T | T | T | T | E | T | T | T | T | T |
| [table_colspan](../test/fixtures/probes-0.2/table_colspan.crv) | L | L | E | E | L | L | L | T | R | T | R | R | L | L | L | L | N |
| [table_column_width](../test/fixtures/probes-0.2/table_column_width.crv) | T | T | E | E | L | T | T | T | T | T | T | T | T | T | T | T | T |
| [table_footer](../test/fixtures/probes-0.2/table_footer.crv) | T | T | E | E | L | T | T | T | T | T | T | T | T | T | T | T | T |
| [table_rowspan](../test/fixtures/probes-0.2/table_rowspan.crv) | L | L | E | E | L | L | L | T | L | T | R | R | L | L | L | L | N |
| [table_simple](../test/fixtures/probes-0.2/table_simple.crv) | T | T | E | E | T | T | T | T | E | E | E | E | E | T | E | E | E |
| [tag](../test/fixtures/probes-0.2/tag.crv) | N | N | T | T | N | N | N | N | N | N | N | N | N | E | N | E | E |
| [task_done](../test/fixtures/probes-0.2/task_done.crv) | E | E | N | E | T | T | T | E | E | E | N | N | N | E | N | E | E |
| [task_mixed](../test/fixtures/probes-0.2/task_mixed.crv) | E | E | N | E | T | T | T | E | E | E | N | N | N | E | N | T | E |
| [task_other](../test/fixtures/probes-0.2/task_other.crv) | T | T | N | E | T | T | T | T | T | T | N | N | N | E | N | E | E |
| [thematic_break](../test/fixtures/probes-0.2/thematic_break.crv) | E | T | E | E | T | E | N | N | E | E | N | E | E | E | E | E | E |
| [underline](../test/fixtures/probes-0.2/underline.crv) | E | T | E | E | E | E | E | E | T | E | T | N | N | E | N | T | T |
| [xref](../test/fixtures/probes-0.2/xref.crv) | L | N | E | E | R | R | R | R | R | N | R | N | L | E | L | E | N |

## Real losses

Each row is a plain lossy cell. The cause is classified from the first differing block, visible words, and critical link, image, table-cell, math, code, and format-matched raw facts.

| Probe | Format | Cause |
| --- | --- | --- |
| abbreviation | commonmark_x | code changed |
| admonition_title | org | words changed: Hint → Tip |
| admonition_title | mediawiki | words changed: Hint → <div class="carve-admonition tip" data-carve-title="[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Hint&quot;}]"> |
| admonition_title | gfm | words changed: Hint → <div class="carve-admonition tip" data-carve-title="[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Hint&quot;}]">
 |
| admonition_title | commonmark_x | words changed: Hint → ::: {.carve-admonition .tip carve-title=“[{"type":"text","value":"Hint"}]”} Hint |
| autolink | jats | link changed |
| autolink | ipynb | link changed |
| autolink | gfm | link changed |
| autolink_attrs | jats | link changed |
| autolink_attrs | ipynb | link changed |
| autolink_attrs | gfm | link changed |
| block_quote_caption | docx | cell changed |
| block_quote_caption | rst | words changed: Quote: A saying → quoted text |
| block_quote_caption | org | words changed: Quote: A saying → #+caption: Quote: A saying |
| block_quote_caption | asciidoc | words changed: Quote: A saying → quoted text |
| block_quote_caption | mediawiki | words changed: Quote: A saying → <div class="figure" data-carve-caption="{&quot;type&quot;:&quot;caption&quot;,&quot;children&quot;:[{&quot;type&quot;:&quot;paragraph&quot;,&quot;children&quot;:[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Quote: A saying&quot;}]}]}"> |
| code_block | docx | code changed |
| code_block | odt | code changed |
| code_block | epub | code changed |
| code_block | html | code changed |
| code_block | latex | code changed |
| code_block | typst | code changed |
| code_block | jats | code changed |
| code_block | docbook | code changed |
| code_block | rst | code changed |
| code_block | mediawiki | code changed |
| code_block | ipynb | code changed |
| code_block | markdown | code changed |
| code_block | gfm | code changed |
| code_block | commonmark_x | code changed |
| code_block_attrs | docx | code changed |
| code_block_attrs | odt | code changed |
| code_block_attrs | epub | code changed |
| code_block_attrs | html | code changed |
| code_block_attrs | latex | code changed |
| code_block_attrs | typst | code changed |
| code_block_attrs | jats | code changed |
| code_block_attrs | docbook | code changed |
| code_block_attrs | rst | code changed |
| code_block_attrs | asciidoc | code changed |
| code_block_attrs | mediawiki | code changed |
| code_block_attrs | ipynb | code changed |
| code_block_attrs | markdown | code changed |
| code_block_attrs | gfm | code changed |
| code_block_attrs | commonmark_x | code changed |
| code_block_caption | docx | cell, code changed |
| code_block_caption | odt | code changed |
| code_block_caption | epub | code changed |
| code_block_caption | html | code changed |
| code_block_caption | latex | code changed |
| code_block_caption | typst | code changed |
| code_block_caption | jats | code changed |
| code_block_caption | docbook | code changed |
| code_block_caption | rst | code changed |
| code_block_caption | asciidoc | code changed |
| code_block_caption | mediawiki | code changed |
| code_block_caption | ipynb | code changed |
| code_block_caption | markdown | code changed |
| code_block_caption | gfm | code changed |
| code_block_caption | commonmark_x | code changed |
| code_block_language | docx | code changed |
| code_block_language | odt | code changed |
| code_block_language | epub | code changed |
| code_block_language | html | code changed |
| code_block_language | latex | code changed |
| code_block_language | typst | code changed |
| code_block_language | jats | code changed |
| code_block_language | docbook | code changed |
| code_block_language | rst | code changed |
| code_block_language | asciidoc | code changed |
| code_block_language | mediawiki | code changed |
| code_block_language | ipynb | code changed |
| code_block_language | markdown | code changed |
| code_block_language | gfm | code changed |
| code_block_language | commonmark_x | code changed |
| code_block_title | docx | code changed |
| code_block_title | odt | code changed |
| code_block_title | epub | code changed |
| code_block_title | html | code changed |
| code_block_title | latex | code changed |
| code_block_title | typst | code changed |
| code_block_title | jats | code changed |
| code_block_title | docbook | code changed |
| code_block_title | rst | code changed |
| code_block_title | asciidoc | code changed |
| code_block_title | mediawiki | code changed |
| code_block_title | ipynb | code changed |
| code_block_title | markdown | code changed |
| code_block_title | gfm | code changed |
| code_block_title | commonmark_x | code changed |
| code_inline | latex | code changed |
| code_inline | asciidoc | code changed |
| code_inline_attrs | latex | code changed |
| comment_block | commonmark_x | code changed |
| comment_braced | commonmark_x | code changed |
| comment_line | commonmark_x | code changed |
| div_title | mediawiki | words changed: Box title → <div class="custom" data-carve-title="[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Box title&quot;}]"> |
| div_title | gfm | words changed: Box title → <div class="custom" data-carve-title="[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Box title&quot;}]">
 |
| div_title | commonmark_x | words changed: Box title → ::: {.custom carve-title=“[{"type":"text","value":"Box title"}]”} Box title |
| editorial_comment | commonmark_x | code changed |
| figure_caption | docx | image, cell changed |
| figure_caption | odt | image changed |
| figure_caption | epub | image changed |
| figure_caption | rst | words changed: Figure: An image → Alt |
| figure_caption | org | image changed |
| figure_caption | asciidoc | words changed: Figure: An image → Alt |
| figure_caption | mediawiki | image changed |
| figure_caption | ipynb | image changed |
| figure_caption | markdown | image changed |
| figure_caption | gfm | image changed |
| figure_caption | commonmark_x | image changed |
| figure_group | docx | image, cell changed |
| figure_group | odt | image changed |
| figure_group | epub | image changed |
| figure_group | jats | words changed: Figure : Both → Figure 1: Both |
| figure_group | rst | words changed: Figure : Both → a |
| figure_group | org | image changed |
| figure_group | asciidoc | words changed: Figure : Both → a |
| figure_group | mediawiki | image changed |
| figure_group | ipynb | image changed |
| figure_group | markdown | image changed |
| figure_group | gfm | image changed |
| figure_group | commonmark_x | image changed |
| figure_group | djot | words changed: (a) First → a |
| footnote | jats | link changed |
| footnote | commonmark_x | code changed |
| frontmatter | markdown | code changed |
| frontmatter | commonmark_x | code changed |
| image | docx | image changed |
| image | odt | image changed |
| image | epub | image changed |
| image | org | image changed |
| image | mediawiki | image changed |
| image | ipynb | image changed |
| image_attrs | docx | image changed |
| image_attrs | odt | image changed |
| image_attrs | epub | image changed |
| image_attrs | org | image changed |
| image_attrs | mediawiki | image changed |
| image_attrs | ipynb | image changed |
| image_attrs | gfm | image changed |
| image_reference | docx | image changed |
| image_reference | odt | image changed |
| image_reference | epub | image changed |
| image_reference | org | image changed |
| image_reference | mediawiki | image changed |
| image_reference | ipynb | image changed |
| image_reference | gfm | image changed |
| image_reference | commonmark_x | code changed |
| image_title | docx | image changed |
| image_title | odt | image changed |
| image_title | epub | image changed |
| image_title | org | image changed |
| image_title | mediawiki | image changed |
| image_title | ipynb | image changed |
| inline_footnote | jats | link changed |
| inline_footnote_attrs | jats | link changed |
| link | jats | link changed |
| link_attrs | jats | link changed |
| link_attrs | ipynb | link changed |
| link_attrs | gfm | link changed |
| link_reference | jats | link changed |
| link_reference | ipynb | link changed |
| link_reference | gfm | link changed |
| link_reference | commonmark_x | code changed |
| link_reference_collapsed | jats | link changed |
| link_reference_collapsed | ipynb | link changed |
| link_reference_collapsed | gfm | link changed |
| link_reference_collapsed | commonmark_x | code changed |
| link_title | jats | link changed |
| literal_inline | asciidoc | words changed: literal text →  |
| math_attrs | docx | math changed |
| math_attrs | odt | math changed |
| math_attrs | typst | math changed |
| math_attrs | docbook | math changed |
| math_caption | docx | cell, math changed |
| math_caption | odt | math changed |
| math_caption | typst | math changed |
| math_caption | docbook | math changed |
| math_caption | rst | words changed: Equation: Square → x^2 |
| math_caption | org | words changed: Equation: Square → #+caption: Equation: Square |
| math_caption | asciidoc | math changed |
| math_caption | mediawiki | words changed: Equation: Square → <div class="figure" data-carve-caption="{&quot;type&quot;:&quot;caption&quot;,&quot;children&quot;:[{&quot;type&quot;:&quot;paragraph&quot;,&quot;children&quot;:[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Equation: Square&quot;}]}]}"> |
| math_caption | ipynb | math changed |
| math_caption | markdown | math changed |
| math_caption | gfm | math changed |
| math_caption | commonmark_x | math changed |
| math_display | docx | math changed |
| math_display | odt | math changed |
| math_display | typst | math changed |
| math_display | docbook | math changed |
| math_display | asciidoc | math changed |
| math_inline | docx | math changed |
| math_inline | odt | math changed |
| math_inline | typst | math changed |
| math_inline | docbook | math changed |
| raw_block | docx | words changed: <span>raw</span>
 → nothing |
| raw_block | odt | words changed: <span>raw</span>
 → nothing |
| raw_block | html | raw changed |
| raw_block | latex | words changed: <span>raw</span>
 → nothing |
| raw_block | typst | words changed: <span>raw</span>
 → nothing |
| raw_block | jats | words changed: <span>raw</span>
 → nothing |
| raw_block | docbook | words changed: <span>raw</span>
 → nothing |
| raw_block | asciidoc | words changed: <span>raw</span>
 → nothing |
| raw_block | gfm | raw changed |
| raw_inline | docx | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | odt | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | html | raw changed |
| raw_inline | latex | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | typst | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | jats | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | rst | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | org | words changed: Raw <b>bold</b>. → Raw . |
| raw_inline | asciidoc | words changed: Raw <b>bold</b>. → Raw . |
| table_attrs | latex | cell changed |
| table_body_partition | gfm | cell changed |
| table_body_partition | commonmark_x | cell changed |
| table_caption | latex | cell changed |
| table_colspan | docx | cell changed |
| table_colspan | odt | cell changed |
| table_colspan | latex | cell changed |
| table_colspan | typst | cell changed |
| table_colspan | jats | cell changed |
| table_colspan | ipynb | cell changed |
| table_colspan | markdown | cell changed |
| table_colspan | gfm | cell changed |
| table_colspan | commonmark_x | cell changed |
| table_column_width | latex | cell changed |
| table_footer | latex | cell changed |
| table_rowspan | docx | cell changed |
| table_rowspan | odt | cell changed |
| table_rowspan | latex | cell changed |
| table_rowspan | typst | cell changed |
| table_rowspan | jats | cell changed |
| table_rowspan | rst | cell changed |
| table_rowspan | ipynb | cell changed |
| table_rowspan | markdown | cell changed |
| table_rowspan | gfm | cell changed |
| table_rowspan | commonmark_x | cell changed |
| xref | docx | link changed |
| xref | ipynb | link changed |
| xref | gfm | link changed |

## Features in Carve sources

For each feature, the table lists the *worst* rung among probes whose source tree contains that feature. A format appears under the best rung it guarantees across those probes. Lossy formats are omitted; this is deliberately stricter than finding one successful example.

| Feature | Exact | Same meaning | Same rendering | Same text |
| --- | --- | --- | --- | --- |
| inline role (28 probes) | — | — | — | — |
| attribute (19 probes) | — | — | — | djot |
| table structure (10 probes) | — | — | epub, html | docbook, asciidoc, mediawiki |
| table alignment (1 probe) | epub, html | — | — | docx, odt, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot |
| caption (6 probes) | — | — | — | — |
| footnote (3 probes) | markdown, djot | — | — | docx, odt, typst, docbook, rst, org |
| math (4 probes) | epub, html | — | — | latex, jats |
| code language (5 probes) | — | — | — | org |
| raw content (2 probes) | djot | — | — | — |
| link target (8 probes) | markdown | — | — | — |
| image (6 probes) | — | — | — | — |
| list structure (11 probes) | markdown, djot | html | — | docx, odt, latex, typst, jats, docbook, rst, org, commonmark_x |
| task state (3 probes) | html, markdown, djot | — | — | docx, odt, latex, typst, jats, docbook, rst, org, commonmark_x |
| container role (14 probes) | — | — | — | — |
| heading level or id (5 probes) | html, markdown, commonmark_x | — | — | epub, latex, typst, jats, docbook, rst |
| frontmatter (1 probe) | djot | — | docx, odt, epub, html, latex, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, gfm | — |
| comment (4 probes) | — | djot | — | — |

## Attribution

The data records bridge on export, Pandoc writer, Pandoc reader, bridge on import, or tree comparison for every nonexact cell. For text formats, the original and observed degraded tree are both written with the same Pandoc options; identical output supports writer loss, different output supports reader loss. For binary formats, the writer/reader split remains undetermined. This differential is evidence about the observed degradation, not a claim that every intermediate difference has one cause.

## Pandoc-to-Carve result

Direct means Pandoc JSON → validated Carve tree → Pandoc JSON. **typed** requires the pair’s distinction in a typed tree field/node and the rich Pandoc AST to come back; **data** means it comes back solely through opaque data or a marker attribute; **dropped** means it does not come back; **refused** means the bridge or validator rejected it. Format cells compare real-file rich and degraded imports: **S** = same tree as direct rich import, **K** = distinction survives in a changed tree, **L** = distinction lost in the tree, **!** = error. A trailing **+** means Pandoc’s reader still distinguishes rich from degraded; **−** means the format erased that distinction. Thus S+ beside a dropped direct result means the format carries the feature but the tree already lacks it.

| Pandoc probe | Direct | docx | odt | epub | html | latex | typst | jats | docbook | rst | org | asciidoc | mediawiki | ipynb | markdown | gfm | commonmark_x | djot |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| emph | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| strong | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| underline | typed | S+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ |
| strikeout | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ | K+ |
| superscript | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ |
| subscript | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ |
| smallcaps | typed | S+ | L− | K+ | S+ | S+ | S+ | S+ | K+ | L− | L− | K+ | L− | K+ | S+ | K+ | K+ | K+ |
| quoted_double | typed | K+ | K+ | K+ | K+ | S+ | K+ | K+ | S+ | K+ | K+ | S+ | K+ | K+ | S+ | K+ | S+ | S+ |
| quoted_single | typed | K+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | K+ | S+ | K+ | K+ | S+ | K+ | S+ | S+ |
| code_inline | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| code_inline_attrs | typed | L− | L− | K+ | K+ | K+ | L− | K+ | L− | L− | L− | L− | L− | L− | S+ | L− | S+ | S+ |
| math_inline | typed | K+ | K+ | K+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| math_display | typed | K+ | L− | K+ | S+ | S+ | K+ | S+ | L− | S+ | S+ | K+ | L− | S+ | S+ | S+ | S+ | S+ |
| rawinline_html | typed | L− | L− | K+ | K+ | L− | L− | L− | K+ | L− | L− | L− | K+ | K+ | S+ | K+ | S+ | S+ |
| rawinline_tex | typed | L− | L− | L− | L− | K+ | L− | L− | L− | K+ | S+ | L− | L− | L− | S+ | L− | S+ | S+ |
| linebreak | typed | S+ | S+ | K+ | S+ | S+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| softbreak | typed | L− | L− | L− | S+ | S+ | S+ | S+ | L− | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| span_attrs | typed | L− | K+ | K+ | S+ | K+ | K+ | L− | K+ | L− | L− | K+ | K+ | K+ | S+ | K+ | S+ | S+ |
| note | typed | S+ | S+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ |
| cite | typed | L− | L− | K+ | K+ | L− | S+ | L− | L− | L− | K+ | L− | L− | L− | S+ | L− | L− | L− |
| link | typed | S+ | S+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| link_title | typed | S+ | L− | K+ | S+ | L− | L− | L− | L− | L− | L− | L− | L− | S+ | S+ | S+ | S+ | K+ |
| link_attrs | typed | L− | L− | K+ | S+ | K+ | L− | K+ | K+ | L− | L− | L− | L− | K+ | S+ | K+ | S+ | S+ |
| image | typed | K+ | K+ | K+ | S+ | S+ | K+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ |
| image_title | typed | K+ | L− | K+ | S+ | L− | L− | S+ | S+ | L− | L− | K+ | L− | K+ | S+ | S+ | S+ | K+ |
| image_size | typed | K+ | L− | K+ | K+ | K+ | K+ | L− | K+ | K+ | L− | K+ | L− | K+ | S+ | K+ | S+ | S+ |
| header | typed | K+ | K+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ |
| header_level | typed | K+ | K+ | K+ | K+ | K+ | S+ | L− | L− | L− | K+ | L− | K+ | K+ | K+ | K+ | K+ | K+ |
| header_attrs | typed | L− | L− | K+ | S+ | L− | L− | L− | L− | L− | S+ | L− | L− | L− | S+ | L− | S+ | K+ |
| blockquote | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ |
| codeblock | typed | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ |
| codeblock_lang | typed | L− | K+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ |
| codeblock_attrs | typed | L− | L− | K+ | K+ | K+ | L− | K+ | L− | L− | K+ | L− | L− | L− | S+ | L− | S+ | K+ |
| rawblock_html | typed | L− | L− | K+ | K+ | L− | L− | L− | L− | S+ | K+ | L− | S+ | S+ | S+ | K+ | K+ | K+ |
| rawblock_tex | typed | L− | L− | L− | L− | L− | L− | L− | L− | S+ | K+ | L− | L− | L− | K+ | L− | K+ | K+ |
| hrule | typed | S+ | K+ | K+ | S+ | K+ | S+ | L− | L− | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| lineblock | typed | K+ | K+ | K+ | S+ | K+ | K+ | L− | S+ | S+ | S+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ |
| div_attrs | typed | L− | K+ | K+ | S+ | K+ | K+ | L− | L− | K+ | K+ | K+ | K+ | L− | S+ | K+ | S+ | S+ |
| bulletlist | typed | S+ | S+ | K+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| orderedlist | typed | S+ | S+ | K+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| ol_start | typed | S+ | L− | K+ | S+ | L− | K+ | L− | S+ | S+ | S+ | K+ | S+ | L− | S+ | S+ | S+ | S+ |
| ol_style_roman | typed | S+ | S+ | K+ | S+ | L− | K+ | K+ | S+ | S+ | L− | K+ | L− | L− | S+ | L− | K+ | S+ |
| ol_style_alpha | typed | S+ | S+ | K+ | S+ | L− | K+ | K+ | S+ | S+ | L− | K+ | L− | L− | S+ | L− | S+ | S+ |
| ol_delim_paren | typed | S+ | S+ | L− | L− | L− | K+ | L− | L− | S+ | L− | L− | L− | L− | S+ | S+ | S+ | S+ |
| ol_example | data (attribute carve-example, attribute carve-example-delimiter) | L− | L− | L− | L− | L− | L+ | L− | L− | L− | L− | L+ | L− | L− | L− | L− | L− | L− |
| list_nested | typed | S+ | K+ | K+ | S+ | K+ | K+ | K+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ |
| list_loose | typed | S+ | L− | K+ | S+ | L− | L− | L− | S+ | L− | S+ | L− | L− | S+ | S+ | S+ | S+ | S+ |
| deflist | typed | S+ | K+ | K+ | S+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | S+ | S+ |
| figure | dropped | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | K+ | K+ | S+ | K+ | K+ | K+ |
| figure_attrs | dropped | L− | L− | K+ | S+ | K+ | K+ | K+ | L− | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ |
| table | typed | K+ | S+ | K+ | S+ | K+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ | K+ | K+ | K+ |
| table_head | typed | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | S+ | S+ | S+ | S+ | S+ | K+ | S+ | S+ | S+ |
| table_caption | dropped | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | S+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | K+ |
| table_foot | typed | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ |
| table_colspan | typed | K+ | S+ | K+ | S+ | K+ | K+ | K+ | L− | S+ | L− | S+ | S+ | K+ | K+ | K+ | K+ | L− |
| table_rowspan | typed | K+ | S+ | K+ | S+ | K+ | K+ | K+ | L− | K+ | L− | S+ | S+ | K+ | K+ | K+ | K+ | L− |
| table_align | typed | K+ | L− | K+ | K+ | S+ | K+ | K+ | S+ | L− | L− | S+ | K+ | S+ | S+ | K+ | K+ | K+ |
| table_colwidth | typed | K+ | L− | K+ | S+ | L− | L− | L− | K+ | S+ | L− | K+ | L− | L− | K+ | L− | L− | L− |
| table_attrs | dropped | L− | L− | K+ | S+ | K+ | K+ | L− | L− | L− | L− | L− | L− | K+ | K+ | K+ | K+ | K+ |
| table_attrs_nocaption | typed | L− | L− | K+ | S+ | K+ | K+ | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | K+ |
| table_cell_attrs | typed | L− | L− | K+ | S+ | L− | L− | L− | L− | L− | L− | L− | S+ | L− | L− | L− | L− | L− |
| table_cell_align | typed | K+ | L− | K+ | K+ | L− | K+ | K+ | L− | L− | L− | S+ | K+ | L− | L− | L− | L− | L− |
| table_row_attrs | typed | L− | L− | K+ | S+ | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− |
| table_block_cell | typed | K+ | S+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | K+ | S+ | S+ | K+ | K+ | K+ | K+ | K+ |
| table_rowheadcols | typed | L− | K+ | K+ | S+ | L− | L− | L− | L− | L− | L− | L− | K+ | L− | L− | L− | L− | L− |
| table_multibody | typed | L− | L− | K+ | S+ | L− | L− | K+ | L− | L− | L− | L− | L− | L− | L− | L− | L− | L− |

## Pandoc features without a typed round trip

Ranked by the number of these formats whose Pandoc writer/reader can carry the rich/degraded distinction. The need names the tree location or standard namespace; it does not imply a specification change is already approved.

| Probe | Direct | Formats carrying it | Need |
| --- | --- | ---: | --- |
| figure | dropped | 17: docx, odt, epub, html, latex, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot | figure field on figure node |
| table_caption | dropped | 17: docx, odt, epub, html, latex, typst, jats, docbook, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot | table row, cell, or section field |
| figure_attrs | dropped | 14: epub, html, latex, typst, jats, rst, org, asciidoc, mediawiki, ipynb, markdown, gfm, commonmark_x, djot | attribute field on the corresponding node |
| table_attrs | dropped | 9: epub, html, latex, typst, ipynb, markdown, gfm, commonmark_x, djot | table row, cell, or section field |
| ol_example | data | 2: typst, asciidoc | ordered-list Example style in a carve-example list marker attribute |

## Reproduce

`npm run build && node scripts/roundtrip-formats.mjs && node scripts/report-roundtrip-0.2.mjs && node scripts/consumer-report-0.2.mjs` with Pandoc 3.14 on PATH. The fidelity pairs and their image resource were copied from `pandoc-format-fidelity/results/probes.json` and `fixtures/i.png` at commit `480beefd3e9a6227e8564dd8bfebf7528b659df8`; see that project’s README and `src/probes.py`, `src/run_matrix.py`, and `src/run_roundtrip.py` for the pair method.
