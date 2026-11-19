import { type ExtensionDefinition, type ExtensionRenderer } from './extensions/types.js';
import { type IncludeSettings } from './include-settings.js';
import { type CodeBlockNode } from './ast.js';
export type HeadingIds = 'off' | 'keep-case' | 'lower' | 'ascii' | 'ascii-lower' | 'ascii-strict' | 'ascii-strict-lower';
export type Mode = 'interactive' | 'static';
export type Profile = 'full' | 'article' | 'comment' | 'minimal';
export type SoftBreak = 'newline' | 'space' | 'br';
/** C2-H-128: a deny list or an allow list of URL schemes. There is no off value. */
export interface UrlPolicy {
    deny?: readonly string[];
    allow?: readonly string[];
}
/** C2-H-126: what a social resolver is called with; `context` is the host's own value, passed on unread. */
export interface SocialRequest {
    kind: 'mention' | 'tag';
    name: string;
    context?: unknown;
}
/** C2-H-126: URL templates, in which `{name}` stands for the encoded name, or resolvers. */
export interface Social {
    mentionUrl?: string;
    tagUrl?: string;
    resolveMention?: (request: SocialRequest) => string | null | undefined;
    resolveTag?: (request: SocialRequest) => string | null | undefined;
    context?: unknown;
}
export interface Options {
    extensions?: readonly ExtensionDefinition[];
    includes?: unknown;
    headingIds?: HeadingIds;
    mode?: Mode;
    renderers?: Readonly<Record<string, ExtensionRenderer>>;
    /** Trusted host HTML for ordinary code blocks; undefined selects the core HTML. */
    codeBlockRenderer?: ((node: Readonly<CodeBlockNode>, defaultHtml: string) => string | null | undefined) | null;
    symbols?: Readonly<Record<string, string>>;
    labels?: Readonly<Record<string, string>>;
    social?: Social | null;
    sourceLines?: boolean;
    sections?: boolean;
    smartTypography?: boolean;
    roundtrip?: boolean;
    rawHtml?: boolean;
    urlPolicy?: UrlPolicy;
    profile?: Profile;
    strictLosses?: boolean;
    /** C2-H-204: render-loss codes left out of the record. */
    allowLosses?: readonly string[];
    /** C2-H-205: the cap on the render-loss entries the record keeps. */
    maxLosses?: number;
    /** C2-H-203: how a soft break is written. */
    softBreak?: SoftBreak;
    alignTables?: boolean;
    /** C2-W-127: `format` writes as if the parse had no sidecar. */
    normalize?: boolean;
    rules?: Readonly<Record<string, 'on' | 'off'>>;
    platforms?: readonly string[];
}
/** The options a parse reads, and whether the tree carries positions (C2-A-138). */
export interface ParseOptions extends Pick<Options, 'extensions' | 'includes' | 'headingIds'> {
    positions?: boolean;
}
export type RenderOptions = Omit<Options, 'alignTables' | 'normalize' | 'rules' | 'platforms'>;
/** The options with every default filled in. */
export interface Settings {
    extensions: readonly ExtensionDefinition[];
    /** C2-N-003: the resolver and the two limits, or null when nothing is expanded. */
    includes: IncludeSettings | null;
    renderers: Readonly<Record<string, ExtensionRenderer>>;
    codeBlockRenderer: ((node: Readonly<CodeBlockNode>, defaultHtml: string) => string | null | undefined) | undefined;
    urlPolicy: UrlPolicy;
    headingIds: HeadingIds;
    mode: Mode;
    symbols: Readonly<Record<string, string>>;
    labels: Readonly<Record<string, string>>;
    social: Social | null;
    sourceLines: boolean;
    sections: boolean;
    smartTypography: boolean;
    roundtrip: boolean;
    rawHtml: boolean;
    denied: ReadonlySet<string> | null;
    allowed: ReadonlySet<string> | null;
    profile: Profile;
    strictLosses: boolean;
    /** C2-H-075 order of the semantic span keys, with what extensions add (`ExtensionDefinition.semanticKeys`). */
    semanticKeys: readonly (readonly [string, string | null])[];
    /** The quote glyphs of a registered extension, or null for those of C2-H-078. */
    quotes: readonly [string, string, string, string] | null;
    allowLosses: ReadonlySet<string>;
    maxLosses: number;
    softBreak: SoftBreak;
}
export declare const CORE_SEMANTIC_KEYS: readonly (readonly [string, string | null])[];
/** An option that has an unknown name or value, or that this engine does not offer. */
export declare class CarveOptionError extends Error {
    option: string;
    constructor(option: string, message: string);
}
/**
 * C2-H-137: refuses a value that is not of the declared type of the option `name`, before anything
 * else is read of it. Null is a value only of an option whose default is null.
 */
export declare function checkType(name: string, value: unknown): void;
/**
 * Checks `options` against the option list and returns them with their defaults. `stage` is
 * `parse` or `render`: an option of another stage is refused there.
 */
export declare function readOptions(options: object | undefined, stage: 'parse' | 'render'): Settings;
