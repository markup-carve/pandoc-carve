import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { carveAstToPandoc, pandocToCarveAst } from '../dist/index.js';
import { preparePandocForWriter } from '../dist/node.js';

const cli = new URL('../dist/cli.js', import.meta.url).pathname;
const run = (args, tree) => spawnSync(process.execPath, [cli, '-', ...args], { input: JSON.stringify(tree), encoding: 'utf8' });
const tree = (children) => ({ type: 'document', astVersion: '2.0', children });
const page = { type: 'thematic_break', attrs: { classes: ['page-break'] } };

test('AST 2.0 CLI input accepts bare trees, envelopes, and files; rejects invalid slots', () => {
  const input = tree([{ type: 'paragraph', children: [{ type: 'text', value: 'Hello' }] }]);
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-host-'));
  const file = join(dir, 'tree.json');
  writeFileSync(file, JSON.stringify(input));
  for (const result of [run(['-f', 'carve-ast-json', '-t', 'json'], input),
    run(['-f', 'carve-ast-json', '-t', 'json'], { astVersion: '2.0', document: input }),
    spawnSync(process.execPath, [cli, file, '-f', 'carve-ast-json', '-t', 'json'], { encoding: 'utf8' })]) {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).blocks[0].t, 'Para');
  }
  const invalid = run(['-f', 'carve-ast-json', '-t', 'json'], tree([{ type: 'thematic_break', bogus: true }]));
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /invalid Carve AST 2\.0 JSON/u);
});

test('page-break carrier round trips and targets only page-break writers', () => {
  const { doc } = carveAstToPandoc(tree([page, { type: 'thematic_break' }]));
  assert.equal(doc.blocks[0].t, 'Div');
  assert.deepEqual(pandocToCarveAst(doc).ast.children[0].attrs.classes, ['page-break']);
  assert.equal(preparePandocForWriter(doc, 'docx').blocks[0].c[0], 'openxml');
  assert.match(preparePandocForWriter(doc, 'docx').blocks[0].c[1], /w:type="page"/u);
  assert.equal(preparePandocForWriter(doc, 'odt').blocks[0].c[0], 'opendocument');
  assert.deepEqual(preparePandocForWriter(doc, 'pdf').blocks[0].c, ['latex', '\\newpage']);
  assert.equal(preparePandocForWriter(doc, 'html').blocks[0].t, 'HorizontalRule');
  assert.equal(preparePandocForWriter(doc, 'docx').blocks[1].t, 'HorizontalRule');
});

test('1,024 page-break variants preserve the class across nesting and siblings', () => {
  for (let i = 0; i < 1024; i++) {
    let block = { type: 'thematic_break', attrs: { classes: i % 2 ? ['other', 'page-break'] : ['page-break'] } };
    for (let depth = 0; depth < i % 8; depth++) block = { type: depth % 2 ? 'div' : 'block_quote', children: [block] };
    const siblings = i % 3 === 0 ? [{ type: 'thematic_break' }, block] : [block, { type: 'thematic_break' }];
    const { doc } = carveAstToPandoc(tree(siblings));
    const converted = preparePandocForWriter(doc, 'docx');
    const asText = JSON.stringify(converted);
    assert.equal((asText.match(/w:type=\\"page\\"/gu) ?? []).length, 1, `variant ${i}`);
    assert.equal((asText.match(/"t":"HorizontalRule"/gu) ?? []).length, 1, `variant ${i}`);
  }
});

test('page breaks reach real DOCX, ODT, and LaTeX writers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-host-'));
  for (const [format, entry, pattern] of [
    ['docx', 'word/document.xml', /w:type="page"/u],
    ['odt', 'content.xml', /text:style-name="CarvePageBreak"/u],
  ]) {
    const output = join(dir, `out.${format}`);
    const result = run(['-f', 'carve-ast-json', '-t', format, '-o', output], tree([page]));
    assert.equal(result.status, 0, result.stderr);
    assert.match(execFileSync('unzip', ['-p', output, entry], { encoding: 'utf8' }), pattern);
    if (format === 'odt') assert.match(execFileSync('unzip', ['-p', output, 'styles.xml'], { encoding: 'utf8' }), /fo:break-before="page"/u);
  }
  const latex = run(['-f', 'carve-ast-json', '-t', 'latex'], tree([page]));
  assert.equal(latex.status, 0, latex.stderr);
  assert.match(latex.stdout, /\\newpage/u);
  const plainOdt = join(dir, 'plain.odt');
  const plain = run(['-f', 'carve-ast-json', '-t', 'odt', '-o', plainOdt], tree([{ type: 'paragraph', children: [{ type: 'text', value: 'Plain' }] }]));
  assert.equal(plain.status, 0, plain.stderr);
  assert.doesNotMatch(execFileSync('unzip', ['-p', plainOdt, 'styles.xml'], { encoding: 'utf8' }), /CarvePageBreak/u);
});

test('offline mode rejects remote images before Pandoc and embeds contained local images', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-host-'));
  const remote = tree([{ type: 'paragraph', children: [{ type: 'image', src: 'http://127.0.0.1:9/a.png', alt: 'a' }] }]);
  const pandocMarker = join(dir, 'pandoc-started');
  const rejected = run(['-f', 'carve-ast-json', '-t', 'docx', '--offline', '--pandoc', pandocMarker, '-o', join(dir, 'remote.docx')], remote);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /offline image has no resolver/u);
  assert.equal(existsSync(pandocMarker), false, 'remote images fail before Pandoc starts');
  const file = join(dir, 'a.png');
  writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64'));
  const local = tree([{ type: 'paragraph', children: [{ type: 'image', src: 'a.png', alt: 'a' }] }]);
  const output = join(dir, 'local.docx');
  const accepted = run(['-f', 'carve-ast-json', '-t', 'docx', '--offline', '--resource-root', dir, '-o', output], local);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(execFileSync('unzip', ['-l', output], { encoding: 'utf8' }), /word\/media\//u);
  writeFileSync(join(dir, 'a b.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64'));
  const encoded = run(['-f', 'carve-ast-json', '-t', 'docx', '--offline', '--resource-root', dir, '-o', join(dir, 'encoded.docx')],
    tree([{ type: 'paragraph', children: [{ type: 'image', src: 'a%20b.png', alt: 'a' }] }]));
  assert.equal(encoded.status, 0, encoded.stderr);
  const noEscape = run(['-f', 'carve-ast-json', '-t', 'docx', '--offline', '--resource-root', dir, '-o', output],
    tree([{ type: 'paragraph', children: [{ type: 'image', src: '../a.png', alt: 'a' }] }]));
  assert.equal(noEscape.status, 1);
});

test('offline library callback resolves images without file access', () => {
  const doc = carveAstToPandoc(tree([{ type: 'paragraph', children: [{ type: 'image', src: 'asset:one', alt: 'a' }] }])).doc;
  const prepared = preparePandocForWriter(doc, 'docx', {
    offline: true,
    resolveImage: (source) => source === 'asset:one' ? { bytes: Buffer.from([1, 2, 3]), mimeType: 'image/png' } : undefined,
  });
  assert.match(JSON.stringify(prepared), /data:image\/png;base64,AQID/u);
  assert.match(JSON.stringify(doc), /asset:one/u);
});

test('offline mode accepts self-contained Pandoc JSON image data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-host-'));
  const data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: [{ t: 'Image', c: [['', [], []], [{ t: 'Str', c: 'pixel' }], [data, '']] }] }] };
  const result = run(['-f', 'json', '-t', 'docx', '--offline', '-o', join(dir, 'data.docx')], doc);
  assert.equal(result.status, 0, result.stderr);
  assert.match(execFileSync('unzip', ['-l', join(dir, 'data.docx')], { encoding: 'utf8' }), /word\/media\//u);
});
