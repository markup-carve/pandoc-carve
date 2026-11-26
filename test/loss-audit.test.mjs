import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const cli = new URL('../dist/cli.js', import.meta.url).pathname;
const run = (args, input) => spawnSync(process.execPath, [cli, '-', ...args], { input, encoding: 'utf8' });
const attr = ['', [], []];
const plain = (value) => ({ t: 'Plain', c: [{ t: 'Str', c: value }] });
const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });

test('ragged 0.2 table rows survive Pandoc JSON without a loss warning', () => {
  const source = '|= A |= B |\n| value |\n| c | d |\n';
  const forward = carveToPandoc(source);
  assert.deepEqual(forward.warnings, []);
  assert.equal(pandocToCarve(forward.doc).carve, source);
  assert.equal(run(['-t', 'json', '--fail-on-loss'], source).status, 0);
});

test('block cell structure stays in the 0.2 tree and source loss is reported', () => {
  const list = { t: 'BulletList', c: [[plain('item')]] };
  const cell = [attr, { t: 'AlignDefault' }, 1, 1, [list]];
  const table = { t: 'Table', c: [attr, [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]],
    [attr, []], [[attr, 0, [], [[attr, [cell]]]]], [attr, []]] };
  const input = doc([table]);
  const ast = pandocToCarveAst(input).ast;
  assert.equal(ast.children[0].children[0].children[0].children[0].children[0].type, 'list');
  const source = pandocToCarve(input);
  assert.match(source.warnings.join('\n'), /structure-unspellable/u);
  assert.equal(run(['-f', 'json', '--fail-on-loss'], JSON.stringify(input)).status, 3);
});

test('mixed citation modes report source loss and fail the CLI loss gate', () => {
  const record = (id, mode) => ({ citationId: id, citationPrefix: [], citationSuffix: [],
    citationMode: { t: mode }, citationNoteNum: 0, citationHash: 0 });
  const input = doc([{ t: 'Para', c: [{ t: 'Cite', c: [[record('a', 'AuthorInText'), record('b', 'NormalCitation')], []] }] }]);
  assert.equal(pandocToCarveAst(input).ast.children[0].children[0].type, 'citation_group');
  assert.match(pandocToCarve(input).warnings.join('\n'), /structure-unspellable/u);
  assert.equal(run(['-f', 'json', '--fail-on-loss'], JSON.stringify(input)).status, 3);
});

test('ragged table exports to HTML without a false loss failure', () => {
  const result = run(['-t', 'html', '--fail-on-loss'], '|= A |= B |\n| value |\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<table>/u);
});
