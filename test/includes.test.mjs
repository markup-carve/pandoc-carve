import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { carveToPandoc } from '../dist/index.js';
import { carveToPandocWithIncludes } from '../dist/includes.js';

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

test('file-backed conversion expands nested includes and returns dependencies', () => fixture(root => {
  const sourcePath = join(root, 'main.crv');
  const source = 'Before.\n\n{{ parts/one.crv }}\n\nAfter.\n';
  const result = carveToPandocWithIncludes(source, { includeRoot: root, sourcePath });
  const json = JSON.stringify(result.doc);
  assert.match(json, /Before/);
  assert.match(json, /One/);
  assert.match(json, /Two/);
  assert.doesNotMatch(json, /\{\{/);
  assert.deepEqual(result.dependencies.map(item => item.resolved), [true, true]);
  assert.deepEqual(result.includeWarnings, []);
}));

test('string-only conversion keeps include directives literal', () => {
  const result = carveToPandoc('{{ child.crv }}');
  assert.match(JSON.stringify(result.doc), /child\.crv/);
});

test('the file-backed path does not change a document without directives', () => fixture(root => {
  const source = '# Hello World\n';
  const sourcePath = join(root, 'plain.crv');
  writeFileSync(sourcePath, source);
  assert.deepEqual(
    carveToPandocWithIncludes(source, { includeRoot: root, sourcePath }).doc,
    carveToPandoc(source).doc,
  );
}));

test('containment failures stay literal and return a stable warning', () => fixture(root => {
  const sourcePath = join(root, 'main.crv');
  const result = carveToPandocWithIncludes('{{ ../outside.crv }}', { includeRoot: root, sourcePath });
  assert.match(JSON.stringify(result.doc), /outside\.crv/);
  assert.equal(result.includeWarnings[0].rule, 'include-unresolved');
  assert.equal(result.dependencies[0].resolved, false);
}));

test('nested cycles warn instead of recursing', () => fixture(root => {
  writeFileSync(join(root, 'main.crv'), '{{ parts/one.crv }}');
  writeFileSync(join(root, 'parts', 'one.crv'), '{{ ../main.crv }}');
  const result = carveToPandocWithIncludes('{{ parts/one.crv }}', {
    includeRoot: root,
    sourcePath: join(root, 'main.crv'),
  });
  assert.ok(result.includeWarnings.some(warning => warning.rule === 'include-cycle'));
}));

test('a symlink cannot escape the containment root', () => fixture(root => {
  const outside = mkdtempSync(join(tmpdir(), 'pandoc-carve-outside-'));
  try {
    writeFileSync(join(outside, 'secret.crv'), 'Secret.\n');
    symlinkSync(join(outside, 'secret.crv'), join(root, 'parts', 'escape.crv'));
    const result = carveToPandocWithIncludes('{{ parts/escape.crv }}', {
      includeRoot: root,
      sourcePath: join(root, 'main.crv'),
    });
    assert.equal(result.includeWarnings[0].rule, 'include-unresolved');
    assert.doesNotMatch(JSON.stringify(result.doc), /Secret/);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
}));

test('include root and source path must be absolute and contained', () => fixture(root => {
  assert.throws(
    () => carveToPandocWithIncludes('text', { includeRoot: 'relative' }),
    /absolute/,
  );
  assert.throws(
    () => carveToPandocWithIncludes('text', { includeRoot: root, sourcePath: join(root, '..', 'outside.crv') }),
    /inside/,
  );
}));
