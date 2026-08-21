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
  /*
   * ALIAS TARGETS (#133, markup-carve/carve-grammars#302). `npm:` used to
   * return early and clean - an unconditional ALLOW on a prefix, which is the
   * same denylist mistake as the URL-prefix list this file replaced, pointing
   * the other way: it never asked what the alias pointed AT.
   * `npm-package-arg` refuses every reject row here.
   *
   * BOTH DIRECTIONS, and the accept rows are the load-bearing half. The way a
   * fix for this goes wrong is over-rejection - the rule collapsing into
   * "reject anything with a slash or an at-sign" - and an over-rejecting guard
   * is worse than the hole, because the next person who hits it switches the
   * guard off.
   */
  ['an npm: alias to a plain package', withDep('npm:some-pkg'), 'accept'],
  ['an npm: alias to a range', withDep('npm:some-pkg@^1.0.0'), 'accept'],
  ['an npm: alias to a scoped package', withDep('npm:@scope/pkg@^1.0.0'), 'accept'],
  ['an npm: alias to a dist-tag', withDep('npm:some-pkg@latest'), 'accept'],
  // `npm:foo@` is npm's `*`, the same alias as `npm:foo`.
  ['an npm: alias with an empty target', withDep('npm:some-pkg@'), 'accept'],
  // No separating `@` at all, so there is no target to recurse into - the
  // whole remainder is the alias's NAME, and that is what has to be refused.
  ['an npm: alias whose name is a git URL', withDep('npm:git+https://x/y'), 'reject'],
  ['an npm: alias whose name is a github: spec', withDep('npm:github:owner/repo'), 'reject'],
  ['an npm: alias whose name is a shorthand', withDep('npm:owner/repo'), 'reject'],
  // With a target, which recurses back through the same rule.
  ['an npm: alias targeting github:', withDep('npm:foo@github:owner/repo'), 'reject'],
  ['an npm: alias targeting git+https://', withDep('npm:foo@git+https://x/y.git'), 'reject'],
  ['an npm: alias targeting a shorthand', withDep('npm:foo@owner/repo'), 'reject'],
  ['an npm: alias targeting file:', withDep('npm:foo@file:../x'), 'reject'],
  ['an npm: alias targeting workspace:', withDep('npm:foo@workspace:*'), 'reject'],
  ['an npm: alias with no name at all', withDep('npm:'), 'reject'],
  ['a nested npm: alias', withDep('npm:foo@npm:bar@1'), 'reject'],
  /*
   * PUNCTUATION npm REFUSES, found by `codex review` on #133 one layer under
   * the alias hole it was reviewing. npm rejects a package name or a dist-tag
   * carrying "any characters that encodeURIComponent encodes" - its own words -
   * and the guard accepted all of these.
   *
   * The accept rows below it are why this is two character rules and not one. A
   * semver RANGE is not held to the tag rule: `^1.0.0` and `1.0.0 || 2.0.0`
   * carry characters encodeURIComponent encodes, and rejecting those would be
   * the over-reach this guard is written to avoid. So does `my!tag`, which is a
   * perfectly valid dist-tag and looks like nonsense.
   */
  ['an alias name with a fragment', withDep('npm:foo#bar'), 'reject'],
  ['an alias name with a query', withDep('npm:foo?bar'), 'reject'],
  ['an alias name with a percent', withDep('npm:foo%bar'), 'reject'],
  ['an alias scope with a fragment', withDep('npm:@scope#bar/pkg'), 'reject'],
  ['an alias targeting a bad tag', withDep('npm:foo@#bad'), 'reject'],
  ['a bare spec with a fragment', withDep('#bad'), 'reject'],
  ['a bare spec with braces', withDep('{x}'), 'reject'],
  ['a bare spec with a comma', withDep('a,b'), 'reject'],
  ['a dist-tag that only looks odd', withDep('my!tag'), 'accept'],
  ['a dist-tag with parentheses', withDep('a(b)'), 'accept'],
  ['a version with build metadata', withDep('1.0.0+build.1'), 'accept'],
  ['an alias to a tilde-led name', withDep('npm:~foo'), 'accept'],
  // A range's whitespace need not be a space, which is why the class above
  // admits all of it. Also found by `codex review`, and the reason the guard is
  // knowingly lenient on one spelling - see the whitespace note in the script.
  ['a range separated by a tab', withDep('>=1\t<2'), 'accept'],
  ['a range broken across lines', withDep('1.0.0\n|| 2.0.0'), 'accept'],
  // A scope with no package. Also `codex review`, and the third thing it found
  // under this one change: every PATTERN written for an alias name grew a
  // fallback branch that let something through, which is why the shipped rule
  // counts `/`-separated pieces instead of matching a shape.
  ['a scope with no package', withDep('npm:@foo'), 'reject'],
  ['a scope with no package and a target', withDep('npm:@foo@1'), 'reject'],
  ['a scoped name with a third segment', withDep('npm:@scope/pkg/extra'), 'reject'],
  // npm's leading `.`/`_` rule is on the WHOLE name, so it never reaches a
  // scope - the fourth thing `codex review` found here, and the second
  // over-rejection. All three of the accept rows were rejected by the version
  // that applied the rule per segment.
  ['an alias to an underscored scope', withDep('npm:@_scope/pkg'), 'accept'],
  ['an alias to an underscored package in a scope', withDep('npm:@scope/_pkg'), 'accept'],
  ['an alias to a dotted scope', withDep('npm:@.scope/pkg'), 'accept'],
  ['an alias to a dotted package in a scope', withDep('npm:@scope/.pkg'), 'reject'],
  ['an alias to an underscored bare name', withDep('npm:_pkg'), 'reject'],
  // npm reads the alias prefix case-insensitively, and a case-sensitive test
  // sent `NPM:foo` down to the catch-all where its `:` got it rejected. The
  // fifth thing `codex review` found, and the third over-rejection - it only
  // became visible once there was something past the prefix worth reaching.
  ['an upper-case alias prefix', withDep('NPM:some-pkg'), 'accept'],
  ['a mixed-case alias prefix', withDep('Npm:some-pkg@^1.0.0'), 'accept'],
  ['a nested alias in upper case', withDep('npm:foo@NPM:bar'), 'reject'],
  // A target carrying leading whitespace, which slipped past the nested-alias
  // test and was then trimmed and read as a good alias one frame down. The
  // sixth and last thing `codex review` found on this change.
  ['a nested alias behind a space', withDep('npm:foo@ npm:bar'), 'reject'],
  ['a git target behind a space', withDep('npm:foo@ github:o/r'), 'reject'],
  ['a range behind a space', withDep('npm:foo@ ^1.0.0'), 'accept'],
  // A leading dot is a local path to npm, whatever follows it - `.`, `..`,
  // `./x` and `.x` are all directories, and none reaches the registry.
  ['a bare dot', withDep('.'), 'reject'],
  ['a parent directory', withDep('..'), 'reject'],
  ['a relative path', withDep('./local'), 'reject'],
  ['a dot-led tag lookalike', withDep('.x'), 'reject'],
  ['an alias targeting a directory', withDep('npm:foo@.'), 'reject'],
  // The near miss on that rule: a dot INSIDE a tag is ordinary.
  ['a tag ending in a dot', withDep('x.'), 'accept'],
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
  // AND FOR THE SAME REASON. A refusal is not evidence on its own once the rule
  // grows a branch: #133 added an alias branch, and this row would still pass if
  // that branch started swallowing the `github:` pin and reporting something
  // else. The pin is a protocol, so that is what the report has to say.
  assert.match(
    out,
    /resolves over github, not the registry/,
    `the guard still refuses the committed manifest, but no longer because of the protocol:\n${out}`,
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
