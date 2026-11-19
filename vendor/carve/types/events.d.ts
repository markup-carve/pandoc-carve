export declare const ENTER = 0;
export declare const SPAN = 1;
export declare const EXIT = 2;
export declare const EVENT_WIDTH = 3;
export declare function eventTag(type: number, kind: number, flags: number): number;
export declare function eventType(tag: number): number;
export declare function eventKind(tag: number): number;
export declare function eventFlags(tag: number): number;
/**
 * A reader of the first `length` ints of an event array, one event at a time. Readers outside this
 * module go through it and never index the array themselves.
 */
export declare class EventCursor {
    private readonly events;
    private readonly length;
    private at;
    constructor(events: Int32Array, length: number);
    /** Whether the cursor stands on an event. */
    more(): boolean;
    /** Moves to the next event. */
    next(): void;
    type(): number;
    kind(): number;
    flags(): number;
    /** The offset of an enter event, or the start of a span. */
    start(): number;
    /** The end of a span, or the end offset of an exit event. */
    end(): number;
    /** The aux of an enter event, or the facts of an exit event. */
    aux(): number;
}
