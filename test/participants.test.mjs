import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { findPandoc, pandocIsRequired, shortfall } from './helpers.mjs';

test('Pandoc is present wherever this suite requires it', () => {
  if (pandocIsRequired()) assert.ok(findPandoc(), 'Pandoc is required but missing');
  else assert.ok(findPandoc(), 'the 0.2 export and import gate runs with Pandoc installed');
});

test('no test source carries a literal control byte where an escape belongs', () => {
  const dir = new URL('.', import.meta.url);
  const offenders = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.mjs'))) {
    const bytes = readFileSync(new URL(file, dir));
    for (const [offset, byte] of bytes.entries()) {
      if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) {
        offenders.push(`${file}: control byte at ${offset}`);
        break;
      }
    }
    if (bytes.includes(Buffer.from(String.fromCharCode(0xfeff), 'utf8'))) offenders.push(`${file}: literal BOM`);
  }
  assert.deepEqual(offenders, []);
});

test('the vendored 0.2 engine data comes from the pinned engine commit', () => {
  const source = JSON.parse(readFileSync(new URL('../vendor/carve/SOURCE.json', import.meta.url), 'utf8'));
  const pin = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).dependencies['@markup-carve/carve'];
  assert.equal(source.repository, 'markup-carve/carve-js');
  assert.equal(source.branch, 'next2');
  assert.match(source.commit, /^[0-9a-f]{40}$/u);
  assert.equal(pin, `github:markup-carve/carve-js#${source.commit}`);
  assert.ok(existsSync(new URL('../vendor/carve/ast-schema.json', import.meta.url)));
});

test('a short population count is a finding, and a sufficient one is not', () => {
  assert.equal(shortfall({ label: 'X', actual: 4, atLeast: 4 }), null);
  assert.match(shortfall({ label: 'X', actual: 0, atLeast: 4 }), /compared 0/u);
  assert.match(shortfall({ label: 'X', actual: undefined, atLeast: 1 }), /not a count at all/u);
  assert.match(shortfall({ label: 'X', actual: -1, atLeast: 1 }), /not a count at all/u);
});
