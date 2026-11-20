import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '@markup-carve/carve';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { carveToPandocWithIncludes } from '../dist/node.js';

test('string-only conversion keeps a 0.2 include directive unresolved', () => {
  const source = '{{ child.crv }}\n';
  const node = parse(source).children[0];
  assert.equal(node.type, 'include');
  assert.equal(node.path, 'child.crv');
  const result = carveToPandoc(source);
  assert.match(result.warnings.join('\n'), /include: unresolved/u);
  assert.match(JSON.stringify(result.doc), /child\.crv/u);
  assert.equal(pandocToCarve(result.doc).carve, source);
});

function fixture(testBody) {
  const root = mkdtempSync(join(tmpdir(), 'pandoc-carve-includes-'));
  try {
    mkdirSync(join(root, 'parts', 'nested'), { recursive: true });
    writeFileSync(join(root, 'main.crv'), 'Before.\n\n{{ parts/one.crv }}\n\nAfter.\n');
    writeFileSync(join(root, 'parts', 'one.crv'), 'One.\n\n{{ nested/two.crv }}\n');
    writeFileSync(join(root, 'parts', 'nested', 'two.crv'), 'Two.\n');
    testBody(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('file-backed conversion expands nested includes', () => fixture(root => {
  const result = carveToPandocWithIncludes('Before.\n\n{{ parts/one.crv }}\n\nAfter.\n', { includeRoot: root, sourcePath: join(root, 'main.crv') });
  assert.deepEqual(result.doc.blocks.map(block => block.c[0].c), ['Before.', 'One.', 'Two.', 'After.']);
  assert.deepEqual(result.includeDiagnostics, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.dependencies.map(item => item.file), ['parts/one.crv', 'parts/nested/two.crv']);
}));

test('the file-backed path does not change a document without directives', () => fixture(root => {
  const source = '# Hello World\n';
  assert.deepEqual(carveToPandocWithIncludes(source, { includeRoot: root, sourcePath: join(root, 'main.crv') }).doc, carveToPandoc(source).doc);
}));

test('an included footnote and link definition resolve in the host', () => fixture(root => {
  writeFileSync(join(root, 'parts', 'defs.crv'), 'See [site][s] and a note.[^n]\n\n[s]: https://example.com\n\n[^n]: Noted.\n');
  const result = carveToPandocWithIncludes('{{ parts/defs.crv }}\n', { includeRoot: root, sourcePath: join(root, 'main.crv') });
  const json = JSON.stringify(result.doc);
  assert.match(json, /"Link".*https:\/\/example\.com/u);
  assert.match(json, /"Note".*Noted\./u);
  assert.doesNotMatch(result.warnings.join('\n'), /unresolved/u);
}));

test('included frontmatter is not part of the host document', () => fixture(root => {
  writeFileSync(join(root, 'parts', 'front.crv'), '---\ntitle: Part\n---\nBody.\n');
  const result = carveToPandocWithIncludes('{{ parts/front.crv }}\n', { includeRoot: root, sourcePath: join(root, 'main.crv') });
  assert.deepEqual(result.doc.blocks.map(block => block.t), ['Para']);
  assert.deepEqual(result.doc.meta, {});
}));

test('containment failures stay unresolved with an include diagnostic', () => fixture(root => {
  const result = carveToPandocWithIncludes('{{ ../outside.crv }}\n', { includeRoot: root, sourcePath: join(root, 'main.crv') });
  assert.match(JSON.stringify(result.doc), /outside\.crv/u);
  assert.equal(result.includeDiagnostics[0].code, 'include-outside-root');
}));

test('a symlink cannot escape the containment root', () => fixture(root => {
  const outside = mkdtempSync(join(tmpdir(), 'pandoc-carve-outside-'));
  try {
    writeFileSync(join(outside, 'secret.crv'), 'Secret.\n');
    symlinkSync(join(outside, 'secret.crv'), join(root, 'parts', 'escape.crv'));
    const result = carveToPandocWithIncludes('{{ parts/escape.crv }}\n', { includeRoot: root, sourcePath: join(root, 'main.crv') });
    assert.equal(result.includeDiagnostics[0].code, 'include-outside-root');
    assert.doesNotMatch(JSON.stringify(result.doc), /Secret/u);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
}));

test('nested cycles report instead of recursing', () => fixture(root => {
  writeFileSync(join(root, 'parts', 'one.crv'), '{{ ../main.crv }}\n');
  writeFileSync(join(root, 'main.crv'), '{{ parts/one.crv }}\n');
  const result = carveToPandocWithIncludes('{{ parts/one.crv }}\n', { includeRoot: root, sourcePath: join(root, 'main.crv') });
  assert.ok(result.includeDiagnostics.length > 0);
}));

test('include root and source path must be absolute and contained', () => fixture(root => {
  assert.throws(() => carveToPandocWithIncludes('text', { includeRoot: 'relative' }), /absolute/u);
  assert.throws(() => carveToPandocWithIncludes('text', { includeRoot: join(root, 'parts'), sourcePath: join(root, 'main.crv') }), /inside/u);
}));
