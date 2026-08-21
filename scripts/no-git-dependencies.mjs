#!/usr/bin/env node
// Refuse a dependency that a consumer of this package cannot resolve from the
// registry.
//
//   node scripts/no-git-dependencies.mjs [package.json]
//
// npm re-resolves a published package's dependency SPECS from the tarball's own
// manifest - the lockfile committed here is not consulted downstream - so a
// `github:` or `git+` spec in `dependencies` means every install of this bridge
// clones carve-js over git. Three consequences, all borne by the consumer: the
// install needs git and GitHub reachability (and resolves over SSH wherever an
// `insteadOf` rewrite is configured), npm has no registry tarball to check an
// integrity hash against, and a commit pin stops tracking the engine's releases
// so a consumer on a caret range still cannot receive an engine fix.
//
// This is a REGRESSION guard. 0.1.0 and 0.1.1 both shipped a
// `git+https://` engine spec; 0.1.2 moved it to `^0.1.4` and said so under
// Changed; a later branch put it back, and nothing inspected the manifest again
// until release prep. markup-carve/carve-grammars#276 added the same check there
// after the same regression reached the registry.
//
// It is wired into release.yml only, deliberately. The manifest is NOT clean
// today - the engine is pinned to a carve-js commit because this bridge reads
// `Table.columns`, which no published engine has yet - so a pull-request check
// would turn every PR red for a condition no PR author can fix. Blocking the
// PUBLISH is the part that protects consumers, and the pull-request half belongs
// with the change that restores the registry range.
//
// Only `dependencies`, `optionalDependencies` and `peerDependencies` are
// inspected, because those are the three a consumer installs - npm fetches an
// optional dependency like any other and only tolerates its failure afterwards.
// A git `devDependency` costs a contributor a git clone and costs a consumer
// nothing, so it is left alone.
//
// DETECTION IS BY WHAT A SPEC IS NOT, and that inversion is the whole point.
// The list of spellings is where this leaks, and it has now leaked three times
// in this org: `git+https://` here, `github:` in carve-lsp, and npm's bare
// `owner/repo#ref` shorthand, which carries no protocol at all. Each fix added
// the next spelling to the list, which is why there was a next one. So the final
// test below is a CATCH-ALL over the characters a registry range cannot contain:
// whatever spelling comes after this one, it does not have to be anticipated to
// be caught.
//
// The rule the guard holds, stated positively: accept exactly what npm would
// resolve from the registry, which is a semver version, a semver range, a
// dist-tag, or an `npm:` alias. `npm-package-arg` - the module npm itself uses
// to classify a spec - was the oracle while this was written. It is deliberately
// NOT a dependency here: a publish-time guard that grows its own install-time
// dependency is a worse trade than a documented rule, and the agreement was
// measured rather than assumed. Over 41 spellings (versions, ranges, dist-tags,
// compound and prerelease ranges, aliases, and every git, file, link, portal,
// workspace, catalog and tarball form) this script and `npm-package-arg` agree
// on all 41: it accepts exactly those npa classifies as version, range, tag or
// alias, and rejects both the ones it calls git and the ones it refuses to
// classify at all.

import { readFileSync } from 'node:fs';

const manifestPath = process.argv[2] ?? 'package.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const NON_REGISTRY_PROTOCOL =
  /^(github|gitlab|bitbucket|gist|git|git\+[a-z.+-]+|ssh|https?|file|link|portal|workspace):/i;

const FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

// user@host:path, npm's scp-style git URL. It carries no protocol, and when the
// repository sits at the root of its host it carries no slash either
// (`git@example.com:repo.git`), so neither test below sees it. That is the
// spelling this file was accepting (#131). Named separately from the catch-all
// only so the report says what it actually found.
const SCP_STYLE = /^[^\s@/:]+@[^\s@/:]+:/;

// A registry range is semver plus at most a dist-tag. None of these characters
// appears in one, so anything carrying them is something else.
const NEVER_IN_A_RANGE = ['/', ':', '@'];

/** Why a consumer's npm could not satisfy this spec from the registry, or null. */
function offendingReason(spec) {
  if (typeof spec !== 'string') return 'is not a string';
  const value = spec.trim();
  // `npm:` is the one alias form that still resolves from the registry, and the
  // only legitimate reason a spec carries a protocol, a slash or an `@`.
  if (value.startsWith('npm:')) return null;
  const protocol = value.match(NON_REGISTRY_PROTOCOL);
  if (protocol) return `resolves over ${protocol[1].toLowerCase()}, not the registry`;
  if (SCP_STYLE.test(value)) return 'is an scp-style git URL (user@host:path), not a registry range';
  if (value.includes('/')) return 'is a git shorthand (owner/repo), not a registry range';
  // The catch-all, and the reason this is an inversion rather than a longer
  // list: whatever spelling comes next, it is not a semver range, and it does
  // not have to be anticipated to be caught.
  const stray = NEVER_IN_A_RANGE.find((c) => value.includes(c));
  if (stray) return `contains ${JSON.stringify(stray)}, which no registry range does`;
  return null;
}

const offenders = [];
for (const field of FIELDS) {
  for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
    const reason = offendingReason(spec);
    if (reason) offenders.push({ field, name, spec, reason });
  }
}

if (offenders.length > 0) {
  console.error(
    `::error::${offenders.length} dependency spec(s) would not resolve from the registry for a consumer of this package:`,
  );
  for (const { field, name, spec, reason } of offenders) {
    console.error(`  ${field}.${name} -> ${spec}`);
    console.error(`    ${reason}`);
  }
  console.error(
    'A consumer would need git at install time and gets no registry integrity check. Declare a published version instead.',
  );
  process.exit(1);
}

const counted = FIELDS.reduce((n, field) => n + Object.keys(manifest[field] ?? {}).length, 0);
console.log(`all ${counted} runtime, optional and peer dependencies resolve from the registry`);
