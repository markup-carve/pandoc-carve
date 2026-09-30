import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { hasLoss } from '../dist/diagnostics.js';
import { findPandoc } from './helpers.mjs';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const pandoc = findPandoc();
const run = (args, input) => spawnSync(process.execPath, [cli, '-', ...args], {
  input, encoding: 'utf8', env: { ...process.env, PANDOC: pandoc ?? 'missing-pandoc' },
});

for (const roundtrip of [false, true]) {
  test(`ragged-table padding fails the loss gate with roundtrip=${roundtrip}`, () => {
    const source = '|= A |= B |\n| value |\n| c | d |\n';
    const result = carveToPandoc(source, { roundtrip });
    assert.equal(result.doc.blocks[0].c[2].length, 2);
    assert.match(pandocToCarve(result.doc).carve, /\| value \| \|/);
    const diagnostic = result.diagnostics.find(d => d.code === 'table-groups-normalized');
    assert.equal(diagnostic.fidelity, 'degraded');
    assert.equal(diagnostic.severity, 'warning');
    const args = ['-t', 'json', '--diagnostics', '-', ...(roundtrip ? ['--roundtrip'] : [])];
    assert.equal(run(args, source).status, 0);
    const strict = run([...args, '--fail-on-loss'], source);
    assert.equal(strict.status, 3, strict.stderr);
    assert.deepEqual(JSON.parse(strict.stdout), result.doc);
    assert.equal(JSON.parse(strict.stderr).diagnostics.find(d => d.code === 'table-groups-normalized').fidelity, 'degraded');
    const rectangular = run([...args, '--fail-on-loss'], '|= A |= B |\n| value | b |\n');
    assert.equal(rectangular.status, 0, rectangular.stderr);
  });
}

const attr = ['', [], []];
const plain = text => ({ t: 'Plain', c: [{ t: 'Str', c: text }] });
const list = { t: 'BulletList', c: [[plain('item')]] };
const cell = blocks => [attr, { t: 'AlignDefault' }, 1, 1, blocks];
const row = blocks => [attr, [cell(blocks)]];
const table = bodies => ({
  'pandoc-api-version': [1, 23, 1], meta: {},
  blocks: [{ t: 'Table', c: [attr, [null, []],
    [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]],
    [attr, []], bodies, [attr, []]] }],
});

for (const [code, counts] of [
  ['list-table-body-groups-merged', [0, 0]],
  ['list-table-row-heads-normalized', [0, 1]],
]) {
  test(`${code} reports degraded fidelity and fails the CLI loss gate`, () => {
    const doc = table(counts.map((count, index) => [attr, count,
      code === 'list-table-row-heads-normalized' && index === 1 ? [row([plain('heading')])] : [],
      [row([list])]]));
    const source = pandocToCarve(doc);
    assert.equal(source.diagnostics.find(d => d.code === code).fidelity, 'degraded');
    assert.deepEqual(source.diagnostics.filter(d => hasLoss([d])).map(d => d.code), [code]);
    assert.ok(!pandocToCarveAst(doc).diagnostics.some(d => d.code === code));
    const result = run(['-f', 'json', '--fail-on-loss', '--diagnostics', '-'], JSON.stringify(doc));
    assert.equal(result.status, 3, result.stderr);
    assert.match(result.stdout, /item/);
    assert.equal(JSON.parse(result.stderr).diagnostics.find(d => d.code === code).fidelity, 'degraded');
  });
}

test('structure-preserving block-cell respelling passes the loss gate', () => {
  const doc = table([[attr, 0, [], [row([list])]]]);
  const source = pandocToCarve(doc);
  assert.deepEqual(source.diagnostics.map(d => d.fidelity), ['normalized']);
  const result = run(['-f', 'json', '--fail-on-loss', '--diagnostics', '-'], JSON.stringify(doc));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /list-table/);
});

test('mixed citation modes degrade on the source path and survive on the AST path', () => {
  const record = (id, mode) => ({ citationId: id, citationPrefix: [], citationSuffix: [],
    citationMode: { t: mode }, citationNoteNum: 0, citationHash: 0 });
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [
    { t: 'Cite', c: [[record('a', 'AuthorInText'), record('b', 'NormalCitation')], []] },
  ] }] };
  const diagnostic = pandocToCarve(doc).diagnostics.find(d => d.code === 'citation-mode-normalized');
  assert.equal(diagnostic.fidelity, 'degraded');
  assert.ok(hasLoss([diagnostic]));
  assert.ok(!pandocToCarveAst(doc).diagnostics.some(d => d.code === 'citation-mode-normalized'));
  const result = run(['-f', 'json', '--fail-on-loss', '--diagnostics', '-'], JSON.stringify(doc));
  assert.equal(result.status, 3, result.stderr);
  assert.equal(JSON.parse(result.stderr).diagnostics.find(d => d.code === 'citation-mode-normalized').fidelity, 'degraded');
});

test('ragged-table export through a Pandoc writer fails the loss gate', {
  skip: !pandoc && 'pandoc is not installed',
}, () => {
  const result = run(['-t', 'html', '--fail-on-loss'], '|= A |= B |\n| value |\n');
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /<table>/);
});
