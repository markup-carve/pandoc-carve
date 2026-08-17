import { citations, type CarveExtension } from '@markup-carve/carve';

/**
 * What to enable while READING Carve source.
 *
 * Only the source entry points take these: once a document is a serialized
 * Carve AST, every parse-stage decision has already been made and recorded in
 * the tree, so `carveAstToPandoc` has nothing to apply them to.
 *
 * THE CONTRACT THESE DEFAULTS SERVE: anything `pandocToCarve` can WRITE,
 * `carveToPandoc` must be able to READ. A construct the bridge chooses on the
 * way out and cannot recognize on the way back is round-trip loss the bridge
 * inflicted on itself, and it is invisible - the source looks right, and only
 * the returned AST is poorer.
 */
export interface ParseOptions {
    /**
     * Parse `[@key]` as a citation group rather than as an `@mention`.
     *
     * ON by default. Citations are a Tier-2 extension, so with them off the
     * parser reaches the `@` first and `[@doe1990]` becomes
     * `[`, a `.mention` span, `]` - which is what an imported bibliography
     * silently turned into, every key of it. The reverse direction writes
     * `[@key]` for every pandoc `Cite`, so reading it back as a citation is
     * what closes the loop.
     */
    citations?: boolean;
    /**
     * Extra Carve extensions to enable while parsing, appended to whatever the
     * flags above already turned on. For extensions with only render hooks this
     * is unnecessary - nothing downstream of the parse renders.
     */
    extensions?: CarveExtension[];
}

/** The extension list a set of {@link ParseOptions} asks for. */
export function parseExtensions(options: ParseOptions = {}): CarveExtension[] {
    const list: CarveExtension[] = [];
    if (options.citations !== false) list.push(citations());
    if (options.extensions?.length) list.push(...options.extensions);
    return list;
}
