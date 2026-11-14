/** Carve 0.2 bridge. The vendored engine is a single import to swap at release. */
import { parse, treesEqual, validateTree, writeWithDiagnostics } from '../vendor/carve-v2/index.js';
import type { Node, DocumentNode, Block, Inline, Attrs, TableNode, TableRowNode, TableCellNode, CaptionNode } from '../vendor/carve-v2/index.js';
import * as P from './pandoc.js';
import { hasDeniedScheme } from './url-scheme.js';

export { treesEqual };
export type { DocumentNode, Node };
type Result = { doc: P.PandocDoc; warnings: string[] };
type Context = { warnings: string[]; notes: Map<string, Block[]>; links: Map<string, [string, string]> };
const impossible = (node: never): never => { throw new Error(`unhandled node ${JSON.stringify(node)}`); };
const attr = (a?: Attrs): P.Attr => P.attr(a?.id, a?.classes, a?.keyValues);
const words = (s: string): P.Inline[] => s.split(/( +)/u).filter(Boolean).map(x => /^ +$/u.test(x) ? P.Space : P.Str(x));
const il = (xs: Inline[], c: Context): P.Inline[] => xs.flatMap(x => emit(x, c));
const bl = (xs: Block[], c: Context): P.Block[] => xs.flatMap(x => emit(x, c));
const cap = (x: CaptionNode | undefined, c: Context): P.Inline[] | null => x ? bl(x.children, c).flatMap(b => (b.t === 'Plain' || b.t === 'Para') ? b.c as P.Inline[] : []) : null;
const alignment = (x?: string): P.Alignment => x === 'left' ? 'AlignLeft' : x === 'right' ? 'AlignRight' : x === 'center' ? 'AlignCenter' : 'AlignDefault';
const safeTarget = (value: string, c: Context): string => { if (hasDeniedScheme(value)) { c.warnings.push('destination-denied: URL scheme is not allowed in Pandoc output'); return ''; } return value; };
const titleCarrier = (title?: Inline[]): [string, string][] => title === undefined ? [] : [['carve-title', JSON.stringify(title, (key, value) => key === 'pos' || key === 'segments' ? undefined : value)]];
function cell(x: TableCellNode, c: Context): P.PCell { return { attr: attr(x.attrs), align: alignment(x.align), rowSpan: x.rowspan ?? 1, colSpan: x.colspan ?? 1, blocks: x.children.flatMap(n => n.type === 'cell_paragraph' ? [P.Plain(il(n.children, c))] : emit(n, c)) }; }
function rows(xs: (TableRowNode | { type: 'comment' })[], c: Context): P.PRow[] { return xs.flatMap(x => x.type === 'table_row' ? [P.row(x.children.map(y => cell(y, c)), attr(x.attrs))] : []); }
function table(x: TableNode, c: Context): P.Block {
  const heads = x.children.filter(n => n.type === 'table_head');
  const bodies = x.children.filter(n => n.type === 'table_body');
  const feet = x.children.filter(n => n.type === 'table_foot');
  return P.Table(attr(x.attrs), cap(x.caption, c), x.columns.map(n => alignment(n.resolvedAlign ?? n.align)), heads.flatMap(n => rows(n.children, c)), bodies.map(n => ({ attr: attr(n.attrs), rowHeadColumns: n.rowHeadColumns, headRows: n.headRows === undefined ? [] : rows(n.children.filter(y => y.type === 'table_row').slice(0, n.headRows), c), bodyRows: rows(n.children.filter(y => y.type === 'table_row').slice(n.headRows ?? 0), c) })), feet.flatMap(n => rows(n.children, c)), x.caption?.short ? il(x.caption.short, c) : null, x.columns.map(n => n.width ?? null));
}
/** Every public 0.2 node has an explicit case; a new type is a compiler error. */
function emit(n: Node, c: Context): P.PandocNode[] {
  if (n.lang !== undefined || n.dir !== undefined || n.data !== undefined || n.metadata !== undefined) c.warnings.push(`${n.type}: language, direction, data, or metadata may not survive Pandoc JSON`);
  if (n.type === 'image' && (n.decorative !== undefined || n.resourceId !== undefined || n.targetKind !== undefined)) c.warnings.push('image: decorative, resource, or target kind field has no Pandoc slot');
  if (n.type === 'link' && n.targetKind !== undefined) c.warnings.push('link: target kind has no Pandoc slot');
  if ((n.type === 'div' || n.type === 'admonition' || n.type === 'directive' || n.type === 'code_block') && n.title !== undefined) c.warnings.push(`${n.type}: title uses a bridge-specific Pandoc attribute`);
  if (n.type === 'figure' && n.kind !== undefined) c.warnings.push('figure: kind uses a bridge-specific Pandoc attribute');
  if (n.type === 'figure_group' && n.caption !== undefined) c.warnings.push('figure_group: caption uses a bridge-specific Pandoc attribute');
  if (n.type === 'document' && (n.extensions !== undefined || n.resources !== undefined)) c.warnings.push('document: extensions and resource manifest have no Pandoc slot');
  switch (n.type) {
    case 'document': return n.children.flatMap(x => emit(x, c));
    case 'text': return words(n.value);
    case 'soft_break': return [P.SoftBreak];
    case 'hard_break': return [P.LineBreak];
    case 'non_breaking_space': return [P.Str('\u00a0')];
    case 'emphasis': return [P.Emph(il(n.children, c))];
    case 'strong': return [P.Strong(il(n.children, c))];
    case 'underline': return [P.Underline(il(n.children, c))];
    case 'strike': return [P.Strikeout(il(n.children, c))];
    case 'subscript': return [P.Subscript(il(n.children, c))];
    case 'superscript': return [P.Superscript(il(n.children, c))];
    case 'small_caps': return [P.SmallCaps(il(n.children, c))];
    case 'span': return [P.Span(attr(n.attrs), il(n.children, c))];
    case 'highlight': return [P.Span(P.attr(n.attrs?.id, ['mark', ...(n.attrs?.classes ?? [])], n.attrs?.keyValues), il(n.children, c))];
    case 'delete': return [P.Span(P.attr('', ['carve-delete']), il(n.children, c))];
    case 'insert': return [P.Span(P.attr('', ['carve-insert']), il(n.children, c))];
    case 'code': return [P.Code(attr(n.attrs), n.value)];
    case 'literal_inline': return [P.Code(P.attr('', ['carve-literal']), n.value)];
    case 'math': return [n.display ? P.MathDisplay(n.value) : P.MathInline(n.value)];
    case 'raw_inline': return [P.RawInline(n.format, n.value)];
    case 'smart_punctuation': return [P.Span(P.attr('', ['carve-smart'], [['kind', n.kind], ['source', n.source], ...(n.glyph ? [['glyph', n.glyph] as [string, string]] : [])]), words(n.glyph ?? n.source))];
    case 'link': { const target = n.href ?? (n.key ? c.links.get(n.key)?.[0] : undefined); if (target === undefined) c.warnings.push('link: unresolved reference'); return [P.Link(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.key ? [['carve-key', n.key], ['carve-form', n.form ?? 'full']] as [string, string][] : []), ...(n.href === undefined ? [['carve-unresolved', '1'] as [string, string]] : [])]), il(n.children, c), [safeTarget(target ?? '', c), n.tooltip ?? ''])]; }
    case 'image': { const target = n.src ?? (n.key ? c.links.get(n.key)?.[0] : undefined); if (target === undefined) c.warnings.push('image: unresolved reference'); return [P.Image(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.key ? [['carve-key', n.key], ['carve-form', n.form ?? 'full']] as [string, string][] : []), ...(n.src === undefined ? [['carve-unresolved', '1'] as [string, string]] : [])]), words(n.alt ?? ''), [safeTarget(target ?? '', c), n.tooltip ?? ''])]; }
    case 'autolink': return [P.Link(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ['carve-autolink', '1']]), words(n.text ?? n.href), [safeTarget(n.href, c), ''])];
    case 'xref': return [P.Link(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ['carve-xref', '1'], ['carve-key', n.key], ['carve-namespace', n.namespace], ...(n.form ? [['carve-display-form', n.form] as [string, string]] : [])]), words(n.key), [n.href ?? `#${n.key}`, ''])];
    case 'footnote_ref': return [P.Span(P.attr('', ['carve-footnote-ref'], [['key', n.key]]), [P.Note(bl(c.notes.get(n.key) ?? [], c))])];
    case 'inline_footnote': return [P.Note([P.Para(il(n.children, c))])];
    case 'abbreviation': return [P.Span(P.attr('', ['carve-abbreviation'], [['key', n.key], ['expansion', n.expansion ?? '']]), words(n.key))];
    case 'mention': return [P.Span(P.attr('', ['carve-mention'], [['target', n.target], ['kind', n.kind]]), words(n.label ?? `@${n.target}`))];
    case 'tag': return [P.Span(P.attr('', ['carve-tag'], [['name', n.name]]), words(`#${n.name}`))];
    case 'symbol': c.warnings.push('symbol: no Pandoc equivalent'); return [P.Span(P.attr('', ['carve-symbol'], [['name', n.name]]), words(`:${n.name}:`))];
    case 'ruby': c.warnings.push('ruby: no Pandoc equivalent'); return [P.Span(P.attr('', ['carve-ruby']), n.pairs.flatMap(p => words(`${p.base.map(x => x.type === 'text' ? x.value : '').join('')}(${p.annotation.map(x => x.type === 'text' ? x.value : '').join('')})`)))];
    case 'citation_group': return [P.Cite(n.children.map(x => P.citation(x.key, x.suppressAuthor ? 'SuppressAuthor' : 'NormalCitation', il(x.prefix ?? [], c), il([...(x.locator ?? []), ...(x.suffix ?? [])], c))), words(n.raw))];
    case 'inline_extension': c.warnings.push(`inline_extension: ${n.name} uses fallback`); return [P.Span(P.attr('', ['carve-extension'], [['name', n.name]]), il(n.fallback ?? n.children, c))];
    case 'critic_comment': return [P.RawInline('carve-critic-comment', n.value)];
    case 'comment': return n.form === 'braced' ? [P.RawInline('carve-comment', n.value)] : [P.RawBlock(`carve-comment-${n.form}`, n.value)];
    case 'caption_number': return words(String(n.n ?? '#'));
    case 'paragraph': { const para = P.Para(il(n.children, c)); return n.attrs || n.blockImage || n.blockMath ? [P.Div(P.attr(n.attrs?.id, ['carve-paragraph', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.blockImage ? [['carve-block-image', '1'] as [string, string]] : []), ...(n.blockMath ? [['carve-block-math', '1'] as [string, string]] : [])]), [para])] : [para]; }
    case 'heading': return [P.Header(n.level, P.attr(n.attrs?.id ?? n.generatedId, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.generatedId && !n.attrs?.id ? [['carve-generated-id', '1'] as [string, string]] : [])]), il(n.children, c))];
    case 'thematic_break': return [P.HorizontalRule];
    case 'block_quote': return [P.BlockQuote(bl(n.children, c))];
    case 'code_block': return [P.CodeBlock(P.attr(n.attrs?.id, [...(n.syntax ? [n.syntax] : []), ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.groupLabel ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), n.value)];
    case 'raw_block': return [P.RawBlock(n.format, n.value)];
    case 'div': return [P.Div(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.groupLabel ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), bl(n.children, c))];
    case 'section': return [P.Div(P.attr(n.attrs?.id, ['carve-section', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.level ? [['carve-section-level', String(n.level)] as [string, string]] : [])]), bl(n.children, c))];
    case 'admonition': return [P.Div(P.attr(n.attrs?.id, ['carve-admonition', n.kind], [...(n.attrs?.keyValues ?? []), ...(n.groupLabel ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), bl(n.children, c))];
    case 'directive': return [P.Div(P.attr(n.attrs?.id, ['carve-directive', n.kind], [...(n.attrs?.keyValues ?? []), ...(n.groupLabel ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), bl(n.children, c))];
    case 'block_extension': c.warnings.push(`block_extension: ${n.name} uses fallback`); return [P.Div(P.attr('', ['carve-extension'], [['name', n.name]]), bl(n.fallback, c))];
    case 'include': c.warnings.push('include: unresolved'); return [P.Div(P.attr('', ['carve-include'], [['path', n.path]]), [])];
    case 'figure': return [P.Figure(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.kind ? [['carve-figure-kind', n.kind] as [string, string]] : [])]), cap(n.caption, c), bl(n.children, c), n.caption?.short ? il(n.caption.short, c) : null)];
    case 'figure_group': return [P.Div(P.attr(n.attrs?.id, ['carve-figure-group', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.caption ? [['carve-caption', JSON.stringify(n.caption, (key, value) => key === 'pos' || key === 'segments' ? undefined : value)] as [string, string]] : [])]), bl(n.children, c))];
    case 'line_block': return [P.LineBlock(n.children.map(x => il(x.children, c)))];
    case 'list': { const items = n.children.map(x => { const content = bl(x.children, c).map(b => n.spacing === 'tight' && b.t === 'Para' ? P.Plain(b.c as P.Inline[]) : b); if (x.task) { const marker = P.Span(P.attr('', ['carve-task'], [['mark', x.task.mark]]), []); if (content[0]?.t === 'Para' || content[0]?.t === 'Plain') content[0] = { ...content[0], c: [marker, ...content[0].c as P.Inline[]] }; else content.unshift(P.Plain([marker])); } return content; }); const list = n.marker.kind === 'bullet' ? P.BulletList(items) : P.OrderedList(n.marker.start ?? 1, n.marker.style === 'a' ? 'LowerAlpha' : n.marker.style === 'A' ? 'UpperAlpha' : n.marker.style === 'i' ? 'LowerRoman' : n.marker.style === 'I' ? 'UpperRoman' : 'Decimal', items, n.marker.delimiter === ')' ? 'OneParen' : 'Period'); return n.marker.kind === 'bullet' && n.marker.char !== '-' ? [P.Div(P.attr('', ['carve-list'], [['marker-char', n.marker.char ?? '-']]), [list])] : [list]; }
    case 'definition_list': { const entries: [P.Inline[], P.Block[][]][] = []; for (const x of n.children) { if (x.type === 'definition_term') entries.push([il(x.children, c), []]); if (x.type === 'definition_description' && entries.length) entries[entries.length - 1]![1].push(bl(x.children, c)); } return [P.DefinitionList(entries)]; }
    case 'table': return [table(n, c)];
    case 'frontmatter': return [P.RawBlock(`carve-frontmatter:${n.format}`, n.value)];
    case 'footnote': case 'link_reference_definition': case 'abbreviation_def': case 'citation_definition': c.warnings.push(`${n.type}: carried as raw Pandoc JSON block`); return [P.RawBlock('carve-tree', JSON.stringify(n, (key, value) => key === 'pos' || key === 'segments' ? undefined : value))];
    case 'caption': return bl(n.children, c);
    case 'cell_paragraph': return [P.Plain(il(n.children, c))];
    case 'citation': return words(n.key);
    case 'definition_term': return il(n.children, c);
    case 'definition_description': return bl(n.children, c);
    case 'line': return il(n.children, c);
    case 'list_item': return bl(n.children, c);
    case 'table_head': case 'table_body': case 'table_foot': return n.children.flatMap(x => emit(x, c));
    case 'table_row': return n.children.flatMap(x => emit(x, c));
    case 'table_cell': return n.children.flatMap(x => emit(x, c));
    case 'table_column': return [];
    default: return impossible(n);
  }
}
export function carveAstToPandoc(input: DocumentNode | string): Result {
  const ast: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  validateTree(ast);
  const c: Context = { warnings: [], notes: new Map(), links: new Map() };
  for (const x of ast.children) { if (x.type === 'footnote') c.notes.set(x.key, x.children); if (x.type === 'link_reference_definition') c.links.set(x.key, [x.href, x.title ?? '']); }
  return { doc: { 'pandoc-api-version': [...P.PANDOC_API_VERSION], meta: {}, blocks: emit(ast, c) }, warnings: c.warnings };
}
export const carveToCarveAst = (source: string): DocumentNode => parse(source);
export const carveToPandoc = (source: string): Result => carveAstToPandoc(parse(source));
export const carveToPandocJson = (source: string): string => JSON.stringify(carveToPandoc(source).doc);

const importAttr = (a: unknown): Attrs | undefined => {
  if (!Array.isArray(a)) return undefined;
  const [id, classes, keyValues] = a as P.Attr;
  return id || classes.length || keyValues.length ? { ...(id ? { id } : {}), ...(classes.length ? { classes } : {}), ...(keyValues.length ? { keyValues } : {}) } : undefined;
};
const readTitle = (value: string | undefined): Inline[] | undefined => { if (value === undefined) return undefined; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed as Inline[] : undefined; } catch { return undefined; } };
const readCaption = (value: string | undefined): CaptionNode | undefined => { if (value === undefined) return undefined; try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'caption' ? parsed as CaptionNode : undefined; } catch { return undefined; } };
const withAttr = <T extends Node>(node: T, a: unknown): T => { const attrs = importAttr(a); return attrs ? { ...node, attrs } : node; };
const inlineList = (xs: P.PandocNode[], warnings: string[]): Inline[] => xs.flatMap(x => importInline(x, warnings));
const blockList = (xs: P.PandocNode[], warnings: string[]): Block[] => xs.flatMap(x => importBlock(x, warnings));
function importItem(item: P.PandocNode[], warnings: string[]): { type: 'list_item'; children: Block[]; task?: { mark: ' ' | 'x' | '_' | '-' | '/' | '!' | '>' | '?'; status: 'todo' | 'done' | 'canceled' | 'in-progress' | 'blocked' | 'partial' | 'other' } } {
  const copy = item.map(x => ({ ...x }));
  const first = copy[0];
  let mark: ' ' | 'x' | '_' | '-' | '/' | '!' | '>' | '?' | undefined;
  if ((first?.t === 'Para' || first?.t === 'Plain') && Array.isArray(first.c)) {
    const head = first.c[0] as P.PandocNode | undefined;
    if (head?.t === 'Span' && (head.c as [P.Attr, unknown])[0][1].includes('carve-task')) {
      const candidate = Object.fromEntries((head.c as [P.Attr, unknown])[0][2])['mark'];
      if ([' ', 'x', '_', '-', '/', '!', '>', '?'].includes(candidate ?? '')) mark = candidate as typeof mark;
      const rest = first.c.slice(1);
      first.c = rest;
      if (rest.length === 0) copy.shift();
    }
  }
  const status = mark === 'x' ? 'done' : mark === '-' ? 'canceled' : mark === '/' ? 'in-progress' : mark === '!' ? 'blocked' : mark === '>' ? 'partial' : mark === '?' ? 'other' : 'todo';
  return { type: 'list_item', children: blockList(copy, warnings), ...(mark === undefined ? {} : { task: { mark, status } }) };
}

function importInline(node: P.PandocNode, warnings: string[]): Inline[] {
  const c = node.c as any;
  switch (node.t) {
    case 'Str': return [{ type: 'text', value: String(c) }];
    case 'Space': return [{ type: 'text', value: ' ' }];
    case 'SoftBreak': return [{ type: 'soft_break' }];
    case 'LineBreak': return [{ type: 'hard_break' }];
    case 'Emph': return [{ type: 'emphasis', children: inlineList(c, warnings) }];
    case 'Strong': return [{ type: 'strong', children: inlineList(c, warnings) }];
    case 'Underline': return [{ type: 'underline', children: inlineList(c, warnings) }];
    case 'Strikeout': return [{ type: 'strike', children: inlineList(c, warnings) }];
    case 'Superscript': return [{ type: 'superscript', children: inlineList(c, warnings) }];
    case 'Subscript': return [{ type: 'subscript', children: inlineList(c, warnings) }];
    case 'SmallCaps': return [{ type: 'small_caps', children: inlineList(c, warnings) }];
    case 'Code': { const a = c[0] as P.Attr; return a[1].includes('carve-literal') ? [{ type: 'literal_inline', value: c[1] }] : [withAttr({ type: 'code', value: c[1] }, a)]; }
    case 'Math': return [{ type: 'math', display: c[0].t === 'DisplayMath', value: c[1] }];
    case 'RawInline': return c[0] === 'carve-comment' ? [{ type: 'comment', form: 'braced', value: c[1] }] : c[0] === 'carve-critic-comment' ? [{ type: 'critic_comment', value: c[1] }] : [{ type: 'raw_inline', format: c[0], value: c[1] }];
    case 'Link': { const a = c[0] as P.Attr; const f = Object.fromEntries(a[2]); const clean: P.Attr = [a[0], a[1], a[2].filter(([k]) => !['carve-key','carve-form','carve-unresolved','carve-autolink','carve-xref','carve-namespace','carve-display-form'].includes(k))]; if (f['carve-autolink']) return [withAttr({ type: 'autolink', href: c[2][0] }, clean)]; if (f['carve-xref']) return [withAttr({ type: 'xref', key: f['carve-key'] ?? '', namespace: (f['carve-namespace'] ?? 'heading') as 'heading', ...(f['carve-display-form'] ? { form: f['carve-display-form'] as 'full' } : {}), ...(!f['carve-unresolved'] ? { href: c[2][0] } : {}) }, clean)]; return [withAttr({ type: 'link', children: inlineList(c[1], warnings), ...(f['carve-unresolved'] ? {} : { href: c[2][0] }), ...(c[2][1] ? { tooltip: c[2][1] } : {}), ...(f['carve-key'] ? { key: f['carve-key'], namespace: 'link', form: f['carve-form'] === 'collapsed' ? 'collapsed' as const : 'full' as const } : {}) }, clean)]; }
    case 'Image': { const a = c[0] as P.Attr; const f = Object.fromEntries(a[2]); const clean: P.Attr = [a[0], a[1], a[2].filter(([k]) => !['carve-key','carve-form','carve-unresolved'].includes(k))]; return [withAttr({ type: 'image', ...(f['carve-unresolved'] ? {} : { src: c[2][0] }), alt: c[1].map((x: P.PandocNode) => x.t === 'Str' ? String(x.c) : x.t === 'Space' ? ' ' : '').join(''), ...(c[2][1] ? { tooltip: c[2][1] } : {}), ...(f['carve-key'] ? { key: f['carve-key'], namespace: 'link', form: f['carve-form'] === 'collapsed' ? 'collapsed' as const : 'full' as const } : {}) }, clean)]; }
    case 'Span': { const a = c[0] as P.Attr; const children = inlineList(c[1], warnings); const fields = Object.fromEntries(a[2]); if (a[1].includes('carve-footnote-ref')) return [{ type: 'footnote_ref', namespace: 'footnote', key: fields['key'] ?? '' }]; if (a[1].includes('carve-smart')) return [{ type: 'smart_punctuation', kind: fields['kind'] ?? 'em_dash', source: fields['source'] ?? '', ...(fields['glyph'] ? { glyph: fields['glyph'] } : {}) }]; if (a[1].includes('carve-delete')) return [{ type: 'delete', children }]; if (a[1].includes('carve-insert')) return [{ type: 'insert', children }]; if (a[1].includes('carve-mention')) return [{ type: 'mention', target: fields['target'] ?? '', kind: fields['kind'] ?? 'user' }]; if (a[1].includes('carve-tag')) return [{ type: 'tag', name: fields['name'] ?? '' }]; if (a[1].includes('carve-symbol')) return [{ type: 'symbol', name: fields['name'] ?? '' }]; if (a[1].includes('carve-abbreviation')) return [{ type: 'text', value: fields['key'] ?? '' }]; return a[1].includes('mark') ? [withAttr({ type: 'highlight', children }, a)]: [withAttr({ type: 'span', children }, a)]; }
    case 'Note': { const children = blockList(c, warnings).flatMap(x => x.type === 'paragraph' ? x.children : []); if (children.length === 0) warnings.push('Note: block content cannot be represented by inline_footnote'); return [{ type: 'inline_footnote', children }]; }
    case 'Quoted': warnings.push('Quoted: quote structure becomes punctuation'); return [{ type: 'text', value: c[0].t === 'SingleQuote' ? '‘' : '“' }, ...inlineList(c[1], warnings), { type: 'text', value: c[0].t === 'SingleQuote' ? '’' : '”' }];
    case 'Cite': return [{ type: 'citation_group', raw: c[1].map((x: P.PandocNode) => x.t === 'Str' ? x.c : '').join('') || `[${c[0].map((x: P.Citation) => '@' + x.citationId).join('; ')}]`, children: c[0].map((x: P.Citation) => ({ type: 'citation', key: x.citationId, namespace: 'citation', suppressAuthor: x.citationMode.t === 'SuppressAuthor' })) }];
    default: warnings.push(`${node.t}: unsupported Pandoc inline`); return [{ type: 'text', value: String(node.c ?? '') }];
  }
}

function importTable(c: any[], warnings: string[]): TableNode {
  const row = (r: any[], header: boolean): TableRowNode => withAttr({ type: 'table_row', children: r[1].map((cell: any[]) => {
    const content = blockList(cell[4], warnings);
    const children: TableCellNode['children'] = content.length === 1 && content[0]?.type === 'paragraph' ? [{ type: 'cell_paragraph', children: content[0].children }] : content;
    return withAttr({ type: 'table_cell', header, ...(cell[1].t === 'AlignDefault' ? {} : { align: cell[1].t === 'AlignLeft' ? 'left' as const : cell[1].t === 'AlignRight' ? 'right' as const : 'center' as const }), ...(cell[2] > 1 ? { rowspan: cell[2] } : {}), ...(cell[3] > 1 ? { colspan: cell[3] } : {}), children }, cell[0]);
  }) }, r[0]);
  const children: TableNode['children'] = [];
  if (c[3][1].length) children.push(withAttr({ type: 'table_head', children: c[3][1].map((r: any[]) => row(r, true)) }, c[3][0]));
  for (const b of c[4]) children.push(withAttr({ type: 'table_body', ...(b[2].length ? { headRows: b[2].length } : {}), ...(b[1] ? { rowHeadColumns: b[1] } : {}), children: [...b[2].map((r: any[]) => row(r, true)), ...b[3].map((r: any[]) => row(r, false))] }, b[0]));
  if (c[5][1].length) children.push(withAttr({ type: 'table_foot', children: c[5][1].map((r: any[]) => row(r, false)) }, c[5][0]));
  const columns: TableNode['columns'] = c[2].map((x: any[]) => ({ type: 'table_column', ...(x[0].t === 'AlignDefault' ? {} : { align: x[0].t === 'AlignLeft' ? 'left' as const : x[0].t === 'AlignRight' ? 'right' as const : 'center' as const, authored: true as const }), ...(x[1].t === 'ColWidth' ? { width: x[1].c, authored: true as const } : {}) }));
  const caption: CaptionNode | undefined = c[1][1].length ? { type: 'caption', children: blockList(c[1][1], warnings), ...(c[1][0] ? { short: inlineList(c[1][0], warnings) } : {}) } : undefined;
  return withAttr({ type: 'table', columns, children, ...(caption ? { caption } : {}) }, c[0]);
}

function importBlock(node: P.PandocNode, warnings: string[]): Block[] {
  const c = node.c as any;
  switch (node.t) {
    case 'Para': case 'Plain': return [{ type: 'paragraph', children: inlineList(c, warnings) }];
    case 'Header': { const a = c[1] as P.Attr; const generated = a[2].some(([key]) => key === 'carve-generated-id'); const cleaned: P.Attr = [generated ? '' : a[0], a[1], a[2].filter(([key]) => key !== 'carve-generated-id')]; return [withAttr({ type: 'heading', level: c[0], children: inlineList(c[2], warnings) }, cleaned)]; }
    case 'HorizontalRule': return [{ type: 'thematic_break' }];
    case 'BlockQuote': return [{ type: 'block_quote', children: blockList(c, warnings) }];
    case 'CodeBlock': { const a = c[0] as P.Attr; const groupLabel = a[2].find(([key]) => key === 'carve-group-label')?.[1]; const title = readTitle(a[2].find(([key]) => key === 'carve-title')?.[1]); return [withAttr({ type: 'code_block', value: c[1], ...(a[1][0] ? { syntax: a[1][0] } : {}), ...(groupLabel ? { groupLabel } : {}), ...(title ? { title } : {}) }, [a[0], a[1].slice(1), a[2].filter(([key]) => key !== 'carve-group-label' && key !== 'carve-title')])]; }
    case 'RawBlock': return c[0] === 'carve-tree' ? [JSON.parse(c[1]) as Block] : c[0].startsWith('carve-frontmatter:') ? [{ type: 'frontmatter', format: c[0].slice('carve-frontmatter:'.length), value: c[1] } as unknown as Block] : c[0].startsWith('carve-comment-') ? [{ type: 'comment', form: c[0].slice('carve-comment-'.length), value: c[1] }] : [{ type: 'raw_block', format: c[0], value: c[1] }];
    case 'Div': { const a = c[0] as P.Attr; const kvs = Object.fromEntries(a[2]); const title = readTitle(kvs['carve-title']); if (a[1].includes('carve-figure-group')) { const caption = readCaption(kvs['carve-caption']); return [withAttr({ type: 'figure_group', children: blockList(c[1], warnings), ...(caption ? { caption } : {}) }, [a[0], a[1].filter(x => x !== 'carve-figure-group'), a[2].filter(([key]) => key !== 'carve-caption')])]; } if (a[1].includes('carve-list') && c[1].length === 1) { const list = importBlock(c[1][0], warnings)[0]; if (list?.type === 'list' && list.marker.kind === 'bullet' && kvs['marker-char'] === '*') return [{ ...list, marker: { kind: 'bullet', char: '*' } }]; } if (a[1].includes('carve-paragraph') && c[1].length === 1 && c[1][0].t === 'Para') { const cleaned: P.Attr = [a[0], a[1].filter(x => x !== 'carve-paragraph'), a[2].filter(([key]) => !['carve-block-image','carve-block-math'].includes(key))]; return [withAttr({ type: 'paragraph', children: inlineList(c[1][0].c, warnings), ...(kvs['carve-block-image'] ? { blockImage: true as const } : {}), ...(kvs['carve-block-math'] ? { blockMath: true as const } : {}) }, cleaned)]; } const cleaned: P.Attr = [a[0], a[1].filter(x => !['carve-section', 'carve-admonition', 'carve-directive'].includes(x)), a[2].filter(([key]) => !['carve-group-label', 'carve-section-level', 'carve-title'].includes(key))]; const children = blockList(c[1], warnings); if (a[1].includes('carve-section')) return [withAttr({ type: 'section', children, ...(kvs['carve-section-level'] ? { level: Number(kvs['carve-section-level']) } : {}) }, cleaned)]; if (a[1].includes('carve-admonition')) return [withAttr({ type: 'admonition', kind: a[1][a[1].indexOf('carve-admonition') + 1] as 'note', children, ...(kvs['carve-group-label'] ? { groupLabel: kvs['carve-group-label'] } : {}), ...(title ? { title } : {}) }, [cleaned[0], cleaned[1].filter(x => x !== a[1][a[1].indexOf('carve-admonition') + 1]), cleaned[2]])]; if (a[1].includes('carve-directive')) return [withAttr({ type: 'directive', kind: a[1][a[1].indexOf('carve-directive') + 1] as 'toc', children, ...(kvs['carve-group-label'] ? { groupLabel: kvs['carve-group-label'] } : {}), ...(title ? { title } : {}) }, [cleaned[0], cleaned[1].filter(x => x !== a[1][a[1].indexOf('carve-directive') + 1]), cleaned[2]])]; return [withAttr({ type: 'div', children, ...(kvs['carve-group-label'] ? { groupLabel: kvs['carve-group-label'] } : {}), ...(title ? { title } : {}) }, cleaned)]; }
    case 'BulletList': return [{ type: 'list', marker: { kind: 'bullet', char: '-' }, spacing: c.every((item: P.PandocNode[]) => item.every(b => b.t !== 'Para')) ? 'tight' : 'loose', children: c.map((item: P.PandocNode[]) => importItem(item, warnings)) }];
    case 'OrderedList': { const style = ({ LowerAlpha: 'a', UpperAlpha: 'A', LowerRoman: 'i', UpperRoman: 'I' } as Record<string, 'a'|'A'|'i'|'I'>)[c[0][1].t] ?? '1'; return [{ type: 'list', marker: { kind: 'ordered', style, delimiter: c[0][2].t === 'OneParen' ? ')' : '.', ...(c[0][0] === 1 ? {} : { start: c[0][0] }) }, spacing: c[1].every((item: P.PandocNode[]) => item.every(b => b.t !== 'Para')) ? 'tight' : 'loose', children: c[1].map((item: P.PandocNode[]) => importItem(item, warnings)) }]; }
    case 'LineBlock': return [{ type: 'line_block', children: c.map((line: P.PandocNode[]) => ({ type: 'line', children: inlineList(line, warnings) })) }];
    case 'DefinitionList': return [{ type: 'definition_list', children: c.flatMap((entry: [P.PandocNode[], P.PandocNode[][]]) => [{ type: 'definition_term', children: inlineList(entry[0], warnings) }, ...entry[1].map(xs => ({ type: 'definition_description', children: blockList(xs, warnings) }))]) }];
    case 'Figure': { const a = c[0] as P.Attr; const figureKind = a[2].find(([key]) => key === 'carve-figure-kind')?.[1]; const caption: CaptionNode | undefined = c[1][1].length ? { type: 'caption', children: blockList(c[1][1], warnings), ...(c[1][0] ? { short: inlineList(c[1][0], warnings) } : {}) } : undefined; return [withAttr({ type: 'figure', children: blockList(c[2], warnings), ...(caption ? { caption } : {}), ...(figureKind ? { kind: figureKind as 'image' } : {}) }, [a[0], a[1], a[2].filter(([key]) => key !== 'carve-figure-kind')])]; }
    case 'Table': return [importTable(c, warnings)];
    default: warnings.push(`${node.t}: unsupported Pandoc block`); return [];
  }
}

export function pandocToCarveAst(input: P.PandocDoc | string): { ast: DocumentNode; warnings: string[] } {
  const doc = typeof input === 'string' ? JSON.parse(input) as P.PandocDoc : input;
  const warnings: string[] = [];
  const ast: DocumentNode = { type: 'document', astVersion: '2.0', children: blockList(doc.blocks, warnings) };
  validateTree(ast);
  return { ast, warnings };
}
export function pandocToCarve(input: P.PandocDoc | string): { carve: string; warnings: string[] } {
  const { ast, warnings } = pandocToCarveAst(input);
  const output = writeWithDiagnostics(ast);
  warnings.push(...output.diagnostics.map(d => `${d.code}: ${d.message}`));
  return { carve: output.source, warnings };
}
