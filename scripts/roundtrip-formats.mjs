import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse, treesEqual } from '../vendor/carve-v2/index.js';
import { carveAstToPandoc, pandocToCarveAst } from '../dist/v2.js';

const root = resolve(import.meta.dirname, '..');
const fixtures = join(root, 'test/fixtures/probes-0.2');
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
function defaultNames(a, b) {
  const raw = firstDifference(a, b);
  if (!raw) return [];
  const names = [];
  for (const x of [a, b]) {
    const s = JSON.stringify(x);
    if (/"start":1/.test(s)) names.push('ordered start 1');
    if (/"(?:rowspan|colspan)":1/.test(s)) names.push('cell span 1');
    if (/"attrs":\{\}/.test(s)) names.push('empty attributes');
  }
  return [...new Set(names)];
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
const probes = readdirSync(fixtures).filter(x => x.endsWith('.crv')).sort();
const result = { version, formats, readers: Object.fromEntries(formats.map(f => [f, readers.has(f)])), probes, cells: {} };
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
      const equal = treesEqual(initial, imported.ast);
      const afterClean = stripIncidental(imported.ast);
      const diff = firstDifference(initialClean, afterClean);
      const defaults = defaultNames(initial, imported.ast);
      const equivalent = !equal && !firstDifference(initialClean, afterClean) && defaults.length > 0;
      const pandocDifference = firstDifference(exported.doc.blocks, cleanedBack.blocks);
      const attribution = equal || equivalent ? null : baselineDiff ? 'bridge export or import' : pandocDifference ? 'Pandoc writer or reader; not determined' : 'bridge import';
      const readerAddedMetaKeys = Object.keys(back.meta ?? {}).filter(k => !(k in exported.doc.meta));
      const stableBack = { ...back, meta: Object.fromEntries(Object.entries(back.meta ?? {}).filter(([k]) => k in exported.doc.meta)) };
      cells[fmt] = { verdict: equal ? 'exact' : equivalent ? 'equivalent' : 'lossy', ...(equivalent ? { defaults } : {}), ...(diff ? { difference: diff } : {}), ...(attribution ? { attribution } : {}), ...(baselineDiff ? { bridgeBaselineDifference: baselineDiff } : {}), ...(pandocDifference ? { pandocDifference } : {}), ...(equal ? {} : { pandocBefore: exported.doc, pandocAfter: stableBack, ...(readerAddedMetaKeys.length ? { readerAddedMetaKeys } : {}), ...(!binary.has(fmt) ? { writerText: written.toString().slice(0, 20000) } : {}) }), ...(exported.warnings.length ? { exportWarnings: exported.warnings } : {}), ...(imported.warnings.length ? { importWarnings: imported.warnings } : {}) };
    }
    process.stderr.write(`${name}\n`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(resolve(out, '..'), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(`wrote ${out}: ${probes.length} probes x ${formats.length} formats`);
