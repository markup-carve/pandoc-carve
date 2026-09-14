import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const localCases = JSON.parse(await readFile(new URL('test/fixtures/importer-fidelity.json', root)));
const localSchema = JSON.parse(await readFile(new URL('test/fixtures/migration-report-schema.json', root)));
const manifest = JSON.parse(await readFile(new URL('spec/tests/importer-fidelity/manifest.json', root)));
assert.equal(manifest.schemaVersion, 2);
const owned = manifest.cases.filter(item => item.repository === 'markup-carve/pandoc-carve');
assert.ok(owned.length > 0, 'the pinned spec has no Pandoc-owned importer fixtures');
assert.deepEqual(localCases, owned);
const upstreamSchema = JSON.parse(await readFile(new URL('spec/resources/migration-report-schema.json', root)));
assert.deepEqual(localSchema, upstreamSchema);
