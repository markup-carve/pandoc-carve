# Carve 0.2 through Pandoc formats

pandoc 3.14; 99 source probes, 17 formats. Every cell runs Carve source → 0.2 tree → Pandoc JSON → writer → reader → Pandoc JSON → 0.2 tree. Equality uses the vendored engine's `treesEqual`. `equivalent` is reserved for documented defaults: ordered start 1, cell span 1, and empty attributes; resolution results are already excluded by `treesEqual`. No cell met the separate equivalent rule in this run.

DOCX, ODT and EPUB use actual files; all other formats use writer stdout. Writers use `--wrap=preserve` and a resource path containing the probe PNGs. EPUB's empty chapter wrapper and notebook's sole cell wrapper are removed before the bridge import; the original reader blocks remain in [the evidence](roundtrip-0.2-data.json). Volatile metadata added by EPUB is listed by key and omitted from the saved JSON. Pandoc has an AsciiDoc reader in this installation. No PDF run was attempted.

## Grid

| Probe | docx | odt | epub | html | latex | typst | jats | docbook | rst | org | asciidoc | mediawiki | ipynb | markdown | gfm | commonmark_x | djot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [abbreviation](../test/fixtures/probes-0.2/abbreviation.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [admonition](../test/fixtures/probes-0.2/admonition.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [admonition_label](../test/fixtures/probes-0.2/admonition_label.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [admonition_title](../test/fixtures/probes-0.2/admonition_title.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [autolink](../test/fixtures/probes-0.2/autolink.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | lossy |
| [autolink_attrs](../test/fixtures/probes-0.2/autolink_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | lossy |
| [block_quote](../test/fixtures/probes-0.2/block_quote.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [block_quote_attrs](../test/fixtures/probes-0.2/block_quote_attrs.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [block_quote_caption](../test/fixtures/probes-0.2/block_quote_caption.crv) | lossy | lossy | exact | exact | exact | exact | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [code_block](../test/fixtures/probes-0.2/code_block.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | exact |
| [code_block_attrs](../test/fixtures/probes-0.2/code_block_attrs.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [code_block_caption](../test/fixtures/probes-0.2/code_block_caption.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [code_block_language](../test/fixtures/probes-0.2/code_block_language.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [code_block_title](../test/fixtures/probes-0.2/code_block_title.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [code_inline](../test/fixtures/probes-0.2/code_inline.crv) | exact | exact | exact | exact | lossy | exact | exact | exact | exact | exact | lossy | exact | exact | exact | exact | exact | exact |
| [code_inline_attrs](../test/fixtures/probes-0.2/code_inline_attrs.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [comment_block](../test/fixtures/probes-0.2/comment_block.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy |
| [comment_braced](../test/fixtures/probes-0.2/comment_braced.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [comment_line](../test/fixtures/probes-0.2/comment_line.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy |
| [deletion](../test/fixtures/probes-0.2/deletion.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact | lossy | exact | exact |
| [description_list](../test/fixtures/probes-0.2/description_list.crv) | exact | lossy | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | lossy | exact | lossy | exact | exact |
| [description_multiple](../test/fixtures/probes-0.2/description_multiple.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | lossy | exact | lossy |
| [directive](../test/fixtures/probes-0.2/directive.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [div](../test/fixtures/probes-0.2/div.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [div_attrs](../test/fixtures/probes-0.2/div_attrs.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [div_title](../test/fixtures/probes-0.2/div_title.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [editorial_comment](../test/fixtures/probes-0.2/editorial_comment.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [emphasis](../test/fixtures/probes-0.2/emphasis.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [emphasis_attrs](../test/fixtures/probes-0.2/emphasis_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [figure_caption](../test/fixtures/probes-0.2/figure_caption.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [figure_group](../test/fixtures/probes-0.2/figure_group.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [footnote](../test/fixtures/probes-0.2/footnote.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [frontmatter](../test/fixtures/probes-0.2/frontmatter.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [hard_break](../test/fixtures/probes-0.2/hard_break.crv) | exact | exact | exact | exact | exact | exact | lossy | lossy | lossy | exact | exact | exact | exact | exact | exact | exact | exact |
| [heading](../test/fixtures/probes-0.2/heading.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | exact | lossy | exact | lossy |
| [heading_attrs](../test/fixtures/probes-0.2/heading_attrs.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | exact | lossy | exact | lossy |
| [heading_authored_id](../test/fixtures/probes-0.2/heading_authored_id.crv) | lossy | lossy | lossy | exact | exact | exact | exact | exact | exact | exact | exact | lossy | lossy | exact | lossy | exact | lossy |
| [heading_level_6](../test/fixtures/probes-0.2/heading_level_6.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | lossy |
| [highlight](../test/fixtures/probes-0.2/highlight.crv) | exact | lossy | exact | exact | exact | exact | lossy | lossy | exact | lossy | exact | lossy | lossy | exact | lossy | exact | exact |
| [image](../test/fixtures/probes-0.2/image.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | exact |
| [image_attrs](../test/fixtures/probes-0.2/image_attrs.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | exact |
| [image_reference](../test/fixtures/probes-0.2/image_reference.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [image_title](../test/fixtures/probes-0.2/image_title.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy |
| [inline_footnote](../test/fixtures/probes-0.2/inline_footnote.crv) | exact | exact | exact | exact | exact | exact | lossy | exact | exact | exact | exact | lossy | lossy | exact | exact | exact | exact |
| [inline_footnote_attrs](../test/fixtures/probes-0.2/inline_footnote_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [insertion](../test/fixtures/probes-0.2/insertion.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact | lossy | exact | exact |
| [line_block](../test/fixtures/probes-0.2/line_block.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | exact | exact | lossy | lossy | lossy | exact | lossy | lossy | lossy |
| [link](../test/fixtures/probes-0.2/link.crv) | exact | exact | exact | exact | exact | exact | lossy | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [link_attrs](../test/fixtures/probes-0.2/link_attrs.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [link_reference](../test/fixtures/probes-0.2/link_reference.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [link_reference_collapsed](../test/fixtures/probes-0.2/link_reference_collapsed.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [link_title](../test/fixtures/probes-0.2/link_title.crv) | exact | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | exact | exact | exact | lossy |
| [list_bullet_dash](../test/fixtures/probes-0.2/list_bullet_dash.crv) | exact | exact | exact | exact | lossy | lossy | lossy | exact | exact | exact | lossy | exact | exact | exact | exact | exact | exact |
| [list_bullet_star](../test/fixtures/probes-0.2/list_bullet_star.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [list_loose](../test/fixtures/probes-0.2/list_loose.crv) | exact | lossy | exact | exact | exact | exact | exact | exact | lossy | exact | exact | lossy | exact | exact | exact | exact | exact |
| [list_nested](../test/fixtures/probes-0.2/list_nested.crv) | exact | lossy | exact | exact | lossy | lossy | lossy | exact | exact | exact | lossy | exact | exact | exact | exact | exact | exact |
| [list_ordered_alpha](../test/fixtures/probes-0.2/list_ordered_alpha.crv) | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [list_ordered_decimal](../test/fixtures/probes-0.2/list_ordered_decimal.crv) | exact | exact | exact | exact | lossy | lossy | lossy | exact | exact | exact | lossy | exact | exact | exact | exact | exact | exact |
| [list_ordered_roman](../test/fixtures/probes-0.2/list_ordered_roman.crv) | exact | exact | exact | exact | lossy | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [list_ordered_start](../test/fixtures/probes-0.2/list_ordered_start.crv) | exact | lossy | exact | exact | lossy | lossy | lossy | exact | exact | exact | lossy | exact | lossy | exact | exact | exact | exact |
| [literal_inline](../test/fixtures/probes-0.2/literal_inline.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [math_attrs](../test/fixtures/probes-0.2/math_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [math_caption](../test/fixtures/probes-0.2/math_caption.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [math_display](../test/fixtures/probes-0.2/math_display.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [math_inline](../test/fixtures/probes-0.2/math_inline.crv) | lossy | lossy | exact | exact | exact | lossy | exact | lossy | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [mention](../test/fixtures/probes-0.2/mention.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [non_breaking_space](../test/fixtures/probes-0.2/non_breaking_space.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [paragraph](../test/fixtures/probes-0.2/paragraph.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [paragraph_attrs](../test/fixtures/probes-0.2/paragraph_attrs.crv) | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [raw_block](../test/fixtures/probes-0.2/raw_block.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [raw_inline](../test/fixtures/probes-0.2/raw_inline.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [replacement](../test/fixtures/probes-0.2/replacement.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact | lossy | exact | exact |
| [smart_dash](../test/fixtures/probes-0.2/smart_dash.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [smart_quotes](../test/fixtures/probes-0.2/smart_quotes.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | exact |
| [soft_break](../test/fixtures/probes-0.2/soft_break.crv) | lossy | lossy | lossy | exact | exact | exact | exact | lossy | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [span_attrs](../test/fixtures/probes-0.2/span_attrs.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [strike](../test/fixtures/probes-0.2/strike.crv) | exact | exact | exact | exact | exact | exact | exact | exact | lossy | exact | lossy | lossy | exact | exact | exact | exact | lossy |
| [strong](../test/fixtures/probes-0.2/strong.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact |
| [strong_attrs](../test/fixtures/probes-0.2/strong_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [subscript](../test/fixtures/probes-0.2/subscript.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | lossy | exact | lossy | exact | exact |
| [superscript](../test/fixtures/probes-0.2/superscript.crv) | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | exact | lossy | exact | lossy | exact | exact |
| [symbol](../test/fixtures/probes-0.2/symbol.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [table_alignment](../test/fixtures/probes-0.2/table_alignment.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [table_attrs](../test/fixtures/probes-0.2/table_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [table_body_partition](../test/fixtures/probes-0.2/table_body_partition.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [table_caption](../test/fixtures/probes-0.2/table_caption.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | exact | lossy | exact | exact | lossy | lossy | lossy | lossy | exact |
| [table_cell_attrs](../test/fixtures/probes-0.2/table_cell_attrs.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | lossy | lossy | lossy | lossy |
| [table_colspan](../test/fixtures/probes-0.2/table_colspan.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [table_column_width](../test/fixtures/probes-0.2/table_column_width.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [table_footer](../test/fixtures/probes-0.2/table_footer.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [table_rowspan](../test/fixtures/probes-0.2/table_rowspan.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy |
| [table_simple](../test/fixtures/probes-0.2/table_simple.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | exact | exact | exact | exact | exact | lossy | exact | exact | exact |
| [tag](../test/fixtures/probes-0.2/tag.crv) | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [task_done](../test/fixtures/probes-0.2/task_done.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [task_mixed](../test/fixtures/probes-0.2/task_mixed.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact |
| [task_other](../test/fixtures/probes-0.2/task_other.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | exact |
| [thematic_break](../test/fixtures/probes-0.2/thematic_break.crv) | exact | lossy | exact | exact | lossy | exact | lossy | lossy | exact | exact | lossy | exact | exact | exact | exact | exact | exact |
| [underline](../test/fixtures/probes-0.2/underline.crv) | exact | lossy | exact | exact | exact | exact | exact | exact | lossy | exact | lossy | lossy | lossy | exact | lossy | lossy | lossy |
| [xref](../test/fixtures/probes-0.2/xref.crv) | lossy | lossy | exact | exact | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | lossy | exact | lossy | exact | lossy |

## Attribution by feature

Each row groups formats with the same first differing tree node and field and the same supported attribution. The before and after Pandoc JSON for every nonexact cell, including the original EPUB/notebook wrappers, are in [the evidence](roundtrip-0.2-data.json). “Not determined” means the JSON snapshots show a change across the format boundary but do not distinguish the writer from the reader. A writer/reader attribution based on a carrier is made only when that carrier is present in the first JSON and absent in the second; the saved writer text distinguishes those steps for text formats.

| Probe | Formats | First differing node.field | Attribution |
| --- | --- | --- | --- |
| abbreviation | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-tree absent after format |
| abbreviation | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-tree absent after format |
| abbreviation | `rst` | abbreviation.type (/children/1/children/0/type) | Not determined: Pandoc writer or reader |
| abbreviation | `commonmark_x` | abbreviation_def.type (/children/0/type) | Not determined: Pandoc writer or reader |
| admonition | `docx`, `odt` | admonition.type (/children/0/type) | not determined: carve-admonition absent after format |
| admonition | `latex`, `typst`, `jats`, `docbook`, `asciidoc`, `ipynb` | admonition.type (/children/0/type) | Pandoc writer: carve-admonition absent after format |
| admonition | `rst` | admonition.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| admonition | `org` | admonition.type (/children/0/type) | Pandoc reader: carve-admonition absent after format |
| admonition | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| admonition_label | `docx`, `odt` | admonition.type (/children/0/type) | not determined: carve-admonition absent after format |
| admonition_label | `latex`, `typst`, `jats`, `docbook`, `asciidoc`, `ipynb` | admonition.type (/children/0/type) | Pandoc writer: carve-admonition absent after format |
| admonition_label | `rst` | admonition.groupLabel (/children/0/groupLabel) | Pandoc writer: carve-group-label absent after format |
| admonition_label | `org` | admonition.type (/children/0/type) | Pandoc reader: carve-admonition absent after format |
| admonition_label | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| admonition_title | `docx`, `odt` | admonition.type (/children/0/type) | not determined: carve-admonition absent after format |
| admonition_title | `latex`, `typst`, `jats`, `docbook`, `asciidoc`, `ipynb` | admonition.type (/children/0/type) | Pandoc writer: carve-admonition absent after format |
| admonition_title | `rst` | admonition.title (/children/0/title) | Pandoc writer: carve-title absent after format |
| admonition_title | `org` | admonition.type (/children/0/type) | Pandoc reader: carve-admonition absent after format |
| admonition_title | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| admonition_title | `commonmark_x` | admonition.type (/children/0/type) | Not determined: Pandoc writer or reader |
| autolink | `docx`, `odt` | autolink.type (/children/0/children/0/type) | not determined: carve-autolink absent after format |
| autolink | `latex`, `typst`, `jats`, `docbook`, `rst`, `org`, `asciidoc`, `mediawiki` | autolink.type (/children/0/children/0/type) | Pandoc writer: carve-autolink absent after format |
| autolink | `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| autolink | `djot` | autolink.attrs (/children/0/children/0/attrs) | Not determined: Pandoc writer or reader |
| autolink_attrs | `docx`, `odt` | autolink.type (/children/0/children/0/type) | not determined: carve-autolink absent after format |
| autolink_attrs | `latex`, `typst`, `jats`, `docbook`, `rst`, `org`, `asciidoc`, `mediawiki` | autolink.type (/children/0/children/0/type) | Pandoc writer: carve-autolink absent after format |
| autolink_attrs | `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| autolink_attrs | `djot` | autolink.length (/children/0/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| block_quote_attrs | `docx` | block_quote.attrs (/children/0/attrs) | not determined: carve-block-quote absent after format |
| block_quote_attrs | `odt` | block_quote.type (/children/0/type) | not determined: carve-block-quote absent after format |
| block_quote_attrs | `epub` | block_quote.id (/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| block_quote_attrs | `latex`, `typst`, `org` | document.length (/children) | Pandoc writer: carve-block-quote absent after format |
| block_quote_attrs | `jats`, `docbook`, `ipynb` | block_quote.attrs (/children/0/attrs) | Pandoc writer: carve-block-quote absent after format |
| block_quote_attrs | `rst` | block_quote.length (/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| block_quote_attrs | `asciidoc` | block_quote.type (/children/0/type) | Pandoc writer: carve-block-quote absent after format |
| block_quote_attrs | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| block_quote_caption | `docx`, `rst`, `asciidoc`, `ipynb`, `gfm`, `commonmark_x`, `djot` | figure.type (/children/0/type) | Not determined: Pandoc writer or reader |
| block_quote_caption | `odt`, `org`, `mediawiki`, `markdown` | document.length (/children) | Not determined: Pandoc writer or reader |
| code_block | `docx`, `odt`, `epub`, `html`, `latex`, `typst`, `jats`, `docbook`, `rst`, `mediawiki`, `ipynb`, `markdown`, `gfm`, `commonmark_x` | code_block.value (/children/0/value) | Not determined: Pandoc writer or reader |
| code_block_attrs | `docx`, `odt`, `typst`, `jats`, `docbook`, `rst`, `asciidoc`, `mediawiki`, `ipynb`, `markdown`, `gfm`, `commonmark_x` | code_block.value (/children/0/value) | Not determined: Pandoc writer or reader |
| code_block_attrs | `epub`, `html` | code_block.type (/children/0/type) | Not determined: Pandoc writer or reader |
| code_block_attrs | `latex` | document.length (/children) | Not determined: Pandoc writer or reader |
| code_block_attrs | `org` | code_block.syntax (/children/0/syntax) | Not determined: Pandoc writer or reader |
| code_block_caption | `docx`, `rst`, `org`, `asciidoc`, `ipynb`, `gfm`, `commonmark_x`, `djot` | figure.type (/children/0/type) | Not determined: Pandoc writer or reader |
| code_block_caption | `odt`, `mediawiki`, `markdown` | document.length (/children) | Not determined: Pandoc writer or reader |
| code_block_caption | `epub`, `html`, `latex` | code_block.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| code_block_caption | `typst`, `jats`, `docbook` | code_block.value (/children/0/children/0/value) | Not determined: Pandoc writer or reader |
| code_block_language | `docx`, `odt`, `typst`, `jats`, `docbook`, `rst`, `asciidoc`, `mediawiki`, `ipynb`, `markdown`, `gfm`, `commonmark_x` | code_block.value (/children/0/value) | Not determined: Pandoc writer or reader |
| code_block_language | `epub`, `html`, `latex` | code_block.type (/children/0/type) | Not determined: Pandoc writer or reader |
| code_block_language | `org` | code_block.syntax (/children/0/syntax) | Not determined: Pandoc writer or reader |
| code_block_title | `docx`, `odt` | code_block.value (/children/0/value) | not determined: carve-title absent after format |
| code_block_title | `epub`, `html` | code_block.type (/children/0/type) | Not determined: Pandoc writer or reader |
| code_block_title | `latex` | code_block.type (/children/0/type) | Pandoc writer: carve-title absent after format |
| code_block_title | `typst`, `jats`, `docbook`, `rst`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | code_block.value (/children/0/value) | Pandoc writer: carve-title absent after format |
| code_block_title | `org` | code_block.syntax (/children/0/syntax) | Not determined: Pandoc writer or reader |
| code_block_title | `markdown` | code_block.value (/children/0/value) | Not determined: Pandoc writer or reader |
| code_block_title | `commonmark_x` | code_block.value (/children/0/value) | Pandoc reader: carve-title absent after format |
| code_inline | `latex` | code.value (/children/0/children/0/value) | Not determined: Pandoc writer or reader |
| code_inline | `asciidoc` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| code_inline_attrs | `docx`, `odt`, `typst`, `docbook`, `rst`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | code.attrs (/children/0/children/0/attrs) | Not determined: Pandoc writer or reader |
| code_inline_attrs | `epub`, `html` | code.length (/children/0/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| code_inline_attrs | `latex` | code.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| code_inline_attrs | `jats`, `org` | code.0 (/children/0/children/0/attrs/classes/0) | Not determined: Pandoc writer or reader |
| comment_block | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-comment absent after format |
| comment_block | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-comment absent after format |
| comment_block | `commonmark_x` | comment.type (/children/0/type) | Not determined: Pandoc writer or reader |
| comment_block | `djot` | comment.value (/children/0/value) | Not determined: Pandoc writer or reader |
| comment_braced | `docx`, `odt`, `epub` | paragraph.length (/children/0/children) | not determined: carve-comment absent after format |
| comment_braced | `html`, `latex`, `typst`, `jats`, `docbook`, `rst`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Pandoc writer: carve-comment absent after format |
| comment_braced | `commonmark_x` | comment.type (/children/0/children/1/type) | Not determined: Pandoc writer or reader |
| comment_line | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-comment absent after format |
| comment_line | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-comment absent after format |
| comment_line | `commonmark_x` | comment.type (/children/0/type) | Not determined: Pandoc writer or reader |
| comment_line | `djot` | comment.value (/children/0/value) | Not determined: Pandoc writer or reader |
| deletion | `docx`, `odt` | delete.type (/children/0/children/0/type) | not determined: carve-delete absent after format |
| deletion | `latex`, `typst`, `docbook`, `rst`, `org` | delete.type (/children/0/children/0/type) | Pandoc writer: carve-delete absent after format |
| deletion | `jats` | delete.type (/children/0/children/0/type) | Pandoc reader: carve-delete absent after format |
| deletion | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| description_list | `odt` | document.length (/children) | Not determined: Pandoc writer or reader |
| description_list | `ipynb`, `gfm` | definition_list.type (/children/0/type) | Not determined: Pandoc writer or reader |
| description_multiple | `docx`, `latex`, `typst`, `jats`, `docbook`, `rst`, `org`, `asciidoc`, `djot` | definition_list.length (/children/0/children) | Not determined: Pandoc writer or reader |
| description_multiple | `odt`, `ipynb`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| directive | `docx`, `odt`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| directive | `rst` | directive.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| div | `docx`, `odt`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `ipynb` | div.type (/children/0/type) | Not determined: Pandoc writer or reader |
| div | `rst` | div.length (/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| div | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| div_attrs | `docx`, `latex`, `jats`, `docbook`, `org`, `ipynb` | div.type (/children/0/type) | Not determined: Pandoc writer or reader |
| div_attrs | `odt` | div.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| div_attrs | `epub` | div.id (/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| div_attrs | `typst`, `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| div_attrs | `rst` | div.length (/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| div_attrs | `asciidoc` | div.classes (/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| div_title | `docx`, `odt` | div.type (/children/0/type) | not determined: carve-title absent after format |
| div_title | `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `ipynb` | div.type (/children/0/type) | Pandoc writer: carve-title absent after format |
| div_title | `rst` | div.title (/children/0/title) | Pandoc writer: carve-title absent after format |
| div_title | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| div_title | `commonmark_x` | div.type (/children/0/type) | Not determined: Pandoc writer or reader |
| editorial_comment | `docx`, `odt`, `epub` | paragraph.length (/children/0/children) | not determined: carve-critic-comment absent after format |
| editorial_comment | `html`, `latex`, `typst`, `jats`, `docbook`, `rst`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Pandoc writer: carve-critic-comment absent after format |
| editorial_comment | `markdown` | critic_comment.value (/children/0/children/1/value) | Not determined: Pandoc writer or reader |
| editorial_comment | `commonmark_x` | critic_comment.type (/children/0/children/1/type) | Not determined: Pandoc writer or reader |
| emphasis_attrs | `docx`, `odt` | emphasis.attrs (/children/0/children/0/attrs) | not determined: carve-inline-attrs absent after format |
| emphasis_attrs | `latex`, `rst` | emphasis.type (/children/0/children/0/type) | Pandoc writer: carve-inline-attrs absent after format |
| emphasis_attrs | `typst`, `docbook`, `org` | emphasis.attrs (/children/0/children/0/attrs) | Pandoc writer: carve-inline-attrs absent after format |
| emphasis_attrs | `jats` | emphasis.attrs (/children/0/children/0/attrs) | Pandoc reader: carve-inline-attrs absent after format |
| emphasis_attrs | `asciidoc` | emphasis.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| emphasis_attrs | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| figure_caption | `docx`, `rst`, `asciidoc`, `ipynb`, `gfm`, `commonmark_x`, `djot` | figure.type (/children/0/type) | Not determined: Pandoc writer or reader |
| figure_caption | `odt`, `org`, `mediawiki`, `markdown` | document.length (/children) | Not determined: Pandoc writer or reader |
| figure_caption | `epub` | image.src (/children/0/children/0/children/0/src) | Not determined: Pandoc writer or reader |
| figure_caption | `latex`, `jats`, `docbook` | paragraph.blockImage (/children/0/children/0/blockImage) | Not determined: Pandoc writer or reader |
| figure_caption | `typst` | image.type (/children/0/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| figure_group | `docx`, `odt`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm`, `commonmark_x` | document.length (/children) | Not determined: Pandoc writer or reader |
| figure_group | `epub` | image.src (/children/0/children/0/children/0/children/0/src) | Not determined: Pandoc writer or reader |
| figure_group | `rst`, `djot` | figure.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| figure_group | `markdown` | figure_group.length (/children/0/children) | Not determined: Pandoc writer or reader |
| footnote | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-tree absent after format |
| footnote | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `gfm` | document.length (/children) | Pandoc writer: carve-tree absent after format |
| footnote | `rst` | footnote_ref.type (/children/1/children/1/type) | Not determined: Pandoc writer or reader |
| footnote | `mediawiki`, `ipynb` | footnote.type (/children/0/type) | Pandoc writer: carve-tree absent after format |
| footnote | `commonmark_x` | footnote.type (/children/0/type) | Not determined: Pandoc writer or reader |
| frontmatter | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-frontmatter absent after format |
| frontmatter | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-frontmatter absent after format |
| frontmatter | `rst` | frontmatter.value (/children/0/value) | Not determined: Pandoc writer or reader |
| frontmatter | `markdown` | document.length (/children) | Not determined: Pandoc writer or reader |
| frontmatter | `commonmark_x` | frontmatter.type (/children/0/type) | Not determined: Pandoc writer or reader |
| hard_break | `jats` | hard_break.type (/children/0/children/1/type) | Not determined: Pandoc writer or reader |
| hard_break | `docbook`, `rst` | paragraph.type (/children/0/type) | Not determined: Pandoc writer or reader |
| heading | `docx` | heading.attrs (/children/0/attrs) | not determined: carve-generated-id absent after format |
| heading | `odt` | heading.length (/children/0/children) | not determined: carve-generated-id absent after format |
| heading | `latex`, `typst`, `jats`, `docbook`, `rst`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | heading.attrs (/children/0/attrs) | Pandoc writer: carve-generated-id absent after format |
| heading | `djot` | heading.type (/children/0/type) | Not determined: Pandoc writer or reader |
| heading_attrs | `docx`, `ipynb`, `gfm` | heading.id (/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| heading_attrs | `odt` | heading.length (/children/0/children) | Not determined: Pandoc writer or reader |
| heading_attrs | `epub`, `djot` | heading.type (/children/0/type) | Not determined: Pandoc writer or reader |
| heading_attrs | `latex`, `typst` | heading.classes (/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| heading_attrs | `jats`, `docbook`, `rst`, `asciidoc` | heading.level (/children/0/level) | Not determined: Pandoc writer or reader |
| heading_attrs | `mediawiki` | document.length (/children) | Not determined: Pandoc writer or reader |
| heading_authored_id | `docx`, `ipynb`, `gfm` | heading.id (/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| heading_authored_id | `odt` | heading.length (/children/0/children) | Not determined: Pandoc writer or reader |
| heading_authored_id | `epub` | heading.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| heading_authored_id | `mediawiki` | document.length (/children) | Not determined: Pandoc writer or reader |
| heading_authored_id | `djot` | heading.type (/children/0/type) | Not determined: Pandoc writer or reader |
| heading_level_6 | `docx` | heading.attrs (/children/0/attrs) | not determined: carve-generated-id absent after format |
| heading_level_6 | `odt` | heading.length (/children/0/children) | not determined: carve-generated-id absent after format |
| heading_level_6 | `epub`, `djot` | heading.type (/children/0/type) | Not determined: Pandoc writer or reader |
| heading_level_6 | `latex`, `rst`, `asciidoc` | heading.type (/children/0/type) | Pandoc writer: carve-generated-id absent after format |
| heading_level_6 | `typst`, `ipynb`, `gfm` | heading.attrs (/children/0/attrs) | Pandoc writer: carve-generated-id absent after format |
| heading_level_6 | `jats`, `docbook` | heading.level (/children/0/level) | Pandoc writer: carve-generated-id absent after format |
| heading_level_6 | `org` | heading.type (/children/0/type) | Pandoc reader: carve-generated-id absent after format |
| heading_level_6 | `mediawiki` | document.length (/children) | Pandoc writer: carve-generated-id absent after format |
| highlight | `odt`, `jats`, `docbook`, `org` | highlight.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| highlight | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| image | `docx`, `odt`, `epub`, `ipynb` | image.src (/children/0/children/0/src) | Not determined: Pandoc writer or reader |
| image | `latex`, `jats`, `docbook`, `rst`, `asciidoc` | paragraph.blockImage (/children/0/blockImage) | Not determined: Pandoc writer or reader |
| image | `typst` | image.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| image | `org` | image.alt (/children/0/children/0/alt) | Not determined: Pandoc writer or reader |
| image | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| image | `markdown` | paragraph.type (/children/0/type) | Not determined: Pandoc writer or reader |
| image_attrs | `docx`, `odt`, `epub` | image.src (/children/0/children/0/src) | Not determined: Pandoc writer or reader |
| image_attrs | `latex`, `asciidoc` | image.attrs (/children/0/children/0/attrs) | Not determined: Pandoc writer or reader |
| image_attrs | `typst`, `ipynb` | image.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| image_attrs | `jats` | image.classes (/children/0/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| image_attrs | `docbook` | paragraph.blockImage (/children/0/blockImage) | Not determined: Pandoc writer or reader |
| image_attrs | `rst` | image.length (/children/0/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| image_attrs | `org` | image.alt (/children/0/children/0/alt) | Not determined: Pandoc writer or reader |
| image_attrs | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| image_attrs | `markdown` | paragraph.type (/children/0/type) | Not determined: Pandoc writer or reader |
| image_reference | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-tree absent after format |
| image_reference | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-tree absent after format |
| image_reference | `rst` | image.key (/children/1/children/0/key) | Pandoc writer: carve-key absent after format |
| image_reference | `markdown` | paragraph.type (/children/1/type) | Not determined: Pandoc writer or reader |
| image_reference | `commonmark_x` | link_reference_definition.type (/children/0/type) | Not determined: Pandoc writer or reader |
| image_title | `docx`, `odt`, `epub`, `ipynb` | image.src (/children/0/children/0/src) | Not determined: Pandoc writer or reader |
| image_title | `latex`, `rst`, `org`, `asciidoc`, `djot` | image.tooltip (/children/0/children/0/tooltip) | Not determined: Pandoc writer or reader |
| image_title | `typst` | image.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| image_title | `jats`, `docbook` | paragraph.0 (/children/0/children/0) | Not determined: Pandoc writer or reader |
| image_title | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| image_title | `markdown` | paragraph.type (/children/0/type) | Not determined: Pandoc writer or reader |
| inline_footnote | `jats` | inline_footnote.type (/children/0/children/1/type) | Not determined: Pandoc writer or reader |
| inline_footnote | `mediawiki`, `ipynb` | document.length (/children) | Not determined: Pandoc writer or reader |
| inline_footnote_attrs | `docx`, `odt` | inline_footnote.attrs (/children/0/children/1/attrs) | not determined: carve-inline-attrs absent after format |
| inline_footnote_attrs | `latex` | inline_footnote.type (/children/0/children/1/type) | Pandoc writer: carve-inline-attrs absent after format |
| inline_footnote_attrs | `typst`, `docbook`, `rst`, `org` | inline_footnote.attrs (/children/0/children/1/attrs) | Pandoc writer: carve-inline-attrs absent after format |
| inline_footnote_attrs | `jats` | inline_footnote.type (/children/0/children/1/type) | Pandoc reader: carve-inline-attrs absent after format |
| inline_footnote_attrs | `asciidoc` | inline_footnote.type (/children/0/children/1/type) | Not determined: Pandoc writer or reader |
| inline_footnote_attrs | `mediawiki`, `ipynb` | document.length (/children) | Not determined: Pandoc writer or reader |
| inline_footnote_attrs | `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| insertion | `docx`, `odt` | insert.type (/children/0/children/0/type) | not determined: carve-insert absent after format |
| insertion | `latex`, `typst`, `docbook`, `rst`, `org` | insert.type (/children/0/children/0/type) | Pandoc writer: carve-insert absent after format |
| insertion | `jats` | insert.type (/children/0/children/0/type) | Pandoc reader: carve-insert absent after format |
| insertion | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| line_block | `docx`, `odt`, `epub`, `latex`, `typst`, `jats`, `asciidoc`, `mediawiki`, `ipynb`, `gfm`, `commonmark_x`, `djot` | line_block.type (/children/0/type) | Not determined: Pandoc writer or reader |
| line_block | `docbook` | text.value (/children/0/children/0/children/0/value) | Not determined: Pandoc writer or reader |
| link | `jats` | link.href (/children/0/children/0/href) | Not determined: Pandoc writer or reader |
| link_attrs | `docx`, `odt`, `typst`, `rst`, `org`, `asciidoc`, `mediawiki` | link.attrs (/children/0/children/0/attrs) | Not determined: Pandoc writer or reader |
| link_attrs | `epub` | link.id (/children/0/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| link_attrs | `latex`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| link_attrs | `jats` | link.href (/children/0/children/0/href) | Not determined: Pandoc writer or reader |
| link_attrs | `docbook` | link.keyValues (/children/0/children/0/attrs/keyValues) | Not determined: Pandoc writer or reader |
| link_reference | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-tree absent after format |
| link_reference | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-tree absent after format |
| link_reference | `rst` | link.key (/children/1/children/0/key) | Pandoc writer: carve-key absent after format |
| link_reference | `commonmark_x` | link_reference_definition.type (/children/0/type) | Not determined: Pandoc writer or reader |
| link_reference_collapsed | `docx`, `odt`, `epub` | document.length (/children) | not determined: carve-tree absent after format |
| link_reference_collapsed | `html`, `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | document.length (/children) | Pandoc writer: carve-tree absent after format |
| link_reference_collapsed | `rst` | link.key (/children/1/children/0/key) | Pandoc writer: carve-key absent after format |
| link_reference_collapsed | `commonmark_x` | link_reference_definition.type (/children/0/type) | Not determined: Pandoc writer or reader |
| link_title | `odt`, `latex`, `typst`, `docbook`, `rst`, `org`, `asciidoc`, `mediawiki`, `djot` | link.tooltip (/children/0/children/0/tooltip) | Not determined: Pandoc writer or reader |
| link_title | `jats` | link.href (/children/0/children/0/href) | Not determined: Pandoc writer or reader |
| list_bullet_dash | `latex`, `typst`, `jats`, `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| list_bullet_star | `docx`, `odt` | list.char (/children/0/marker/char) | not determined: carve-list absent after format |
| list_bullet_star | `latex`, `typst`, `jats`, `docbook`, `org`, `asciidoc`, `ipynb` | list.char (/children/0/marker/char) | Pandoc writer: carve-list absent after format |
| list_bullet_star | `rst` | list.type (/children/0/type) | Not determined: Pandoc writer or reader |
| list_bullet_star | `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| list_loose | `odt`, `rst`, `mediawiki` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| list_nested | `odt`, `latex`, `typst`, `jats`, `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| list_ordered_alpha | `epub`, `html`, `jats`, `docbook`, `asciidoc` | list.delimiter (/children/0/marker/delimiter) | Not determined: Pandoc writer or reader |
| list_ordered_alpha | `latex`, `org`, `mediawiki`, `ipynb`, `gfm` | list.style (/children/0/marker/style) | Not determined: Pandoc writer or reader |
| list_ordered_alpha | `typst` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| list_ordered_decimal | `latex`, `typst`, `jats`, `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| list_ordered_roman | `latex`, `org`, `mediawiki`, `ipynb`, `gfm` | list.style (/children/0/marker/style) | Not determined: Pandoc writer or reader |
| list_ordered_roman | `typst`, `jats`, `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| list_ordered_start | `odt`, `latex`, `jats`, `ipynb` | list.start (/children/0/marker/start) | Not determined: Pandoc writer or reader |
| list_ordered_start | `typst`, `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| literal_inline | `docx`, `odt` | literal_inline.type (/children/0/children/0/type) | not determined: carve-literal absent after format |
| literal_inline | `latex`, `jats`, `docbook`, `rst`, `org`, `mediawiki`, `ipynb`, `gfm` | literal_inline.type (/children/0/children/0/type) | Pandoc writer: carve-literal absent after format |
| literal_inline | `typst` | literal_inline.type (/children/0/children/0/type) | Pandoc reader: carve-literal absent after format |
| literal_inline | `asciidoc` | paragraph.length (/children/0/children) | Pandoc writer: carve-literal absent after format |
| math_attrs | `docx` | math.value (/children/0/children/0/value) | not determined: carve-inline-attrs absent after format |
| math_attrs | `odt` | math.display (/children/0/children/0/display) | not determined: carve-inline-attrs absent after format |
| math_attrs | `latex` | math.type (/children/0/children/0/type) | Pandoc writer: carve-inline-attrs absent after format |
| math_attrs | `typst` | math.value (/children/0/children/0/value) | Pandoc writer: carve-inline-attrs absent after format |
| math_attrs | `jats` | math.attrs (/children/0/children/0/attrs) | Pandoc reader: carve-inline-attrs absent after format |
| math_attrs | `docbook` | document.length (/children) | Pandoc writer: carve-inline-attrs absent after format |
| math_attrs | `rst`, `org` | math.attrs (/children/0/children/0/attrs) | Pandoc writer: carve-inline-attrs absent after format |
| math_attrs | `asciidoc` | math.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| math_attrs | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| math_caption | `docx`, `rst`, `asciidoc`, `ipynb`, `gfm`, `commonmark_x`, `djot` | figure.type (/children/0/type) | Not determined: Pandoc writer or reader |
| math_caption | `odt`, `org`, `mediawiki`, `markdown` | document.length (/children) | Not determined: Pandoc writer or reader |
| math_caption | `latex`, `jats` | paragraph.blockMath (/children/0/children/0/blockMath) | Not determined: Pandoc writer or reader |
| math_caption | `typst` | math.value (/children/0/children/0/children/0/value) | Not determined: Pandoc writer or reader |
| math_caption | `docbook` | figure.length (/children/0/children) | Not determined: Pandoc writer or reader |
| math_display | `docx`, `odt`, `typst`, `asciidoc` | math.value (/children/0/children/0/value) | Not determined: Pandoc writer or reader |
| math_display | `latex`, `jats`, `rst`, `org`, `ipynb` | paragraph.blockMath (/children/0/blockMath) | Not determined: Pandoc writer or reader |
| math_display | `docbook`, `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| math_inline | `docx` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| math_inline | `odt` | math.display (/children/0/children/0/display) | Not determined: Pandoc writer or reader |
| math_inline | `typst` | math.value (/children/0/children/0/value) | Not determined: Pandoc writer or reader |
| math_inline | `docbook` | document.length (/children) | Not determined: Pandoc writer or reader |
| mention | `docx`, `odt` | paragraph.length (/children/0/children) | not determined: carve-mention absent after format |
| mention | `latex` | mention.type (/children/0/children/1/type) | Pandoc writer: carve-mention absent after format |
| mention | `typst`, `docbook`, `rst`, `org` | paragraph.length (/children/0/children) | Pandoc writer: carve-mention absent after format |
| mention | `jats` | paragraph.length (/children/0/children) | Pandoc reader: carve-mention absent after format |
| mention | `asciidoc` | mention.target (/children/0/children/1/target) | Not determined: Pandoc writer or reader |
| mention | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| paragraph_attrs | `docx`, `jats`, `docbook`, `ipynb` | paragraph.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| paragraph_attrs | `odt`, `asciidoc` | paragraph.type (/children/0/type) | Not determined: Pandoc writer or reader |
| paragraph_attrs | `epub` | paragraph.id (/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| paragraph_attrs | `latex`, `org` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| paragraph_attrs | `typst`, `mediawiki`, `gfm` | document.length (/children) | Not determined: Pandoc writer or reader |
| paragraph_attrs | `rst` | paragraph.length (/children/0/attrs/classes) | Not determined: Pandoc writer or reader |
| raw_block | `docx`, `odt`, `latex`, `typst`, `jats`, `docbook`, `asciidoc` | document.length (/children) | Not determined: Pandoc writer or reader |
| raw_block | `epub`, `html`, `mediawiki`, `ipynb`, `markdown`, `gfm`, `commonmark_x` | raw_block.type (/children/0/type) | Not determined: Pandoc writer or reader |
| raw_block | `rst` | raw_block.value (/children/0/value) | Not determined: Pandoc writer or reader |
| raw_inline | `docx`, `odt`, `latex`, `typst`, `jats`, `docbook`, `rst`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| raw_inline | `epub`, `html` | raw_inline.type (/children/0/children/1/type) | Not determined: Pandoc writer or reader |
| replacement | `docx`, `odt` | paragraph.length (/children/0/children) | not determined: carve-delete absent after format |
| replacement | `latex` | delete.type (/children/0/children/0/type) | Pandoc writer: carve-delete absent after format |
| replacement | `typst`, `docbook`, `rst`, `org` | paragraph.length (/children/0/children) | Pandoc writer: carve-delete absent after format |
| replacement | `jats` | paragraph.length (/children/0/children) | Pandoc reader: carve-delete absent after format |
| replacement | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| smart_dash | `docx`, `odt` | paragraph.length (/children/0/children) | not determined: carve-smart absent after format |
| smart_dash | `latex` | smart_punctuation.type (/children/0/children/1/type) | Pandoc writer: carve-smart absent after format |
| smart_dash | `typst`, `docbook`, `rst`, `org` | paragraph.length (/children/0/children) | Pandoc writer: carve-smart absent after format |
| smart_dash | `jats` | paragraph.length (/children/0/children) | Pandoc reader: carve-smart absent after format |
| smart_dash | `asciidoc` | smart_punctuation.glyph (/children/0/children/1/glyph) | Not determined: Pandoc writer or reader |
| smart_dash | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| smart_quotes | `docx`, `odt` | paragraph.length (/children/0/children) | not determined: carve-smart absent after format |
| smart_quotes | `latex` | smart_punctuation.type (/children/0/children/0/type) | Pandoc writer: carve-smart absent after format |
| smart_quotes | `typst`, `docbook`, `rst`, `org` | paragraph.length (/children/0/children) | Pandoc writer: carve-smart absent after format |
| smart_quotes | `jats` | paragraph.length (/children/0/children) | Pandoc reader: carve-smart absent after format |
| smart_quotes | `asciidoc` | smart_punctuation.kind (/children/0/children/0/kind) | Not determined: Pandoc writer or reader |
| smart_quotes | `mediawiki`, `ipynb`, `gfm`, `commonmark_x` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| soft_break | `docx`, `odt`, `epub`, `docbook` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| span_attrs | `docx`, `jats`, `rst`, `org` | span.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| span_attrs | `odt`, `latex`, `typst`, `docbook`, `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| span_attrs | `epub` | span.id (/children/0/children/0/attrs/id) | Not determined: Pandoc writer or reader |
| span_attrs | `html` | span.0 (/children/0/children/0/attrs/keyValues/0/0) | Not determined: Pandoc writer or reader |
| span_attrs | `asciidoc` | span.keyValues (/children/0/children/0/attrs/keyValues) | Not determined: Pandoc writer or reader |
| strike | `rst`, `asciidoc`, `djot` | strike.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| strike | `mediawiki` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| strong_attrs | `docx`, `odt` | strong.attrs (/children/0/children/0/attrs) | not determined: carve-inline-attrs absent after format |
| strong_attrs | `latex`, `rst` | strong.type (/children/0/children/0/type) | Pandoc writer: carve-inline-attrs absent after format |
| strong_attrs | `typst`, `docbook`, `org` | strong.attrs (/children/0/children/0/attrs) | Pandoc writer: carve-inline-attrs absent after format |
| strong_attrs | `jats` | strong.attrs (/children/0/children/0/attrs) | Pandoc reader: carve-inline-attrs absent after format |
| strong_attrs | `asciidoc` | strong.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| strong_attrs | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| subscript | `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| superscript | `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| symbol | `docx`, `odt` | paragraph.length (/children/0/children) | not determined: carve-symbol absent after format |
| symbol | `epub`, `html`, `asciidoc` | symbol.name (/children/0/children/1/name) | Not determined: Pandoc writer or reader |
| symbol | `latex` | symbol.type (/children/0/children/1/type) | Pandoc writer: carve-symbol absent after format |
| symbol | `typst`, `docbook`, `rst`, `org` | paragraph.length (/children/0/children) | Pandoc writer: carve-symbol absent after format |
| symbol | `jats` | paragraph.length (/children/0/children) | Pandoc reader: carve-symbol absent after format |
| symbol | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| table_alignment | `docx` | table_column.width (/children/0/columns/0/width) | not determined: carve-columns absent after format |
| table_alignment | `odt` | text.type (/children/0/children/0/children/0/children/0/children/0/children/0/type) | not determined: carve-columns absent after format |
| table_alignment | `epub`, `html`, `djot` | table_row.1 (/children/0/children/0/children/0/children/1) | Not determined: Pandoc writer or reader |
| table_alignment | `latex`, `docbook`, `markdown` | table_column.align (/children/0/columns/0/align) | Pandoc writer: carve-columns absent after format |
| table_alignment | `typst`, `jats` | table.type (/children/0/type) | Pandoc writer: carve-columns absent after format |
| table_alignment | `rst`, `org` | table_cell.align (/children/0/children/0/children/0/children/1/align) | Pandoc writer: carve-columns absent after format |
| table_alignment | `asciidoc`, `ipynb`, `gfm`, `commonmark_x` | table_column.align (/children/0/columns/1/align) | Pandoc writer: carve-columns absent after format |
| table_alignment | `mediawiki` | table_cell.align (/children/0/children/0/children/0/children/1/align) | Pandoc reader: carve-columns absent after format |
| table_attrs | `docx` | table_column.width (/children/0/columns/0/width) | Not determined: Pandoc writer or reader |
| table_attrs | `odt` | text.type (/children/0/children/0/children/0/children/0/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| table_attrs | `latex`, `docbook`, `markdown` | table_column.align (/children/0/columns/0/align) | Not determined: Pandoc writer or reader |
| table_attrs | `typst` | document.length (/children) | Not determined: Pandoc writer or reader |
| table_attrs | `jats` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_attrs | `rst`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm`, `commonmark_x` | table.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| table_body_partition | `docx` | table_column.width (/children/0/columns/0/width) | not determined: carve-head-rows absent after format |
| table_body_partition | `odt` | table_body.headRows (/children/0/children/0/headRows) | not determined: carve-head-rows absent after format |
| table_body_partition | `latex`, `docbook`, `markdown` | table_column.align (/children/0/columns/0/align) | Pandoc writer: carve-head-rows absent after format |
| table_body_partition | `typst`, `jats` | table.type (/children/0/type) | Pandoc writer: carve-head-rows absent after format |
| table_body_partition | `rst`, `org`, `asciidoc`, `mediawiki`, `ipynb` | table_body.headRows (/children/0/children/0/headRows) | Pandoc writer: carve-head-rows absent after format |
| table_body_partition | `gfm`, `commonmark_x`, `djot` | table.length (/children/0/children) | Pandoc writer: carve-head-rows absent after format |
| table_caption | `docx` | table_column.width (/children/0/columns/0/width) | Not determined: Pandoc writer or reader |
| table_caption | `odt`, `org`, `ipynb`, `gfm`, `commonmark_x` | document.length (/children) | Not determined: Pandoc writer or reader |
| table_caption | `latex`, `docbook`, `markdown` | table_column.align (/children/0/columns/0/align) | Not determined: Pandoc writer or reader |
| table_caption | `typst`, `jats` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_cell_attrs | `docx` | table_column.width (/children/0/columns/0/width) | Not determined: Pandoc writer or reader |
| table_cell_attrs | `odt` | text.type (/children/0/children/0/children/0/children/0/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| table_cell_attrs | `latex`, `docbook`, `markdown` | table_column.align (/children/0/columns/0/align) | Not determined: Pandoc writer or reader |
| table_cell_attrs | `typst`, `jats` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_cell_attrs | `rst`, `org`, `asciidoc`, `ipynb`, `gfm`, `commonmark_x`, `djot` | table_cell.attrs (/children/0/children/1/children/0/children/0/attrs) | Not determined: Pandoc writer or reader |
| table_colspan | `docx` | table_column.width (/children/0/columns/0/width) | not determined: carve-span absent after format |
| table_colspan | `odt` | text.type (/children/0/children/0/children/0/children/0/children/0/children/0/type) | not determined: carve-span absent after format |
| table_colspan | `epub`, `html`, `mediawiki` | table_row.length (/children/0/children/1/children/0/children) | Not determined: Pandoc writer or reader |
| table_colspan | `latex`, `docbook` | table_column.align (/children/0/columns/0/align) | Pandoc writer: carve-span absent after format |
| table_colspan | `typst`, `jats`, `asciidoc` | table.type (/children/0/type) | Pandoc writer: carve-span absent after format |
| table_colspan | `rst` | table.length (/children/0/columns) | Pandoc writer: carve-span absent after format |
| table_colspan | `org`, `djot` | table_cell.colspan (/children/0/children/1/children/0/children/0/colspan) | Pandoc writer: carve-span absent after format |
| table_colspan | `ipynb`, `gfm`, `commonmark_x` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_colspan | `markdown` | table_column.width (/children/0/columns/0/width) | Pandoc writer: carve-span absent after format |
| table_column_width | `docx`, `odt`, `latex`, `rst`, `org`, `mediawiki`, `ipynb`, `markdown`, `gfm`, `commonmark_x`, `djot` | table_column.width (/children/0/columns/0/width) | Not determined: Pandoc writer or reader |
| table_column_width | `typst`, `jats` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_column_width | `docbook` | table_column.align (/children/0/columns/0/align) | Not determined: Pandoc writer or reader |
| table_column_width | `asciidoc` | table.attrs (/children/0/attrs) | Not determined: Pandoc writer or reader |
| table_footer | `docx`, `markdown` | table_column.width (/children/0/columns/0/width) | Not determined: Pandoc writer or reader |
| table_footer | `odt`, `rst`, `org`, `asciidoc`, `mediawiki`, `ipynb`, `gfm`, `commonmark_x`, `djot` | table.length (/children/0/children) | Not determined: Pandoc writer or reader |
| table_footer | `latex`, `docbook` | table_column.align (/children/0/columns/0/align) | Not determined: Pandoc writer or reader |
| table_footer | `typst`, `jats` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_rowspan | `docx` | table_column.width (/children/0/columns/0/width) | not determined: carve-span absent after format |
| table_rowspan | `odt` | text.type (/children/0/children/0/children/0/children/0/children/0/children/0/type) | not determined: carve-span absent after format |
| table_rowspan | `epub`, `html`, `mediawiki` | table_row.0 (/children/0/children/1/children/0/children/0) | Not determined: Pandoc writer or reader |
| table_rowspan | `latex`, `docbook` | table_column.align (/children/0/columns/0/align) | Pandoc writer: carve-span absent after format |
| table_rowspan | `typst`, `jats`, `asciidoc` | table.type (/children/0/type) | Pandoc writer: carve-span absent after format |
| table_rowspan | `rst`, `markdown` | table_column.width (/children/0/columns/0/width) | Pandoc writer: carve-span absent after format |
| table_rowspan | `org`, `djot` | table_cell.rowspan (/children/0/children/1/children/0/children/0/rowspan) | Pandoc writer: carve-span absent after format |
| table_rowspan | `ipynb`, `gfm`, `commonmark_x` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| table_simple | `docx` | table_column.width (/children/0/columns/0/width) | Not determined: Pandoc writer or reader |
| table_simple | `odt` | text.type (/children/0/children/0/children/0/children/0/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| table_simple | `latex`, `docbook`, `markdown` | table_column.align (/children/0/columns/0/align) | Not determined: Pandoc writer or reader |
| table_simple | `typst`, `jats` | table.type (/children/0/type) | Not determined: Pandoc writer or reader |
| tag | `docx`, `odt` | paragraph.length (/children/0/children) | not determined: carve-tag absent after format |
| tag | `epub`, `html`, `asciidoc` | tag.name (/children/0/children/1/name) | Not determined: Pandoc writer or reader |
| tag | `latex` | tag.type (/children/0/children/1/type) | Pandoc writer: carve-tag absent after format |
| tag | `typst`, `docbook`, `rst`, `org` | paragraph.length (/children/0/children) | Pandoc writer: carve-tag absent after format |
| tag | `jats` | paragraph.length (/children/0/children) | Pandoc reader: carve-tag absent after format |
| tag | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| task_done | `docx`, `odt` | list_item.task (/children/0/children/0/task) | not determined: carve-task absent after format |
| task_done | `latex`, `typst` | list.spacing (/children/0/spacing) | Pandoc writer: carve-task absent after format |
| task_done | `jats` | list.spacing (/children/0/spacing) | Pandoc reader: carve-task absent after format |
| task_done | `docbook`, `rst`, `org` | list_item.task (/children/0/children/0/task) | Pandoc writer: carve-task absent after format |
| task_done | `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| task_done | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children/0/children/0/children) | Not determined: Pandoc writer or reader |
| task_mixed | `docx` | document.length (/children) | not determined: carve-task absent after format |
| task_mixed | `odt` | list_item.task (/children/0/children/0/task) | not determined: carve-task absent after format |
| task_mixed | `latex` | list.spacing (/children/0/spacing) | Pandoc writer: carve-task absent after format |
| task_mixed | `typst`, `rst`, `org` | document.length (/children) | Pandoc writer: carve-task absent after format |
| task_mixed | `jats` | list.spacing (/children/0/spacing) | Pandoc reader: carve-task absent after format |
| task_mixed | `docbook` | list_item.task (/children/0/children/0/task) | Pandoc writer: carve-task absent after format |
| task_mixed | `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| task_mixed | `mediawiki` | paragraph.length (/children/0/children/0/children/0/children) | Not determined: Pandoc writer or reader |
| task_mixed | `ipynb`, `markdown`, `gfm`, `commonmark_x` | document.length (/children) | Not determined: Pandoc writer or reader |
| task_other | `docx`, `odt` | list_item.task (/children/0/children/0/task) | not determined: carve-task absent after format |
| task_other | `latex`, `typst` | list.spacing (/children/0/spacing) | Pandoc writer: carve-task absent after format |
| task_other | `jats` | list.spacing (/children/0/spacing) | Pandoc reader: carve-task absent after format |
| task_other | `docbook`, `rst`, `org` | list_item.task (/children/0/children/0/task) | Pandoc writer: carve-task absent after format |
| task_other | `asciidoc` | list.spacing (/children/0/spacing) | Not determined: Pandoc writer or reader |
| task_other | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children/0/children/0/children) | Not determined: Pandoc writer or reader |
| thematic_break | `odt`, `latex`, `asciidoc` | thematic_break.type (/children/0/type) | Not determined: Pandoc writer or reader |
| thematic_break | `jats`, `docbook` | document.length (/children) | Not determined: Pandoc writer or reader |
| underline | `odt`, `rst`, `asciidoc`, `commonmark_x`, `djot` | underline.type (/children/0/children/0/type) | Not determined: Pandoc writer or reader |
| underline | `mediawiki`, `ipynb`, `gfm` | paragraph.length (/children/0/children) | Not determined: Pandoc writer or reader |
| xref | `docx` | heading.attrs (/children/0/attrs) | not determined: carve-generated-id absent after format |
| xref | `odt` | heading.length (/children/0/children) | not determined: carve-generated-id absent after format |
| xref | `latex`, `typst`, `jats`, `docbook`, `rst`, `asciidoc`, `mediawiki`, `ipynb`, `gfm` | heading.attrs (/children/0/attrs) | Pandoc writer: carve-generated-id absent after format |
| xref | `org` | xref.type (/children/1/children/1/type) | Pandoc writer: carve-xref absent after format |
| xref | `djot` | document.length (/children) | Not determined: Pandoc writer or reader |

## Scope of the attribution

The direct bridge export/import baseline is equal for all 99 probes. The format changes above are therefore observed after the first Pandoc JSON and before or at bridge import. A lost Pandoc carrier does not prove that a format has no way to express the underlying content; it proves this bridge’s carrier did not survive Pandoc’s writer/reader pair. Ordinary text reflow, code trailing line feeds, image paths rewritten to embedded media, and table normalization are recorded as tree loss when they change a compared field.
