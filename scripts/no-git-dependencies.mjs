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
// Detection is by what a spec IS NOT, rather than by a list of the git URL
// spellings, because the list is where this leaks: the two regressions in this
// org used two different spellings (`git+https://` and `github:`), and npm
// accepts a bare `owner/repo#ref` shorthand as a third that neither pattern
// matches. A registry range is semver plus at most a dist-tag, so it never
// contains a slash and never carries a protocol.

import { readFileSync } from 'node:fs';

const manifestPath = process.argv[2] ?? 'package.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const NON_REGISTRY_PROTOCOL =
  /^(github|gitlab|bitbucket|gist|git|git\+[a-z.+-]+|ssh|https?|file|link|portal):/i;

const FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

/** Why a consumer's npm could not satisfy this spec from the registry, or null. */
function offendingReason(spec) {
  if (typeof spec !== 'string') return 'is not a string';
  const value = spec.trim();
  // `npm:` is the one alias form that still resolves from the registry, and the
  // only legitimate reason a spec contains a slash.
  if (value.startsWith('npm:')) return null;
  const protocol = value.match(NON_REGISTRY_PROTOCOL);
  if (protocol) return `resolves over ${protocol[1].toLowerCase()}, not the registry`;
  if (value.includes('/')) return 'is a git shorthand (owner/repo), not a registry range';
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
