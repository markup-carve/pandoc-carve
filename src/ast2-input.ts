import type { CarveAstDocument, CarveAstNode } from './ast-json.js';

export const wireOrigin = new WeakMap<object, object>();

/** Project the 2.0 exchange tree onto the bridge's conversion view. */
export function conversionView(doc: CarveAstDocument): CarveAstDocument {
    const visit = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(visit);
        if (!value || typeof value !== 'object') return value;
        const node = value as Record<string, unknown>;
        const out: Record<string, unknown> = Object.fromEntries(
            Object.entries(node).map(([key, child]) => [key, visit(child)]),
        );
        const children = out['children'] as CarveAstNode[] | undefined;
        switch (out['type']) {
            case 'list': {
                const marker = out['marker'] as Record<string, unknown> | undefined;
                out['items'] = children ?? [];
                out['tight'] = out['spacing'] === 'tight';
                out['ordered'] = marker?.['kind'] === 'ordered';
                if (out['ordered']) {
                    out['olType'] = marker?.['style'];
                    out['delim'] = marker?.['delimiter'];
                    out['start'] = marker?.['start'];
                }
                break;
            }
            case 'list_item': {
                const task = out['task'] as Record<string, unknown> | undefined;
                if (task) {
                    out['checked'] = task['mark'] === 'x';
                    out['taskState'] = task['mark'];
                }
                break;
            }
            case 'definition_list':
                out['items'] = children ?? [];
                out['loose'] = out['spacing'] === 'loose';
                break;
            case 'table': {
                const groups = children ?? [];
                out['rows'] = groups.flatMap((group) => group.children as CarveAstNode[] ?? []);
                const caption = out['caption'] as CarveAstNode | undefined;
                if (caption) {
                    out['caption'] = (caption.children as CarveAstNode[] ?? []).flatMap((block) => block.children as CarveAstNode[] ?? []);
                    out['shortCaption'] = caption['short'];
                }
                const head = groups.find((group) => group.type === 'table_head');
                const foot = groups.find((group) => group.type === 'table_foot');
                const bodies = groups.filter((group) => group.type === 'table_body');
                const explicit = Boolean(foot || head?.['attrs'] || bodies.length > 1
                    || bodies.some((group) => group['headRows'] !== undefined
                        || group['rowHeadColumns'] !== undefined || group['attrs'] !== undefined));
                if (explicit) out['rowGroups'] = {
                    headRows: (head?.children as unknown[])?.length ?? 0,
                    headAttrs: head?.['attrs'],
                    bodies: bodies.map((group) => ({
                        headRows: group['headRows'] ?? 0,
                        bodyRows: ((group.children as unknown[])?.length ?? 0) - Number(group['headRows'] ?? 0),
                        rowHeadColumns: group['rowHeadColumns'],
                        attrs: group['attrs'],
                    })),
                    footRows: (foot?.children as unknown[])?.length ?? 0,
                    footAttrs: foot?.['attrs'],
                };
                break;
            }
            case 'table_row':
                out['cells'] = children ?? [];
                break;
            case 'table_cell':
                if (children?.length === 1 && children[0]?.type === 'cell_paragraph') {
                    out['children'] = children[0].children ?? [];
                } else {
                    out['blocks'] = children ?? [];
                }
                break;
            case 'figure': {
                const caption = out['caption'] as CarveAstNode | undefined;
                out['target'] = children?.[0];
                if (caption) {
                    const paragraphs = caption.children as CarveAstNode[] | undefined;
                    out['caption'] = paragraphs?.flatMap((block) => block.children as CarveAstNode[] ?? []) ?? [];
                    out['shortCaption'] = caption['short'];
                }
                break;
            }
            case 'figure_group': {
                const caption = out['caption'] as CarveAstNode | undefined;
                if (caption) {
                    out['caption'] = (caption.children as CarveAstNode[] ?? []).flatMap((block) => block.children as CarveAstNode[] ?? []);
                }
                break;
            }
            case 'xref':
                out['type'] = 'heading_ref';
                out['target'] = out['key'];
                break;
            case 'footnote_ref':
                out['label'] = out['key'];
                break;
            case 'footnote':
                out['label'] = out['key'];
                break;
            case 'inline_footnote':
                out['inline'] = children ?? [];
                break;
            case 'link_reference_definition':
                out['label'] = out['key'];
                break;
            case 'citation_group':
                out['items'] = children ?? [];
                break;
            case 'inline_extension':
                out['content'] = children ?? [];
                break;
            case 'abbreviation':
            case 'abbreviation_def':
                out['abbr'] = out['key'];
                break;
            case 'critic_substitution':
                out['type'] = 'substitution';
                break;
        }
        if (['math', 'raw_inline', 'raw_block', 'literal_inline', 'code_block', 'frontmatter', 'comment'].includes(String(out['type']))) {
            out['content'] = out['value'];
        }
        if (out['type'] === 'code_block') out['lang'] = out['syntax'];
        if (out['type'] === 'smart_punctuation') out['value'] = out['source'];
        if (out['type'] === 'critic_comment') out['text'] = out['value'];
        if (out['type'] === 'mention') out['user'] = out['target'];
        if (out['type'] === 'link' || out['type'] === 'image') out['title'] = out['tooltip'];
        if (out['type'] === 'admonition' || out['type'] === 'directive' || out['type'] === 'div') out['label'] = out['groupLabel'];
        if ((out['type'] === 'link' || out['type'] === 'image')
            && out['key'] !== undefined && out['ref'] === undefined) out['ref'] = out['key'];
        wireOrigin.set(out, node);
        return out;
    };
    return visit(doc) as CarveAstDocument;
}
