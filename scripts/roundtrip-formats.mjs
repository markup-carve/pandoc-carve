import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse, treesEqual } from '../vendor/carve-v2/index.js';
import { carveAstToPandoc, pandocToCarveAst } from '../dist/v2.js';
import { grade } from './roundtrip-grade.mjs';

const root = resolve(import.meta.dirname, '..');
const fixtures = join(root, 'test/fixtures/probes-0.2');
const fidelity = JSON.parse(readFileSync(join(root, 'test/fixtures/pandoc-fidelity-probes.json'), 'utf8'));
const formats = ['docx', 'odt', 'epub', 'html', 'latex', 'typst', 'jats', 'docbook', 'rst', 'org', 'asciidoc', 'mediawiki', 'ipynb', 'markdown', 'gfm', 'commonmark_x', 'djot'];
const pandoc = process.env.PANDOC || 'pandoc';
const out = process.env.CARVE_RT_OUTPUT || join(root, 'docs/roundtrip-0.2-data.json');
const binary = new Set(['docx', 'odt', 'epub']);
const readers = new Set(execFileSync(pandoc, ['--list-input-formats'], { encoding: 'utf8' }).trim().split(/\s+/));
const writers = new Set(execFileSync(pandoc, ['--list-output-formats'], { encoding: 'utf8' }).trim().split(/\s+/));
const version = execFileSync(pandoc, ['--version'], { encoding: 'utf8' }).split('\n')[0];
const temp = mkdtempSync(join(tmpdir(), 'carve-rt-'));

// Defaults documented in ast.md C2-A-058 and C2-A-092. Resolution results are
// already excluded by the engine's treesEqual (C2-A-162).
function stripIncidental(x) {
  if (Array.isArray(x)) {
    const out = [];
    for (const item of x.map(stripIncidental)) {
      const last = out.at(-1);
      if (item?.type === 'text' && last?.type === 'text') last.value += item.value;
      else out.push(item);
    }
    return out;
  }
  if (!x || typeof x !== 'object') return x;
  const y = {};
  for (const [k, v] of Object.entries(x)) {
    if (['pos', 'segments', 'srcByteLength', 'stages', 'generatedId', 'resolvedAlign'].includes(k)) continue;
    if (k === 'n' && x.type === 'caption_number') continue;
    if (k === 'number' && ['footnote_ref', 'inline_footnote', 'math', 'citation'].includes(x.type)) continue;
    if ((k === 'href' || k === 'src') && x.key) continue;
    if (k === 'start' && x.kind === 'ordered' && v === 1) continue;
    if ((k === 'rowspan' || k === 'colspan') && x.type === 'table_cell' && v === 1) continue;
    if (k === 'attrs' && v && Object.keys(v).length === 0) continue;
    y[k] = stripIncidental(v);
  }
  return y;
}
function firstDifference(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return { path, field: 'length', before: a.length, after: b.length };
    for (let i = 0; i < a.length; i++) { const d = firstDifference(a[i], b[i], `${path}/${i}`); if (d) return d; }
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDifference(a[k], b[k], `${path}/${k}`); if (d) return d;
    }
  } else return { path, field: path.split('/').at(-1) || 'root', before: a, after: b };
  return { path, field: path.split('/').at(-1) || 'root', before: a, after: b };
}
function run(args, input, step) {
  const result = spawnSync(pandoc, args, { input, maxBuffer: 64 * 1024 * 1024, encoding: null });
  if (result.error || result.status !== 0) throw { step, message: (result.stderr?.toString() || result.error?.message || `exit ${result.status}`).trim().slice(0, 400) };
  return result.stdout;
}
function error(step, e) { return { verdict: 'error', step, message: String(e?.message ?? e).slice(0, 400) }; }
// EPUB and notebooks add document chrome on import. It is not authored content.
// Keep the raw JSON in the evidence and remove only recognized empty wrappers
// before handing the reader result to the bridge.
function removeReaderChrome(doc, fmt) {
  if (fmt !== 'epub' && fmt !== 'ipynb') return doc;
  let blocks = doc.blocks;
  if (fmt === 'epub') {
    blocks = blocks.filter(b => !(b.t === 'Para' && b.c?.length === 1 && b.c[0]?.t === 'Span' && b.c[0].c?.[1]?.length === 0));
    while (blocks.length === 1 && blocks[0]?.t === 'Div' && blocks[0].c?.[0]?.[1]?.includes('section')) blocks = blocks[0].c[1];
    blocks = blocks.filter(b => !(b.t === 'Header' && b.c?.[2]?.length === 0));
  }
  if (fmt === 'ipynb' && blocks.length === 1 && blocks[0]?.t === 'Div' && blocks[0].c?.[0]?.[1]?.includes('cell')) blocks = blocks[0].c[1];
  return { ...doc, blocks };
}
function opaqueCarriers(tree) {
  const names = new Set();
  function visit(x) {
    if (Array.isArray(x)) { x.forEach(visit); return; }
    if (!x || typeof x !== 'object') return;
    if (x.data !== undefined) names.add('data');
    for (const cls of x.attrs?.classes ?? []) if (/^(?:carve-|data-carve-)/.test(cls)) names.add(`class ${cls}`);
    for (const [key] of x.attrs?.keyValues ?? []) if (/^(?:carve[.-]|data-carve-)/.test(key)) names.add(`attribute ${key}`);
    Object.values(x).forEach(visit);
  }
  visit(tree);
  return [...names].sort();
}
function withoutOpaque(x) {
  if (Array.isArray(x)) return x.map(withoutOpaque);
  if (!x || typeof x !== 'object') return x;
  const y = Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'data').map(([k, v]) => [k, withoutOpaque(v)]));
  if (y.attrs) {
    if (y.attrs.classes) y.attrs.classes = y.attrs.classes.filter(v => !/^(?:carve-|data-carve-)/.test(v));
    if (y.attrs.keyValues) y.attrs.keyValues = y.attrs.keyValues.filter(([k]) => !/^(?:carve[.-]|data-carve-)/.test(k));
    if (!y.attrs.classes?.length) delete y.attrs.classes;
    if (!y.attrs.keyValues?.length) delete y.attrs.keyValues;
    if (!Object.keys(y.attrs).length) delete y.attrs;
  }
  return y;
}
function canonicalDirectBlocks(blocks) {
  // The bridge spells Plain as Para inside figure bodies and definition
  // descriptions. That changes tightness but not the paired feature being
  // measured (figure identity, figure attributes, definition-list identity).
  return blocks.map(block => {
    const copy = structuredClone(block);
    const para = b => b?.t === 'Plain' ? { ...b, t: 'Para' } : b;
    if (copy.t === 'Figure') copy.c[2] = copy.c[2].map(para);
    if (copy.t === 'DefinitionList') copy.c = copy.c.map(([term, descriptions]) => [term, descriptions.map(d => d.map(para))]);
    return copy;
  });
}
function reverseDirect(pair) {
  const doc = blocks => ({ 'pandoc-api-version': fidelity.api, meta: {}, blocks });
  try {
    const rich = pandocToCarveAst(doc(pair.rich));
    const degraded = pandocToCarveAst(doc(pair.degraded));
    const backRich = carveAstToPandoc(rich.ast).doc.blocks;
    const backDegraded = carveAstToPandoc(degraded.ast).doc.blocks;
    const distinct = !treesEqual(rich.ast, degraded.ast);
    const returned = JSON.stringify(backRich) !== JSON.stringify(backDegraded);
    const exactFeature = JSON.stringify(backRich) === JSON.stringify(canonicalDirectBlocks(pair.rich));
    const carrier = opaqueCarriers(rich.ast);
    const opaqueOnly = treesEqual(withoutOpaque(rich.ast), withoutOpaque(degraded.ast));
    const verdict = !distinct || !returned || !exactFeature ? 'dropped' : opaqueOnly && carrier.length ? 'data' : 'typed';
    return { verdict, ...(carrier.length ? { carrier } : {}), warnings: rich.warnings, tree: rich.ast, degradedTree: degraded.ast, backRich, backDegraded };
  } catch (e) { return { verdict: 'refused', message: String(e?.message ?? e).slice(0, 400) }; }
}
const probes = readdirSync(fixtures).filter(x => x.endsWith('.crv')).sort();
const result = { version, formats, readers: Object.fromEntries(formats.map(f => [f, readers.has(f)])), probes, cells: {}, reverse: { probes: Object.keys(fidelity.probes), direct: {}, formats: {} } };
try {
  for (const file of probes) {
    const name = file.slice(0, -4);
    const cells = result.cells[name] = {};
    let initial, exported, baseline;
    try { initial = parse(readFileSync(join(fixtures, file), 'utf8')); }
    catch (e) { for (const fmt of formats) cells[fmt] = error('Carve parse', e); continue; }
    try { exported = carveAstToPandoc(initial); }
    catch (e) { for (const fmt of formats) cells[fmt] = error('bridge export', e); continue; }
    try { baseline = pandocToCarveAst(exported.doc); }
    catch (e) { baseline = { error: String(e) }; }
    const initialClean = stripIncidental(initial);
    const baselineDiff = baseline.error ? { path: '/', field: 'import error', before: null, after: baseline.error } : treesEqual(initial, baseline.ast) ? null : firstDifference(initialClean, stripIncidental(baseline.ast));
    for (const fmt of formats) {
      if (!writers.has(fmt)) { cells[fmt] = error('Pandoc writer', 'writer unavailable'); continue; }
      if (!readers.has(fmt)) { cells[fmt] = { verdict: 'error', step: 'Pandoc reader', message: 'writer only: Pandoc has no reader for this format' }; continue; }
      let written, back;
      const path = join(temp, `document.${fmt}`);
      try {
        if (binary.has(fmt)) { run(['-f', 'json', '-t', fmt, '--wrap=preserve', '--resource-path', fixtures, '-o', path], Buffer.from(JSON.stringify(exported.doc)), 'Pandoc writer'); written = readFileSync(path); }
        else written = run(['-f', 'json', '-t', fmt, '--wrap=preserve', '-o', '-', '--resource-path', fixtures], Buffer.from(JSON.stringify(exported.doc)), 'Pandoc writer');
      } catch (e) { cells[fmt] = error(e.step || 'Pandoc writer', e); continue; }
      try { back = JSON.parse(run(['-f', fmt, '-t', 'json'], written, 'Pandoc reader').toString()); }
      catch (e) { cells[fmt] = error(e.step || 'Pandoc reader', e); continue; }
      const cleanedBack = removeReaderChrome(back, fmt);
      let imported;
      try { imported = pandocToCarveAst(cleanedBack); }
      catch (e) { cells[fmt] = error('bridge import', e); cells[fmt].pandocBefore = exported.doc; cells[fmt].pandocAfter = back; continue; }
      const graded = grade(initial, imported.ast);
      const equal = graded.verdict === 'exact';
      const afterClean = stripIncidental(imported.ast);
      const diff = firstDifference(initialClean, afterClean);
      const pandocDifference = firstDifference(exported.doc.blocks, cleanedBack.blocks);
      let attribution = equal ? null : baselineDiff ? 'bridge on export or import' : pandocDifference ? 'Pandoc writer or reader; not determined' : 'bridge on import';
      if (!equal && !baselineDiff && pandocDifference && !binary.has(fmt)) {
        // Differential writer check: write the original and the observed
        // degraded tree through the same writer with identical options.
        try {
          const degradedDoc = carveAstToPandoc(imported.ast).doc;
          const degradedText = run(['-f', 'json', '-t', fmt, '--wrap=preserve', '-o', '-', '--resource-path', fixtures], Buffer.from(JSON.stringify(degradedDoc)), 'Pandoc writer');
          attribution = written.equals(degradedText) ? 'Pandoc writer: rich and degraded output identical' : 'Pandoc reader: rich and degraded output differ';
        } catch {
          const src = diff?.field === 'src' ? diff.after : null;
          if (fmt === 'ipynb' && typeof src === 'string' && /^[0-9a-f-]{36}-/.test(src) && written.toString().includes('attachment:'))
            attribution = 'Pandoc writer and reader: attachment source and cell id rewrite';
          else attribution = 'Pandoc writer or reader; differential unavailable';
        }
      }
      if (!equal && !baselineDiff && pandocDifference && binary.has(fmt)) attribution = 'Pandoc writer or reader; binary split not determined';
      const readerAddedMetaKeys = Object.keys(back.meta ?? {}).filter(k => !(k in exported.doc.meta));
      const stableBack = { ...back, meta: Object.fromEntries(Object.entries(back.meta ?? {}).filter(([k]) => k in exported.doc.meta)) };
      cells[fmt] = { ...graded, ...(diff ? { difference: diff } : {}), ...(attribution ? { attribution } : {}), ...(baselineDiff ? { bridgeBaselineDifference: baselineDiff } : {}), ...(pandocDifference ? { pandocDifference } : {}), ...(equal ? {} : { pandocBefore: exported.doc, pandocAfter: stableBack, ...(readerAddedMetaKeys.length ? { readerAddedMetaKeys } : {}), ...(!binary.has(fmt) ? { writerText: written.toString().slice(0, 20000) } : {}) }), ...(exported.warnings.length ? { exportWarnings: exported.warnings } : {}), ...(imported.warnings.length ? { importWarnings: imported.warnings } : {}) };
    }
    process.stderr.write(`${name}\n`);
  }
  for (const [name, pair] of Object.entries(fidelity.probes)) {
    const direct = reverseDirect(pair);
    result.reverse.direct[name] = { verdict: direct.verdict, ...(direct.carrier ? { carrier: direct.carrier } : {}), ...(direct.warnings?.length ? { warnings: direct.warnings } : {}), ...(direct.message ? { message: direct.message } : {}) };
    for (const fmt of formats) {
      const grid = result.reverse.formats[fmt] ??= {};
      if (!readers.has(fmt) || !writers.has(fmt)) { grid[name] = { verdict: 'error', message: 'reader or writer unavailable' }; continue; }
      try {
        const transfer = blocks => {
          const doc = { 'pandoc-api-version': fidelity.api, meta: {}, blocks };
          const path = join(temp, `reverse.${fmt}`);
          const input = Buffer.from(JSON.stringify(doc));
          let written;
          if (binary.has(fmt)) { run(['-f', 'json', '-t', fmt, '--wrap=preserve', '--resource-path', join(root, 'test/fixtures/pandoc-fidelity'), '-o', path], input, 'Pandoc writer'); written = readFileSync(path); }
          else written = run(['-f', 'json', '-t', fmt, '--wrap=preserve', '--resource-path', join(root, 'test/fixtures/pandoc-fidelity'), '-o', '-'], input, 'Pandoc writer');
          const back = JSON.parse(run(['-f', fmt, '-t', 'json'], written, 'Pandoc reader').toString());
          const clean = removeReaderChrome(back, fmt);
          return { tree: pandocToCarveAst(clean).ast, blocks: clean.blocks };
        };
        const rich = transfer(pair.rich);
        const degraded = transfer(pair.degraded);
        grid[name] = {
          verdict: treesEqual(rich.tree, degraded.tree) ? 'lost' : direct.tree && treesEqual(rich.tree, direct.tree) ? 'same-tree' : 'kept',
          formatCarries: JSON.stringify(rich.blocks) !== JSON.stringify(degraded.blocks),
        };
      } catch (e) { grid[name] = { verdict: 'error', step: e.step ?? 'bridge on import', message: String(e?.message ?? e).slice(0, 300) }; }
    }
    process.stderr.write(`reverse ${name}\n`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(resolve(out, '..'), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(`wrote ${out}: ${probes.length} probes x ${formats.length} formats`);
