import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse, treesEqual } from '../vendor/carve-v2/index.js';
import { carveAstToPandoc, pandocToCarve } from '../dist/v2.js';

const root = resolve(import.meta.dirname, '..');
const samples = [];
function collect(dir) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.name.endsWith('.crv')) samples.push({ label: path, source: readFileSync(join(root, path), 'utf8'), group: 'fixtures' });
  }
}
collect('test/fixtures'); collect('examples');
for (const e of JSON.parse(readFileSync(join(root, '../carve-js/v2/data/examples.json'), 'utf8'))) samples.push({ label: `${e.file} ${e.number}`, source: e.input, group: 'specification' });
const results = [];
function normalized(value) {
  if (Array.isArray(value)) {
    const output = [];
    for (const item of value.map(normalized)) {
      const last = output.at(-1);
      if (item?.type === 'text' && last?.type === 'text') last.value += item.value;
      else output.push(item);
    }
    return output;
  }
  if (value === null || typeof value !== 'object') return value;
  const skip = new Set(['pos', 'segments', 'srcByteLength', 'stages', 'generatedId', 'resolvedAlign', 'n']);
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (skip.has(key) || child === undefined) continue;
    if ((value.type === 'link' || value.type === 'image' || value.type === 'xref') && value.key && (key === 'href' || key === 'src')) continue;
    if ((value.type === 'footnote_ref' || value.type === 'inline_footnote') && key === 'number') continue;
    output[key] = normalized(child);
  }
  return output;
}
function difference(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: list length ${a.length} -> ${b.length}`;
    for (let i = 0; i < a.length; i++) { const found = difference(a[i], b[i], `${path}/${i}`); if (found) return found; }
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) { const found = difference(a[key], b[key], `${path}/${key}`); if (found) return found; }
  }
  return `${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`;
}
for (const sample of samples) {
  try {
    const initial = parse(sample.source);
    const exported = carveAstToPandoc(initial);
    const imported = pandocToCarve(exported.doc);
    const final = parse(imported.carve);
    const equal = treesEqual(initial, final);
    results.push({ group: sample.group, label: sample.label, equal, cause: equal ? undefined : difference(normalized(initial), normalized(final)), warnings: [...exported.warnings, ...imported.warnings] });
  } catch (error) {
    results.push({ group: sample.group, label: sample.label, equal: false, error: String(error) });
  }
}
const summary = Object.fromEntries(['fixtures', 'specification'].map(group => {
  const subset = results.filter(r => r.group === group);
  return [group, { total: subset.length, equal: subset.filter(r => r.equal).length, different: subset.filter(r => !r.equal && !r.error).length, errors: subset.filter(r => r.error).length }];
}));
console.log(JSON.stringify({ summary, differences: results.filter(r => !r.equal) }, null, 2));
