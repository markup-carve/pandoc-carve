import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from '../vendor/carve-v2/index.js';

const repo = resolve(import.meta.dirname, '..');
const brief = process.env.CARVE_RT_BRIEF_DIR;
const run = JSON.parse(readFileSync(join(repo, 'docs/roundtrip-0.2-data.json'), 'utf8'));
const names = run.probes.map(x => x.slice(0, -4));
const cell = (p, f) => run.cells[p][f];
const counts = Object.fromEntries(run.formats.map(f => [f, Object.fromEntries(['exact', 'equivalent', 'lossy', 'error'].map(v => [v, names.filter(p => cell(p, f).verdict === v).length]))]));
const fmt = fs => fs.map(x => `\`${x}\``).join(', ');
const short = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 90);
function nodeAt(probe, path) {
  let x = parse(readFileSync(join(repo, 'test/fixtures/probes-0.2', `${probe}.crv`), 'utf8'));
  let last = x?.type || 'document';
  for (const part of path.split('/').filter(Boolean)) {
    if (x?.type) last = x.type;
    if (x === undefined || x === null) break;
    x = x[Number.isInteger(Number(part)) && part !== '' ? Number(part) : part];
  }
  return last;
}
const markers = ['carve-tree','carve-frontmatter','carve-comment','carve-critic-comment','carve-generated-id','carve-list','carve-task','carve-span','carve-columns','carve-head-rows','carve-block-image','carve-block-math','carve-paragraph','carve-figure-group','carve-figure-kind','carve-admonition','carve-directive','carve-title','carve-group-label','carve-abbreviation','carve-mention','carve-tag','carve-symbol','carve-smart','carve-xref','carve-inline-attrs','carve-block-quote','carve-literal','carve-delete','carve-insert','carve-autolink','carve-footnote-ref','carve-key','carve-form'];
function lostMarkers(x) {
  if (!x.pandocBefore || !x.pandocAfter) return [];
  const before = JSON.stringify(x.pandocBefore.blocks), after = JSON.stringify(x.pandocAfter.blocks);
  return markers.filter(m => before.includes(m) && !after.includes(m)).map(m => ({ marker: m, step: x.writerText === undefined ? 'not determined' : x.writerText.includes(m) ? 'Pandoc reader' : 'Pandoc writer' }));
}
const relevant = {
  abbreviation: ['carve-tree'], footnote: ['carve-tree'], image_reference: ['carve-tree','carve-key'], link_reference: ['carve-tree','carve-key'], link_reference_collapsed: ['carve-tree','carve-key'], frontmatter: ['carve-frontmatter'],
  comment_line: ['carve-comment'], comment_block: ['carve-comment'], comment_braced: ['carve-comment'], editorial_comment: ['carve-critic-comment'],
  heading: ['carve-generated-id'], heading_level_6: ['carve-generated-id'], heading_authored_id: ['carve-generated-id'], xref: ['carve-xref','carve-generated-id'],
  list_bullet_star: ['carve-list'], task_done: ['carve-task'], task_other: ['carve-task'], task_mixed: ['carve-task'],
  table_colspan: ['carve-span'], table_rowspan: ['carve-span'],
  table_alignment: ['carve-columns'], table_body_partition: ['carve-head-rows'],
  admonition: ['carve-admonition'], admonition_label: ['carve-group-label','carve-admonition'], admonition_title: ['carve-title','carve-admonition'], div_title: ['carve-title'], code_block_title: ['carve-title'],
  mention: ['carve-mention'], tag: ['carve-tag'], symbol: ['carve-symbol'], smart_dash: ['carve-smart'], smart_quotes: ['carve-smart'], literal_inline: ['carve-literal'],
  autolink: ['carve-autolink'], autolink_attrs: ['carve-autolink'], insertion: ['carve-insert'], deletion: ['carve-delete'], replacement: ['carve-delete','carve-insert'],
  emphasis_attrs: ['carve-inline-attrs'], strong_attrs: ['carve-inline-attrs'], math_attrs: ['carve-inline-attrs'], inline_footnote_attrs: ['carve-inline-attrs'], block_quote_attrs: ['carve-block-quote'],
};
function attribution(p, x) {
  if (x.verdict === 'error') return `${x.step}: ${short(x.message)}`;
  if (x.bridgeBaselineDifference) return 'Bridge export/import: direct Pandoc JSON baseline differs';
  if (!x.pandocDifference) return 'Bridge import: Pandoc JSON blocks are unchanged';
  const m = lostMarkers(x).find(z => relevant[p]?.includes(z.marker));
  if (m) return `${m.step}: ${m.marker} absent after format`;
  return 'Not determined: Pandoc writer or reader';
}

let md = `# Carve 0.2 through Pandoc formats\n\n${run.version}; ${names.length} source probes, ${run.formats.length} formats. Every cell runs Carve source → 0.2 tree → Pandoc JSON → writer → reader → Pandoc JSON → 0.2 tree. Equality uses the vendored engine's \`treesEqual\`. \`equivalent\` is reserved for documented defaults: ordered start 1, cell span 1, and empty attributes; resolution results are already excluded by \`treesEqual\`. No cell met the separate equivalent rule in this run.\n\nDOCX, ODT and EPUB use actual files; all other formats use writer stdout. Writers use \`--wrap=preserve\` and a resource path containing the probe PNGs. EPUB's empty chapter wrapper and notebook's sole cell wrapper are removed before the bridge import; the original reader blocks remain in [the evidence](roundtrip-0.2-data.json). Volatile metadata added by EPUB is listed by key and omitted from the saved JSON. Pandoc ${run.readers.asciidoc ? 'has an AsciiDoc reader in this installation' : 'has no AsciiDoc reader; its cells are writer-only errors'}. No PDF run was attempted.\n\n## Grid\n\n`;
md += `| Probe | ${run.formats.join(' | ')} |\n| --- | ${run.formats.map(() => '---').join(' | ')} |\n`;
for (const p of names) md += `| [${p}](../test/fixtures/probes-0.2/${p}.crv) | ${run.formats.map(f => cell(p, f).verdict).join(' | ')} |\n`;
md += '\n## Attribution by feature\n\nEach row groups formats with the same first differing tree node and field and the same supported attribution. The before and after Pandoc JSON for every nonexact cell, including the original EPUB/notebook wrappers, are in [the evidence](roundtrip-0.2-data.json). “Not determined” means the JSON snapshots show a change across the format boundary but do not distinguish the writer from the reader. A writer/reader attribution based on a carrier is made only when that carrier is present in the first JSON and absent in the second; the saved writer text distinguishes those steps for text formats.\n\n| Probe | Formats | First differing node.field | Attribution |\n| --- | --- | --- | --- |\n';
for (const p of names) {
  const groups = new Map();
  for (const f of run.formats) {
    const x = cell(p, f);
    if (x.verdict === 'exact') continue;
    const d = x.difference || { path: '/', field: x.verdict === 'equivalent' ? `defaults: ${x.defaults?.join(', ')}` : x.step || 'error' };
    const where = `${nodeAt(p, d.path)}.${d.field} (${d.path || '/'})`;
    const stage = attribution(p, x);
    const key = `${where}|${stage}`;
    if (!groups.has(key)) groups.set(key, { where, stage, formats: [] });
    groups.get(key).formats.push(f);
  }
  for (const g of groups.values()) md += `| ${p} | ${fmt(g.formats)} | ${short(g.where)} | ${short(g.stage)} |\n`;
}
md += '\n## Scope of the attribution\n\nThe direct bridge export/import baseline is equal for all 99 probes. The format changes above are therefore observed after the first Pandoc JSON and before or at bridge import. A lost Pandoc carrier does not prove that a format has no way to express the underlying content; it proves this bridge’s carrier did not survive Pandoc’s writer/reader pair. Ordinary text reflow, code trailing line feeds, image paths rewritten to embedded media, and table normalization are recorded as tree loss when they change a compared field.\n';
writeFileSync(join(repo, 'docs/roundtrip-0.2.md'), md);

const gaps = [
  { title: 'Definitions and raw frontmatter', markers: ['carve-tree','carve-frontmatter'], probes: ['abbreviation','footnote','image_reference','link_reference','link_reference_collapsed','frontmatter'], need: 'A standard data namespace for typed definitions and frontmatter provenance.' },
  { title: 'Comments and editorial comments', markers: ['carve-comment','carve-critic-comment'], probes: ['comment_line','comment_block','comment_braced','editorial_comment'], need: 'A standard data namespace for comment form and placement.' },
  { title: 'Titles and labels on containers', markers: ['carve-title','carve-group-label'], probes: ['admonition_title','admonition_label','div_title','code_block_title'], need: 'A standard data namespace for inline title content and literal group labels.' },
  { title: 'Container roles and figure groups', markers: ['carve-admonition','carve-directive','carve-figure-group','carve-figure-kind'], probes: ['admonition','admonition_label','admonition_title','directive','figure_group','figure_caption','code_block_caption','math_caption'], need: 'A standard data namespace for typed container roles, figure groups, and figure kind.' },
  { title: 'Generated versus authored heading IDs', markers: ['carve-generated-id'], probes: ['heading','heading_level_6','xref'], need: 'A standard data namespace for heading ID provenance.' },
  { title: 'Literal inline versus code', markers: ['carve-literal'], probes: ['literal_inline'], need: 'A standard data namespace for the literal-inline role.' },
  { title: 'Table span marks and covered cells', markers: ['carve-span'], probes: ['table_colspan','table_rowspan'], need: 'A standard data namespace for source span marks and an explicit covered-cell rule.' },
  { title: 'Table authored columns and declared partitions', markers: ['carve-columns','carve-head-rows'], probes: ['table_alignment','table_body_partition'], need: 'A standard data namespace for authored versus resolved alignment and explicit zero head rows.' },
  { title: 'Block image and block math facts', markers: ['carve-block-image','carve-block-math'], probes: ['image','image_attrs','image_title','figure_caption','figure_group','math_display','math_caption'], need: 'A standard data namespace for paragraph blockImage and blockMath facts.' },
  { title: 'Paragraph attributes on hosts without Pandoc Attr', markers: ['carve-paragraph'], probes: ['paragraph_attrs','image','image_attrs','figure_caption','math_display'], need: 'A standard data namespace for paragraph attributes and promoted image/math paragraph identity.' },
  { title: 'Cross-reference identity', markers: ['carve-xref','carve-key','carve-form'], probes: ['xref','link_reference','link_reference_collapsed','image_reference'], need: 'A standard data namespace for keyed reference identity and display form.' },
  { title: 'Autolink identity', markers: ['carve-autolink'], probes: ['autolink','autolink_attrs'], need: 'A standard data namespace to distinguish authored autolinks from ordinary links.' },
  { title: 'Footnote reference identity', markers: ['carve-footnote-ref'], probes: ['footnote'], need: 'A standard data namespace to distinguish a keyed footnote reference from an inline note.' },
  { title: 'Inline attributes on un-attributed Pandoc nodes', markers: ['carve-inline-attrs'], probes: ['emphasis_attrs','strong_attrs','math_attrs','inline_footnote_attrs'], need: 'A standard data namespace for attributes on inline roles that have no Pandoc Attr slot.' },
  { title: 'Block quote attributes', markers: ['carve-block-quote'], probes: ['block_quote_attrs'], need: 'A standard data namespace for attributes on a quote.' },
  { title: 'Bullet glyph', markers: ['carve-list'], probes: ['list_bullet_star'], need: 'A standard data namespace for list marker.char.' },
  { title: 'Task states', markers: ['carve-task'], probes: ['task_done','task_other','task_mixed'], need: 'A standard data namespace for task mark and status.' },
  { title: 'Mentions, tags, symbols, abbreviations', markers: ['carve-mention','carve-tag','carve-symbol','carve-abbreviation'], probes: ['mention','tag','symbol','abbreviation'], need: 'A standard data namespace for the distinct inline roles and their typed payloads.' },
  { title: 'Smart punctuation source', markers: ['carve-smart'], probes: ['smart_dash','smart_quotes'], need: 'A standard data namespace for punctuation source and kind.' },
  { title: 'Insertion and deletion roles', markers: ['carve-insert','carve-delete'], probes: ['insertion','deletion','replacement'], need: 'A standard data namespace for edit roles where Pandoc has only generic Span.' },
];
for (const g of gaps) {
  g.cases = [];
  for (const p of g.probes) {
    const affected = run.formats.filter(f => {
      const x = cell(p, f);
      return x.verdict === 'lossy' && lostMarkers(x).some(m => g.markers.includes(m.marker));
    });
    if (affected.length) g.cases.push({ probe: p, formats: affected });
  }
  g.formats = [...new Set(g.cases.flatMap(c => c.formats))];
}
gaps.sort((a,b) => b.formats.length - a.formats.length || a.title.localeCompare(b.title));
let tree = '# Carve 0.2 tree and Pandoc carrier gaps\n\nThese are cross-model gaps observed in the 99-probe run. The Carve tree already has the named typed fact; Pandoc JSON has no native slot for it, so the bridge uses a marker. A listed format is one where that marker occurs in the first Pandoc JSON and is absent in the reader JSON. This is a carrier-loss census, not a claim that the format itself cannot express the visible feature. Counts rank distinct affected formats. For binary formats, the writer/reader split is not determined.\n\n| Rank | Gap | Affected formats | Lost or marked | Tree addition or convention |\n| ---: | --- | ---: | --- | --- |\n';
for (const [i,g] of gaps.entries()) tree += `| ${i+1} | ${g.title} | ${g.formats.length} | ${g.markers.map(x => `\`${x}\``).join(', ')} | ${g.need} |\n`;
tree += '\n## Observed probe and format cases\n\n| Gap | Probe | Formats with carrier loss |\n| --- | --- | --- |\n';
for (const g of gaps) for (const c of g.cases) tree += `| ${g.title} | ${c.probe} | ${fmt(c.formats)} |\n`;
tree += '\nThe run did not prove a missing Carve core node for any source-spellable probe: all 99 direct bridge JSON baselines are tree-equal. A typed foreign metadata projection remains a candidate because frontmatter is currently a raw value and Pandoc readers may return structured metadata; the present probes do not establish that adding a core field is necessary.\n';

const causeGroups = new Map();
for (const p of names) for (const f of run.formats) {
  const x = cell(p, f); if (x.verdict !== 'lossy') continue;
  const stage = attribution(p, x);
  const cause = p.startsWith('table_') ? 'Table structure, width, or alignment changed' : /^(list_|task_)/.test(p) ? 'List spacing, marker, or task changed' : /^(admonition|div|directive|figure|block_quote)/.test(p) ? 'Container role, title, or caption changed' : /^(image|math|code_block)/.test(p) ? 'Image, math, or code payload/role changed' : /^(abbreviation|footnote|frontmatter|comment|editorial_comment|link_reference)/.test(p) ? 'Definition, comment, or frontmatter carrier changed' : 'Inline role, attributes, or text changed';
  const entry = causeGroups.get(cause) || { total: 0, writer: 0, reader: 0, bridge: 0, undetermined: 0 };
  entry.total++;
  if (stage.startsWith('Pandoc writer')) entry.writer++;
  else if (stage.startsWith('Pandoc reader')) entry.reader++;
  else if (stage.startsWith('Bridge')) entry.bridge++;
  else entry.undetermined++;
  causeGroups.set(cause, entry);
}
const top = [...causeGroups].sort((a,b) => b[1].total-a[1].total).slice(0,5);
let report = `# Carve 0.2 format round-trip report\n\n${run.version}. The bridge tested ${names.length} Carve 0.2 source probes across ${run.formats.length} formats after local fixes. The direct bridge Pandoc JSON baseline is tree-equal for every probe.\n\n## Counts\n\n| Format | Exact | Equivalent | Lossy | Error |\n| --- | ---: | ---: | ---: | ---: |\n`;
for (const f of run.formats) report += `| ${f} | ${counts[f].exact} | ${counts[f].equivalent} | ${counts[f].lossy} | ${counts[f].error} |\n`;
report += '\n## Five most common observed loss groups\n\n| Cause | Cells | Pandoc writer | Pandoc reader | Bridge | Not determined |\n| --- | ---: | ---: | ---: | ---: | ---: |\n';
for (const [cause,n] of top) report += `| ${cause} | ${n.total} | ${n.writer} | ${n.reader} | ${n.bridge} | ${n.undetermined} |\n`;
report += '\nThe attribution table and both Pandoc JSON snapshots for each nonexact cell are in the bridge’s `docs/roundtrip-0.2.md` and `docs/roundtrip-0.2-data.json`. “Not determined” means the Pandoc snapshots changed but do not isolate the writer or reader.\n\n## Bridge fixes\n\nThe bridge now reconstructs abbreviation uses, preserves authored attributes on inline formatting, math, inline footnotes and block quotes through explicit Pandoc carriers, removes its own `mark` class when importing highlights, and carries table span marks, authored column alignment and an explicit zero head-row partition. The final direct JSON baseline has zero differences. The vendored engine was not changed.\n\n## Tree gaps\n\n' + tree + '\nFrom this measurement, the 0.2 tree can hold the tested rich-format content: every source probe has a tree-equal direct Pandoc JSON baseline, while formats vary widely in how much they return. The three additions with the broadest measured reach are standard `data` namespace profiles for definitions, comments and frontmatter; for reference and generated-ID provenance; and for table authored columns, partitions and covered cells. These are interchange conventions for facts the tree already types, rather than evidence that 0.2 needs new core nodes.\n';
if (brief) { writeFileSync(join(brief, '_TREE-GAPS.md'), tree); writeFileSync(join(brief, '_REPORT.md'), report); }
console.log(`wrote docs/roundtrip-0.2.md${brief ? ' and brief reports' : ''}`);
