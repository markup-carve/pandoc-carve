The two `spine-order-v*.epub` fixtures contain chapters named `a-last.xhtml`
and `z-first.xhtml`. The ZIP entries and OPF manifest list A before Z. The OPF
spine lists Z before A. Each chapter contains a heading marker and a paragraph
marker. One fixture uses EPUB 2 with NCX navigation; the other uses EPUB 3 with
an XHTML navigation document.

Pandoc reads the EPUB spine; the bridge must preserve that order. The CLI import
test checks the heading order and requires each paragraph
marker exactly once after importing into Carve and re-exporting to Pandoc JSON.
