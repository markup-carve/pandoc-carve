import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';

/*
 * The publish-time guard must detect a git dependency by what a spec IS NOT.
 *
 * WHY THIS FILE EXISTS AT ALL. The guard runs from `release.yml`, on a `v*` tag
 * push and nowhere else, so until this file existed its logic was never executed
 * except during a release - the one moment where discovering a broken guard is
 * most expensive. Running the real script here puts it on every pull request
 * WITHOUT putting the manifest check itself there, which matters below.
 *
 * WHY THE GUARD WAS WIDENED. The rule was already an inversion, but the "not"
 * was still spelled as a list of protocols plus a slash test, and both miss
 * npm's scp-style URL: it carries no protocol, and when the repository sits at
 * the root of its host it carries no slash either. That is the third hole in
 * this guard family in this org - `git+https://` here, `github:` in carve-lsp,
 * then the bare `owner/repo#ref` shorthand - and each earlier fix added the next
 * spelling to the list, which is why there was a next one (#131).
 * markup-carve/carve-grammars#299 replaced the tail of the list with a catch-all
 * over the characters no registry range can contain; this is that shape.
 *
 * Both directions are asserted. A rejection has to exit non-zero AND name the
 * field, quote the spec and give a reason; an acceptance has to exit zero. So a
 * guard stuck at always-pass and a guard stuck at always-fail each fail here.
 *
 * The `npm:` alias row is the near miss that keeps the rule from collapsing into
 * "reject anything with a slash or an at-sign". An alias resolves from the
 * registry, so rejecting it would be an over-broad fix that breaks a manifest
 * that is fine - and an over-rejecting guard gets switched off by whoever hits
 * it, which is worse than the hole.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const guard = resolve(root, 'scripts/no-git-dependencies.mjs');
const manifestPath = resolve(root, 'package.json');
const ENGINE = '@markup-carve/carve';

const committed = JSON.parse(readFileSync(manifestPath, 'utf8'));

/*
 * The rows below mutate a NEUTRALIZED manifest, not the committed one.
 *
 * This repo pins the engine to a carve-js commit deliberately (see the header of
 * the script under test), so the committed manifest is one the guard refuses.
 * Building the rows from it would leave that git spec in `dependencies` for
 * every row that does not itself overwrite that field - the optionalDependencies
 * and devDependencies rows - and each would then "reject" because of the pin
 * rather than because of the spec it is meant to be testing. Measured while
 * fixing this: that confound alone turns the devDependencies row red against a
 * guard that handles devDependencies perfectly correctly. A test that passes for
 * the wrong reason is the failure mode this whole file exists to close, so the
 * baseline is cleaned first and the committed manifest gets its own test at the
 * bottom.
 */
const baseline = { ...committed, dependencies: { ...committed.dependencies, [ENGINE]: '^0.1.4' } };

const scratch = mkdtempSync(join(tmpdir(), 'pandoc-carve-guard-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

/** Run the REAL script against a manifest written to a scratch file. */
function runGuard(manifest) {
  const path = join(scratch, 'package.json');
  writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf8');
  const run = spawnSync(process.execPath, [guard, path], { encoding: 'utf8' });
  assert.equal(run.error, undefined, `spawning the guard failed: ${run.error}`);
  assert.notEqual(run.status, null, 'the guard was killed by a signal rather than exiting');
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
}

const withDep = (spec) => ({ ...baseline, dependencies: { ...baseline.dependencies, [ENGINE]: spec } });

/*
 * Each row: what the spec is, the manifest carrying it, and whether a consumer's
 * npm could install it from the registry alone. Cross-checked while writing
 * against `npm-package-arg`, the module npm itself classifies a spec with -
 * every `reject` row is one npa either calls `git` or refuses to classify at
 * all, and every `accept` row is one it calls version, range, tag or alias.
 */
const MATRIX = [
  ['a github: pin', withDep('github:markup-carve/carve-js#61f824d'), 'reject'],
  [
    'a git+https:// pin',
    withDep('git+https://github.com/markup-carve/carve-js.git#61f824d'),
    'reject',
  ],
  [
    'a bare owner/repo#sha shorthand',
    withDep('markup-carve/carve-js#61f824d5d5724bfaa26dd07dc5c159249a66c977'),
    'reject',
  ],
  [
    'a git spec in optionalDependencies',
    { ...baseline, optionalDependencies: { 'some-tool': 'github:markup-carve/some-tool#abc123' } },
    'reject',
  ],
  // The two rows this ticket is about. The first still carries a slash, so the
  // previous version caught it by accident; the second does not, and was
  // accepted.
  ['an scp-style git URL', withDep('git@github.com:markup-carve/carve-js.git'), 'reject'],
  ['an scp-style git URL with no slash', withDep('git@example.com:repo.git'), 'reject'],
  // Caught by the catch-all rather than by a pattern named for them, which is
  // the point of the catch-all: neither was anticipated and both leaked before.
  ['a workspace: protocol spec', withDep('workspace:*'), 'reject'],
  ['a catalog: protocol spec', withDep('catalog:default'), 'reject'],
  ['an exact version', withDep('0.1.4'), 'accept'],
  ['a caret range', withDep('^0.1.4'), 'accept'],
  ['a dist-tag', withDep('latest'), 'accept'],
  ['a compound range', withDep('>=0.1.4 <0.2.0'), 'accept'],
  ['a prerelease version', withDep('0.2.0-beta.1'), 'accept'],
  ['an npm: alias', withDep('npm:@markup-carve/carve@^0.1.4'), 'accept'],
];

for (const [label, manifest, verdict] of MATRIX) {
  test(`${verdict}s ${label}`, () => {
    const { status, out } = runGuard(manifest);
    if (verdict === 'accept') {
      assert.equal(status, 0, `the guard rejected ${label}, which installs fine:\n${out}`);
      return;
    }
    assert.notEqual(status, 0, `the guard passed ${label}, which needs git at install time`);
    // A non-zero exit alone would also come from a crash, so the report has to
    // name what it found.
    const optional = manifest.optionalDependencies ?? {};
    const [field, spec] = Object.keys(optional).length
      ? ['optionalDependencies', Object.values(optional)[0]]
      : ['dependencies', manifest.dependencies[ENGINE]];
    assert.ok(out.includes(field), `the report does not name the field it found it in:\n${out}`);
    assert.ok(out.includes(spec), `the report does not quote the offending spec:\n${out}`);
    assert.match(out, /registry/i, `the report does not say why:\n${out}`);
  });
}

test('devDependencies are left alone', () => {
  // A contributor's git devDependency costs a consumer nothing, and rejecting it
  // would be the same over-reach the npm: alias row guards against.
  const { status } = runGuard({
    ...baseline,
    devDependencies: { ...baseline.devDependencies, something: 'github:someone/something#abc' },
  });
  assert.equal(status, 0, 'a git devDependency was rejected; only installed fields are in scope');
});

test('still refuses the manifest committed here, and says which dependency', () => {
  /*
   * This repo is the one where the guard is SUPPOSED to fail, and the assertion
   * runs in that direction on purpose.
   *
   * The engine is pinned to a carve-js commit deliberately: the pin is ahead of
   * published carve-js and this bridge reads `Table.columns` (carve-js#1206),
   * so restoring a registry range would break it. That is why the guard is wired
   * into release.yml only, and it is why the prepared release is mechanically
   * blocked. The block is the guard working.
   *
   * So this asserts the refusal rather than papering over it. Widening the rule
   * must not make this repo accidentally publishable, and if someone later
   * restores the registry range, this test is what tells them to update it
   * rather than letting the change land silently.
   */
  const run = spawnSync(process.execPath, [guard, manifestPath], { encoding: 'utf8' });
  const out = `${run.stdout}${run.stderr}`;
  assert.notEqual(
    run.status,
    0,
    `the guard now ACCEPTS the committed manifest. If the engine was restored to a registry\n` +
      `range that is good news - update this test. If it was not, the guard just stopped\n` +
      `detecting the pin it exists to detect:\n${out}`,
  );
  assert.ok(out.includes(ENGINE), `the report does not name the engine dependency:\n${out}`);
  assert.ok(
    out.includes(committed.dependencies[ENGINE]),
    `the report does not quote the committed engine spec:\n${out}`,
  );
});

test('the release workflow runs this script and not its own copy of the rule', () => {
  // The guard is worth nothing if release.yml still carries an inline prefix
  // list beside it, so both halves are pinned: the call is there, and no
  // spelling of its own is.
  const workflow = readFileSync(resolve(root, '.github/workflows/release.yml'), 'utf8');
  assert.ok(
    workflow.includes('node scripts/no-git-dependencies.mjs'),
    'release.yml does not call scripts/no-git-dependencies.mjs',
  );
  assert.doesNotMatch(
    workflow,
    /github:\|git|\^\(github\|git/,
    'release.yml still carries a prefix-list filter beside the script',
  );
});
