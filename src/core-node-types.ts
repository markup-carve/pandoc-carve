/** Every node type the pinned 2.0 schema defines; test/core-node-types.test.mjs keeps it in step. */
export const CORE_NODE_TYPES: ReadonlySet<string> = new Set([
    'abbreviation', 'abbreviation_def', 'admonition', 'autolink', 'block_extension', 'block_quote',
    'caption', 'caption_number', 'cell_paragraph', 'cell_wrap', 'citation', 'citation_definition',
    'citation_group', 'code', 'code_block', 'comment', 'critic_comment', 'critic_substitution',
    'definition_description', 'definition_list', 'definition_term', 'delete', 'directive', 'div',
    'document', 'emphasis', 'escaped_text', 'figure', 'figure_group', 'footnote', 'footnote_ref',
    'frontmatter', 'hard_break', 'heading', 'highlight', 'image', 'inline_extension',
    'inline_footnote', 'insert', 'line_block', 'link', 'link_reference_definition', 'list',
    'list_item', 'literal_inline', 'math', 'mention', 'non_breaking_space', 'paragraph',
    'raw_block', 'raw_inline', 'ruby', 'ruby_pair', 'section', 'small_caps', 'smart_punctuation',
    'soft_break', 'span', 'strike', 'strong', 'subscript', 'superscript', 'symbol', 'table',
    'table_body', 'table_cell', 'table_column', 'table_foot', 'table_head', 'table_row', 'tag',
    'text', 'thematic_break', 'underline', 'xref',
]);
