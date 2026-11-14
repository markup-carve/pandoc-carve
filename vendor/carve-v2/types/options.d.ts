export type HeadingIds = 'off' | 'keep-case' | 'lower' | 'ascii';
export type Mode = 'interactive' | 'static';
export type Profile = 'full' | 'article' | 'comment' | 'minimal';
/** C2-H-128: a deny list or an allow list of URL schemes. There is no off value. */
export interface UrlPolicy {
    deny?: readonly string[];
    allow?: readonly string[];
}
/** C2-H-126: URL templates, in which `{name}` stands for the encoded name, or resolvers. */
export interface Social {
    mentionUrl?: string;
    tagUrl?: string;
    resolveMention?: (name: string) => string | null | undefined;
    resolveTag?: (name: string) => string | null | undefined;
}
export interface Options {
    extensions?: readonly unknown[];
    includes?: unknown;
    headingIds?: HeadingIds;
    mode?: Mode;
    renderers?: Readonly<Record<string, unknown>>;
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
    alignTables?: boolean;
    rules?: Readonly<Record<string, boolean>>;
    platforms?: readonly string[];
}
/** The options a parse reads, and whether the tree carries positions (C2-A-138). */
export interface ParseOptions extends Pick<Options, 'extensions' | 'includes' | 'headingIds'> {
    positions?: boolean;
}
export type RenderOptions = Omit<Options, 'alignTables' | 'rules' | 'platforms'>;
/** The options with every default filled in. */
export interface Settings {
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
}
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
