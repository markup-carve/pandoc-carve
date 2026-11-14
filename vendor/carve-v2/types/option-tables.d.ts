/** C2-H-137: the options, and the stage that reads each. */
export declare const OPTION_KINDS: ReadonlyMap<string, string>;
/** C2-H-137: the declared type of each option, checked before anything else is read of it. */
export declare const OPTION_TYPES: ReadonlyMap<string, string>;
/** The options whose default is null, which take null as that default. */
export declare const NULL_DEFAULTS: readonly string[];
export declare const ENUM_VALUES: ReadonlyMap<string, readonly string[]>;
export declare const ENUM_DEFAULTS: ReadonlyMap<string, string>;
export declare const BOOLEAN_DEFAULTS: ReadonlyMap<string, boolean>;
/** C2-H-125: the English strings the engine writes itself. */
export declare const DEFAULT_LABELS: Readonly<Record<string, string>>;
/** C2-H-128: the schemes the default URL policy denies. */
export declare const DEFAULT_DENIED_SCHEMES: readonly string[];
