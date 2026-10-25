# Upstream Pandoc drafts

Proposals for jgm/pandoc that come out of the bridge work: places where the Pandoc AST cannot hold something Carve has, so pandoc-carve has to drop it, report a loss, or carry it in a private marker.

They are drafts. None of these three has been posted; each one is posted by the maintainer, by hand, after a re-check against the current Pandoc release.

| Draft | Asks for | Where it would go |
|---|---|---|
| `03-source-provenance.md` | optional source ranges on AST nodes | Discussions, ideas |
| `04-rowspan-across-table-sections.md` | a span across a head/body boundary, or at least a reader warning when one is clipped | Issues, feature request |
| `05-comments-and-annotations.md` | a representation for non-rendering source comments, kept apart from review annotations | Discussions, ideas; related: jgm/pandoc#1926, jgm/pandoc#9428 |

Already filed from this work: jgm/pandoc#11820 (structured citation locators).
