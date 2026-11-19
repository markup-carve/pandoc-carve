import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from '../vendor/carve/index.js';
import { pandocToCarveAst } from '../dist/convert.js';

const root = resolve(import.meta.dirname, '..');
const slots = JSON.parse(readFileSync(join(root, 'vendor/carve/node-slots.json'), 'utf8')).nodes;
const words = value => (value.match(/[\p{L}\p{N}]+/gu) ?? []).map(x => x.toLowerCase());
const htmlText = value => value.replace(/<[^>]*>/gu, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gu, ' ');
function childAt(node, path) {
  let value = node;
  for (const part of path.split('.')) value = value?.[part];
  return value;
}
function readable(node, format) {
  if (Array.isArray(node)) return node.map(x => readable(x, format)).join(' ');
  if (!node || typeof node !== 'object') return '';
  if (['comment', 'critic_comment', 'frontmatter', 'link_reference_definition', 'citation_definition', 'abbreviation_def', 'footnote'].includes(node.type)) return '';
  if (node.type === 'raw_block' || node.type === 'raw_inline') {
    if (node.format === 'html') return htmlText(node.value);
    return node.format === format ? node.value : '';
  }
  let text = node.type === 'image' ? node.alt ?? '' : node.type === 'autolink' ? node.text ?? node.href : node.type === 'smart_punctuation' ? node.glyph ?? '' : typeof node.value === 'string' ? node.value : '';
  for (const slot of slots[node.type] ?? []) {
    if (slot.includes('*')) continue;
    text += ` ${readable(childAt(node, slot), format)}`;
  }
  return text;
}
function facts(tree, kind, format) {
  const out = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    if (kind === 'link' && ['link', 'autolink', 'xref'].includes(node.type)) out.push(node.href ?? (node.type === 'autolink' ? node.href : null));
    if (kind === 'image' && node.type === 'image') out.push([node.src ?? null, node.alt ?? '']);
    if (kind === 'cell' && node.type === 'table_cell') out.push(words(readable(node, 'html')).join(' '));
    if (kind === 'math' && node.type === 'math') out.push(node.value);
    if (kind === 'code' && ['code', 'code_block'].includes(node.type)) out.push(node.value);
    if (kind === 'raw' && ['raw_inline', 'raw_block'].includes(node.type) && (node.format === format || (format === 'gfm' && node.format === 'html'))) out.push([node.format, node.value]);
    for (const slot of slots[node.type] ?? []) {
      if (slot.includes('*')) continue;
      visit(childAt(node, slot));
    }
  }
  visit(tree);
  return out;
}
const containedInOrder = (a, b) => { let at = 0; for (const token of b) if (token === a[at]) at++; return at === a.length; };
export function classifyLosses(data) {
  const sources = new Map();
  for (const [probe, row] of Object.entries(data.cells)) {
    const source = sources.get(probe) ?? parse(readFileSync(join(root, 'test/fixtures/probes-0.2', `${probe}.crv`), 'utf8'));
    sources.set(probe, source);
    for (const [format, cell] of Object.entries(row)) {
      if (cell.verdict !== 'lossy' && cell.verdict !== 'lossy-by-nature') continue;
      let after;
      try { after = pandocToCarveAst(cell.pandocAfter).ast; }
      catch { cell.lossCause = 'bridge could not import the Pandoc reader result'; continue; }
      const originalWords = words(readable(source, format));
      const returnedWords = words(readable(after, format));
      const lostWords = !containedInOrder(originalWords, returnedWords);
      const lost = ['link', 'image', 'cell', 'math', 'code', 'raw'].filter(kind => {
        const before = facts(source, kind, format);
        if (kind === 'raw' && before.length === 0) return false;
        return JSON.stringify(before) !== JSON.stringify(facts(after, kind, format));
      });
      const nature = !lostWords && lost.length === 0;
      cell.verdict = nature ? 'lossy-by-nature' : 'lossy';
      cell.lossCause = lost.length ? `${lost.join(', ')} changed` : lostWords ? `words changed: ${cell.differenceBlock?.before ?? 'content'} → ${cell.differenceBlock?.after ?? 'nothing'}` : 'source role or attributes lost; words retained';
    }
  }
  return data;
}
