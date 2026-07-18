import { execFileSync, spawnSync } from 'node:child_process';

/** Locate a pandoc executable: $PANDOC, PATH, or the local test fallback. */
export function findPandoc() {
  const candidates = [process.env.PANDOC, 'pandoc', '/tmp/pandoc-3.5/bin/pandoc'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'pipe' });
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

/** Run pandoc -f json -t <target> over a Pandoc doc object; returns stdout. */
export function pandocRender(pandoc, doc, target, extraArgs = []) {
  const result = spawnSync(pandoc, ['-f', 'json', '-t', target, ...extraArgs], {
    input: JSON.stringify(doc),
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pandoc -t ${target} failed: ${result.stderr}`);
  }
  return result.stdout;
}
