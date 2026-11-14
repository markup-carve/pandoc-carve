// ../carve-js/v2/src/chars.ts
var TAB = 9;
var LF = 10;
var CR = 13;
var SPACE = 32;
var BANG = 33;
var QUOTE_MARK = 34;
var HASH = 35;
var DOLLAR = 36;
var PERCENT = 37;
var APOSTROPHE = 39;
var PAREN_OPEN = 40;
var PAREN_CLOSE = 41;
var STAR = 42;
var PLUS = 43;
var COMMA = 44;
var HYPHEN = 45;
var DOT = 46;
var SLASH = 47;
var DIGIT_0 = 48;
var DIGIT_9 = 57;
var COLON = 58;
var LESS = 60;
var EQUALS = 61;
var GREATER = 62;
var QUESTION = 63;
var AT_SIGN = 64;
var UPPER_A = 65;
var UPPER_I = 73;
var UPPER_X = 88;
var UPPER_Z = 90;
var BRACKET_OPEN = 91;
var BACKSLASH = 92;
var BRACKET_CLOSE = 93;
var CARET = 94;
var UNDERSCORE = 95;
var BACKTICK = 96;
var LOWER_A = 97;
var LOWER_I = 105;
var LOWER_X = 120;
var LOWER_Z = 122;
var BRACE_OPEN = 123;
var PIPE = 124;
var BRACE_CLOSE = 125;
var TILDE = 126;
var BYTE_ORDER_MARK = 65279;

// ../carve-js/v2/src/dispatch.ts
var SHAPE_BLANK = 1;
var SHAPE_TEXT = 2;
var SHAPE_BLOCK_IMAGE = 4;
var SHAPE_HEADING = 8;
var SHAPE_DISPLAY_MATH = 16;
var SHAPE_COMMENT_BLOCK_CLOSER = 32;
var SHAPE_COMMENT_BLOCK_OPENER = 64;
var SHAPE_COMMENT_ONLY = 128;
var SHAPE_ABBREVIATION_DEFINITION = 256;
var SHAPE_BULLET = 512;
var SHAPE_THEMATIC_BREAK = 1024;
var SHAPE_CONTINUATION_ROW = 2048;
var SHAPE_FRONTMATTER_CLOSER = 4096;
var SHAPE_FRONTMATTER_OPENER = 8192;
var SHAPE_ORDERED = 16384;
var SHAPE_DESCRIPTION = 32768;
var SHAPE_DIV_BARE_RUN = 65536;
var SHAPE_DIV_OPENER = 131072;
var SHAPE_TERM = 262144;
var SHAPE_QUOTE = 524288;
var SHAPE_FOOTNOTE_DEFINITION = 1048576;
var SHAPE_LINK_DEFINITION = 2097152;
var SHAPE_CAPTION = 4194304;
var SHAPE_CODE_FENCE_CLOSER = 8388608;
var SHAPE_CODE_FENCE_OPENER = 16777216;
var SHAPE_ATTRIBUTE_LINE = 33554432;
var SHAPE_INCLUDE = 67108864;
var SHAPE_TABLE_ROW = 134217728;
var FIRST_CHARACTER_SHAPES = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  4,
  0,
  8,
  16,
  224,
  0,
  0,
  0,
  0,
  1792,
  2048,
  0,
  12800,
  16384,
  0,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  491520,
  0,
  0,
  8,
  524288,
  0,
  0,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  3145728,
  0,
  0,
  4194304,
  0,
  25165824,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  16384,
  100663296,
  134217728,
  0,
  0,
  0
];

// ../carve-js/v2/src/events.ts
var ENTER = 0;
var SPAN = 1;
var EXIT = 2;
var EVENT_WIDTH = 3;
var TYPE_BITS = 2;
var TYPE_MASK = 3;
var KIND_BITS = 6;
var KIND_MASK = 63;
function eventTag(type, kind, flags) {
  return type | kind << TYPE_BITS | flags << TYPE_BITS + KIND_BITS;
}
function eventType(tag2) {
  return tag2 & TYPE_MASK;
}
function eventKind(tag2) {
  return tag2 >> TYPE_BITS & KIND_MASK;
}
function eventFlags(tag2) {
  return tag2 >> TYPE_BITS + KIND_BITS;
}
var EventCursor = class {
  events;
  length;
  at = 0;
  constructor(events, length) {
    this.events = events;
    this.length = length;
  }
  /** Whether the cursor stands on an event. */
  more() {
    return this.at < this.length;
  }
  /** Moves to the next event. */
  next() {
    this.at += EVENT_WIDTH;
  }
  type() {
    return eventType(this.events[this.at]);
  }
  kind() {
    return eventKind(this.events[this.at]);
  }
  flags() {
    return eventFlags(this.events[this.at]);
  }
  /** The offset of an enter event, or the start of a span. */
  start() {
    return this.events[this.at + 1];
  }
  /** The end of a span, or the end offset of an exit event. */
  end() {
    const at = this.at;
    return this.events[at + (eventType(this.events[at]) === SPAN ? 2 : 1)];
  }
  /** The aux of an enter event, or the facts of an exit event. */
  aux() {
    return this.events[this.at + 2];
  }
};

// ../carve-js/v2/src/kinds.ts
var DOCUMENT = 0;
var QUOTE = 1;
var BULLET_LIST = 2;
var ORDERED_LIST = 3;
var ITEM = 4;
var DESCRIPTION_LIST = 5;
var DESCRIPTION = 6;
var FOOTNOTE = 7;
var DIV = 8;
var TABLE = 9;
var ROW = 10;
var PARAGRAPH = 11;
var TERM = 12;
var CAPTION = 13;
var CODE = 14;
var COMMENT_BLOCK = 15;
var LINE_BLOCK = 16;
var FRONTMATTER = 17;
var HEADING = 18;
var THEMATIC_BREAK = 19;
var COMMENT = 20;
var ATTRIBUTES = 21;
var INCLUDE = 22;
var LINK_DEFINITION = 23;
var ABBREVIATION = 24;
var CELL = 25;
var KIND_NAMES = [
  "document",
  "quote",
  "bullet_list",
  "ordered_list",
  "item",
  "description_list",
  "description",
  "footnote",
  "div",
  "table",
  "row",
  "paragraph",
  "term",
  "caption",
  "code",
  "comment_block",
  "line_block",
  "frontmatter",
  "heading",
  "thematic_break",
  "comment",
  "attributes",
  "include",
  "link_definition",
  "abbreviation",
  "cell"
];
function isLeaf(kind) {
  return kind >= PARAGRAPH;
}
function isList(kind) {
  return kind === BULLET_LIST || kind === ORDERED_LIST;
}
function isIndentContainer(kind) {
  return kind === ITEM || kind === DESCRIPTION || kind === FOOTNOTE;
}
function isTextLeaf(kind) {
  return kind === PARAGRAPH || kind === TERM || kind === CAPTION || kind === HEADING;
}
function isOpaqueLeaf(kind) {
  return kind >= CODE && kind <= FRONTMATTER;
}
var FLAG_STAR = 1;
var FLAG_TASK = 2;
var FLAG_PAREN = 4;
var FLAG_ALPHA = 8;
var FLAG_ROMAN = 16;
var FLAG_UPPER = 32;
var LIST_STYLE_MASK = 63;
var FLAG_AUTO = 64;
var FLAG_HARD_BREAKS = 1;
var FLAG_QUOTE_FENCE = 2;
var FLAG_FIGURE = 4;
var FLAG_MARKER_ATTRIBUTES = 1;
var FLAG_RAW = 1;
var FLAG_DELIMITED = 2;
var FLAG_CONTINUATION = 1;
var FLAG_HEADER = 1;
var FLAG_CELL_ATTRIBUTES = 2;
var FLAG_SPAN_LEFT = 4;
var FLAG_SPAN_UP = 8;
var FLAG_ATTRIBUTES = 128;
var FLAG_TIGHT = 1;
var FLAG_IMAGE = 2;
var FLAG_UNCLOSED = 4;
var FLAG_BLOCK_MATH = 8;

// ../carve-js/v2/src/inline-tables.ts
var CLASS_SCHEME_FIRST = 1;
var CLASS_SCHEME_REST = 2;
var CLASS_URL_BODY = 4;
var CLASS_EMAIL_LOCAL = 8;
var CLASS_EMAIL_DOMAIN = 16;
var CLASS_EMAIL_LAST = 32;
var CLASS_RAW_FIRST = 64;
var CLASS_RAW_REST = 128;
var CLASS_EXTENSION_FIRST = 256;
var CLASS_EXTENSION_REST = 512;
var CLASS_SYMBOL_FIRST = 1024;
var CLASS_SYMBOL_REST = 2048;
var CLASS_MENTION = 4096;
var CLASS_NAME = 8192;
var CLASS_KEY_FIRST = 16384;
var CLASS_KEY_REST = 32768;
var CLASS_BARE_KEY_FIRST = 65536;
var CLASS_LANGUAGE = 131072;
var CLASS_VALUE_END = 262144;
var CLASS_BRACED_MARK = 524288;
var CLASS_QUOTE_OPENS_AFTER = 1048576;
var CLASS_QUOTE_CLOSES_BEFORE = 2097152;
var CLASS_SMART_TRIGGER = 4194304;
var CHARACTER_CLASSES = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  262144,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  262144,
  6291460,
  6553600,
  4,
  4,
  4,
  4,
  6553604,
  5242884,
  2097156,
  524292,
  4721694,
  2621444,
  4767390,
  6291486,
  1572868,
  179870,
  179870,
  179870,
  179870,
  179870,
  179870,
  179870,
  179870,
  179870,
  179870,
  3145732,
  2097156,
  4194304,
  5767172,
  4194304,
  2097156,
  4,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  1048580,
  262144,
  2097156,
  524288,
  588764,
  0,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  262143,
  1048576,
  262144,
  262144,
  524292,
  0
];
var SMART_EM_DASH = 1;
var SMART_EN_DASH = 2;
var SMART_LEFT_DOUBLE_QUOTE = 4;
var SMART_LEFT_SINGLE_QUOTE = 7;
var SMART_PLUS_MINUS = 12;
var SMART_RIGHT_DOUBLE_QUOTE = 13;
var SMART_RIGHT_SINGLE_QUOTE = 14;
var SMART_RIGHTWARDS_ARROW = 15;
var SMART_KIND_NAMES = [
  "ellipsis",
  "em_dash",
  "en_dash",
  "greater_than_or_equal",
  "left_double_quote",
  "left_right_arrow",
  "left_right_double_arrow",
  "left_single_quote",
  "leftwards_arrow",
  "leftwards_double_arrow",
  "less_than_or_equal",
  "not_equal",
  "plus_minus",
  "right_double_quote",
  "right_single_quote",
  "rightwards_arrow",
  "rightwards_double_arrow",
  "trademark"
];
var SMART_GLYPHS = ["\u2026", "\u2014", "\u2013", "\u2265", "\u201C", "\u2194", "\u21D4", "\u2018", "\u2190", "\u21D0", "\u2264", "\u2260", "\xB1", "\u201D", "\u2019", "\u2192", "\u21D2", "\u2122"];
var SMART_RUNS = [
  ["(tm)", 17],
  ["<-->", 5],
  ["-->", 15],
  ["...", 0],
  ["<--", 8],
  ["<==", 9],
  ["<=>", 6],
  ["==>", 16],
  ["!=", 11],
  ["+-", 12],
  ["<=", 10],
  [">=", 3]
];
var APOSTROPHE_WORDS = ["bout", "cause", "em", "n", "til", "tis", "tisn", "twas", "twasn", "twere", "twill", "twould"];
var BRACED_MARKS = "*+,-/=^_~";
var BRACED_NODES = [
  "strong",
  "insert",
  "subscript",
  "delete",
  "emphasis",
  "highlight",
  "superscript",
  "underline",
  "strike"
];
var BARE_MARKS = "/*";
var DEPTH_CAP = 200;

// ../carve-js/v2/src/unicode.ts
var NO_CHARACTER = -1;
var ASCII = 128;
var HIGH_SURROGATE = 55296;
var LOW_SURROGATE = 56320;
var SURROGATE_END = 57344;
var ZERO_WIDTH_JOINER = 8205;
var LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
var LETTER = /\p{L}/u;
var COMBINING = /[\p{M}\u{fe00}-\u{fe0f}\u{e0100}-\u{e01ef}]/u;
var NO_URL_CHARACTER = /[\p{Cc}\p{Cf}\p{White_Space}]/u;
function isAsciiLetter(code) {
  return code >= LOWER_A && code <= LOWER_Z || code >= UPPER_A && code <= UPPER_Z;
}
function isAsciiDigit(code) {
  return code >= DIGIT_0 && code <= DIGIT_9;
}
function isAsciiAlphanumeric(code) {
  return isAsciiLetter(code) || isAsciiDigit(code);
}
function isAsciiNameCharacter(code) {
  return isAsciiAlphanumeric(code) || code === UNDERSCORE || code === HYPHEN;
}
function isWordCharacter(code) {
  if (code < ASCII) return isAsciiLetter(code) || isAsciiDigit(code);
  return LETTER_OR_NUMBER.test(String.fromCodePoint(code));
}
function isLetter(code) {
  if (code < ASCII) return isAsciiLetter(code);
  return LETTER.test(String.fromCodePoint(code));
}
function isWhitespace(code) {
  return code === SPACE || code === TAB || code === LF || code === NO_CHARACTER;
}
var NO_BREAK_SPACE = 160;
function isBoundarySpace(code) {
  return isWhitespace(code) || code === NO_BREAK_SPACE;
}
function isJoining(code) {
  if (code < ASCII) return false;
  return code === ZERO_WIDTH_JOINER || COMBINING.test(String.fromCodePoint(code));
}
function isUrlCharacter(code) {
  return !NO_URL_CHARACTER.test(String.fromCodePoint(code));
}
function isAsciiPunctuation(code) {
  return code > SPACE && code < DIGIT_0 || code > DIGIT_9 && code < UPPER_A || code > UPPER_Z && code < LOWER_A || code > LOWER_Z && code < ASCII - 1;
}
function codePointAt(text, pos, end) {
  if (pos >= end) return NO_CHARACTER;
  const code = text.charCodeAt(pos);
  if (code < HIGH_SURROGATE || code >= LOW_SURROGATE || pos + 1 >= end) return code;
  return text.codePointAt(pos);
}
function codePointBefore(text, pos) {
  if (pos <= 0) return NO_CHARACTER;
  const code = text.charCodeAt(pos - 1);
  if (code < LOW_SURROGATE || code >= SURROGATE_END || pos < 2) return code;
  const lead = text.charCodeAt(pos - 2);
  return lead >= HIGH_SURROGATE && lead < LOW_SURROGATE ? text.codePointAt(pos - 2) : code;
}
var BIDI_FIRST = 8234;
var BIDI_LAST = 8297;
var BIDI_EMBEDDINGS_LAST = 8238;
var BIDI_ISOLATES_FIRST = 8294;
function isBidiControl(code) {
  return code >= BIDI_FIRST && code <= BIDI_EMBEDDINGS_LAST || code >= BIDI_ISOLATES_FIRST && code <= BIDI_LAST;
}
function holdsBidiControl(text, start, end) {
  for (let at = start; at < end; at++) {
    const code = text.charCodeAt(at);
    if (code >= BIDI_FIRST && code <= BIDI_LAST && isBidiControl(code)) return true;
  }
  return false;
}

// ../carve-js/v2/src/attributes.ts
var NONE = -1;
var ASCII2 = 128;
function emptyMemo() {
  return { doubleQuoteFailEnd: -1, singleQuoteFailEnd: -1, valueFailEnd: -1 };
}
function inClass(code, mask) {
  return code < ASCII2 && (CHARACTER_CLASSES[code] & mask) !== 0;
}
function skipSpaces(text, pos, end) {
  while (pos < end && text.charCodeAt(pos) === SPACE) pos++;
  return pos;
}
function classRunEnd(text, pos, end, mask) {
  while (pos < end && inClass(text.charCodeAt(pos), mask)) pos++;
  return pos;
}
function readAttributeBlock(text, pos, end, memo, sink) {
  let p = skipSpaces(text, pos + 1, end);
  for (let parts = 0; p < end; parts++) {
    if (text.charCodeAt(p) === BRACE_CLOSE) return parts > 0 ? p + 1 : NONE;
    const after2 = readPart(text, p, end, memo, sink);
    if (after2 === NONE) return NONE;
    p = skipSpaces(text, after2, end);
    if (p === after2 && p < end && text.charCodeAt(p) !== BRACE_CLOSE) return NONE;
  }
  return NONE;
}
function emptyBlockEnd(text, pos, end) {
  if (pos >= end || text.charCodeAt(pos) !== BRACE_OPEN) return NONE;
  const p = skipSpaces(text, pos + 1, end);
  return p < end && text.charCodeAt(p) === BRACE_CLOSE ? p + 1 : NONE;
}
function readPart(text, pos, end, memo, sink) {
  const code = text.charCodeAt(pos);
  if (code === HASH || code === DOT) {
    const after2 = classRunEnd(text, pos + 1, end, CLASS_NAME);
    if (after2 === pos + 1) return NONE;
    if (sink !== null && code === HASH) sink.id(text.slice(pos + 1, after2));
    if (sink !== null && code === DOT) sink.className(text.slice(pos + 1, after2));
    return after2;
  }
  if (code === COLON) return readLanguage(text, pos + 1, end, sink);
  return readKey(text, pos, end, memo, sink);
}
function readLanguage(text, pos, end, sink) {
  let p = classRunEnd(text, pos, end, CLASS_LANGUAGE);
  while (p > pos && p < end && text.charCodeAt(p) === HYPHEN) {
    const after2 = classRunEnd(text, p + 1, end, CLASS_LANGUAGE);
    if (after2 === p + 1) return NONE;
    p = after2;
  }
  if (sink !== null) sink.lang(text.slice(pos, p));
  return p;
}
function readValue(text, pos, equals, end, memo, sink) {
  const first = equals + 1 < end ? text.charCodeAt(equals + 1) : NONE;
  if (first === QUOTE_MARK || first === APOSTROPHE) {
    const close = quotedValueEnd(text, equals + 1, end, memo);
    if (close === NONE) return NONE;
    sink?.key(text.slice(pos, equals), unescape(text, equals + 2, close));
    return close + 1;
  }
  const after2 = unquotedValueEnd(text, equals + 1, end, memo);
  if (after2 !== NONE) sink?.key(text.slice(pos, equals), text.slice(equals + 1, after2));
  return after2;
}
function readKey(text, pos, end, memo, sink) {
  if (!inClass(text.charCodeAt(pos), CLASS_KEY_FIRST)) return NONE;
  const keyEnd = classRunEnd(text, pos + 1, end, CLASS_KEY_REST);
  if (keyEnd < end && text.charCodeAt(keyEnd) === EQUALS) return readValue(text, pos, keyEnd, end, memo, sink);
  if (!inClass(text.charCodeAt(pos), CLASS_BARE_KEY_FIRST)) return NONE;
  sink?.key(text.slice(pos, keyEnd), "");
  return keyEnd;
}
function quotedValueEnd(text, pos, end, memo) {
  const quote3 = text.charCodeAt(pos);
  if (pos < (quote3 === QUOTE_MARK ? memo.doubleQuoteFailEnd : memo.singleQuoteFailEnd)) return NONE;
  let p = pos + 1;
  for (; p < end; p++) {
    const code = text.charCodeAt(p);
    if (code === quote3) return p;
    if (code === LF) break;
    if (code === BACKSLASH && text.charCodeAt(p + 1) !== LF) p++;
  }
  if (quote3 === QUOTE_MARK) memo.doubleQuoteFailEnd = p;
  else memo.singleQuoteFailEnd = p;
  return NONE;
}
function unquotedValueEnd(text, pos, end, memo) {
  if (pos < memo.valueFailEnd) return NONE;
  let p = pos;
  while (p < end && !inClass(text.charCodeAt(p), CLASS_VALUE_END) && text.charCodeAt(p) !== LF) p++;
  const code = p < end ? text.charCodeAt(p) : NONE;
  if (p > pos && (code === SPACE || code === BRACE_CLOSE)) return p;
  if (code !== SPACE && code !== BRACE_CLOSE) memo.valueFailEnd = p;
  return NONE;
}
function unescape(text, start, end) {
  let value = "";
  let from = start;
  for (let p = start; p + 1 < end; p++) {
    if (text.charCodeAt(p) !== BACKSLASH || !isAsciiPunctuation(text.charCodeAt(p + 1))) continue;
    value += text.slice(from, p);
    from = p + 1;
    p++;
  }
  return value + text.slice(from, end);
}

// ../carve-js/v2/src/ast-nodes.ts
var FIELD_VALUES = {
  "*.dir": ["ltr", "rtl", "auto"],
  "comment.form": ["block", "line", "braced"],
  "link.form": ["full", "collapsed"],
  "image.form": ["full", "collapsed"],
  "xref.form": ["number", "page", "title", "full"],
  "list.spacing": ["tight", "loose"],
  "table_cell.span": ["rowspan", "colspan"],
  "table_cell.align": ["left", "right", "center"],
  "table_column.align": ["left", "right", "center"],
  "table_column.resolvedAlign": ["left", "right", "center"],
  "link.targetKind": ["url", "wiki", "doc", "xref"],
  "image.targetKind": ["url", "wiki", "doc", "xref"],
  "directive.tocTarget": ["headings", "figures", "tables", "listings"],
  "directive.kind": ["bibliography", "footnotes", "glossary", "index", "references", "toc"],
  "figure.kind": ["image", "table", "listing", "equation", "other"],
  "admonition.kind": ["note", "tip", "warning", "danger", "info", "success", "example", "quote"],
  "*.namespace": ["link", "footnote", "citation", "abbr", "heading"],
  "link.namespace": ["link"],
  "image.namespace": ["link"],
  "link_reference_definition.namespace": ["link"],
  "footnote_ref.namespace": ["footnote"],
  "footnote.namespace": ["footnote"],
  "abbreviation.namespace": ["abbr"],
  "abbreviation_def.namespace": ["abbr"],
  "citation.namespace": ["citation"],
  "citation_definition.namespace": ["citation"]
};
function isFieldValue(field, value) {
  return FIELD_VALUES[field].some((allowed) => allowed === value);
}

// ../carve-js/v2/src/ast.ts
var AST_VERSION = "2.0";
var DEFINITION_TYPES = ["footnote", "link_reference_definition", "abbreviation_def", "citation_definition"];
var INLINE_PARENTS = [
  "paragraph",
  "heading",
  "definition_term",
  "cell_paragraph",
  "line",
  "citation_definition",
  "emphasis",
  "strong",
  "underline",
  "strike",
  "highlight",
  "superscript",
  "subscript",
  "insert",
  "delete",
  "span",
  "link",
  "inline_footnote",
  "inline_extension",
  "small_caps"
];
var INLINE_PARENT_TYPES = new Set(INLINE_PARENTS);
var BLOCK_PARENTS = [
  "admonition",
  "block_extension",
  "block_quote",
  "caption",
  "definition_description",
  "directive",
  "div",
  "figure",
  "figure_group",
  "footnote",
  "list_item",
  "section"
];
var BLOCK_PARENT_TYPES = new Set(BLOCK_PARENTS);
var NO_NODES = [];
function childNodes(node) {
  return node.children ?? NO_NODES;
}
function titleOf(node) {
  const title = node.title;
  return typeof title === "string" ? void 0 : title;
}
function captionOf(node) {
  return node.caption;
}
function pointerKey(key) {
  return key.replaceAll("~", "~0").replaceAll("/", "~1");
}
function pointerToken(token) {
  return token.includes("~") ? token.replaceAll("~1", "/").replaceAll("~0", "~") : token;
}
var SPEC_ORDER = 0;
var SOURCE_ORDER = 1;
function forEachSlot(node, visit3, order = SPEC_ORDER) {
  const fields = node;
  const title = titleOf(node);
  if (order === SOURCE_ORDER && title !== void 0) visit3(title, "title", false);
  const children2 = node.children;
  if (children2 !== void 0) visit3(children2, "children", false);
  const caption2 = captionOf(node);
  if (caption2 !== void 0) visit3([caption2], "caption", true);
  visitInlineSlots(node, visit3);
  if (order === SPEC_ORDER && title !== void 0) visit3(title, "title", false);
  const fallback = fields["fallback"];
  if (fallback !== void 0) visit3(fallback, "fallback", false);
  const slots = fields["slots"];
  if (slots !== void 0) for (const name in slots) visit3(slots[name], `slots/${pointerKey(name)}`, false);
}
function visitInlineSlots(node, visit3) {
  if (node.type === "caption" && node.short !== void 0) visit3(node.short, "short", false);
  if (node.type === "citation") {
    for (const name of ["prefix", "locator", "suffix"]) {
      const list3 = node[name];
      if (list3 !== void 0) visit3(list3, name, false);
    }
  }
  if (node.type === "ruby") {
    node.pairs.forEach((pair, at) => {
      visit3(pair.base, `pairs/${at}/base`, false);
      visit3(pair.annotation, `pairs/${at}/annotation`, false);
    });
  }
}
function isNodeOfType(node, type) {
  return node.type === type;
}
function isInlineParent(node) {
  return INLINE_PARENT_TYPES.has(node.type);
}
function isBlockParent(node) {
  return BLOCK_PARENT_TYPES.has(node.type);
}
function isBreak(node) {
  return node !== void 0 && (node.type === "soft_break" || node.type === "hard_break");
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../carve-js/v2/src/render-tables.ts
var SLUG_REMOVED = [173, 8203, 8204, 8205, 8234, 8235, 8236, 8237, 8238, 8288, 8294, 8295, 8296, 8297, 65279];
var SLUG_REVERSED = /* @__PURE__ */ new Map([
  ["\xAB", '"'],
  ["\xB1", "+-"],
  ["\xBB", '"'],
  ["\u2013", "-"],
  ["\u2014", "-"],
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201A", "'"],
  ["\u201C", '"'],
  ["\u201D", '"'],
  ["\u201E", '"'],
  ["\u201F", '"'],
  ["\u2026", "..."],
  ["\u2122", "(tm)"],
  ["\u2190", "<--"],
  ["\u2192", "-->"],
  ["\u2194", "<-->"],
  ["\u21D0", "<=="],
  ["\u21D2", "==>"],
  ["\u21D4", "<=>"],
  ["\u2260", "!="],
  ["\u2264", "<="],
  ["\u2265", ">="]
]);
var PROBE_REMOVED = [
  [0, 32],
  [127, 160],
  [5760, 5760],
  [8192, 8202],
  [8232, 8233],
  [8234, 8238],
  [8239, 8239],
  [8287, 8287],
  [8294, 8297],
  [12288, 12288],
  [65279, 65279],
  [65533, 65533]
];
var DROPPED_NAMES = ["formaction", "srcdoc"];
var DROPPED_PREFIXES = ["on"];
var URL_LIST_ATTRIBUTES = /* @__PURE__ */ new Map([
  ["attributionsrc", false],
  ["imagesrcset", true],
  ["ping", false],
  ["srcset", true]
]);
var STYLE_PATTERNS = ["-moz-binding", "@import", "behavior:", "expression(", "url("];
var PROFILES = /* @__PURE__ */ new Map([
  ["article", {
    deniedBlock: ["raw_block"],
    deniedInline: ["raw_inline"],
    allowedBlock: null,
    allowedInline: null,
    linkRel: "",
    maxNesting: -1,
    maxLength: -1
  }],
  ["comment", {
    deniedBlock: null,
    deniedInline: null,
    allowedBlock: ["block_quote", "code_block", "list", "list_item", "paragraph"],
    allowedInline: [
      "autolink",
      "code",
      "delete",
      "emphasis",
      "hard_break",
      "highlight",
      "inline_extension",
      "insert",
      "link",
      "literal_inline",
      "mention",
      "soft_break",
      "strike",
      "strong",
      "subscript",
      "superscript",
      "text",
      "underline"
    ],
    linkRel: "nofollow ugc",
    maxNesting: 4,
    maxLength: 1e5
  }],
  ["full", { deniedBlock: null, deniedInline: null, allowedBlock: null, allowedInline: null, linkRel: "", maxNesting: -1, maxLength: -1 }],
  ["minimal", {
    deniedBlock: null,
    deniedInline: null,
    allowedBlock: ["list", "list_item", "paragraph"],
    allowedInline: [
      "code",
      "delete",
      "emphasis",
      "hard_break",
      "inline_extension",
      "insert",
      "literal_inline",
      "mention",
      "soft_break",
      "strike",
      "strong",
      "subscript",
      "superscript",
      "text",
      "underline"
    ],
    linkRel: "",
    maxNesting: 2,
    maxLength: 1e4
  }]
]);
var INCLUDE_OPTIONS = /* @__PURE__ */ new Map([
  ["lines", { value: "range", withoutValue: "paragraph", outsideShape: "include_node", repeated: "paragraph" }],
  ["region", { value: "identifier", withoutValue: "paragraph", outsideShape: "paragraph", repeated: "paragraph" }],
  ["rows", { value: "range", withoutValue: "include_node", outsideShape: "include_node", repeated: "include_node" }],
  ["cols", { value: "range_or_names", withoutValue: "include_node", outsideShape: "include_node", repeated: "include_node" }],
  ["shift", { value: "signed_integer_or_auto", withoutValue: "paragraph", outsideShape: "paragraph", repeated: "paragraph" }],
  ["code", { value: "language", withoutValue: "valid", outsideShape: "paragraph", repeated: "paragraph" }]
]);

// ../carve-js/v2/src/source.ts
var TAB_STOP = 4;
function lineAt(lineStarts, lineCount2, offset) {
  let low = 0;
  let high = lineCount2 - 1;
  while (low < high) {
    const middle = low + high + 1 >> 1;
    if (lineStarts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
}
function lineFeedAt(src, pos) {
  const feed = src.indexOf("\n", pos);
  return feed < 0 ? src.length : feed;
}
function lineEndAt(src, lineStarts, lineCount2, line2) {
  if (line2 + 1 >= lineCount2) {
    const length = src.length;
    return length > 0 && src.charCodeAt(length - 1) === LF ? contentEnd(src, lineStarts[line2], length - 1) : length;
  }
  return contentEnd(src, lineStarts[line2], lineStarts[line2 + 1] - 1);
}
function contentEnd(src, start, end) {
  return end > start && src.charCodeAt(end - 1) === CR ? end - 1 : end;
}
function advanceColumn(column, code) {
  return code === TAB ? column + TAB_STOP - column % TAB_STOP : column + 1;
}
function columnAt(src, lineStarts, lineCount2, offset) {
  let column = 0;
  for (let pos = lineStarts[lineAt(lineStarts, lineCount2, offset)]; pos < offset; pos++) {
    column = advanceColumn(column, src.charCodeAt(pos));
  }
  return column;
}
function isSpaceOrTab(code) {
  return code === SPACE || code === TAB;
}
function trimEndWhitespace(text) {
  let end = text.length;
  while (end > 0 && (isSpaceOrTab(text.charCodeAt(end - 1)) || text.charCodeAt(end - 1) === LF)) end--;
  return end === text.length ? text : text.slice(0, end);
}
function trimSpaces(text) {
  let start = 0;
  let end = text.length;
  while (start < end && isSpaceOrTab(text.charCodeAt(start))) start++;
  while (end > start && isSpaceOrTab(text.charCodeAt(end - 1))) end--;
  return start === 0 && end === text.length ? text : text.slice(start, end);
}

// ../carve-js/v2/src/include.ts
var LEFT_CURLY_QUOTE = 8220;
var RIGHT_CURLY_QUOTE = "\u201D";
var NONE2 = -1;
function skip(src, pos, end) {
  while (pos < end && src.charCodeAt(pos) === SPACE) pos++;
  return pos;
}
function closingQuote(src, pos, end) {
  const quote3 = src.charCodeAt(pos);
  for (let p = pos + 1; p < end; p++) {
    const code = src.charCodeAt(p);
    if (code === BACKSLASH) p++;
    else if (code === quote3) return p;
  }
  return NONE2;
}
function readPath(src, pos, end, shape) {
  const first = src.charCodeAt(pos);
  let close;
  if (first === QUOTE_MARK) {
    close = closingQuote(src, pos, end);
  } else if (first === LEFT_CURLY_QUOTE) {
    close = src.indexOf(RIGHT_CURLY_QUOTE, pos + 1);
    if (close >= end) close = NONE2;
  } else {
    let p = pos;
    while (p < end && !endsBarePath(src.charCodeAt(p))) p++;
    shape.pathStart = pos;
    shape.pathEnd = p;
    return p > pos ? p : NONE2;
  }
  if (close <= pos + 1) return NONE2;
  shape.pathStart = pos + 1;
  shape.pathEnd = close;
  shape.pathQuote = first;
  return close + 1;
}
function endsBarePath(code) {
  return code === SPACE || code === HASH || code === AT_SIGN || code === BRACE_CLOSE || code === QUOTE_MARK || code === LEFT_CURLY_QUOTE;
}
function nameEnd(src, pos, end, first) {
  if (pos >= end || !first(src.charCodeAt(pos))) return NONE2;
  let p = pos + 1;
  while (p < end && isAsciiNameCharacter(src.charCodeAt(p))) p++;
  return p;
}
function startsSection(code) {
  return isAsciiLetter(code) || isAsciiDigit(code) || code === UNDERSCORE;
}
function startsKey(code) {
  return isAsciiLetter(code) || code === UNDERSCORE;
}
function valueEnd(src, pos, end) {
  const first = pos < end ? src.charCodeAt(pos) : 0;
  if (first === QUOTE_MARK || first === APOSTROPHE) {
    const close = closingQuote(src, pos, end);
    return close === NONE2 ? NONE2 : close + 1;
  }
  let p = pos;
  while (p < end && !endsValue(src.charCodeAt(p))) p++;
  return p > pos ? p : NONE2;
}
function endsValue(code) {
  return code === AT_SIGN || code === BRACE_CLOSE || isSpaceOrTab(code);
}
function readOption(src, pos, end, shape) {
  const keyEnd = nameEnd(src, pos + 1, end, startsKey);
  if (keyEnd === NONE2) return NONE2;
  if (keyEnd >= end || src.charCodeAt(keyEnd) !== COLON) {
    shape.options.push(pos + 1, keyEnd, NONE2, NONE2);
    return keyEnd;
  }
  const after2 = valueEnd(src, keyEnd + 1, end);
  if (after2 !== NONE2) shape.options.push(pos + 1, keyEnd, keyEnd + 1, after2);
  return after2;
}
function readSection(src, pos, end, shape) {
  const after2 = nameEnd(src, pos + 1, end, startsSection);
  if (after2 === NONE2) return NONE2;
  if (shape.sectionStart !== NONE2) shape.twoSections = true;
  shape.sectionStart = pos + 1;
  shape.sectionEnd = after2;
  return after2;
}
function closesAt(src, pos, end) {
  if (pos + 2 > end || src.charCodeAt(pos) !== BRACE_CLOSE || src.charCodeAt(pos + 1) !== BRACE_CLOSE) return false;
  let p = pos + 2;
  while (p < end && isSpaceOrTab(src.charCodeAt(p))) p++;
  return p === end;
}
function readShape(src, pos, end) {
  if (pos + 2 > end || src.charCodeAt(pos) !== BRACE_OPEN || src.charCodeAt(pos + 1) !== BRACE_OPEN) return null;
  const shape = {
    pathStart: 0,
    pathEnd: 0,
    pathQuote: 0,
    sectionStart: NONE2,
    sectionEnd: NONE2,
    options: [],
    twoSections: false,
    end: 0
  };
  const pathStart = skip(src, pos + 2, end);
  let p = pathStart === pos + 2 ? NONE2 : readPath(src, pathStart, end, shape);
  while (p !== NONE2) {
    const part = skip(src, p, end);
    const code = part < end ? src.charCodeAt(part) : 0;
    if (code === HASH) p = readSection(src, part, end, shape);
    else if (code === AT_SIGN) p = readOption(src, part, end, shape);
    else if (part > p && closesAt(src, part, end)) return { ...shape, end: part + 2 };
    else return null;
  }
  return null;
}
function isIdentifier(value) {
  return nameEnd(value, 0, value.length, startsKey) === value.length;
}
function isShift(value) {
  if (value === "auto") return true;
  const first = value.charCodeAt(0);
  const start = first === PLUS || first === HYPHEN ? 1 : 0;
  if (start === value.length) return false;
  for (let p = start; p < value.length; p++) if (!isAsciiDigit(value.charCodeAt(p))) return false;
  return true;
}
function isLanguageCharacter(code) {
  return isAsciiNameCharacter(code) || code === PLUS || code === HASH || code === DOT || code === SLASH;
}
function isLanguage(value) {
  for (let p = 0; p < value.length; p++) if (!isLanguageCharacter(value.charCodeAt(p))) return false;
  return value !== "";
}
function isNameList(written) {
  if (written.length < 2 || written.charCodeAt(0) !== QUOTE_MARK) return false;
  let length = 0;
  for (let p = 1; p < written.length - 1; p++) {
    const code = written.charCodeAt(p);
    if (code === COMMA) {
      if (length === 0) return false;
      length = 0;
      continue;
    }
    if (code === BACKSLASH) p++;
    length++;
  }
  return length > 0;
}
var SHAPES = /* @__PURE__ */ new Map([
  ["identifier", isIdentifier],
  ["signed_integer_or_auto", isShift],
  ["language", isLanguage]
]);
function isQuote(code) {
  return code === QUOTE_MARK || code === APOSTROPHE;
}
function valueText(written) {
  return written.length >= 2 && isQuote(written.charCodeAt(0)) ? unescape(written, 1, written.length - 1) : written;
}
function optionVerdict(key, written) {
  const rule = INCLUDE_OPTIONS.get(key);
  if (rule === void 0) return "paragraph";
  if (written === null) return rule.withoutValue;
  const shape = SHAPES.get(rule.value);
  return shape === void 0 || shape(valueText(written)) ? "valid" : rule.outsideShape;
}
function keptValue(key, written) {
  if (written === null) return "";
  return key === "cols" && isNameList(written) ? written : valueText(written);
}
function optionPairs(src, shape) {
  const values = /* @__PURE__ */ new Map();
  const options = shape.options;
  for (let at = 0; at < options.length; at += 4) {
    const key = src.slice(options[at], options[at + 1]);
    const written = options[at + 2] === NONE2 ? null : src.slice(options[at + 2], options[at + 3]);
    const repeated = values.has(key);
    const verdict = repeated ? INCLUDE_OPTIONS.get(key)?.repeated : optionVerdict(key, written);
    if (verdict === "paragraph" || verdict === void 0) return null;
    if (!repeated) values.set(key, keptValue(key, written));
  }
  const pairs = [];
  for (const key of INCLUDE_OPTIONS.keys()) {
    const value = values.get(key);
    if (value !== void 0) pairs.push([key, value]);
  }
  return pairs;
}
function readInclude(src, pos, end) {
  const shape = readShape(src, pos, end);
  if (shape === null || shape.twoSections) return null;
  const options = optionPairs(src, shape);
  if (options === null) return null;
  const path = shape.pathQuote === QUOTE_MARK ? unescape(src, shape.pathStart, shape.pathEnd) : src.slice(shape.pathStart, shape.pathEnd);
  const section = shape.sectionStart === NONE2 ? null : src.slice(shape.sectionStart, shape.sectionEnd);
  return { path, section, options, end: shape.end };
}
function quoted(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
function isBarePath(path) {
  if (path === "") return false;
  for (let at = 0; at < path.length; at++) if (endsBarePath(path.charCodeAt(at))) return false;
  return true;
}
function isBareValue(value) {
  if (isQuote(value.charCodeAt(0))) return false;
  for (let at = 0; at < value.length; at++) if (endsValue(value.charCodeAt(at))) return false;
  return true;
}
function includeOption(name, value) {
  if (name === "") return value;
  if (value === "") return `@${name}`;
  const bare = name === "cols" && value.startsWith('"') || isBareValue(value);
  return `@${name}:${bare ? value : quoted(value)}`;
}
var OPTION_ORDER = [...INCLUDE_OPTIONS.keys()];
function optionRank(name) {
  const rank = OPTION_ORDER.indexOf(name);
  return rank < 0 ? OPTION_ORDER.length : rank;
}
function includeSource(node) {
  const path = node.path;
  const parts = [isBarePath(path) ? path : quoted(path)];
  if (node.section !== void 0) parts.push(`#${node.section}`);
  const options = [...node.options ?? []].sort((a, b) => optionRank(a[0]) - optionRank(b[0]));
  for (const [name, value] of options) parts.push(includeOption(name, value));
  return `{{ ${parts.join(" ")} }}`;
}

// ../carve-js/v2/src/lines.ts
var MAX_HEADING_LEVEL = 6;
var MAX_ORDERED_DIGITS = 9;
var MAX_ORDERED_LETTERS = 9;
var MIN_RUN_LENGTH = 3;
var TASK_BOX_LENGTH = 4;
var FRONTMATTER_RUN = 3;
function skipSpaces2(src, pos, end) {
  while (pos < end && isSpaceOrTab(src.charCodeAt(pos))) pos++;
  return pos;
}
function runLength(src, pos, end, code) {
  let p = pos;
  while (p < end && src.charCodeAt(p) === code) p++;
  return p - pos;
}
function isQuoteMark(src, pos, end) {
  if (pos >= end || src.charCodeAt(pos) !== GREATER) return false;
  return pos + 1 === end || src.charCodeAt(pos + 1) === SPACE;
}
function afterMarkerSpace(src, markerEnd, end, spaces) {
  const contentStart = markerEnd + spaces;
  if (contentStart > end || runLength(src, markerEnd, contentStart, SPACE) !== spaces) return -1;
  return skipSpaces2(src, contentStart, end) < end ? contentStart : -1;
}
function braceBlockEnd(src, pos, end) {
  if (pos + 1 >= end || src.charCodeAt(pos) !== BRACE_OPEN) return -1;
  const first = src.charCodeAt(pos + 1);
  if (first === PERCENT || first === BRACE_OPEN || first === BRACE_CLOSE) return -1;
  for (let p = pos + 1; p < end; p++) {
    const code = src.charCodeAt(p);
    if (code === BRACE_OPEN) return -1;
    if (code === BRACE_CLOSE) return p + 1;
    if (code !== QUOTE_MARK) continue;
    const after2 = quotedEnd(src, p, end);
    if (after2 < 0) return -1;
    p = after2 - 1;
  }
  return -1;
}
function braceBlocksEnd(src, pos, end) {
  for (; ; ) {
    const next = braceBlockEnd(src, pos, end);
    if (next < 0) return pos;
    pos = next;
  }
}
function isAttributeLine(src, pos, end) {
  const blocksEnd = braceBlocksEnd(src, pos, end);
  if (blocksEnd === pos || skipSpaces2(src, blocksEnd, end) !== end) return false;
  const memo = emptyMemo();
  let p = pos;
  while (p >= 0 && p < blocksEnd) p = readAttributeBlock(src, p, blocksEnd, memo, null);
  return p === blocksEnd;
}
function isIncludeLine(src, pos, end) {
  return readInclude(src, pos, end) !== null;
}
function bulletMarkerEnd(src, pos, end) {
  const code = src.charCodeAt(pos);
  if (code !== HYPHEN && code !== STAR) return -1;
  return afterMarkerSpace(src, braceBlocksEnd(src, pos + 1, end), end, 1);
}
function isLower(code) {
  return code >= LOWER_A && code <= LOWER_Z;
}
function isUpper(code) {
  return code >= UPPER_A && code <= UPPER_Z;
}
function romanLetterValue(code) {
  switch (code | 32) {
    case 105:
      return 1;
    case 118:
      return 5;
    case 120:
      return 10;
    case 108:
      return 50;
    case 99:
      return 100;
    case 100:
      return 500;
    case 109:
      return 1e3;
    default:
      return 0;
  }
}
function digitsEnd(src, pos, end) {
  let p = pos;
  while (p < end && isAsciiDigit(src.charCodeAt(p))) p++;
  return p - pos > MAX_ORDERED_DIGITS ? -1 : p;
}
var CASE_BIT = 32;
function romanPlaceEnd(src, pos, end, one, five, ten) {
  const first = pos < end ? src.charCodeAt(pos) | CASE_BIT : 0;
  const second = pos + 1 < end ? src.charCodeAt(pos + 1) | CASE_BIT : 0;
  if (first === one && (second === ten || second === five)) return pos + 2;
  let p = first === five ? pos + 1 : pos;
  const limit = p + 3;
  while (p < end && p < limit && (src.charCodeAt(p) | CASE_BIT) === one) p++;
  return p;
}
function isStandardRoman(src, pos, end) {
  let p = romanPlaceEnd(src, pos, end, 109, 0, 0);
  p = romanPlaceEnd(src, p, end, 99, 100, 109);
  p = romanPlaceEnd(src, p, end, 120, 108, 99);
  return romanPlaceEnd(src, p, end, 105, 118, 120) === end;
}
function lettersEnd(src, pos, end) {
  const lower = isLower(src.charCodeAt(pos));
  let roman2 = romanLetterValue(src.charCodeAt(pos)) > 0;
  let p = pos + 1;
  while (p < end && (lower ? isLower(src.charCodeAt(p)) : isUpper(src.charCodeAt(p)))) {
    roman2 = roman2 && romanLetterValue(src.charCodeAt(p)) > 0;
    if (!roman2 || p - pos >= MAX_ORDERED_LETTERS) return -1;
    p++;
  }
  return p - pos === 1 || isStandardRoman(src, pos, p) ? p : -1;
}
function orderedDelimiter(src, pos, end) {
  const first = src.charCodeAt(pos);
  let p = pos;
  if (isAsciiDigit(first)) p = digitsEnd(src, pos, end);
  else if (isLower(first) || isUpper(first)) p = lettersEnd(src, pos, end);
  if (p < 0 || p >= end) return -1;
  const delimiter = src.charCodeAt(p);
  if (delimiter === DOT) return p;
  return delimiter === PAREN_CLOSE && p > pos ? p : -1;
}
function orderedMarkerEnd(src, pos, delimiter, end) {
  const spaces = src.charCodeAt(delimiter) === DOT && delimiter === pos + 1 && isUpper(src.charCodeAt(pos)) ? 2 : 1;
  const content = afterMarkerSpace(src, braceBlocksEnd(src, delimiter + 1, end), end, spaces);
  const ellipsis = content >= 0 && src.charCodeAt(content) === DOT && content + 1 < end && src.charCodeAt(content + 1) === SPACE;
  if (delimiter === pos && ellipsis) return -1;
  return content;
}
function opensListInParagraph(src, pos, end) {
  if (bulletMarkerEnd(src, pos, end) >= 0) return true;
  const delimiter = orderedDelimiter(src, pos, end);
  if (delimiter === pos) return true;
  if (isAsciiDigit(src.charCodeAt(pos))) return decimalValue(src, pos, delimiter) === 1;
  const letter = src.charCodeAt(pos) | CASE_BIT;
  return delimiter === pos + 1 && (letter === LOWER_A || letter === LOWER_I);
}
function isListMarker(src, pos, end) {
  if (bulletMarkerEnd(src, pos, end) >= 0) return true;
  const delimiter = orderedDelimiter(src, pos, end);
  return delimiter >= 0 && orderedMarkerEnd(src, pos, delimiter, end) >= 0;
}
function decimalValue(src, pos, end) {
  let value = 0;
  for (let p = pos; p < end; p++) value = value * 10 + (src.charCodeAt(p) - DIGIT_0);
  return value;
}
function romanValue(src, pos, end) {
  let value = 0;
  for (let p = pos; p < end; p++) {
    const digit = romanLetterValue(src.charCodeAt(p));
    const next = p + 1 < end ? romanLetterValue(src.charCodeAt(p + 1)) : 0;
    value += digit < next ? -digit : digit;
  }
  return value;
}
function isTaskState(code) {
  return code === SPACE || code === LOWER_X || code === UPPER_X || code === UNDERSCORE || code === SLASH || code === BANG || code === HYPHEN || code === GREATER || code === QUESTION;
}
function taskBoxEnd(src, pos, end) {
  if (pos + TASK_BOX_LENGTH > end) return -1;
  if (src.charCodeAt(pos) !== BRACKET_OPEN || src.charCodeAt(pos + 2) !== BRACKET_CLOSE) return -1;
  if (!isTaskState(src.charCodeAt(pos + 1))) return -1;
  return afterMarkerSpace(src, pos + 3, end, 1);
}
function termMarkEnd(src, pos, end) {
  return runLength(src, pos, end, COLON) === 2 ? afterMarkerSpace(src, pos + 2, end, 1) : -1;
}
function descriptionMarkEnd(src, pos, end) {
  return runLength(src, pos, end, COLON) === 1 ? afterMarkerSpace(src, pos + 1, end, 1) : -1;
}
function isDescriptionListMark(src, pos, end) {
  return termMarkEnd(src, pos, end) >= 0 || descriptionMarkEnd(src, pos, end) >= 0;
}
function headingLevel(src, pos, end) {
  const code = src.charCodeAt(pos);
  if (code !== EQUALS && code !== HASH) return 0;
  const level = runLength(src, pos, end, code);
  if (level > MAX_HEADING_LEVEL) return 0;
  return afterMarkerSpace(src, pos + level, end, 1) < 0 ? 0 : level;
}
function fenceOpenerLength(src, pos, end) {
  if (src.charCodeAt(pos) !== BACKTICK) return 0;
  const length = runLength(src, pos, end, BACKTICK);
  if (length < MIN_RUN_LENGTH) return 0;
  for (let p = pos + length; p < end; p++) if (src.charCodeAt(p) === BACKTICK) return 0;
  return length;
}
function fenceRunLength(src, pos, end, code) {
  const length = runLength(src, pos, end, code);
  return length >= MIN_RUN_LENGTH ? length : 0;
}
function isFenceLine(src, pos, end) {
  const code = src.charCodeAt(pos);
  if (code === COLON) return divRunLength(src, pos, end) > 0;
  if (code === PERCENT) return fenceRunLength(src, pos, end, code) > 0;
  return fenceOpenerLength(src, pos, end) > 0;
}
function divRunLength(src, pos, end) {
  const length = fenceRunLength(src, pos, end, COLON);
  const after2 = pos + length;
  return after2 === end || isSpaceOrTab(src.charCodeAt(after2)) ? length : 0;
}
function isSigil(src, pos, end) {
  const code = src.charCodeAt(pos);
  if (code !== PIPE && code !== BACKSLASH && code !== GREATER) return false;
  return pos + 1 === end || isSpaceOrTab(src.charCodeAt(pos + 1));
}
function isBareRun(src, pos, end, code, minLength) {
  const length = runLength(src, pos, end, code);
  return length >= minLength && skipSpaces2(src, pos + length, end) === end;
}
function divSigil(src, pos, end) {
  const at = skipSpaces2(src, pos, end);
  return at < end && isSigil(src, at, end) ? src.charCodeAt(at) : 0;
}
function isFigureName(src, pos, end) {
  const at = skipSpaces2(src, pos, end);
  const name = "figure";
  if (at + name.length > end) return false;
  for (let p = 0; p < name.length; p++) if (src.charCodeAt(at + p) !== name.charCodeAt(p)) return false;
  return skipSpaces2(src, at + name.length, end) === end;
}
function isThematicBreak(src, pos, end) {
  return isBareRun(src, pos, end, STAR, MIN_RUN_LENGTH);
}
function isLineComment(src, pos, end) {
  return runLength(src, pos, end, PERCENT) === 2;
}
function captionContentStart(src, pos, end) {
  if (pos + 1 >= end || src.charCodeAt(pos) !== CARET || src.charCodeAt(pos + 1) !== SPACE) return -1;
  const content = skipSpaces2(src, pos + 1, end);
  return content < end ? content : -1;
}
function labelEnd(src, pos, end, skip2, spaces) {
  let p = pos + skip2;
  const start = p;
  while (p < end) {
    const code = src.charCodeAt(p);
    if (code === BRACKET_CLOSE) break;
    if (code === BRACKET_OPEN || !spaces && isSpaceOrTab(code)) return -1;
    if (code === BACKSLASH) p++;
    p++;
  }
  if (p === start || p + 1 >= end || src.charCodeAt(p + 1) !== COLON) return -1;
  return p + 2;
}
function footnoteMarkerEnd(src, pos, end) {
  if (pos + 1 >= end || src.charCodeAt(pos) !== BRACKET_OPEN || src.charCodeAt(pos + 1) !== CARET) return -1;
  const marker = labelEnd(src, pos, end, 2, true);
  return marker < 0 ? -1 : afterMarkerSpace(src, marker, end, 1);
}
function definitionDestinationEnd(src, p, end) {
  const start = p;
  while (p < end && !isSpaceOrTab(src.charCodeAt(p))) p++;
  if (p === start) return -1;
  const destination3 = p;
  const quote3 = p + 1 < end && src.charCodeAt(p) === SPACE ? src.charCodeAt(p + 1) : 0;
  if (quote3 === QUOTE_MARK || quote3 === APOSTROPHE) {
    const after2 = quotedEnd(src, p + 1, end, quote3);
    if (after2 >= 0 && skipSpaces2(src, after2, end) === end) return destination3;
  }
  return skipSpaces2(src, p, end) === end ? destination3 : -1;
}
function isLinkDefinition(src, pos, end) {
  if (pos + 1 >= end || src.charCodeAt(pos) !== BRACKET_OPEN || src.charCodeAt(pos + 1) === CARET) return false;
  const marker = labelEnd(src, pos, end, 1, true);
  if (marker < 0 || marker >= end || src.charCodeAt(marker) !== SPACE) return false;
  return definitionDestinationEnd(src, skipSpaces2(src, marker + 1, end), end) >= 0;
}
function quotedEnd(src, pos, end, quote3 = QUOTE_MARK) {
  for (let p = pos + 1; p < end; p++) {
    const code = src.charCodeAt(p);
    if (code === BACKSLASH) p++;
    else if (code === quote3) return p + 1;
  }
  return -1;
}
function isAbbreviation(src, pos, end) {
  if (pos + 1 >= end || src.charCodeAt(pos) !== STAR || src.charCodeAt(pos + 1) !== BRACKET_OPEN) return false;
  let p = pos + 2;
  while (p < end && (isAsciiDigit(src.charCodeAt(p)) || isLower(src.charCodeAt(p)) || isUpper(src.charCodeAt(p)))) p++;
  if (p === pos + 2 || p + 1 >= end || src.charCodeAt(p) !== BRACKET_CLOSE || src.charCodeAt(p + 1) !== COLON) return false;
  return afterMarkerSpace(src, p + 2, end, 1) >= 0;
}
function isDefinition(src, pos, end) {
  return footnoteMarkerEnd(src, pos, end) >= 0 || isLinkDefinition(src, pos, end) || isAbbreviation(src, pos, end);
}
function pairEnd(src, pos, end, open, close) {
  let depth2 = 0;
  for (let p = pos; p < end; p++) {
    const code = src.charCodeAt(p);
    if (code === BACKSLASH) p++;
    else if (code === open) depth2++;
    else if (code === close && --depth2 === 0) return p + 1;
  }
  return -1;
}
function isImageOnly(src, pos, end) {
  if (pos + 1 >= end || src.charCodeAt(pos) !== BANG || src.charCodeAt(pos + 1) !== BRACKET_OPEN) return false;
  let p = pairEnd(src, pos + 1, end, BRACKET_OPEN, BRACKET_CLOSE);
  if (p < 0 || p >= end) return false;
  const code = src.charCodeAt(p);
  if (code === PAREN_OPEN) p = pairEnd(src, p, end, PAREN_OPEN, PAREN_CLOSE);
  else if (code === BRACKET_OPEN) p = pairEnd(src, p, end, BRACKET_OPEN, BRACKET_CLOSE);
  else return false;
  return p >= 0 && skipSpaces2(src, braceBlocksEnd(src, p, end), end) === end;
}
function isDisplayMathOnly(src, pos, end) {
  if (pos + 2 >= end || src.charCodeAt(pos) !== DOLLAR || src.charCodeAt(pos + 1) !== DOLLAR) return false;
  const open = runLength(src, pos + 2, end, BACKTICK);
  if (open === 0) return false;
  let p = pos + 2 + open;
  while (p < end) {
    if (src.charCodeAt(p) !== BACKTICK) {
      p++;
      continue;
    }
    const run = runLength(src, p, end, BACKTICK);
    p += run;
    if (run === open) return skipSpaces2(src, braceBlocksEnd(src, p, end), end) === end;
  }
  return false;
}
function isFrontmatterOpener(src, pos, end) {
  if (runLength(src, pos, end, HYPHEN) !== FRONTMATTER_RUN) return false;
  let p = pos + FRONTMATTER_RUN;
  const name = p + 1 < end && src.charCodeAt(p) === SPACE ? p + 1 : p;
  if (name < end && isLower(src.charCodeAt(name))) {
    p = name + 1;
    while (p < end && (isLower(src.charCodeAt(p)) || isAsciiDigit(src.charCodeAt(p)) || src.charCodeAt(p) === HYPHEN)) p++;
  }
  return skipSpaces2(src, p, end) === end;
}
function isFrontmatterCloser(src, pos, end) {
  if (runLength(src, pos, end, HYPHEN) !== FRONTMATTER_RUN) return false;
  return skipSpaces2(src, pos + FRONTMATTER_RUN, end) === end;
}
function isRawInfo(src, pos, end) {
  return pos + 1 < end && src.charCodeAt(pos) === EQUALS && (isLower(src.charCodeAt(pos + 1)) || isUpper(src.charCodeAt(pos + 1)));
}
function startsWith(src, pos, end, word) {
  if (pos + word.length > end) return false;
  for (let p = 0; p < word.length; p++) if (src.charCodeAt(pos + p) !== word.charCodeAt(p)) return false;
  return true;
}
function isWord(src, pos, end, word) {
  return startsWith(src, pos, end, word) && (pos + word.length === end || isSpaceOrTab(src.charCodeAt(pos + word.length)));
}
var MAX_COUNT_DIGITS = 9;
function attributeKeyValue(src, pos, end, key) {
  const found = { value: null };
  const ignore = () => void 0;
  const sink = {
    id: ignore,
    className: ignore,
    lang: ignore,
    key: (name, value) => {
      if (name === key) found.value = value;
    }
  };
  const memo = emptyMemo();
  let p = pos;
  while (p < end) {
    const after2 = src.charCodeAt(p) === BRACE_OPEN ? readAttributeBlock(src, p, end, memo, sink) : -1;
    p = after2 < 0 ? p + 1 : after2;
  }
  return found.value;
}
function countValue(value) {
  if (value === null) return -1;
  if (value === "") return 1;
  for (let p = 0; p < value.length; p++) if (!isAsciiDigit(value.charCodeAt(p))) return -1;
  return value.length > MAX_COUNT_DIGITS ? 10 ** MAX_COUNT_DIGITS : decimalValue(value, 0, value.length);
}
var BacktickRuns = class {
  starts = /* @__PURE__ */ new Map();
  cursors = /* @__PURE__ */ new Map();
  constructor(src, pos, end) {
    let p = pos;
    while (p < end) {
      if (src.charCodeAt(p) !== BACKTICK) {
        p++;
        continue;
      }
      const run = runLength(src, p, end, BACKTICK);
      const list3 = this.starts.get(run);
      if (list3 === void 0) this.starts.set(run, [p]);
      else list3.push(p);
      p += run;
    }
  }
  /** Start of the first run of exactly `length` at or after `pos`, or -1. Calls for one length move forward. */
  closer(pos, length) {
    const list3 = this.starts.get(length);
    if (list3 === void 0) return -1;
    let index = this.cursors.get(length) ?? 0;
    while (index < list3.length && list3[index] < pos) index++;
    this.cursors.set(length, index);
    return index < list3.length ? list3[index] : -1;
  }
};
function scanOutsideCode(src, pos, end, target2, first, out) {
  let runs = null;
  let last = -1;
  let p = pos;
  while (p < end) {
    const code = src.charCodeAt(p);
    if (code === target2) {
      if (first) return p;
      out?.push(p);
      last = p;
      p++;
    } else if (code === BACKSLASH) {
      p += 2;
    } else if (code === BACKTICK) {
      const run = runLength(src, p, end, BACKTICK);
      runs ??= new BacktickRuns(src, p + run, end);
      const close = runs.closer(p + run, run);
      p = close < 0 ? p + run : close + run;
    } else {
      p++;
    }
  }
  return last;
}
function separatorPipes(src, pos, end) {
  const pipes = [];
  scanOutsideCode(src, pos, end, PIPE, false, pipes);
  return pipes;
}
function lastPipe(src, pos, end) {
  return scanOutsideCode(src, pos, end, PIPE, false, null);
}
function rowAttributeStart(src, pipe, end) {
  let p = pipe + 1;
  if (p < end && src.charCodeAt(p) === SPACE) p++;
  return braceBlockEnd(src, p, end) < 0 ? -1 : p;
}
function rowClosingPipe(src, pos, end) {
  if (src.charCodeAt(pos) !== PIPE) return -1;
  const last = lastPipe(src, pos + 1, end);
  if (last < 0) return -1;
  const attribute = rowAttributeStart(src, last, end);
  const tail = skipSpaces2(src, attribute < 0 ? last + 1 : braceBlocksEnd(src, attribute, end), end);
  return tail === end || isLineComment(src, tail, end) ? last : -1;
}
function continuationClosingPipe(src, pos, end) {
  if (src.charCodeAt(pos) !== PLUS) return -1;
  const last = lastPipe(src, pos + 1, end);
  return last >= 0 && skipSpaces2(src, last + 1, end) === end ? last : -1;
}
function trimEnd(src, pos, end) {
  while (end > pos && isSpaceOrTab(src.charCodeAt(end - 1))) end--;
  return end;
}

// ../carve-js/v2/src/state.ts
var MAX_DEPTH = 200;
var NO_LEAF = -1;
var NO_LINE = -1;
var NO_DEPTH = -1;
var INITIAL_EVENTS = 1024 * EVENT_WIDTH;
var INITIAL_LINES = 256;
var POOL_SIZE = 4;
function createState() {
  return {
    src: "",
    events: new Int32Array(INITIAL_EVENTS),
    eventLength: 0,
    lineStarts: new Int32Array(INITIAL_LINES),
    lineCount: 0,
    contentEnd: 0,
    containers: {
      kind: new Uint8Array(MAX_DEPTH + 1),
      column: new Int32Array(MAX_DEPTH + 1),
      style: new Uint8Array(MAX_DEPTH + 1),
      loose: new Uint8Array(MAX_DEPTH + 1),
      depth: 0
    },
    leaf: {
      kind: NO_LEAF,
      start: 0,
      end: 0,
      lines: 0,
      column: 0,
      fenceChar: 0,
      fenceLength: 0,
      fenceColumn: 0,
      tableHeadRows: 0,
      tableHeadOpen: false
    },
    above: {
      blankCount: 0,
      captionDepth: NO_DEPTH,
      attributesDepth: NO_DEPTH,
      attributesStart: 0,
      attributesEnd: 0,
      takeAttributes: false,
      heldBlankLine: NO_LINE
    },
    cursor: { pos: 0, column: 0, origin: 0, prefixEnd: 0 }
  };
}
var pool = [];
function acquireState() {
  return pool.pop() ?? createState();
}
function releaseState(state) {
  state.src = "";
  if (pool.length < POOL_SIZE) pool.push(state);
}
function writeEvent(state, tag2, a, b) {
  const at = state.eventLength;
  if (at === state.events.length) {
    const grown2 = new Int32Array(at * 2);
    grown2.set(state.events);
    state.events = grown2;
  }
  const events = state.events;
  events[at] = tag2;
  events[at + 1] = a;
  events[at + 2] = b;
  state.eventLength = at + EVENT_WIDTH;
}
function addLine(state, start) {
  const at = state.lineCount;
  if (at === state.lineStarts.length) {
    const grown2 = new Int32Array(at * 2);
    grown2.set(state.lineStarts);
    state.lineStarts = grown2;
  }
  state.lineStarts[at] = start;
  state.lineCount = at + 1;
}

// ../carve-js/v2/src/blocks.ts
var LIST_BOUNDARY_BLANKS = 3;
var SPAN_TAG = eventTag(SPAN, 0, 0);
var ASCII3 = 128;
var FENCE_SHAPES = SHAPE_CODE_FENCE_OPENER | SHAPE_DIV_BARE_RUN | SHAPE_DIV_OPENER | SHAPE_COMMENT_BLOCK_OPENER;
var MARK_SHAPES = SHAPE_DESCRIPTION | SHAPE_TERM;
var DEFINITION_SHAPES = SHAPE_FOOTNOTE_DEFINITION | SHAPE_LINK_DEFINITION | SHAPE_ABBREVIATION_DEFINITION;
var MARKER_SHAPES = SHAPE_BULLET | SHAPE_ORDERED;
var CONTAINER_SHAPES = SHAPE_QUOTE | MARKER_SHAPES | SHAPE_DESCRIPTION | SHAPE_FOOTNOTE_DEFINITION;
var LEAF_SHAPES = FENCE_SHAPES | SHAPE_COMMENT_ONLY | SHAPE_HEADING | SHAPE_THEMATIC_BREAK | SHAPE_TERM | SHAPE_ATTRIBUTE_LINE | SHAPE_INCLUDE | SHAPE_LINK_DEFINITION | SHAPE_ABBREVIATION_DEFINITION | SHAPE_TABLE_ROW;
function scanBlocks(state, src) {
  state.src = src;
  state.eventLength = 0;
  state.lineCount = 0;
  state.contentEnd = 0;
  state.containers.depth = 0;
  state.leaf.kind = NO_LEAF;
  const above = state.above;
  above.blankCount = 0;
  above.captionDepth = NO_DEPTH;
  above.attributesDepth = NO_DEPTH;
  above.takeAttributes = false;
  above.heldBlankLine = NO_LINE;
  const length = src.length;
  push(state, DOCUMENT, 0, 0, 0, 0);
  let lineStart = 0;
  while (lineStart < length) {
    let lineEnd = src.indexOf("\n", lineStart);
    if (lineEnd < 0) lineEnd = length;
    const next = lineEnd + 1;
    if (lineEnd < length && lineEnd > lineStart && src.charCodeAt(lineEnd - 1) === CR) lineEnd--;
    addLine(state, lineStart);
    if (lineStart > 0) scanLine(state, lineStart, lineEnd);
    else if (!openFrontmatter(state, lineEnd)) scanLine(state, src.charCodeAt(0) === BYTE_ORDER_MARK ? 1 : 0, lineEnd);
    lineStart = next;
  }
  closeTo(state, 1);
  state.contentEnd = length;
  closeTo(state, 0);
}
function openFrontmatter(state, end) {
  const cursor = state.cursor;
  const src = state.src;
  const pos = src.charCodeAt(0) === BYTE_ORDER_MARK ? 1 : 0;
  if (!isFrontmatterOpener(src, pos, end)) return false;
  writeEvent(state, eventTag(ENTER, FRONTMATTER, 0), pos, 0);
  cursor.column = 0;
  cursor.origin = 0;
  openOpaqueLeaf(state, FRONTMATTER, HYPHEN, 0);
  state.contentEnd = end;
  return true;
}
function closeBodyLeaf(state, matched, end, blank) {
  const opaque = state.leaf.kind !== TABLE;
  closeLeaf(state);
  if (!opaque || blank) return matched;
  closeUnowned(state, matched, end);
  return state.containers.depth;
}
function blankLine(state, matched) {
  const above = state.above;
  closeLeaf(state);
  closeTo(state, matched);
  above.blankCount++;
  above.captionDepth = NO_DEPTH;
  above.attributesDepth = NO_DEPTH;
}
function lazyLine(state, matched, lineStart, end) {
  const cursor = state.cursor;
  if (interruptsLeaf(state, matched, lineStart, end)) return false;
  writeEvent(state, SPAN_TAG, cursor.pos, end);
  state.contentEnd = end;
  if (!isLineComment(state.src, cursor.pos, end)) state.leaf.lines++;
  return true;
}
function scanLine(state, lineStart, end) {
  const leaf = state.leaf;
  const cursor = state.cursor;
  let matched = matchContainers(state, lineStart, end);
  const blank = cursor.pos >= end;
  if (leaf.kind !== NO_LEAF && !isTextLeaf(leaf.kind)) {
    if (bodyLine(state, matched, lineStart, end, blank)) return;
    matched = closeBodyLeaf(state, matched, end, blank);
  }
  if (blank) return blankLine(state, matched);
  if (leaf.kind === HEADING && !continuesHeading(state, matched)) closeLeaf(state);
  if (isTextLeaf(leaf.kind)) {
    const captions = leaf.kind === PARAGRAPH && captionsAfterParagraph(state, matched, end);
    if (!captions && lazyLine(state, matched, lineStart, end)) return;
    closeLeaf(state);
    return openLine(state, matched, lineStart, end, captions);
  }
  if (isLineComment(state.src, cursor.pos, end)) return writeComment(state, end);
  openLine(state, matched, lineStart, end, captionsAfterBlock(state, matched, end));
}
function bodyLine(state, matched, lineStart, end, blank) {
  const owned = matched === state.containers.depth;
  if (state.leaf.kind !== TABLE) {
    if (owned) opaqueLine(state, lineStart, end, blank);
    return owned;
  }
  if (blank) return false;
  if (isLineComment(state.src, state.cursor.pos, end)) {
    writeComment(state, end);
    return true;
  }
  return owned && tableLine(state, end);
}
function openLine(state, matched, lineStart, end, captions) {
  const containers = state.containers;
  const above = state.above;
  const cursor = state.cursor;
  const takes = above.attributesDepth === containers.depth && matched === containers.depth;
  above.captionDepth = NO_DEPTH;
  above.attributesDepth = NO_DEPTH;
  if (captions) {
    closeTo(state, matched);
    writeEvent(state, eventTag(ENTER, CAPTION, 0), cursor.pos, 0);
    openTextLeaf(state, CAPTION, captionContentStart(state.src, cursor.pos, end), end);
  } else {
    closeUnowned(state, matched, end);
    above.takeAttributes = takes && captionContentStart(state.src, cursor.pos, end) < 0;
    openBlocks(state, lineStart, end);
    above.takeAttributes = false;
  }
  above.blankCount = 0;
  state.contentEnd = end;
}
function matchContainers(state, lineStart, end) {
  const src = state.src;
  const containers = state.containers;
  const depth2 = containers.depth;
  const cursor = state.cursor;
  cursor.pos = lineStart;
  cursor.column = 0;
  cursor.origin = 0;
  cursor.prefixEnd = lineStart;
  skipIndent(state, end);
  let index = 1;
  for (; index < depth2; index++) {
    const kind = containers.kind[index];
    if (kind === QUOTE) {
      if (!isQuoteMark(src, cursor.pos, end)) break;
      passQuoteMark(state, end);
    } else if (isIndentContainer(kind)) {
      if (cursor.pos < end && cursor.column - cursor.origin <= containers.column[index]) break;
    }
  }
  return index;
}
function passQuoteMark(state, end) {
  const cursor = state.cursor;
  cursor.pos++;
  cursor.column++;
  cursor.origin = cursor.column;
  cursor.prefixEnd = cursor.pos;
  skipIndent(state, end);
}
function skipIndent(state, end) {
  const src = state.src;
  const cursor = state.cursor;
  let pos = cursor.pos;
  let column = cursor.column;
  while (pos < end) {
    const code = src.charCodeAt(pos);
    if (!isSpaceOrTab(code)) break;
    column = advanceColumn(column, code);
    pos++;
  }
  cursor.pos = pos;
  cursor.column = column;
}
function shapesAt(state) {
  const code = state.src.charCodeAt(state.cursor.pos);
  return code < ASCII3 ? FIRST_CHARACTER_SHAPES[code] : 0;
}
function opaqueLine(state, lineStart, end, blank) {
  const leaf = state.leaf;
  const above = state.above;
  const line2 = state.lineCount - 1;
  if (blank) {
    if (above.heldBlankLine === NO_LINE) above.heldBlankLine = line2;
    return;
  }
  if (above.heldBlankLine !== NO_LINE) {
    for (let pending = above.heldBlankLine; pending < line2; pending++) {
      const pendingEnd = lineEndAt(state.src, state.lineStarts, state.lineCount, pending);
      matchContainers(state, state.lineStarts[pending], pendingEnd);
      writeEvent(state, SPAN_TAG, opaqueContentStart(state, pendingEnd), pendingEnd);
    }
    above.heldBlankLine = NO_LINE;
    matchContainers(state, lineStart, end);
  }
  state.contentEnd = end;
  if (isCloser(state, lineStart, end)) {
    const kind = leaf.kind;
    writeEvent(state, eventTag(EXIT, kind, 0), end, 0);
    leaf.kind = NO_LEAF;
    above.blankCount = 0;
    above.captionDepth = kind === CODE ? state.containers.depth : NO_DEPTH;
    return;
  }
  writeEvent(state, SPAN_TAG, opaqueContentStart(state, end), end);
}
function isCloser(state, lineStart, end) {
  const leaf = state.leaf;
  if (leaf.kind === FRONTMATTER) return isFrontmatterCloser(state.src, lineStart, end);
  return isBareRun(state.src, state.cursor.pos, end, leaf.fenceChar, leaf.fenceLength);
}
function opaqueContentStart(state, end) {
  const cursor = state.cursor;
  const src = state.src;
  let pos = cursor.prefixEnd;
  let column = cursor.origin;
  while (pos < end) {
    const code = src.charCodeAt(pos);
    if (!isSpaceOrTab(code)) break;
    const after2 = advanceColumn(column, code);
    if (after2 - cursor.origin > state.leaf.fenceColumn) break;
    column = after2;
    pos++;
  }
  return pos;
}
function captionsAfterParagraph(state, matched, end) {
  const containers = state.containers;
  const leaf = state.leaf;
  const src = state.src;
  if ((shapesAt(state) & SHAPE_CAPTION) === 0 || captionContentStart(src, state.cursor.pos, end) < 0) return false;
  if (matched < containers.depth) return containers.kind[matched] === QUOTE;
  return leaf.lines === 1 && (isImageOnly(src, leaf.start, leaf.end) || isDisplayMathOnly(src, leaf.start, leaf.end));
}
function captionsAfterBlock(state, matched, end) {
  const containers = state.containers;
  if ((shapesAt(state) & SHAPE_CAPTION) === 0 || captionContentStart(state.src, state.cursor.pos, end) < 0) return false;
  if (matched < containers.depth) return containers.kind[matched] === QUOTE;
  return state.above.captionDepth === containers.depth;
}
function continuesHeading(state, matched) {
  const cursor = state.cursor;
  return matched === state.containers.depth && cursor.column - cursor.origin > state.leaf.column;
}
function interruptsLeaf(state, matched, lineStart, end) {
  const src = state.src;
  const pos = state.cursor.pos;
  const shapes = shapesAt(state);
  if ((shapes & FENCE_SHAPES) !== 0 && isFenceLine(src, pos, end)) return true;
  if ((shapes & SHAPE_THEMATIC_BREAK) !== 0 && isThematicBreak(src, pos, end)) return true;
  if ((shapes & SHAPE_TABLE_ROW) !== 0) return rowClosingPipe(src, pos, end) >= 0;
  if ((shapes & MARK_SHAPES) !== 0) return isDescriptionListMark(src, pos, end) && isSiblingMark(state, matched, end);
  if ((shapes & DEFINITION_SHAPES) !== 0 && pos === lineStart && isSiblingDefinition(state, matched, end)) return true;
  return (shapes & MARKER_SHAPES) !== 0 && isListMarker(src, pos, end) && markerInterrupts(state, matched, end);
}
function isSiblingMark(state, matched, end) {
  const containers = state.containers;
  const cursor = state.cursor;
  const column = cursor.column - cursor.origin;
  const depth2 = containers.depth;
  if (matched === depth2) {
    return containers.kind[depth2 - 1] === DESCRIPTION_LIST && column === containers.column[depth2 - 1] && markFits(state, end);
  }
  return containers.kind[matched] === DESCRIPTION && column === containers.column[matched];
}
function markFits(state, end) {
  return descriptionMarkEnd(state.src, state.cursor.pos, end) < 0 || state.containers.depth <= MAX_DEPTH;
}
function isSiblingDefinition(state, matched, end) {
  const containers = state.containers;
  return matched === 1 && containers.depth > 1 && containers.kind[1] === FOOTNOTE && isDefinition(state.src, state.cursor.pos, end);
}
function markerInterrupts(state, matched, end) {
  const containers = state.containers;
  const cursor = state.cursor;
  const depth2 = containers.depth;
  const opens = opensListInParagraph(state.src, cursor.pos, end);
  if (matched === depth2) {
    return opens && isIndentContainer(containers.kind[depth2 - 1]) && depth2 + 2 <= MAX_DEPTH + 1;
  }
  const kind = containers.kind[matched];
  const column = cursor.column - cursor.origin;
  if (kind === QUOTE) {
    return opens && isIndentContainer(containers.kind[matched - 1]) && matched + 2 <= MAX_DEPTH + 1;
  }
  if (kind === ITEM) {
    return column === containers.column[matched] || isIndentContainer(containers.kind[matched - 2]);
  }
  return opens && kind === DESCRIPTION && column < containers.column[matched] && isIndentContainer(containers.kind[matched - 2]);
}
function closeUnowned(state, matched, end) {
  const containers = state.containers;
  const cursor = state.cursor;
  const src = state.src;
  if (matched < containers.depth) {
    const keepsList = containers.kind[matched] !== ITEM || isListMarker(src, cursor.pos, end);
    closeTo(state, keepsList ? matched : matched - 1);
  }
  const top = containers.depth - 1;
  if (containers.kind[top] === DESCRIPTION_LIST) {
    const sibling = cursor.column - cursor.origin === containers.column[top] && isDescriptionListMark(src, cursor.pos, end) && markFits(state, end) && state.above.blankCount < LIST_BOUNDARY_BLANKS;
    if (!sibling) closeTo(state, top);
  }
}
function openBlocks(state, lineStart, end) {
  while (openContainer(state, lineStart, end)) {
    if (state.cursor.pos >= end) return;
  }
  openLeaf(state, lineStart, end);
}
function openContainer(state, lineStart, end) {
  let shapes = shapesAt(state) & CONTAINER_SHAPES;
  while (shapes !== 0) {
    const shape = shapes & -shapes;
    if (openContainerOf(state, shape, lineStart, end)) return true;
    shapes ^= shape;
  }
  return false;
}
function openContainerOf(state, shape, lineStart, end) {
  switch (shape) {
    case SHAPE_QUOTE:
      return openQuote(state, end);
    case SHAPE_BULLET:
      return openBulletItem(state, end);
    case SHAPE_ORDERED:
      return openOrderedItem(state, end);
    case SHAPE_DESCRIPTION:
      return openDescription(state, end);
    case SHAPE_FOOTNOTE_DEFINITION:
      return openFootnote(state, lineStart, end);
    default:
      return false;
  }
}
function openQuote(state, end) {
  const cursor = state.cursor;
  if (!isQuoteMark(state.src, cursor.pos, end) || state.containers.depth > MAX_DEPTH) return false;
  push(state, QUOTE, 0, cursor.pos, 0, 0);
  passQuoteMark(state, end);
  return true;
}
function openDescription(state, end) {
  const cursor = state.cursor;
  const markEnd = descriptionMarkEnd(state.src, cursor.pos, end);
  const containers = state.containers;
  if (markEnd < 0 || containers.kind[containers.depth - 1] !== DESCRIPTION_LIST || containers.depth > MAX_DEPTH) return false;
  push(state, DESCRIPTION, 0, cursor.pos, 0, cursor.column - cursor.origin);
  moveTo(state, markEnd, end);
  return true;
}
function openFootnote(state, lineStart, end) {
  const cursor = state.cursor;
  if (cursor.pos !== lineStart || state.containers.depth !== 1) return false;
  const markerEnd = footnoteMarkerEnd(state.src, cursor.pos, end);
  if (markerEnd < 0) return false;
  push(state, FOOTNOTE, 0, cursor.pos, 0, 0);
  moveTo(state, markerEnd, end);
  return true;
}
function openBulletItem(state, end) {
  const src = state.src;
  const pos = state.cursor.pos;
  const markerEnd = bulletMarkerEnd(src, pos, end);
  if (markerEnd < 0) return false;
  const boxEnd = taskBoxEnd(src, markerEnd, end);
  let style = src.charCodeAt(pos) === STAR ? FLAG_STAR : 0;
  if (boxEnd >= 0) style |= FLAG_TASK;
  const box = boxEnd < 0 ? 0 : src.charCodeAt(markerEnd + 1) === UPPER_X ? LOWER_X : src.charCodeAt(markerEnd + 1);
  if (!openItem(state, BULLET_LIST, style, 0, 0, box, pos + 1)) return false;
  moveTo(state, boxEnd >= 0 ? boxEnd : markerEnd, end);
  return true;
}
function letterFlags(state, pos, delimiter, style) {
  const first = state.src.charCodeAt(pos);
  const flags = first < LOWER_A ? style | FLAG_UPPER : style;
  return flags | letterStyle(state, flags, delimiter - pos === 1, romanLetterValue(first) > 0, first === LOWER_I || first === UPPER_I);
}
function letterStart(src, pos, delimiter, style) {
  if ((style & FLAG_ROMAN) !== 0) return romanValue(src, pos, delimiter);
  return src.charCodeAt(pos) - ((style & FLAG_UPPER) !== 0 ? UPPER_A : LOWER_A) + 1;
}
function openOrderedItem(state, end) {
  const src = state.src;
  const pos = state.cursor.pos;
  const delimiter = orderedDelimiter(src, pos, end);
  if (delimiter < 0) return false;
  const markerEnd = orderedMarkerEnd(src, pos, delimiter, end);
  if (markerEnd < 0) return false;
  let style = src.charCodeAt(delimiter) === PAREN_CLOSE ? FLAG_PAREN : 0;
  const first = src.charCodeAt(pos);
  let start = -1;
  if (delimiter !== pos && first >= DIGIT_0 && first <= DIGIT_9) {
    start = decimalValue(src, pos, delimiter);
  } else if (delimiter !== pos) {
    style = letterFlags(state, pos, delimiter, style);
    start = letterStart(src, pos, delimiter, style);
  }
  const auto = start < 0;
  if (!openItem(state, ORDERED_LIST, style, auto ? FLAG_AUTO : 0, auto ? 0 : start, 0, delimiter + 1)) return false;
  moveTo(state, markerEnd, end);
  return true;
}
function letterStyle(state, style, single, roman2, loneI) {
  const containers = state.containers;
  const top = containers.depth - 1;
  if (containers.kind[top] === ORDERED_LIST) {
    const open = containers.style[top];
    if ((open & (FLAG_PAREN | FLAG_UPPER)) === style) {
      if ((open & FLAG_ROMAN) !== 0 && roman2) return FLAG_ROMAN;
      if ((open & FLAG_ALPHA) !== 0 && single) return FLAG_ALPHA;
    }
  }
  return single && !loneI ? FLAG_ALPHA : FLAG_ROMAN;
}
function moveTo(state, pos, end) {
  const cursor = state.cursor;
  cursor.column += pos - cursor.pos;
  cursor.pos = pos;
  skipIndent(state, end);
}
function openItem(state, listKind, style, listFlags, listAux, itemAux, afterMarker) {
  const containers = state.containers;
  const above = state.above;
  const cursor = state.cursor;
  let top = containers.depth - 1;
  if (isList(containers.kind[top])) {
    if (containers.kind[top] !== listKind || containers.style[top] !== style || above.blankCount >= LIST_BOUNDARY_BLANKS) {
      closeTo(state, top);
      top--;
    } else if (above.blankCount > 0) {
      containers.loose[top] = 1;
    }
  }
  const column = cursor.column - cursor.origin;
  if (!isList(containers.kind[top])) {
    if (containers.depth + 2 > MAX_DEPTH + 1) return false;
    push(state, listKind, style | listFlags, cursor.pos, listAux, column);
    containers.style[containers.depth - 1] = style;
  }
  const itemFlags = state.src.charCodeAt(afterMarker) === BRACE_OPEN ? FLAG_MARKER_ATTRIBUTES : 0;
  push(state, ITEM, itemFlags, cursor.pos, itemAux, column);
  return true;
}
function openLeaf(state, lineStart, end) {
  const cursor = state.cursor;
  let shapes = shapesAt(state) & LEAF_SHAPES;
  while (shapes !== 0) {
    const shape = shapes & -shapes;
    if (openLeafOf(state, shape, lineStart, end)) return;
    shapes ^= shape;
  }
  writeEvent(state, enterTag(state, PARAGRAPH, 0), cursor.pos, 0);
  openTextLeaf(state, PARAGRAPH, cursor.pos, end);
}
function openLeafOf(state, shape, lineStart, end) {
  switch (shape) {
    case SHAPE_HEADING:
      return openHeading(state, end);
    case SHAPE_COMMENT_BLOCK_OPENER:
      return openCommentBlock(state, end);
    case SHAPE_COMMENT_ONLY:
      return openComment(state, end);
    case SHAPE_ABBREVIATION_DEFINITION:
      return openDefinitionLine(state, ABBREVIATION, lineStart, end);
    case SHAPE_THEMATIC_BREAK:
      return openThematicBreak(state, end);
    case SHAPE_DIV_BARE_RUN:
      return openBareRun(state, end);
    case SHAPE_DIV_OPENER:
      return openDiv(state, end);
    case SHAPE_TERM:
      return openTerm(state, end);
    case SHAPE_LINK_DEFINITION:
      return openDefinitionLine(state, LINK_DEFINITION, lineStart, end);
    case SHAPE_CODE_FENCE_OPENER:
      return openFence(state, end);
    case SHAPE_ATTRIBUTE_LINE:
      return openAttributeLine(state, end);
    case SHAPE_INCLUDE:
      return openInclude(state, end);
    case SHAPE_TABLE_ROW:
      return openTable(state, end);
    default:
      return false;
  }
}
function openComment(state, end) {
  if (!isLineComment(state.src, state.cursor.pos, end)) return false;
  state.above.takeAttributes = false;
  writeComment(state, end);
  return true;
}
function openCommentBlock(state, end) {
  const cursor = state.cursor;
  const length = fenceRunLength(state.src, cursor.pos, end, PERCENT);
  if (length === 0) return false;
  writeEvent(state, enterTag(state, COMMENT_BLOCK, 0), cursor.pos, length);
  openOpaqueLeaf(state, COMMENT_BLOCK, PERCENT, length);
  const tail = skipSpaces2(state.src, cursor.pos + length, end);
  if (tail < end) writeEvent(state, SPAN_TAG, tail, end);
  return true;
}
function openHeading(state, end) {
  const cursor = state.cursor;
  const pos = cursor.pos;
  const level = headingLevel(state.src, pos, end);
  if (level === 0) return false;
  writeEvent(state, enterTag(state, HEADING, 0), pos, level);
  openTextLeaf(state, HEADING, skipSpaces2(state.src, pos + level, end), end);
  state.leaf.column = cursor.column - cursor.origin;
  state.contentEnd = end;
  return true;
}
function openThematicBreak(state, end) {
  const cursor = state.cursor;
  if (!isThematicBreak(state.src, cursor.pos, end)) return false;
  writeEvent(state, enterTag(state, THEMATIC_BREAK, 0), cursor.pos, 0);
  writeEvent(state, eventTag(EXIT, THEMATIC_BREAK, 0), end, 0);
  return true;
}
function openFence(state, end) {
  const above = state.above;
  const cursor = state.cursor;
  const src = state.src;
  const length = fenceOpenerLength(src, cursor.pos, end);
  if (length === 0) return false;
  const info = cursor.pos + length;
  let flags = isRawInfo(src, info, end) ? FLAG_RAW : 0;
  if (above.takeAttributes && (isWord(src, info, end, "csv") || isWord(src, info, end, "tsv"))) {
    if (attributeKeyValue(src, above.attributesStart, above.attributesEnd, "table") !== null) flags = FLAG_DELIMITED;
  }
  writeEvent(state, enterTag(state, CODE, flags), cursor.pos, length);
  openOpaqueLeaf(state, CODE, BACKTICK, length);
  return true;
}
function openTable(state, end) {
  const leaf = state.leaf;
  const above = state.above;
  const cursor = state.cursor;
  const src = state.src;
  const closing = rowClosingPipe(src, cursor.pos, end);
  if (closing < 0) return false;
  let footerRows = 0;
  if (above.takeAttributes) {
    const value = attributeKeyValue(src, above.attributesStart, above.attributesEnd, "footer-rows");
    footerRows = Math.max(0, countValue(value));
  }
  writeEvent(state, enterTag(state, TABLE, 0), cursor.pos, footerRows);
  leaf.kind = TABLE;
  leaf.tableHeadRows = 0;
  leaf.tableHeadOpen = true;
  writeRow(state, closing, end);
  return true;
}
function tableLine(state, end) {
  const cursor = state.cursor;
  const src = state.src;
  const closing = rowClosingPipe(src, cursor.pos, end);
  if (closing >= 0) {
    writeRow(state, closing, end);
    return true;
  }
  const last = (shapesAt(state) & SHAPE_CONTINUATION_ROW) === 0 ? -1 : continuationClosingPipe(src, cursor.pos, end);
  if (last < 0) return false;
  writeEvent(state, eventTag(ENTER, ROW, FLAG_CONTINUATION), cursor.pos, 0);
  let start = cursor.pos + 1;
  for (const stop of separatorPipes(src, start, last + 1)) {
    const content = skipSpaces2(src, start, stop);
    writeEvent(state, eventTag(ENTER, CELL, 0), start, 0);
    writeEvent(state, SPAN_TAG, content, trimEnd(src, content, stop));
    writeEvent(state, eventTag(EXIT, CELL, 0), stop, 0);
    start = stop + 1;
  }
  writeEvent(state, eventTag(EXIT, ROW, 0), end, 0);
  state.contentEnd = end;
  return true;
}
function writeRow(state, closing, end) {
  const leaf = state.leaf;
  const cursor = state.cursor;
  const src = state.src;
  const attribute = rowAttributeStart(src, closing, end);
  writeEvent(state, eventTag(ENTER, ROW, 0), cursor.pos, attribute < 0 ? 0 : attribute);
  let headers = 0;
  let others = 0;
  let pipe = cursor.pos;
  for (const next of separatorPipes(src, pipe + 1, closing + 1)) {
    const flags = writeCell(state, pipe, next);
    if ((flags & FLAG_HEADER) !== 0) headers++;
    else if ((flags & (FLAG_SPAN_LEFT | FLAG_SPAN_UP)) === 0) others++;
    pipe = next;
  }
  writeEvent(state, eventTag(EXIT, ROW, 0), end, 0);
  state.contentEnd = end;
  leaf.tableHeadOpen = leaf.tableHeadOpen && headers > 0 && others === 0;
  if (leaf.tableHeadOpen) leaf.tableHeadRows++;
}
function writeCell(state, pipe, next) {
  const src = state.src;
  let p = pipe + 1;
  let flags = 0;
  if (src.charCodeAt(p) === EQUALS) {
    flags = FLAG_HEADER;
    p++;
  }
  const blocksEnd = braceBlocksEnd(src, p, next);
  const alignment = blocksEnd > p ? alignmentMark(src.charCodeAt(p + 1)) : 0;
  if (blocksEnd > p) flags |= FLAG_CELL_ATTRIBUTES;
  const content = skipSpaces2(src, blocksEnd, next);
  const contentEnd3 = trimEnd(src, content, next);
  if (contentEnd3 - content === 1 && blocksEnd === pipe + 1) flags |= spanMark(src.charCodeAt(content));
  writeEvent(state, eventTag(ENTER, CELL, flags), pipe, alignment);
  writeEvent(state, SPAN_TAG, content, contentEnd3);
  writeEvent(state, eventTag(EXIT, CELL, 0), next, 0);
  return flags;
}
function alignmentMark(code) {
  return code === LESS || code === GREATER || code === TILDE ? code : 0;
}
function spanMark(code) {
  if (code === LESS) return FLAG_SPAN_LEFT;
  return code === CARET ? FLAG_SPAN_UP : 0;
}
function openAttributeLine(state, end) {
  const above = state.above;
  const cursor = state.cursor;
  if (!isAttributeLine(state.src, cursor.pos, end)) return false;
  if (!above.takeAttributes) above.attributesStart = cursor.pos;
  above.attributesEnd = end;
  writeLeafLine(state, enterTag(state, ATTRIBUTES, 0), ATTRIBUTES, end);
  above.attributesDepth = state.containers.depth;
  return true;
}
function openInclude(state, end) {
  if (!isIncludeLine(state.src, state.cursor.pos, end)) return false;
  writeLeafLine(state, enterTag(state, INCLUDE, 0), INCLUDE, end);
  return true;
}
function openDefinitionLine(state, kind, lineStart, end) {
  const cursor = state.cursor;
  if (cursor.pos !== lineStart || state.containers.depth !== 1) return false;
  const pos = cursor.pos;
  const matches = kind === LINK_DEFINITION ? isLinkDefinition(state.src, pos, end) : isAbbreviation(state.src, pos, end);
  if (!matches) return false;
  writeLeafLine(state, enterTag(state, kind, 0), kind, end);
  return true;
}
function writeLeafLine(state, tag2, kind, end) {
  const cursor = state.cursor;
  writeEvent(state, tag2, cursor.pos, 0);
  writeEvent(state, SPAN_TAG, cursor.pos, end);
  writeEvent(state, eventTag(EXIT, kind, 0), end, 0);
}
function writeComment(state, end) {
  writeLeafLine(state, eventTag(ENTER, COMMENT, 0), COMMENT, end);
  state.contentEnd = end;
}
function openTextLeaf(state, kind, contentStart, end) {
  const leaf = state.leaf;
  writeEvent(state, SPAN_TAG, contentStart, end);
  leaf.kind = kind;
  leaf.start = contentStart;
  leaf.end = end;
  leaf.lines = 1;
}
function openOpaqueLeaf(state, kind, fenceChar, length) {
  const leaf = state.leaf;
  const cursor = state.cursor;
  leaf.kind = kind;
  leaf.fenceChar = fenceChar;
  leaf.fenceLength = length;
  leaf.fenceColumn = cursor.column - cursor.origin;
  state.above.heldBlankLine = NO_LINE;
}
function openTerm(state, end) {
  const containers = state.containers;
  const cursor = state.cursor;
  const markEnd = termMarkEnd(state.src, cursor.pos, end);
  if (markEnd < 0) return false;
  if (containers.kind[containers.depth - 1] !== DESCRIPTION_LIST) {
    if (containers.depth > MAX_DEPTH) return false;
    push(state, DESCRIPTION_LIST, 0, cursor.pos, 0, cursor.column - cursor.origin);
  }
  writeEvent(state, enterTag(state, TERM, 0), cursor.pos, 0);
  openTextLeaf(state, TERM, skipSpaces2(state.src, markEnd, end), end);
  return true;
}
function openBareRun(state, end) {
  const containers = state.containers;
  const cursor = state.cursor;
  const src = state.src;
  const length = divRunLength(src, cursor.pos, end);
  if (length === 0 || skipSpaces2(src, cursor.pos + length, end) !== end) return false;
  for (let index = containers.depth - 1; containers.kind[index] === DIV; index--) {
    if (containers.column[index] > length) continue;
    const captioned = (containers.style[index] & (FLAG_QUOTE_FENCE | FLAG_FIGURE)) !== 0;
    state.contentEnd = end;
    closeTo(state, index, index);
    if (captioned) state.above.captionDepth = containers.depth;
    return true;
  }
  return pushDiv(state, 0, length);
}
function openDiv(state, end) {
  const src = state.src;
  const pos = state.cursor.pos;
  const length = divRunLength(src, pos, end);
  const runEnd = pos + length;
  if (length === 0 || skipSpaces2(src, runEnd, end) === end) return false;
  const sigil = divSigil(src, runEnd, end);
  if (sigil === PIPE) {
    writeEvent(state, enterTag(state, LINE_BLOCK, 0), pos, length);
    openOpaqueLeaf(state, LINE_BLOCK, COLON, length);
    return true;
  }
  let style = 0;
  if (sigil === BACKSLASH) style = FLAG_HARD_BREAKS;
  else if (sigil === GREATER) style = FLAG_QUOTE_FENCE;
  else if (isFigureName(src, runEnd, end)) style = FLAG_FIGURE;
  return pushDiv(state, style, length);
}
function pushDiv(state, style, length) {
  const containers = state.containers;
  if (containers.depth > MAX_DEPTH) return false;
  push(state, DIV, style, state.cursor.pos, length, length);
  containers.style[containers.depth - 1] = style;
  return true;
}
function enterTag(state, kind, flags) {
  const above = state.above;
  if (above.takeAttributes) {
    above.takeAttributes = false;
    flags |= FLAG_ATTRIBUTES;
  }
  return eventTag(ENTER, kind, flags);
}
function push(state, kind, flags, pos, aux, column) {
  const containers = state.containers;
  const depth2 = containers.depth;
  containers.kind[depth2] = kind;
  containers.column[depth2] = column;
  containers.style[depth2] = 0;
  containers.loose[depth2] = 0;
  containers.depth = depth2 + 1;
  writeEvent(state, enterTag(state, kind, flags), pos, aux);
}
function closeLeaf(state) {
  const leaf = state.leaf;
  const kind = leaf.kind;
  if (kind === NO_LEAF) return;
  leaf.kind = NO_LEAF;
  if (kind === TABLE) {
    writeEvent(state, eventTag(EXIT, TABLE, 0), state.contentEnd, leaf.tableHeadRows);
    state.above.captionDepth = state.containers.depth;
    return;
  }
  writeEvent(state, eventTag(EXIT, kind, leafFacts(state, kind)), state.contentEnd, 0);
}
function leafFacts(state, kind) {
  const leaf = state.leaf;
  const above = state.above;
  if (isOpaqueLeaf(kind)) {
    if (above.heldBlankLine !== NO_LINE) {
      above.blankCount = state.lineCount - 1 - above.heldBlankLine;
      above.heldBlankLine = NO_LINE;
    }
    return FLAG_UNCLOSED;
  }
  if (kind !== PARAGRAPH || leaf.lines !== 1) return 0;
  if (isImageOnly(state.src, leaf.start, leaf.end)) return FLAG_IMAGE;
  return isDisplayMathOnly(state.src, leaf.start, leaf.end) ? FLAG_BLOCK_MATH : 0;
}
function closeTo(state, depth2, closed = -1) {
  closeLeaf(state);
  const containers = state.containers;
  while (containers.depth > depth2) {
    const index = --containers.depth;
    const kind = containers.kind[index];
    let flags = isList(kind) && containers.loose[index] === 0 ? FLAG_TIGHT : 0;
    if (kind === DIV && index !== closed) flags = FLAG_UNCLOSED;
    writeEvent(state, eventTag(EXIT, kind, flags), state.contentEnd, 0);
  }
}

// ../carve-js/v2/src/tree.ts
function buildTree(events, length) {
  const open = [];
  let root = null;
  let top = null;
  for (const event = new EventCursor(events, length); event.more(); event.next()) {
    const type = event.type();
    if (type === SPAN) {
      top.spans.push(event.start(), event.end());
    } else if (type === ENTER) {
      const node = enterNode(event.kind(), event.flags(), event.start(), event.aux(), top);
      if (top === null) root = node;
      else top.children.push(node);
      open.push(node);
      top = node;
    } else {
      const node = open.pop();
      node.end = event.end();
      node.exitFlags = event.flags();
      top = open.length > 0 ? open[open.length - 1] : null;
      exitNode(node, event.aux());
    }
  }
  return root;
}
function enterNode(kind, flags, start, aux, parent) {
  const leaf = isLeaf(kind);
  const takes = (flags & FLAG_ATTRIBUTES) !== 0 && kind !== ATTRIBUTES;
  return {
    kind,
    start,
    end: start,
    aux,
    flags,
    exitFlags: 0,
    facts: kind === CELL ? 1 : 0,
    rowFacts: kind === CELL ? 1 : 0,
    children: leaf ? null : [],
    spans: leaf ? [] : null,
    attributes: takes ? takeAttributes(parent.children) : null
  };
}
function exitNode(node, headRows2) {
  if (node.kind === TABLE) {
    node.facts = headRows2;
    const rows = resolveTable(node);
    node.rowFacts = Math.min(node.aux, rows - headRows2);
  }
  if (node.children !== null) orphanAttributes(node.children);
}
function takeAttributes(siblings) {
  let first = siblings.length;
  let merges = true;
  for (let at = siblings.length - 1; at >= 0 && merges; at--) {
    const sibling = siblings[at];
    if (sibling.kind === COMMENT) continue;
    if (sibling.kind !== ATTRIBUTES) break;
    first = at;
    merges = (sibling.flags & FLAG_ATTRIBUTES) !== 0;
  }
  const spans = [];
  let kept = first;
  for (let at = first; at < siblings.length; at++) {
    const sibling = siblings[at];
    if (sibling.kind === ATTRIBUTES) spans.push(sibling.spans[0], sibling.spans[1]);
    else siblings[kept++] = sibling;
  }
  siblings.length = kept;
  return spans;
}
function orphanAttributes(children2) {
  let kept = 0;
  for (let at = 0; at < children2.length; at++) {
    const child = children2[at];
    const before2 = kept > 0 ? children2[kept - 1] : null;
    if (child.kind === ATTRIBUTES && (child.flags & FLAG_ATTRIBUTES) !== 0 && before2 !== null && before2.kind === PARAGRAPH) {
      before2.spans.push(child.spans[0], child.spans[1]);
      before2.end = child.end;
      continue;
    }
    if (child.kind === ATTRIBUTES) child.kind = PARAGRAPH;
    children2[kept++] = child;
  }
  children2.length = kept;
}
function resolveTable(table3) {
  const headRows2 = table3.facts;
  const kept = [];
  let owners = [];
  let last = null;
  let rowIndex = 0;
  for (const row of table3.children) {
    if (row.kind === ROW && (row.flags & FLAG_CONTINUATION) !== 0) {
      joinContinuation(row, last, owners);
      continue;
    }
    kept.push(row);
    if (row.kind !== ROW) continue;
    owners = resolveRow(row, rowIndex === headRows2 ? [] : owners);
    last = row;
    rowIndex++;
  }
  table3.children = kept;
  return rowIndex;
}
function joinContinuation(row, above, owners) {
  const fragments = row.children;
  for (let column = 0; column < fragments.length; column++) {
    const fragment = fragments[column];
    if (column >= owners.length) {
      above.children.push(fragment);
      owners.push(fragment);
    } else if (fragment.spans[0] !== fragment.spans[1]) {
      const spans = owners[column].spans;
      if (spans.length === 2 && spans[0] === spans[1]) spans.length = 0;
      spans.push(fragment.spans[0], fragment.spans[1]);
    }
  }
  above.end = row.end;
}
function resolveRow(row, above) {
  const owners = [];
  const kept = [];
  let left = null;
  for (const cell of row.children) {
    const column = owners.length;
    const up = above[column] ?? null;
    if ((cell.flags & FLAG_SPAN_LEFT) !== 0 && left !== null) {
      left.facts++;
      owners.push(left);
    } else if ((cell.flags & FLAG_SPAN_UP) !== 0 && up !== null && up.facts === 1) {
      up.rowFacts++;
      owners.push(up);
      left = null;
    } else {
      if ((cell.flags & (FLAG_SPAN_LEFT | FLAG_SPAN_UP)) !== 0) cell.spans = [];
      kept.push(cell);
      owners.push(cell);
      left = cell;
    }
  }
  row.children = kept;
  return owners;
}

// ../carve-js/v2/src/opener.ts
function labelClose(src, p, end) {
  for (let at = p + 1; at < end; at++) if (src.charCodeAt(at) === BRACKET_CLOSE) return at;
  return -1;
}
function startsLabel(src, p, end) {
  return src.charCodeAt(p) === BRACKET_OPEN && labelClose(src, p, end) >= 0;
}
function readWord(src, p, end, info) {
  if (p >= end || src.charCodeAt(p) === QUOTE_MARK || startsLabel(src, p, end)) return p;
  info.wordStart = p;
  while (p < end && !isSpaceOrTab(src.charCodeAt(p))) p++;
  info.wordEnd = p;
  return skipSpaces2(src, p, end);
}
function readTitle(src, p, end, info) {
  if (p >= end || src.charCodeAt(p) !== QUOTE_MARK) return p;
  const after2 = quotedEnd(src, p, end);
  if (after2 < 0) return p;
  info.titleStart = p + 1;
  info.titleEnd = after2 - 1;
  return skipSpaces2(src, after2, end);
}
function readLabel(src, p, end, info) {
  if (p >= end || src.charCodeAt(p) !== BRACKET_OPEN) return p;
  const close = labelClose(src, p, end);
  if (close < 0) return p;
  info.labelStart = p + 1;
  info.labelEnd = close;
  return skipSpaces2(src, close + 1, end);
}
function readOpenerInfo(src, pos) {
  let end = pos;
  while (end < src.length && src.charCodeAt(end) !== LF) end++;
  if (end < src.length && end > pos && src.charCodeAt(end - 1) === CR) end--;
  const info = {
    wordStart: -1,
    wordEnd: -1,
    titleStart: -1,
    titleEnd: -1,
    labelStart: -1,
    labelEnd: -1,
    extra: false,
    extraStart: -1
  };
  const p = readLabel(src, readTitle(src, readWord(src, skipSpaces2(src, pos, end), end, info), end, info), end, info);
  info.extra = p < end;
  if (info.extra) info.extraStart = p;
  return info;
}
function definitionLabel(src, pos) {
  let start = pos + 1;
  const first = src.charCodeAt(pos);
  if (first === STAR || src.charCodeAt(start) === CARET) start++;
  let end = start;
  while (src.charCodeAt(end) !== BRACKET_CLOSE) end += src.charCodeAt(end) === BACKSLASH ? 2 : 1;
  return [start, end];
}

// ../carve-js/v2/src/inline-kinds.ts
var EMPHASIS = 26;
var STRONG = 27;
var UNDERLINE = 28;
var STRIKE = 29;
var HIGHLIGHT = 30;
var SUPERSCRIPT = 31;
var SUBSCRIPT = 32;
var INSERT = 33;
var DELETE = 34;
var BRACKET_SPAN = 35;
var LINK = 36;
var INLINE_FOOTNOTE = 37;
var INLINE_EXTENSION = 38;
var IMAGE = 39;
var CODE_SPAN = 40;
var LITERAL = 41;
var MATH = 42;
var RAW_INLINE = 43;
var INLINE_COMMENT = 44;
var EDITORIAL = 45;
var AUTOLINK = 46;
var XREF = 47;
var MENTION = 48;
var TAG = 49;
var SYMBOL = 50;
var FOOTNOTE_REF = 51;
var NBSP = 52;
var HARD_BREAK = 53;
var SOFT_BREAK = 54;
var SMART = 55;
var ESCAPE = 56;
var DESTINATION = 57;
var TITLE = 58;
var LABEL = 59;
var ATTRIBUTE_BLOCK = 60;
var FIRST_INLINE_KIND = EMPHASIS;
var INLINE_KIND_NAMES = [
  "emphasis",
  "strong",
  "underline",
  "strike",
  "highlight",
  "superscript",
  "subscript",
  "insert",
  "delete",
  "span",
  "link",
  "inline_footnote",
  "inline_extension",
  "image",
  "code",
  "literal_inline",
  "math",
  "raw_inline",
  "comment",
  "critic_comment",
  "autolink",
  "xref",
  "mention",
  "tag",
  "symbol",
  "footnote_ref",
  "non_breaking_space",
  "hard_break",
  "soft_break",
  "smart_punctuation",
  "escape",
  "destination",
  "title",
  "label",
  "attributes"
];
function isInlineContainer(kind) {
  return kind >= EMPHASIS && kind <= INLINE_EXTENSION;
}
var BRACED_KINDS = BRACED_NODES.map(
  (name) => FIRST_INLINE_KIND + INLINE_KIND_NAMES.indexOf(name)
);
var FLAG_BRACED = 1;
var FLAG_REFERENCE = 1;
var FLAG_COLLAPSED = 2;
var FLAG_DISPLAY = 1;
var FLAG_EMAIL = 1;
var FLAG_OPEN_END = 2;
var HOSTS = [
  EMPHASIS,
  STRONG,
  UNDERLINE,
  STRIKE,
  HIGHLIGHT,
  SUPERSCRIPT,
  SUBSCRIPT,
  INSERT,
  DELETE,
  BRACKET_SPAN,
  LINK,
  INLINE_FOOTNOTE,
  INLINE_EXTENSION,
  IMAGE,
  CODE_SPAN,
  LITERAL,
  MATH,
  AUTOLINK,
  SYMBOL,
  FOOTNOTE_REF
];
function isHost(kind) {
  return HOSTS.includes(kind);
}

// ../carve-js/v2/src/inline-state.ts
var TOKEN_WIDTH = 7;
var TOKEN_START = 1;
var TOKEN_END = 2;
var TOKEN_A = 3;
var TOKEN_B = 4;
var TOKEN_C = 5;
var TOKEN_D = 6;
var TOKEN_TEXT = 0;
var TOKEN_OPEN = 1;
var TOKEN_CLOSE = 2;
var TOKEN_TAIL = 3;
var TOKEN_DELIMITER = 4;
var TOKEN_BRACED_OPEN = 5;
var TOKEN_BRACED_CLOSE = 6;
var TOKEN_LITERAL = 7;
var NONE3 = -1;
var OPEN_PLAIN = 0;
var OPEN_IMAGE = 1;
var OPEN_FOOTNOTE = 2;
var OPEN_EXTENSION = 3;
var CAN_OPEN = 1;
var CAN_CLOSE = 2;
var BETWEEN_WORDS = 4;
var INITIAL_TOKENS = 256 * TOKEN_WIDTH;
var INITIAL_EVENTS2 = 512 * EVENT_WIDTH;
var INITIAL_STACK = 256;
var INITIAL_LINES2 = 16;
var INITIAL_TEXT = 1024;
var POOL_SIZE2 = 4;
function createState2() {
  return {
    src: "",
    text: "",
    end: 0,
    lineText: new Int32Array(INITIAL_LINES2),
    lineSource: new Int32Array(INITIAL_LINES2),
    lineCount: 0,
    lineComments: true,
    bidi: false,
    baseDepth: 0,
    tokens: new Int32Array(INITIAL_TOKENS),
    tokenLength: 0,
    tokenEnd: 0,
    events: new Int32Array(INITIAL_EVENTS2),
    eventLength: 0,
    brackets: new Int32Array(INITIAL_STACK),
    bracketDepth: 0,
    commentCloserMissing: false,
    editorialCloserMissing: false,
    labelCloserMissing: false,
    xrefFailEnd: NONE3,
    doubleQuoteFailEnd: NONE3,
    singleQuoteFailEnd: NONE3,
    valueFailEnd: NONE3,
    tailStart: NONE3,
    tailEnd: NONE3,
    tailTitleFailed: false,
    tailDepth: new Int32Array(INITIAL_TEXT),
    tailLowest: new Int32Array(INITIAL_TEXT),
    tailDestinationEnd: 0,
    tailTitleStart: NONE3,
    stackToken: new Int32Array(INITIAL_STACK),
    stackClass: new Int8Array(INITIAL_STACK),
    stackBelow: new Int32Array(INITIAL_STACK),
    stackSlash: new Int32Array(INITIAL_STACK),
    stackStar: new Int32Array(INITIAL_STACK),
    stackLength: 0,
    stackLive: 0,
    classTop: new Int32Array(16),
    stackFloor: NONE3,
    lastSlash: NONE3,
    lastStar: NONE3,
    line: 0,
    breakFrom: 0,
    nextBreak: NONE3,
    previous: NO_CHARACTER,
    singleQuoteOpen: false,
    footnoteQuotes: new Uint8Array(256),
    footnoteDepth: 0,
    textRun: 0,
    smartKind: 0
  };
}
var pool2 = [];
function acquireInlineState() {
  return pool2.pop() ?? createState2();
}
function releaseInlineState(state) {
  state.src = "";
  state.text = "";
  if (pool2.length < POOL_SIZE2) pool2.push(state);
}
function grown(array) {
  const larger = new Int32Array(array.length * 2);
  larger.set(array);
  return larger;
}
function pushToken(state, kind, start, end, a, b, c, d) {
  const at = state.tokenLength;
  if (at + TOKEN_WIDTH > state.tokens.length) state.tokens = grown(state.tokens);
  const tokens = state.tokens;
  tokens[at] = kind;
  tokens[at + TOKEN_START] = start;
  tokens[at + TOKEN_END] = end;
  tokens[at + TOKEN_A] = a;
  tokens[at + TOKEN_B] = b;
  tokens[at + TOKEN_C] = c;
  tokens[at + TOKEN_D] = d;
  state.tokenLength = at + TOKEN_WIDTH;
  state.tokenEnd = end;
  return at;
}
function writeInlineEvent(state, tag2, a, b) {
  const at = state.eventLength;
  if (at + EVENT_WIDTH > state.events.length) state.events = grown(state.events);
  const events = state.events;
  events[at] = tag2;
  events[at + 1] = a;
  events[at + 2] = b;
  state.eventLength = at + EVENT_WIDTH;
}
var LINE_FEED = 10;
function joinLines(src, spans, from, to) {
  if (from >= to) return "";
  let text = src.slice(spans[from], spans[from + 1]);
  for (let at = from + 2; at < to; at += 2) text += `
${src.slice(spans[at], spans[at + 1])}`;
  return text;
}
function setContent(state, src, spans, from, to) {
  const lines = to - from >> 1;
  if (lines > state.lineText.length) {
    state.lineText = new Int32Array(lines * 2);
    state.lineSource = new Int32Array(lines * 2);
  }
  let joined2 = true;
  let length = 0;
  for (let at = from, line2 = 0; at < to; at += 2, line2++) {
    if (line2 > 0) {
      joined2 &&= spans[at] === spans[at - 1] + 1 && src.charCodeAt(spans[at - 1]) === LINE_FEED;
      length++;
    }
    state.lineText[line2] = length;
    state.lineSource[line2] = spans[at];
    length += spans[at + 1] - spans[at];
  }
  state.src = src;
  state.text = joined2 && to > from ? src.slice(spans[from], spans[to - 1]) : joinLines(src, spans, from, to);
  state.lineCount = lines;
  if (length + 2 > state.tailDepth.length) {
    state.tailDepth = new Int32Array(length * 2 + 2);
    state.tailLowest = new Int32Array(length * 2 + 2);
  }
}

// ../carve-js/v2/src/inline-atoms.ts
var ASCII4 = 128;
function codeAt(state, pos) {
  return pos < state.end ? state.text.charCodeAt(pos) : NO_CHARACTER;
}
function inClass2(code, mask) {
  return code >= 0 && code < ASCII4 && (CHARACTER_CLASSES[code] & mask) !== 0;
}
function characterBefore(state, pos) {
  const tokens = state.tokens;
  for (let at = state.tokenLength - TOKEN_WIDTH; at >= 0; at -= TOKEN_WIDTH) {
    if (tokens[at + TOKEN_END] !== pos || tokens[at] !== INLINE_COMMENT || (tokens[at + TOKEN_C] & FLAG_BRACED) === 0) break;
    pos = tokens[at + TOKEN_START];
  }
  return codePointBefore(state.text, pos);
}
function characterAfter(state, pos) {
  const text = state.text;
  while (!state.commentCloserMissing && text.charCodeAt(pos) === BRACE_OPEN && text.charCodeAt(pos + 1) === PERCENT) {
    const close = text.indexOf("%}", pos + 2);
    if (close < 0 || close + 2 > state.end) state.commentCloserMissing = true;
    else pos = close + 2;
  }
  if (text.charCodeAt(pos) === BACKSLASH && pos + 1 < state.end && text.charCodeAt(pos + 1) === SPACE) return NO_BREAK_SPACE;
  return codePointAt(text, pos, state.end);
}
function pushBreak(state, kind, start, lineEnd) {
  let end = lineEnd < state.end ? lineEnd + 1 : lineEnd;
  while (end < state.end && isSpaceOrTab(state.text.charCodeAt(end))) end++;
  pushToken(state, kind, start, end, NONE3, NONE3, 0, NONE3);
  return end;
}
function scanBackslash(state, pos) {
  const next = codeAt(state, pos + 1);
  if (next === NO_CHARACTER || next === LF) return pushBreak(state, HARD_BREAK, pos, pos + 1);
  if (next === SPACE) pushToken(state, NBSP, pos, pos + 2, NONE3, NONE3, 0, NONE3);
  else if (isAsciiPunctuation(next)) pushToken(state, ESCAPE, pos, pos + 2, pos + 1, pos + 2, 0, NONE3);
  else return pos + 1;
  return pos + 2;
}
function scanLineBreak(state, pos) {
  let start = pos;
  while (start > state.tokenEnd && isSpaceOrTab(state.text.charCodeAt(start - 1))) start--;
  return pushBreak(state, SOFT_BREAK, start, pos);
}
function backtickRunEnd(text, pos, end) {
  while (pos < end && text.charCodeAt(pos) === BACKTICK) pos++;
  return pos;
}
function closingRun(text, pos, end, length) {
  while (pos < end) {
    if (text.charCodeAt(pos) !== BACKTICK) {
      pos++;
      continue;
    }
    const after2 = backtickRunEnd(text, pos, end);
    if (after2 - pos === length) return pos;
    pos = after2;
  }
  return NONE3;
}
function hasSpacePadding(text, start, end) {
  if (end - start < 2 || text.charCodeAt(start) !== SPACE || text.charCodeAt(end - 1) !== SPACE) return false;
  for (let p = start + 1; p < end - 1; p++) if (text.charCodeAt(p) !== SPACE) return true;
  return false;
}
function rawMarkerEnd(text, pos, end) {
  if (text.charCodeAt(pos) !== BRACE_OPEN || text.charCodeAt(pos + 1) !== EQUALS) return NONE3;
  if (!inClass2(pos + 2 < end ? text.charCodeAt(pos + 2) : NO_CHARACTER, CLASS_RAW_FIRST)) return NONE3;
  const nameEnd2 = classRunEnd(text, pos + 3, end, CLASS_RAW_REST);
  return nameEnd2 < end && text.charCodeAt(nameEnd2) === BRACE_CLOSE ? nameEnd2 + 1 : NONE3;
}
function codeSpan(state, start, run, kind, flags) {
  const text = state.text;
  const open = backtickRunEnd(text, run, state.end);
  const close = closingRun(text, open, state.end, open - run);
  if (close === NONE3) {
    let contentEnd4 = state.end;
    while (contentEnd4 > open && isWhitespace(text.charCodeAt(contentEnd4 - 1))) contentEnd4--;
    pushToken(state, kind, start, state.end, open, contentEnd4, flags | FLAG_OPEN_END, NONE3);
    return state.end;
  }
  const padded = hasSpacePadding(text, open, close);
  const contentStart = padded ? open + 1 : open;
  const contentEnd3 = padded ? close - 1 : close;
  const after2 = close + open - run;
  const marker = kind === CODE_SPAN ? rawMarkerEnd(text, after2, state.end) : NONE3;
  if (marker !== NONE3) {
    pushToken(state, RAW_INLINE, start, marker, contentStart, contentEnd3, 0, after2 + 2);
    return marker;
  }
  pushToken(state, kind, start, after2, contentStart, contentEnd3, flags, NONE3);
  return after2;
}
function scanBacktick(state, pos) {
  return codeSpan(state, pos, pos, CODE_SPAN, 0);
}
function scanLiteralSpan(state, pos) {
  return codeSpan(state, pos, pos + 1, LITERAL, 0);
}
function scanDollar(state, pos) {
  const next = codeAt(state, pos + 1);
  if (next === BACKTICK) return codeSpan(state, pos, pos + 1, MATH, 0);
  if (next === DOLLAR && codeAt(state, pos + 2) === BACKTICK) return codeSpan(state, pos, pos + 2, MATH, FLAG_DISPLAY);
  return pos + 1;
}
function crossReference(state, pos) {
  if (pos < state.xrefFailEnd) return pos + 1;
  const text = state.text;
  let p = pos + 3;
  while (p < state.end && text.charCodeAt(p) !== GREATER && text.charCodeAt(p) !== SPACE && text.charCodeAt(p) !== LF) p++;
  if (codeAt(state, p) !== GREATER) {
    state.xrefFailEnd = p;
    return pos + 1;
  }
  if (p === pos + 3) return pos + 1;
  pushToken(state, XREF, pos, p + 1, pos + 3, p, 0, NONE3);
  return p + 1;
}
function urlEnd(text, pos, end) {
  if (!inClass2(text.charCodeAt(pos), CLASS_SCHEME_FIRST)) return NONE3;
  let p = classRunEnd(text, pos + 1, end, CLASS_SCHEME_REST);
  if (p >= end || text.charCodeAt(p) !== COLON) return NONE3;
  const body2 = ++p;
  while (p < end) {
    const code = codePointAt(text, p, end);
    if (code < ASCII4 ? !inClass2(code, CLASS_URL_BODY) : !isUrlCharacter(code)) break;
    p += code > 65535 ? 2 : 1;
  }
  return p > body2 && p < end && text.charCodeAt(p) === GREATER ? p : NONE3;
}
function emailEnd(text, pos, end) {
  const at = classRunEnd(text, pos, end, CLASS_EMAIL_LOCAL);
  if (at === pos || at >= end || text.charCodeAt(at) !== AT_SIGN) return NONE3;
  const close = classRunEnd(text, at + 1, end, CLASS_EMAIL_DOMAIN);
  if (close >= end || text.charCodeAt(close) !== GREATER) return NONE3;
  let label = close;
  while (label > at + 1 && inClass2(text.charCodeAt(label - 1), CLASS_EMAIL_LAST)) label--;
  return label < close && label > at + 2 && text.charCodeAt(label - 1) === DOT ? close : NONE3;
}
function scanLess(state, pos) {
  const text = state.text;
  if (text.charCodeAt(pos + 1) === SLASH && text.charCodeAt(pos + 2) === HASH) return crossReference(state, pos);
  let close = urlEnd(text, pos + 1, state.end);
  let flags = 0;
  if (close === NONE3) {
    close = emailEnd(text, pos + 1, state.end);
    flags = FLAG_EMAIL;
  }
  if (close === NONE3) return pos + 1;
  pushToken(state, AUTOLINK, pos, close + 1, pos + 1, close, flags, NONE3);
  return close + 1;
}
function scanPercent(state, pos) {
  const text = state.text;
  if (!state.lineComments || text.charCodeAt(pos + 1) !== PERCENT) return pos + 1;
  if (!isBoundarySpace(pos > 0 ? text.charCodeAt(pos - 1) : NO_CHARACTER)) return pos + 1;
  let start = pos;
  while (start > state.tokenEnd && isSpaceOrTab(text.charCodeAt(start - 1))) start--;
  let end = text.indexOf("\n", pos);
  if (end < 0 || end > state.end) end = state.end;
  pushToken(state, INLINE_COMMENT, start, end, pos + 2, end, 0, NONE3);
  return end;
}
function bracedComment(state, pos, kind) {
  const text = state.text;
  const editorial = kind === EDITORIAL;
  if (isJoining(codePointAt(text, pos + 2, state.end))) return pos + 2;
  if (editorial ? state.editorialCloserMissing : state.commentCloserMissing) return pos + 2;
  const close = text.indexOf(editorial ? "#}" : "%}", pos + 2);
  if (close < 0 || close + 2 > state.end) {
    if (editorial) state.editorialCloserMissing = true;
    else state.commentCloserMissing = true;
    return pos + 2;
  }
  if (editorial && close === pos + 2) return pos + 2;
  pushToken(state, kind, pos, close + 2, pos + 2, close, editorial ? 0 : FLAG_BRACED, NONE3);
  return close + 2;
}
function scanBrace(state, pos) {
  const text = state.text;
  const block = readAttributeBlock(text, pos, state.end, state, null);
  if (block !== NONE3) {
    pushToken(state, ATTRIBUTE_BLOCK, pos, block, NONE3, NONE3, 0, NONE3);
    return block;
  }
  const next = codeAt(state, pos + 1);
  if (next === PERCENT) return bracedComment(state, pos, INLINE_COMMENT);
  if (next === HASH) return bracedComment(state, pos, EDITORIAL);
  if (!inClass2(next, CLASS_BRACED_MARK) || isJoining(codePointAt(text, pos + 2, state.end))) return pos + 1;
  pushToken(state, TOKEN_BRACED_OPEN, pos, pos + 2, BRACED_MARKS.indexOf(String.fromCharCode(next)), NONE3, 0, NONE3);
  return pos + 2;
}
function atSigilBoundary(state, pos) {
  return !isWordCharacter(characterBefore(state, pos));
}
function isInnerDot(text, p, pos, end) {
  if (text.charCodeAt(p) !== DOT || p === pos || text.charCodeAt(p - 1) === DOT) return false;
  return inClass2(p + 1 < end ? text.charCodeAt(p + 1) : NO_CHARACTER, CLASS_MENTION);
}
function dottedNameEnd(text, pos, end) {
  let p = pos;
  let letters = false;
  for (; p < end; p++) {
    const code = text.charCodeAt(p);
    if (inClass2(code, CLASS_MENTION)) letters ||= isAsciiLetter(code);
    else if (!isInnerDot(text, p, pos, end)) break;
  }
  while (p > pos && (text.charCodeAt(p - 1) === HYPHEN || text.charCodeAt(p - 1) === DOT)) p--;
  return p > pos && letters ? p : NONE3;
}
function mentionOrTag(state, pos, kind) {
  if (!atSigilBoundary(state, pos)) return pos + 1;
  const end = dottedNameEnd(state.text, pos + 1, state.end);
  if (end === NONE3) return pos + 1;
  pushToken(state, kind, pos, end, pos + 1, end, 0, NONE3);
  return end;
}
function scanAtSign(state, pos) {
  return mentionOrTag(state, pos, MENTION);
}
function scanHash(state, pos) {
  return mentionOrTag(state, pos, TAG);
}
function symbol(state, pos) {
  const text = state.text;
  if (!inClass2(codeAt(state, pos + 1), CLASS_SYMBOL_FIRST)) return NONE3;
  const end = classRunEnd(text, pos + 2, state.end, CLASS_SYMBOL_REST);
  if (codeAt(state, end) !== COLON || text.charCodeAt(end - 1) === HYPHEN) return NONE3;
  pushToken(state, SYMBOL, pos, end + 1, pos + 1, end, 0, NONE3);
  return end + 1;
}
function scanColon(state, pos, open) {
  if (!atSigilBoundary(state, pos)) return pos + 1;
  if (inClass2(codeAt(state, pos + 1), CLASS_EXTENSION_FIRST)) {
    const nameEnd2 = classRunEnd(state.text, pos + 2, state.end, CLASS_EXTENSION_REST);
    if (codeAt(state, nameEnd2) === BRACKET_OPEN) return open(state, pos, nameEnd2 + 1, OPEN_EXTENSION);
  }
  const after2 = symbol(state, pos);
  return after2 === NONE3 ? pos + 1 : after2;
}

// ../carve-js/v2/src/inline-brackets.ts
function openBracket(state, start, end, form) {
  if (state.baseDepth + state.bracketDepth >= DEPTH_CAP) return start + 1;
  if (state.bracketDepth === state.brackets.length) {
    const larger = new Int32Array(state.brackets.length * 2);
    larger.set(state.brackets);
    state.brackets = larger;
  }
  state.brackets[state.bracketDepth++] = pushToken(state, TOKEN_OPEN, start, end, form, NONE3, 0, NONE3);
  return end;
}
function isBlank(text, start, end) {
  for (let p = start; p < end; p++) if (!isWhitespace(text.charCodeAt(p))) return false;
  return true;
}
function startsLineComment(state, p) {
  return state.lineComments && state.text.charCodeAt(p + 1) === PERCENT && isBoundarySpace(state.text.charCodeAt(p - 1));
}
function labelEnd2(state, pos) {
  if (state.labelCloserMissing) return NONE3;
  const text = state.text;
  for (let p = pos; p < state.end; p++) {
    const code = text.charCodeAt(p);
    if (code === BRACKET_CLOSE) return p;
    if (code === BACKSLASH) p++;
    else if (code === PERCENT && startsLineComment(state, p)) return NONE3;
  }
  state.labelCloserMissing = true;
  return NONE3;
}
function footnoteReference(state, pos) {
  const close = labelEnd2(state, pos + 2);
  if (close === NONE3 || isBlank(state.text, pos + 2, close)) return pos + 1;
  pushToken(state, FOOTNOTE_REF, pos, close + 1, pos + 2, close, 0, NONE3);
  return close + 1;
}
function scanBracketOpen(state, pos) {
  if (state.text.charCodeAt(pos + 1) === CARET) return footnoteReference(state, pos);
  return openBracket(state, pos, pos + 1, OPEN_PLAIN);
}
function scanFootnoteOpen(state, pos) {
  return openBracket(state, pos, pos + 2, OPEN_FOOTNOTE);
}
function scanImageOpen(state, pos) {
  return openBracket(state, pos, pos + 2, OPEN_IMAGE);
}
function scanDestinationRun(state, pos) {
  const text = state.text;
  const depth2 = state.tailDepth;
  let level = 0;
  let p = pos;
  for (; p < state.end && !isWhitespace(text.charCodeAt(p)); p++) {
    const code = text.charCodeAt(p);
    depth2[p] = level;
    if (code === PAREN_OPEN) level++;
    else if (code === PAREN_CLOSE) level--;
    else if (code === BACKSLASH && isDestinationEscape(text.charCodeAt(p + 1)) && p + 1 < state.end) depth2[++p] = level;
  }
  depth2[p] = level;
  const lowest = state.tailLowest;
  lowest[p] = level;
  for (let q = p - 1; q >= pos; q--) lowest[q] = Math.min(lowest[q + 1], depth2[q + 1]);
  state.tailStart = pos;
  state.tailEnd = p;
  state.tailTitleFailed = false;
}
function isDestinationEscape(code) {
  return code === PAREN_OPEN || code === PAREN_CLOSE || code === BACKSLASH;
}
function closingQuote2(text, p, end, quote3) {
  while (p < end && text.charCodeAt(p) !== quote3 && text.charCodeAt(p) !== LF) {
    p += text.charCodeAt(p) === BACKSLASH && text.charCodeAt(p + 1) !== LF ? 2 : 1;
  }
  return p < end && text.charCodeAt(p) === quote3 ? p : NONE3;
}
function titleEnd(state, pos) {
  const text = state.text;
  const quote3 = text.charCodeAt(pos + 1);
  if (quote3 !== QUOTE_MARK && quote3 !== APOSTROPHE) return NONE3;
  const close = closingQuote2(text, pos + 2, state.end, quote3);
  if (close === NONE3) return NONE3;
  let p = close + 1;
  while (p < state.end && text.charCodeAt(p) === SPACE) p++;
  if (p >= state.end || text.charCodeAt(p) !== PAREN_CLOSE) return NONE3;
  state.tailTitleStart = pos + 1;
  return p + 1;
}
function linkTail(state, pos) {
  const from = pos + 1;
  if (from < state.tailStart || from > state.tailEnd || state.tailStart === NONE3) scanDestinationRun(state, from);
  const depth2 = state.tailDepth;
  const base = depth2[from];
  const runEnd = state.tailEnd;
  state.tailTitleStart = NONE3;
  if (state.tailLowest[from] < base) {
    let p = from;
    while (depth2[p + 1] >= base) p++;
    state.tailDestinationEnd = p;
    return p + 1;
  }
  if (depth2[runEnd] !== base || state.tailTitleFailed || state.text.charCodeAt(runEnd) !== SPACE) return NONE3;
  state.tailDestinationEnd = runEnd;
  const end = titleEnd(state, runEnd);
  if (end === NONE3) state.tailTitleFailed = true;
  return end;
}
function referenceLabel(state, pos, textStart, textEnd) {
  const text = state.text;
  const first = text.charCodeAt(pos + 1);
  if (first === BRACKET_CLOSE) return isBlank(text, textStart, textEnd) ? NONE3 : pos + 2;
  if (first === AT_SIGN || first === CARET) return NONE3;
  const close = labelEnd2(state, pos + 1);
  return close === NONE3 || isBlank(text, pos + 1, close) ? NONE3 : close + 1;
}
function attributeRun(state, pos) {
  const text = state.text;
  for (; ; ) {
    let end = text.charCodeAt(pos) === BRACE_OPEN ? readAttributeBlock(text, pos, state.end, state, null) : NONE3;
    if (end === NONE3) end = emptyBlockEnd(text, pos, state.end);
    if (end === NONE3) return pos;
    pushToken(state, ATTRIBUTE_BLOCK, pos, end, NONE3, NONE3, 0, NONE3);
    pos = end;
  }
}
function closePair(state, open, pos, kind) {
  if (kind === IMAGE) state.tokenLength = open + TOKEN_WIDTH;
  const close = pushToken(state, TOKEN_CLOSE, pos, pos + 1, open, NONE3, 0, NONE3);
  state.tokens[open + TOKEN_B] = close;
  state.tokens[open + TOKEN_C] = kind;
}
function closeInlineLink(state, open, pos, image2) {
  const end = linkTail(state, pos + 1);
  if (end === NONE3) return NONE3;
  closePair(state, open, pos, image2 ? IMAGE : LINK);
  pushToken(state, TOKEN_TAIL, pos + 1, end, pos + 2, state.tailDestinationEnd, state.tailTitleStart, NONE3);
  return end;
}
function closeReference(state, open, pos, image2) {
  const end = referenceLabel(state, pos + 1, state.tokens[open + TOKEN_END], pos);
  if (end === NONE3) return NONE3;
  closePair(state, open, pos, image2 ? IMAGE : LINK);
  pushToken(state, LABEL, pos + 1, end, pos + 2, end - 1, end === pos + 3 ? FLAG_COLLAPSED : 0, NONE3);
  return end;
}
function closeSpan(state, open, pos, image2) {
  const text = state.text;
  if (readAttributeBlock(text, pos + 1, state.end, state, null) === NONE3 && emptyBlockEnd(text, pos + 1, state.end) === NONE3) return NONE3;
  if (image2) state.tokens[open + TOKEN_START]++;
  closePair(state, open, pos, BRACKET_SPAN);
  return attributeRun(state, pos + 1);
}
function closeConstruct(state, open, pos) {
  const image2 = state.tokens[open + TOKEN_A] === OPEN_IMAGE;
  const next = pos + 1 < state.end ? state.text.charCodeAt(pos + 1) : NONE3;
  if (next === PAREN_OPEN) return closeInlineLink(state, open, pos, image2);
  if (next === BRACKET_OPEN) return closeReference(state, open, pos, image2);
  return next === BRACE_OPEN ? closeSpan(state, open, pos, image2) : NONE3;
}
function scanBracketClose(state, pos) {
  if (state.bracketDepth === 0) return pos + 1;
  const open = state.brackets[--state.bracketDepth];
  const form = state.tokens[open + TOKEN_A];
  if (form >= OPEN_FOOTNOTE) {
    closePair(state, open, pos, form === OPEN_FOOTNOTE ? INLINE_FOOTNOTE : INLINE_EXTENSION);
    return pos + 1;
  }
  const end = closeConstruct(state, open, pos);
  if (end !== NONE3) return end;
  state.tokens[open] = TOKEN_TEXT;
  return pos + 1;
}
function failOpenBrackets(state) {
  while (state.bracketDepth > 0) state.tokens[state.brackets[--state.bracketDepth]] = TOKEN_TEXT;
}

// ../carve-js/v2/src/inline-delimiters.ts
var SLASH_MARK = BRACED_MARKS.indexOf(BARE_MARKS[0]);
var BARE_CLASS = BRACED_MARKS.length;
var BARRIER = BARE_CLASS + BARE_MARKS.length;
var DEAD = BARRIER + 1;
function markIndex(text, pos) {
  return BRACED_MARKS.indexOf(text[pos]);
}
function flanking(state, pos) {
  const before2 = characterBefore(state, pos);
  const after2 = characterAfter(state, pos + 1);
  const wordBefore = isWordCharacter(before2);
  const wordAfter = isWordCharacter(after2);
  let flags = wordBefore && wordAfter ? BETWEEN_WORDS : 0;
  if (!wordBefore && !isBoundarySpace(after2)) flags |= CAN_OPEN;
  if (!isBoundarySpace(before2) && !wordAfter) flags |= CAN_CLOSE;
  return flags;
}
function scanBareMark(state, pos) {
  const text = state.text;
  const code = text.charCodeAt(pos);
  let last = pos;
  while (last + 1 < state.end && text.charCodeAt(last + 1) === code) last++;
  const closer = last + 1 < state.end && text.charCodeAt(last + 1) === BRACE_CLOSE;
  const mark2 = markIndex(text, pos);
  if (last > pos) {
    if (closer) pushToken(state, TOKEN_BRACED_CLOSE, last, last + 2, mark2, NONE3, 0, NONE3);
    return closer ? last + 2 : last + 1;
  }
  if (isJoining(codePointAt(text, pos + 1, state.end))) return pos + 1;
  const flags = flanking(state, pos);
  if (closer) pushToken(state, TOKEN_BRACED_CLOSE, pos, pos + 2, mark2, NONE3, flags, NONE3);
  else if (flags !== 0) pushToken(state, TOKEN_DELIMITER, pos, pos + 1, mark2, NONE3, flags, NONE3);
  return closer ? pos + 2 : pos + 1;
}
function scanBracedMark(state, pos) {
  if (pos + 1 >= state.end || state.text.charCodeAt(pos + 1) !== BRACE_CLOSE) return pos + 1;
  pushToken(state, TOKEN_BRACED_CLOSE, pos, pos + 2, markIndex(state.text, pos), NONE3, 0, NONE3);
  return pos + 2;
}
function growStack(state) {
  const size = state.stackToken.length * 2;
  const grow = (array) => {
    const larger = new Int32Array(size);
    larger.set(array);
    return larger;
  };
  const classes = new Int8Array(size);
  classes.set(state.stackClass);
  state.stackClass = classes;
  state.stackToken = grow(state.stackToken);
  state.stackBelow = grow(state.stackBelow);
  state.stackSlash = grow(state.stackSlash);
  state.stackStar = grow(state.stackStar);
}
function push2(state, token, entryClass, below) {
  const at = state.stackLength;
  if (at === state.stackToken.length) growStack(state);
  state.stackToken[at] = token;
  state.stackClass[at] = entryClass;
  state.stackBelow[at] = below;
  state.stackSlash[at] = state.lastSlash;
  state.stackStar[at] = state.lastStar;
  state.stackLength = at + 1;
  state.stackLive++;
  return at;
}
function pushDelimiter(state, token, entryClass) {
  state.classTop[entryClass] = push2(state, token, entryClass, state.classTop[entryClass]);
}
function unlink(state, at) {
  state.classTop[state.stackClass[at]] = state.stackBelow[at];
  state.stackLive--;
}
function removeAbove(state, at) {
  for (let entry = state.stackLength - 1; entry > at; entry--) {
    if (state.stackClass[entry] === DEAD) continue;
    unlink(state, entry);
    state.tokens[state.stackToken[entry]] = TOKEN_TEXT;
  }
  state.stackLength = at + 1;
}
function pop(state) {
  state.stackLength--;
  while (state.stackLength > 0 && state.stackClass[state.stackLength - 1] === DEAD) state.stackLength--;
}
function depth(state) {
  return state.baseDepth + state.stackLive;
}
function closeEntry(state, at, token) {
  const tokens = state.tokens;
  const opener = state.stackToken[at];
  removeAbove(state, at);
  unlink(state, at);
  pop(state);
  tokens[opener + TOKEN_B] = token;
  tokens[token + TOKEN_B] = opener;
}
function bareDelimiter(state, token) {
  const tokens = state.tokens;
  const flags = tokens[token + TOKEN_C];
  const slash = tokens[token + TOKEN_A] === SLASH_MARK;
  const entryClass = slash ? BARE_CLASS : BARE_CLASS + 1;
  const top = state.classTop[entryClass];
  if ((flags & BETWEEN_WORDS) !== 0) {
    if (slash) state.lastSlash = token;
    else state.lastStar = token;
  } else if ((flags & CAN_CLOSE) !== 0 && top > state.stackFloor) {
    closeBare(state, top, token, slash ? state.lastSlash : state.lastStar);
    return;
  } else if ((flags & CAN_OPEN) !== 0 && depth(state) < DEPTH_CAP) {
    pushDelimiter(state, token, entryClass);
    return;
  }
  tokens[token] = TOKEN_TEXT;
}
function closeBare(state, at, token, lastBetweenWords) {
  const tokens = state.tokens;
  const opener = state.stackToken[at];
  if (lastBetweenWords < opener) {
    closeEntry(state, at, token);
    return;
  }
  unlink(state, at);
  state.stackClass[at] = DEAD;
  if (at === state.stackLength - 1) pop(state);
  tokens[opener] = TOKEN_TEXT;
  tokens[token] = TOKEN_TEXT;
}
function bracedCloser(state, token) {
  const tokens = state.tokens;
  const mark2 = tokens[token + TOKEN_A];
  const top = state.classTop[mark2];
  if (top <= state.stackFloor) {
    if (tokens[token + TOKEN_C] === 0) {
      tokens[token] = TOKEN_TEXT;
      return;
    }
    tokens[token] = TOKEN_DELIMITER;
    tokens[token + TOKEN_END]--;
    bareDelimiter(state, token);
    return;
  }
  const opener = state.stackToken[top];
  state.lastSlash = state.stackSlash[top];
  state.lastStar = state.stackStar[top];
  if (tokens[opener + TOKEN_END] !== tokens[token + TOKEN_START]) {
    closeEntry(state, top, token);
    return;
  }
  unlink(state, top);
  pop(state);
  tokens[opener] = TOKEN_TEXT;
  tokens[token] = TOKEN_TEXT;
}
function demote(state, open) {
  const tokens = state.tokens;
  const close = tokens[open + TOKEN_B];
  tokens[open] = TOKEN_TEXT;
  tokens[close] = TOKEN_TEXT;
  const part = close + TOKEN_WIDTH;
  if (part < state.tokenLength && (tokens[part] === TOKEN_TAIL || tokens[part] === LABEL)) tokens[part] = TOKEN_LITERAL;
}
function enterConstruct(state, open) {
  if (state.tokens[open + TOKEN_C] === IMAGE) return;
  if (depth(state) >= DEPTH_CAP) {
    demote(state, open);
    return;
  }
  state.stackFloor = push2(state, open, BARRIER, state.stackFloor);
  state.lastSlash = NONE3;
  state.lastStar = NONE3;
}
function leaveConstruct(state, close) {
  const open = state.tokens[close + TOKEN_A];
  if (state.tokens[open + TOKEN_C] === IMAGE) return;
  const at = state.stackFloor;
  removeAbove(state, at);
  state.stackFloor = state.stackBelow[at];
  state.lastSlash = state.stackSlash[at];
  state.lastStar = state.stackStar[at];
  state.stackLive--;
  pop(state);
}
function braceOpener(state, token) {
  if (depth(state) < DEPTH_CAP) pushDelimiter(state, token, state.tokens[token + TOKEN_A]);
  else state.tokens[token] = TOKEN_TEXT;
}
function pairDelimiters(state) {
  const tokens = state.tokens;
  state.stackLength = 0;
  state.stackLive = 0;
  state.stackFloor = NONE3;
  state.lastSlash = NONE3;
  state.lastStar = NONE3;
  if (state.tokenLength === 0) return;
  state.classTop.fill(NONE3);
  for (let at = 0; at < state.tokenLength; at += TOKEN_WIDTH) {
    const kind = tokens[at];
    if (kind === TOKEN_DELIMITER) bareDelimiter(state, at);
    else if (kind === TOKEN_BRACED_OPEN) braceOpener(state, at);
    else if (kind === TOKEN_BRACED_CLOSE) bracedCloser(state, at);
    else if (kind === TOKEN_OPEN) enterConstruct(state, at);
    else if (kind === TOKEN_CLOSE) leaveConstruct(state, at);
  }
  removeAbove(state, NONE3);
}

// ../carve-js/v2/src/typography.ts
var ASCII5 = 128;
var EN_DASH = 8211;
var EM_DASH = 8212;
var LEFT_SINGLE = 8216;
var LEFT_DOUBLE = 8220;
var LONGEST_WORD = 6;
var NO_MATCH = -1;
var TRIGGERS = Uint8Array.from(CHARACTER_CLASSES, (classes) => (classes & CLASS_SMART_TRIGGER) === 0 ? 0 : 1);
function toSource(state, pos) {
  let line2 = state.line;
  while (line2 + 1 < state.lineCount && state.lineText[line2 + 1] <= pos) line2++;
  while (line2 > 0 && state.lineText[line2] > pos) line2--;
  state.line = line2;
  return state.lineSource[line2] + pos - state.lineText[line2];
}
function inClass3(code, mask) {
  return code >= 0 && code < ASCII5 && (CHARACTER_CLASSES[code] & mask) !== 0;
}
function isPlusOrHyphen(code) {
  return code === PLUS || code === HYPHEN;
}
function isDash(code) {
  return code === HYPHEN || code === EN_DASH || code === EM_DASH;
}
function before(state, pos, from) {
  return pos > from ? codePointBefore(state.text, pos) : state.previous;
}
function after(state, pos, to) {
  return pos < to ? codePointAt(state.text, pos, to) : characterAfter(state, to);
}
function quoteOpens(previous, next) {
  if (isBoundarySpace(previous) || previous === LEFT_SINGLE || previous === LEFT_DOUBLE) return true;
  if (!isDash(previous) && !inClass3(previous, CLASS_QUOTE_OPENS_AFTER)) return false;
  if (!isDash(previous) && previous !== SLASH) return true;
  return !isBoundarySpace(next) && !inClass3(next, CLASS_QUOTE_CLOSES_BEFORE);
}
function apostropheWord(text, pos, end) {
  let p = pos;
  while (p < end && p - pos <= LONGEST_WORD && isAsciiLetter(text.charCodeAt(p))) p++;
  if (p === pos || isLetter(codePointAt(text, p, end))) return 0;
  return APOSTROPHE_WORDS.includes(text.slice(pos, p).toLowerCase()) ? p - pos : 0;
}
function singleQuote(state, pos, previous, next) {
  const text = state.text;
  if (isAsciiDigit(next)) return SMART_RIGHT_SINGLE_QUOTE;
  if (!quoteOpens(previous, next)) {
    if (!isWordCharacter(previous) || !isWordCharacter(next)) state.singleQuoteOpen = false;
    return SMART_RIGHT_SINGLE_QUOTE;
  }
  const word = apostropheWord(text, pos + 1, state.end);
  if (word > 0) {
    const closer = pos + 1 + word;
    const quoted3 = word > 1 && text.charCodeAt(closer) === APOSTROPHE && !isWordCharacter(codePointAt(text, closer + 1, state.end));
    if (!quoted3) return SMART_RIGHT_SINGLE_QUOTE;
  } else if (state.singleQuoteOpen && isWordCharacter(next)) {
    return SMART_RIGHT_SINGLE_QUOTE;
  }
  state.singleQuoteOpen = true;
  return SMART_LEFT_SINGLE_QUOTE;
}
function writeSmart(state, start, end, kind) {
  writeInlineEvent(state, eventTag(ENTER, SMART, 0), toSource(state, start), kind);
  writeInlineEvent(state, eventTag(EXIT, SMART, 0), toSource(state, end), 0);
}
function writeDashes(state, pos, length) {
  while (length > 0) {
    const em = length % 3 === 0 || length % 2 !== 0;
    const size = em ? 3 : 2;
    state.smartKind = em ? SMART_EM_DASH : SMART_EN_DASH;
    writeSmart(state, pos, pos + size, state.smartKind);
    pos += size;
    length -= size;
  }
}
function hyphens(state, pos, to) {
  const text = state.text;
  let end = pos;
  while (end < to && text.charCodeAt(end) === HYPHEN) end++;
  const length = end - pos;
  if (length === 2 && end < to && text.charCodeAt(end) === GREATER) {
    flushSpan(state, pos);
    writeSmart(state, pos, end + 1, SMART_RIGHTWARDS_ARROW);
    state.smartKind = SMART_RIGHTWARDS_ARROW;
    return end + 1;
  }
  if (length < 2) return -end;
  flushSpan(state, pos);
  writeDashes(state, pos, length);
  return end;
}
function runAt(text, pos, to) {
  for (let index = 0; index < SMART_RUNS.length; index++) {
    const source = SMART_RUNS[index][0];
    const end = pos + source.length;
    if (end > to || source.charCodeAt(0) === HYPHEN || !text.startsWith(source, pos)) continue;
    if (source.charCodeAt(source.length - 1) === HYPHEN && end < to && text.charCodeAt(end) === HYPHEN) continue;
    return index;
  }
  return NO_MATCH;
}
function flushSpan(state, end) {
  if (end > state.textRun) writeInlineEvent(state, eventTag(SPAN, 0, 0), toSource(state, state.textRun), toSource(state, end));
  state.textRun = end;
}
function quote(state, pos, from, to, code) {
  const previous = before(state, pos, from);
  const next = after(state, pos + 1, to);
  let kind = quoteOpens(previous, next) ? SMART_LEFT_DOUBLE_QUOTE : SMART_RIGHT_DOUBLE_QUOTE;
  if (code === APOSTROPHE) kind = singleQuote(state, pos, previous, next);
  flushSpan(state, pos);
  writeSmart(state, pos, pos + 1, kind);
  state.smartKind = kind;
  return pos + 1;
}
function smartAt(state, pos, from, to) {
  const text = state.text;
  const code = text.charCodeAt(pos);
  if (code === QUOTE_MARK || code === APOSTROPHE) return quote(state, pos, from, to, code);
  if (code === HYPHEN) return hyphens(state, pos, to);
  const run = runAt(text, pos, to);
  if (run === NO_MATCH) return pos;
  const [source, kind] = SMART_RUNS[run];
  if (kind === SMART_PLUS_MINUS && (isPlusOrHyphen(before(state, pos, from)) || isPlusOrHyphen(after(state, pos + 2, to)))) {
    return pos;
  }
  flushSpan(state, pos);
  writeSmart(state, pos, pos + source.length, kind);
  state.smartKind = kind;
  return pos + source.length;
}
function afterSmart(state, pos) {
  state.previous = SMART_GLYPHS[state.smartKind].codePointAt(0);
  state.textRun = pos;
}
function writeText(state, from, to) {
  if (from >= to) return;
  const text = state.text;
  state.textRun = from;
  let start = from;
  for (let pos = from; pos < to; ) {
    const code = text.charCodeAt(pos);
    if (code >= ASCII5 || TRIGGERS[code] === 0) {
      pos++;
      continue;
    }
    const end = smartAt(state, pos, start, to);
    if (end > pos) {
      afterSmart(state, end);
      start = end;
    }
    pos = end > pos ? end : Math.max(pos + 1, -end);
  }
  if (to > state.textRun) {
    state.previous = codePointBefore(text, to);
    flushSpan(state, to);
  }
}
function startOfContent(state) {
  state.previous = NO_CHARACTER;
}

// ../carve-js/v2/src/inline-emit.ts
var SLASH_MARK2 = BRACED_MARKS.indexOf(BARE_MARKS[0]);
var NO_BREAK_SPACE2 = 160;
var MAX_FOOTNOTES = 256;
function lineBreakFrom(state, pos) {
  if (pos < state.breakFrom || pos > state.nextBreak) {
    const at = state.text.indexOf("\n", pos);
    state.nextBreak = at < 0 ? state.text.length : at;
  }
  state.breakFrom = pos;
  return state.nextBreak;
}
function writePieces(state, start, end) {
  while (start < end) {
    const lineEnd = Math.min(lineBreakFrom(state, start), end);
    writeInlineEvent(state, eventTag(SPAN, 0, 0), toSource(state, start), toSource(state, lineEnd));
    if (lineEnd + 1 === end) writeInlineEvent(state, eventTag(SPAN, 0, 0), toSource(state, end), toSource(state, end));
    start = lineEnd + 1;
  }
}
function writeLeaf(state, kind, flags, start, aux, from, to, end) {
  writeInlineEvent(state, eventTag(ENTER, kind, flags), toSource(state, start), aux);
  if (from !== NONE3) writePieces(state, from, to);
  writeInlineEvent(state, eventTag(EXIT, kind, 0), toSource(state, end), 0);
}
function writeLabel(state, at) {
  const tokens = state.tokens;
  writeLeaf(state, LABEL, 0, tokens[at + TOKEN_START], 0, tokens[at + TOKEN_A], tokens[at + TOKEN_B], tokens[at + TOKEN_END]);
}
function afterNode(state) {
  state.previous = LOWER_A;
}
function closeHost(state, at, kind, end) {
  const tokens = state.tokens;
  while (isHost(kind) && at < state.tokenLength && tokens[at] === ATTRIBUTE_BLOCK && tokens[at + TOKEN_START] === end) {
    end = tokens[at + TOKEN_END];
    writeLeaf(state, ATTRIBUTE_BLOCK, 0, tokens[at + TOKEN_START], 0, NONE3, NONE3, end);
    at += TOKEN_WIDTH;
  }
  writeInlineEvent(state, eventTag(EXIT, kind, 0), toSource(state, end), 0);
  state.textRun = end;
  afterNode(state);
  return at;
}
function writeTail(state, at) {
  const tokens = state.tokens;
  const text = state.text;
  const destinationEnd = tokens[at + TOKEN_B];
  writeLeaf(state, DESTINATION, 0, tokens[at + TOKEN_A], 0, tokens[at + TOKEN_A], destinationEnd, destinationEnd);
  const title = tokens[at + TOKEN_C];
  if (title === NONE3) return;
  let end = tokens[at + TOKEN_END] - 1;
  while (text.charCodeAt(end - 1) === SPACE) end--;
  writeLeaf(state, TITLE, 0, title, 0, title + 1, end - 1, end);
}
function delimiterKind(state, at) {
  const mark2 = state.tokens[at + TOKEN_A];
  if (state.tokens[at] !== TOKEN_DELIMITER) return BRACED_KINDS[mark2];
  return mark2 === SLASH_MARK2 ? EMPHASIS : STRONG;
}
function writeDelimiter(state, at) {
  const tokens = state.tokens;
  const partner = tokens[at + TOKEN_B];
  if (partner > at) {
    const kind = delimiterKind(state, at);
    const flags = tokens[at] === TOKEN_BRACED_OPEN ? FLAG_BRACED : 0;
    writeInlineEvent(state, eventTag(ENTER, kind, flags), toSource(state, tokens[at + TOKEN_START]), 0);
    state.textRun = tokens[at + TOKEN_END];
    startOfContent(state);
    return at + TOKEN_WIDTH;
  }
  return closeHost(state, at + TOKEN_WIDTH, delimiterKind(state, partner), tokens[at + TOKEN_END]);
}
function referenceFlags(state, close) {
  const tokens = state.tokens;
  const part = close + TOKEN_WIDTH;
  if (part >= state.tokenLength || tokens[part] !== LABEL) return 0;
  return FLAG_REFERENCE | tokens[part + TOKEN_C] & FLAG_COLLAPSED;
}
function writeOpen(state, at) {
  const tokens = state.tokens;
  const kind = tokens[at + TOKEN_C];
  const start = toSource(state, tokens[at + TOKEN_START]);
  const end = tokens[at + TOKEN_END];
  const aux = kind === INLINE_EXTENSION ? toSource(state, end - 1) : 0;
  writeInlineEvent(state, eventTag(ENTER, kind, referenceFlags(state, tokens[at + TOKEN_B])), start, aux);
  state.textRun = end;
  if (kind === IMAGE) {
    state.textRun = tokens[tokens[at + TOKEN_B] + TOKEN_START];
    writePieces(state, end, state.textRun);
    return at + TOKEN_WIDTH;
  }
  if (kind === INLINE_FOOTNOTE && state.footnoteDepth < MAX_FOOTNOTES) {
    state.footnoteQuotes[state.footnoteDepth++] = state.singleQuoteOpen ? 1 : 0;
    state.singleQuoteOpen = false;
  }
  startOfContent(state);
  return at + TOKEN_WIDTH;
}
function writeClose(state, at) {
  const tokens = state.tokens;
  const kind = tokens[tokens[at + TOKEN_A] + TOKEN_C];
  let end = tokens[at + TOKEN_END];
  let next = at + TOKEN_WIDTH;
  if (kind === INLINE_FOOTNOTE && state.footnoteDepth > 0) state.singleQuoteOpen = state.footnoteQuotes[--state.footnoteDepth] === 1;
  if (next < state.tokenLength && (tokens[next] === TOKEN_TAIL || tokens[next] === LABEL) && kind !== BRACKET_SPAN) {
    if (tokens[next] === TOKEN_TAIL) writeTail(state, next);
    else writeLabel(state, next);
    end = tokens[next + TOKEN_END];
    next += TOKEN_WIDTH;
  }
  return closeHost(state, next, kind, end);
}
function afterAtom(state, at, kind) {
  const tokens = state.tokens;
  if (kind === SOFT_BREAK || kind === HARD_BREAK) state.previous = LF;
  else if (kind === NBSP) state.previous = NO_BREAK_SPACE2;
  else if (kind === ESCAPE) state.previous = state.text.charCodeAt(tokens[at + TOKEN_A]);
  else if (kind === SMART) state.previous = SMART_GLYPHS[tokens[at + TOKEN_D]].codePointAt(0);
}
function writeAtom(state, at) {
  const tokens = state.tokens;
  const kind = tokens[at];
  const start = tokens[at + TOKEN_START];
  const end = tokens[at + TOKEN_END];
  if (kind === ATTRIBUTE_BLOCK || kind === TOKEN_LITERAL) {
    writePieces(state, start, end);
    state.previous = BRACE_CLOSE;
    state.textRun = end;
    return at + TOKEN_WIDTH;
  }
  let aux = tokens[at + TOKEN_D];
  if (kind === RAW_INLINE) aux = toSource(state, aux);
  const keepsAux = kind === SMART || kind === RAW_INLINE;
  writeInlineEvent(state, eventTag(ENTER, kind, tokens[at + TOKEN_C]), toSource(state, start), keepsAux ? aux : 0);
  if (tokens[at + TOKEN_A] !== NONE3) writePieces(state, tokens[at + TOKEN_A], tokens[at + TOKEN_B]);
  const previous = state.previous;
  const next = closeHost(state, at + TOKEN_WIDTH, kind, end);
  if (kind === INLINE_COMMENT) {
    state.previous = previous;
  } else {
    afterAtom(state, at, kind);
  }
  return next;
}
function writeToken(state, at) {
  const kind = state.tokens[at];
  if (kind === TOKEN_OPEN) return writeOpen(state, at);
  if (kind === TOKEN_CLOSE) return writeClose(state, at);
  if (kind >= TOKEN_DELIMITER && kind < TOKEN_LITERAL) return writeDelimiter(state, at);
  return writeAtom(state, at);
}
function writeEvents(state) {
  const tokens = state.tokens;
  state.eventLength = 0;
  state.line = 0;
  state.singleQuoteOpen = false;
  state.footnoteDepth = 0;
  state.breakFrom = 0;
  state.nextBreak = NONE3;
  startOfContent(state);
  let textStart = 0;
  for (let at = 0; at < state.tokenLength; ) {
    if (tokens[at] === TOKEN_TEXT) {
      at += TOKEN_WIDTH;
      continue;
    }
    writeText(state, textStart, tokens[at + TOKEN_START]);
    at = writeToken(state, at);
    textStart = state.textRun;
  }
  writeText(state, textStart, state.end);
}

// ../carve-js/v2/src/inline-scan.ts
var ASCII6 = 128;
function scanBang(state, pos) {
  const next = pos + 1 < state.end ? state.text.charCodeAt(pos + 1) : NONE3;
  if (next === BACKTICK) return scanLiteralSpan(state, pos);
  return next === BRACKET_OPEN ? scanImageOpen(state, pos) : pos + 1;
}
function scanCaret(state, pos) {
  if (pos + 1 < state.end && state.text.charCodeAt(pos + 1) === BRACKET_OPEN) return scanFootnoteOpen(state, pos);
  return scanBracedMark(state, pos);
}
function scanSigilColon(state, pos) {
  return scanColon(state, pos, openBracket);
}
function scanners() {
  const table3 = new Array(ASCII6).fill(void 0);
  for (const mark2 of BRACED_MARKS) table3[mark2.charCodeAt(0)] = scanBracedMark;
  for (const mark2 of BARE_MARKS) table3[mark2.charCodeAt(0)] = scanBareMark;
  table3[BACKSLASH] = scanBackslash;
  table3[LF] = scanLineBreak;
  table3[BACKTICK] = scanBacktick;
  table3[BANG] = scanBang;
  table3[DOLLAR] = scanDollar;
  table3[LESS] = scanLess;
  table3[PERCENT] = scanPercent;
  table3[BRACE_OPEN] = scanBrace;
  table3[AT_SIGN] = scanAtSign;
  table3[HASH] = scanHash;
  table3[COLON] = scanSigilColon;
  table3[BRACKET_OPEN] = scanBracketOpen;
  table3[BRACKET_CLOSE] = scanBracketClose;
  table3[CARET] = scanCaret;
  return table3;
}
var SCANNERS = scanners();
var STARTS_TOKEN = Uint8Array.from(SCANNERS, (scanner) => scanner === void 0 ? 0 : 1);
var ALWAYS_TEXT = Uint8Array.from(STARTS_TOKEN, (starts, code) => {
  const smart = (CHARACTER_CLASSES[code] & CLASS_SMART_TRIGGER) !== 0;
  return starts === 0 && !smart ? 1 : 0;
});
function isPlainText(src, start, end) {
  if (start >= end || isSpaceOrTab(src.charCodeAt(start)) || isSpaceOrTab(src.charCodeAt(end - 1))) return false;
  for (let pos = start; pos < end; pos++) {
    const code = src.charCodeAt(pos);
    if (code >= ASCII6 || ALWAYS_TEXT[code] === 0) return false;
  }
  return true;
}
function resetScan(state) {
  state.tokenLength = 0;
  state.tokenEnd = 0;
  state.bracketDepth = 0;
  state.commentCloserMissing = false;
  state.editorialCloserMissing = false;
  state.labelCloserMissing = false;
  state.xrefFailEnd = NONE3;
  state.doubleQuoteFailEnd = NONE3;
  state.singleQuoteFailEnd = NONE3;
  state.valueFailEnd = NONE3;
  state.tailStart = NONE3;
  state.tailEnd = NONE3;
}
function contentEnd2(text) {
  let end = text.length;
  while (end > 0 && isSpaceOrTab(text.charCodeAt(end - 1))) end--;
  if (end === text.length || text.charCodeAt(end) !== SPACE) return end;
  let first = end;
  while (first > 0 && text.charCodeAt(first - 1) === BACKSLASH) first--;
  return (end - first) % 2 === 1 ? end + 1 : end;
}
function scanInline(state, src, spans, from, to, baseDepth, lineComments) {
  setContent(state, src, spans, from, to);
  const text = state.text;
  const end = contentEnd2(text);
  state.end = end;
  state.baseDepth = baseDepth;
  state.lineComments = lineComments;
  resetScan(state);
  for (let pos = 0; pos < end; ) {
    const code = text.charCodeAt(pos);
    if (code >= ASCII6) {
      if (code >= BIDI_FIRST && code <= BIDI_LAST && isBidiControl(code)) state.bidi = true;
      pos++;
    } else if (STARTS_TOKEN[code] === 1) {
      const next = SCANNERS[code](state, pos);
      if (next > pos + 1 && !state.bidi) state.bidi = holdsBidiControl(text, pos + 1, next);
      pos = next;
    } else {
      pos++;
    }
  }
  failOpenBrackets(state);
  pairDelimiters(state);
  writeEvents(state);
}

// ../carve-js/v2/src/ast-attributes.ts
function foldLabel(source) {
  let out = "";
  let gap = false;
  let start = 0;
  for (let at = 0; at < source.length; at++) {
    const code = source.charCodeAt(at);
    if (code !== SPACE && code !== TAB && code !== LF) continue;
    if (at > start) out += (gap && out !== "" ? " " : "") + source.slice(start, at);
    gap = true;
    start = at + 1;
  }
  if (start < source.length) out += (gap && out !== "" ? " " : "") + source.slice(start);
  return out;
}
function sameName(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}
function keyIndexOf(keyValues) {
  const index = /* @__PURE__ */ new Map();
  keyValues.forEach(([key], at) => {
    const name = key.toLowerCase();
    if (!index.has(name)) index.set(name, at);
  });
  return index;
}
function attributeSink(attributes2) {
  const sink = {
    id: (name) => {
      attributes2.id = name;
    },
    className: (name) => {
      attributes2.classes.push(name);
    },
    lang: (tag2) => {
      attributes2.lang = tag2;
    },
    key: (key, value) => {
      if (sameName(key, "id")) return sink.id(value);
      if (sameName(key, "class")) {
        for (const name2 of value.split(/[ \t]+/)) if (name2 !== "") attributes2.classes.push(name2);
        return;
      }
      const index = attributes2.keyIndex ??= keyIndexOf(attributes2.keyValues);
      const name = key.toLowerCase();
      const earlier = index.get(name);
      if (earlier === void 0) {
        index.set(name, attributes2.keyValues.length);
        attributes2.keyValues.push([key, value]);
      } else {
        attributes2.keyValues[earlier][1] = value;
      }
    }
  };
  return sink;
}
function emptyAttributes() {
  return { id: null, classes: [], lang: null, keyValues: [] };
}
function readGluedBlocks(src, pos, end, attributes2) {
  const sink = attributeSink(attributes2);
  const memo = emptyMemo();
  while (pos < end && src.charCodeAt(pos) === BRACE_OPEN) {
    const first = src.charCodeAt(pos + 1);
    const marked = first === LESS || first === GREATER || first === TILDE;
    const next = readAttributeBlock(src, marked ? pos + 1 : pos, end, memo, sink);
    if (next < 0) {
      const close = marked ? src.indexOf("}", pos) : -1;
      if (close < 0 || close >= end) break;
      pos = close + 1;
    } else {
      pos = next;
    }
  }
  return pos;
}
function readAttributeLines(src, spans) {
  if (spans === null || spans.length === 0) return null;
  const attributes2 = emptyAttributes();
  for (let at = 0; at < spans.length; at += 2) readGluedBlocks(src, spans[at], spans[at + 1], attributes2);
  return attributes2;
}
function takeKey(attributes2, name) {
  if (attributes2 === null) return null;
  const at = attributes2.keyValues.findIndex((pair) => pair[0] === name);
  if (at < 0) return null;
  delete attributes2.keyIndex;
  return attributes2.keyValues.splice(at, 1)[0][1];
}

// ../carve-js/v2/src/delimited.ts
function readDelimitedTable(src, node) {
  const tsv = isWord(src, node.start + node.aux, lineFeedAt(src, node.start), "tsv");
  const separator = tsv ? String.fromCharCode(TAB) : ",";
  const spans = node.spans;
  const lines = [];
  for (let at = 0; at < spans.length; at += 2) lines.push(src.slice(spans[at], spans[at + 1]));
  const count = headRows(src, node);
  const table3 = { rows: [], headRows: count < 0 ? 1 : count, declared: count >= 0, malformed: false };
  readRows(lines.join("\n"), separator, table3);
  return table3;
}
function headRows(src, node) {
  const attributes2 = node.attributes ?? [];
  let value = null;
  for (let at = 0; at < attributes2.length; at += 2) {
    value = attributeKeyValue(src, attributes2[at], attributes2[at + 1], "header-rows") ?? value;
  }
  return countValue(value);
}
function quotedPart(cursor, table3) {
  const body2 = cursor.body;
  let cell = "";
  let at = cursor.at + 1;
  for (; ; ) {
    const quote3 = body2.indexOf('"', at);
    if (quote3 < 0) {
      table3.malformed = true;
      cursor.at = body2.length;
      return cell + body2.slice(at);
    }
    cell += body2.slice(at, quote3);
    at = quote3 + 1;
    if (body2[at] !== '"') break;
    cell += '"';
    at++;
  }
  cursor.at = at;
  return cell;
}
function readCell(cursor, separator, table3) {
  const body2 = cursor.body;
  const quoted3 = body2[cursor.at] === '"' ? quotedPart(cursor, table3) : "";
  const start = cursor.at;
  while (cursor.at < body2.length && body2[cursor.at] !== separator && body2[cursor.at] !== "\n") cursor.at++;
  return quoted3 + body2.slice(start, cursor.at);
}
function readRows(body2, separator, table3) {
  if (body2.length === 0) return;
  const cursor = { body: body2, at: 0 };
  let row = [];
  for (; ; ) {
    row.push(readCell(cursor, separator, table3));
    if (cursor.at < body2.length && body2[cursor.at] === separator) {
      cursor.at++;
      continue;
    }
    table3.rows.push(row);
    row = [];
    cursor.at++;
    if (cursor.at >= body2.length) return;
  }
}

// ../carve-js/v2/src/diagnostics.ts
function addFinding(findings, node, entry) {
  findings.entries.push(entry);
  findings.nodes.push(node);
}
function pushList(stack, list3, above, slot) {
  if (list3 === void 0) return;
  for (let at = list3.length - 1; at >= 0; at--) stack.push({ node: list3[at], above, step: `${slot}/${at}` });
}
function pushSlots(stack, frame) {
  const node = frame.node;
  forEachSlot(node, (nodes, step, single) => {
    if (single) stack.push({ node: nodes[0], above: frame, step });
    else pushList(stack, nodes, frame, step);
  });
  if (node.type === "table") pushList(stack, node.columns, frame, "columns");
}
function pointerOf(frame) {
  const steps = [];
  for (let at = frame; at !== null && at.above !== null; at = at.above) steps.push(at.step);
  return steps.length === 0 ? "" : `/${steps.reverse().join("/")}`;
}
function pointers(document, wanted) {
  const found = /* @__PURE__ */ new Map();
  const stack = [{ node: document, above: null, step: "" }];
  while (stack.length > 0 && found.size < wanted.size) {
    const frame = stack.pop();
    if (wanted.has(frame.node)) found.set(frame.node, pointerOf(frame));
    pushSlots(stack, frame);
  }
  return found;
}
function locateFindings(document, findings) {
  const { entries, nodes } = findings;
  if (entries.length === 0) return entries;
  const wanted = /* @__PURE__ */ new Set();
  for (const node of nodes) if (node !== null) wanted.add(node);
  const found = pointers(document, wanted);
  entries.forEach((entry, at) => {
    const node = nodes[at] ?? null;
    const path = node === null ? void 0 : found.get(node);
    entry.path = path ?? "";
    const pos = path === void 0 || node === null ? void 0 : node.pos;
    if (pos !== void 0) entry.range = { startOffset: pos.startOffset, endOffset: pos.endOffset };
  });
  return entries;
}

// ../carve-js/v2/src/parse-findings.ts
var UNCLOSED = 0;
var TITLE_SYNTAX = 1;
var DELIMITED_MALFORMED = 2;
var CURLY_QUOTES = "\u201C\u201D\u201E\u201F";
var DIV_WORDS = {
  admonition: "admonition",
  directive: "directive",
  figure_group: "figure group",
  block_quote: "quote fence",
  div: "div"
};
var MALFORMED = "This marked CSV/TSV fence has malformed quoting. It stays a table, and the cell with the unclosed quote holds the rest of the fence body.";
function onlySpaces(src, pos, end) {
  for (let p = pos; p < end; p++) {
    const code = src.charCodeAt(p);
    if (code === SPACE || code === TAB || code === LF) continue;
    if (code !== CR || src.charCodeAt(p + 1) !== LF) return false;
  }
  return true;
}
function lineOf(src, pos) {
  let line2 = 1;
  for (let p = src.indexOf("\n"); p >= 0 && p < pos; p = src.indexOf("\n", p + 1)) line2++;
  return line2;
}
function openerRun(src, start) {
  let p = start;
  while (p < src.length && src.charCodeAt(p) === src.charCodeAt(start)) p++;
  return src.slice(start, p);
}
function containerMessage(width, word) {
  const close = `Add a bare fence of ${width} colons to close it.`;
  if (word === null) return `This ${width}-colon container has no closer; add a bare fence of ${width} colons to close it.`;
  return `This ${width}-colon ${word} has no closer; it runs to the end of its container. ${close}`;
}
function unclosedMessage(src, note) {
  const block = note.block;
  const toEnd = onlySpaces(src, block.end, src.length);
  const run = openerRun(src, block.start);
  if (block.kind === CODE) {
    const ending = toEnd ? "it runs to the end of the document" : `it ends at the end of its container on line ${lineOf(src, block.end)}`;
    const message = `The ${run} fence opened here has no closing fence; ${ending}. `;
    return ["unclosed-code-fence", `${message}Add a closing ${run} where the code should stop.`];
  }
  if (block.kind === COMMENT_BLOCK) {
    const hidden = toEnd ? "the document" : "its container";
    const message = `The ${run} comment fence opened here has no closing fence and hides everything to the end of ${hidden}. `;
    return ["unclosed-comment-fence", `${message}Add a closing ${run} where the comment should stop.`];
  }
  if (block.kind === FRONTMATTER) {
    return ["unclosed-frontmatter", "The frontmatter opened on line 1 has no closing line, so the whole document is frontmatter."];
  }
  if (block.kind === LINE_BLOCK) return ["unclosed-container-fence", containerMessage(run.length, "line block")];
  const bare = block.kind === DIV && note.node.type === "div" && onlySpaces(src, block.start + run.length, lineFeedAt(src, block.start));
  return ["unclosed-container-fence", containerMessage(run.length, bare ? null : DIV_WORDS[note.node.type] ?? "div")];
}
function splitLabel(text) {
  const open = text.lastIndexOf(" [");
  if (!text.endsWith("]") || open < 0) return [text, ""];
  return [text.slice(0, open).trim(), text.slice(open)];
}
function titleMessage(src, note) {
  const block = note.block;
  const run = openerRun(src, block.start);
  const lineEnd = lineFeedAt(src, block.start);
  const line2 = src.slice(block.start + run.length, lineEnd).trim();
  const space = line2.search(/[ \t]/);
  const type = space < 0 ? line2 : line2.slice(0, space);
  const rest = note.from < 0 ? space < 0 ? "" : line2.slice(space).trim() : src.slice(note.from, lineEnd).trim();
  const [text, label] = note.from < 0 ? [rest, ""] : splitLabel(rest);
  if (CURLY_QUOTES.includes(text.charAt(0))) {
    const title = text.slice(1, CURLY_QUOTES.includes(text.charAt(text.length - 1)) ? -1 : void 0);
    return `The title after "${type}" uses typographic quotes - usually a CMS "smart quote" filter rewrote the source before Carve parsed it. A fence title needs straight double quotes: ${run} ${type} "${title}"${label}.`;
  }
  return `Text after the "${type}" fence type must be a quoted "title" or a [label]; unquoted it is not read as a title, and the block opens. Did you mean ${run} ${type} "${text}"${label}?`;
}
function addParseFindings(src, notes, findings) {
  const ordered = [...notes].sort((a, b) => a.block.start - b.block.start);
  for (const note of ordered) {
    if (note.what === UNCLOSED) {
      const [code, message] = unclosedMessage(src, note);
      addFinding(findings, note.node, { code, severity: "error", channel: "parse", message });
    } else if (note.what === TITLE_SYNTAX) {
      const message = titleMessage(src, note);
      addFinding(findings, note.node, { code: "fence-title-syntax", severity: "warning", channel: "parse", message });
    } else {
      addFinding(findings, note.node, { code: "delimited-table-malformed", severity: "error", channel: "parse", message: MALFORMED });
    }
  }
}

// ../carve-js/v2/src/ast-inline.ts
var FLOW_PLAIN = 0;
var FLOW_HARD_BREAKS = 1;
var FLOW_CELL = 2;
var FLOW_KIND_MASK = 3;
var FLOW_UNPLACED = 4;
function place(ctx, node, start, end) {
  if (ctx.positions) node.pos = { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0, startOffset: start, endOffset: end };
  return node;
}
function setAttributes(node, attributes2) {
  if (attributes2 === null) return;
  const attrs = {};
  if (attributes2.id !== null) attrs.id = attributes2.id;
  if (attributes2.classes.length > 0) attrs.classes = attributes2.classes;
  if (attributes2.keyValues.length > 0) attrs.keyValues = attributes2.keyValues;
  if (attrs.id !== void 0 || attrs.classes !== void 0 || attrs.keyValues !== void 0) node.attrs = attrs;
  if (attributes2.lang !== null) node.lang = attributes2.lang;
}
function commentValue(text, braced2) {
  let value = text.startsWith(" ") ? text.slice(1) : text;
  if (!braced2) {
    let end = value.length;
    while (end > 0 && (value[end - 1] === " " || value[end - 1] === "	")) end--;
    return value.slice(0, end);
  }
  if (value.endsWith(" ")) value = value.slice(0, -1);
  return value;
}
function referenceForm(node) {
  return (node.flags & FLAG_COLLAPSED) !== 0 ? "collapsed" : "full";
}
function imageNode(node) {
  if ((node.flags & FLAG_REFERENCE) !== 0) {
    return { type: "image", key: node.key ?? "", namespace: "link", form: referenceForm(node), alt: node.value };
  }
  const out = { type: "image", src: node.destination ?? "" };
  if (node.title !== null) out.tooltip = node.title;
  out.alt = node.value;
  return out;
}
function linkNode(node, children2) {
  if ((node.flags & FLAG_REFERENCE) !== 0) {
    return { type: "link", key: node.key ?? "", namespace: "link", form: referenceForm(node), children: children2 };
  }
  const href = node.destination ?? "";
  return node.title === null ? { type: "link", href, children: children2 } : { type: "link", href, tooltip: node.title, children: children2 };
}
var LEAVES = /* @__PURE__ */ new Map([
  [CODE_SPAN, (_ctx, node) => ({ type: "code", value: node.value })],
  [LITERAL, (_ctx, node) => ({ type: "literal_inline", value: node.value })],
  [EDITORIAL, (_ctx, node) => ({ type: "critic_comment", value: node.value })],
  [TAG, (_ctx, node) => ({ type: "tag", name: node.value })],
  [SYMBOL, (_ctx, node) => ({ type: "symbol", name: node.value })],
  [NBSP, () => ({ type: "non_breaking_space" })],
  [HARD_BREAK, () => ({ type: "hard_break" })],
  [MATH, (_ctx, node) => ({ type: "math", display: (node.flags & FLAG_DISPLAY) !== 0, value: node.value })],
  [RAW_INLINE, (ctx, node) => ({
    type: "raw_inline",
    format: ctx.src.slice(node.aux, ctx.src.indexOf("}", node.aux)),
    value: node.value
  })],
  [INLINE_COMMENT, (_ctx, node) => {
    const braced2 = (node.flags & FLAG_BRACED) !== 0;
    return { type: "comment", form: braced2 ? "braced" : "line", value: commentValue(node.value, braced2) };
  }],
  // C2-H-079: the destination of an email autolink is `mailto:` and the address; its text is the address.
  [AUTOLINK, (_ctx, node) => {
    const body2 = node.value;
    return (node.flags & FLAG_EMAIL) !== 0 ? { type: "autolink", href: `mailto:${body2}`, text: body2 } : { type: "autolink", href: body2 };
  }],
  [XREF, (_ctx, node) => ({ type: "xref", key: node.value, namespace: "heading" })],
  [MENTION, (_ctx, node) => ({ type: "mention", target: node.value, kind: "user" })],
  [FOOTNOTE_REF, (_ctx, node) => ({ type: "footnote_ref", key: foldLabel(node.value), namespace: "footnote" })],
  [SMART, (ctx, node) => ({
    type: "smart_punctuation",
    kind: SMART_KIND_NAMES[node.aux],
    glyph: SMART_GLYPHS[node.aux],
    source: ctx.src.slice(node.start, node.end)
  })],
  [IMAGE, (_ctx, node) => imageNode(node)]
]);
var PLAIN_PARENTS = /* @__PURE__ */ new Map([
  [EMPHASIS, "emphasis"],
  [STRONG, "strong"],
  [UNDERLINE, "underline"],
  [STRIKE, "strike"],
  [HIGHLIGHT, "highlight"],
  [SUPERSCRIPT, "superscript"],
  [SUBSCRIPT, "subscript"],
  [INSERT, "insert"],
  [DELETE, "delete"],
  [BRACKET_SPAN, "span"],
  [INLINE_FOOTNOTE, "inline_footnote"]
]);
function parentNode(ctx, node, children2) {
  if (node.kind === LINK) return linkNode(node, children2);
  if (node.kind === INLINE_EXTENSION) return { type: "inline_extension", name: ctx.src.slice(node.start + 1, node.aux), children: children2 };
  return { type: PLAIN_PARENTS.get(node.kind), children: children2 };
}
function addText(ctx, list3, value, start, end) {
  const last = list3.length > 0 ? list3[list3.length - 1] : null;
  if (last !== null && last.type === "text") {
    last.value += value;
    delete last.pos;
    return;
  }
  const node = { type: "text", value };
  list3.push(start < 0 ? node : place(ctx, node, start, end));
}
function addRun(ctx, list3, value, start, end) {
  const last = list3.length > 0 ? list3[list3.length - 1] : null;
  if (last === null || last.type !== "text") return addText(ctx, list3, value, start, end);
  last.value += value;
  if (start < 0) delete last.pos;
  else if (last.pos !== void 0) last.pos.endOffset = end;
}
function traceBreak(trace, text, fragment) {
  const breaks = trace.breaks.get(text);
  if (breaks === void 0) trace.breaks.set(text, [text.value.length, fragment]);
  else breaks.push(text.value.length, fragment);
}
function addBreak(ctx, list3, node, flow) {
  const kind = flow & FLOW_KIND_MASK;
  if (kind === FLOW_CELL) {
    addText(ctx, list3, " ", -1, -1);
    const text = list3[list3.length - 1];
    if (ctx.trace !== null && text?.type === "text") traceBreak(ctx.trace, text, node.end);
    return;
  }
  const out = kind === FLOW_HARD_BREAKS ? { type: "hard_break" } : { type: "soft_break" };
  list3.push((flow & FLOW_UNPLACED) !== 0 ? out : place(ctx, out, node.start, node.end));
}
function isResolvable(node) {
  if (node.attributes !== null && node.attributes.id !== null) return true;
  return node.kind === XREF || node.kind === FOOTNOTE_REF || node.kind === INLINE_FOOTNOTE || (node.flags & FLAG_REFERENCE) !== 0;
}
function addNode(ctx, list3, node, flow) {
  if (node.kind === SOFT_BREAK) return addBreak(ctx, list3, node, flow);
  if (!ctx.resolvable && isResolvable(node)) ctx.resolvable = true;
  const out = node.children !== null ? parentNode(ctx, node, node.children) : LEAVES.get(node.kind)(ctx, node);
  setAttributes(out, node.attributes);
  if (ctx.trace !== null) ctx.trace.inlines.set(out, node);
  list3.push((flow & FLOW_UNPLACED) !== 0 ? out : place(ctx, out, node.start, node.end));
}
function isPart(kind) {
  return kind === ATTRIBUTE_BLOCK || kind === DESTINATION || kind === TITLE || kind === LABEL;
}
function contentSource(src, spans, start, end) {
  const lines = [];
  for (let at = 0; at < spans.length; at += 2) {
    const from = Math.max(start, spans[at]);
    const to = Math.min(end, spans[at + 1]);
    if (from < to) lines.push(src.slice(from, to));
  }
  return lines.join("\n");
}
function destinationValue(value) {
  return value.includes("\\") ? value.replaceAll(/\\([()\\])/g, "$1") : value;
}
function closePart(ctx, spans, node, host) {
  const value = node.value;
  if (node.kind === LABEL) host.aux = node.end;
  if (node.kind === ATTRIBUTE_BLOCK) {
    host.attributes ??= emptyAttributes();
    readAttributeBlock(ctx.src, node.start, node.end, emptyMemo(), attributeSink(host.attributes));
  } else if (node.kind === DESTINATION) {
    host.destination = destinationValue(value);
  } else if (node.kind === TITLE) {
    host.title = unescape(value, 0, value.length);
  } else if ((host.flags & FLAG_COLLAPSED) !== 0) {
    host.key = foldLabel(contentSource(ctx.src, spans, host.start + (host.kind === IMAGE ? 2 : 1), node.start - 1));
  } else {
    host.key = foldLabel(value);
  }
}
function openFrame(kind, start, flags, aux) {
  return {
    kind,
    start,
    end: start,
    flags,
    aux,
    children: isInlineContainer(kind) ? [] : null,
    value: "",
    spanned: false,
    destination: null,
    title: null,
    key: null,
    attributes: null
  };
}
function runStart(flow, start) {
  return (flow & FLOW_UNPLACED) !== 0 ? -1 : start;
}
function closeFrame(ctx, spans, node, host, list3, flow) {
  if (node.kind === ESCAPE) addRun(ctx, list3, node.value, runStart(flow, node.start), node.end);
  else if (isPart(node.kind)) closePart(ctx, spans, node, host);
  else addNode(ctx, list3, node, flow);
}
function addSpan(ctx, root, top, start, end, flow) {
  const text = ctx.src.slice(start, end);
  if (top === null) return addRun(ctx, root, text, runStart(flow, start), end);
  if (top.children !== null) return addRun(ctx, top.children, text, runStart(flow, start), end);
  top.value = top.spanned ? `${top.value}
${text}` : text;
  top.spanned = true;
}
function buildFromEvents(ctx, spans, flow) {
  const { events, eventLength } = ctx.inline;
  const root = [];
  const open = [];
  let top = null;
  for (const event = new EventCursor(events, eventLength); event.more(); event.next()) {
    const type = event.type();
    if (type === ENTER) {
      top = openFrame(event.kind(), event.start(), event.flags(), event.aux());
      open.push(top);
    } else if (type === SPAN) {
      addSpan(ctx, root, top, event.start(), event.end(), flow);
    } else {
      const node = open.pop();
      node.end = event.end();
      top = open.length > 0 ? open[open.length - 1] : null;
      closeFrame(ctx, spans, node, top, top === null ? root : top.children, flow);
    }
  }
  return root;
}
function contentNodes(ctx, spans, from, to, lineComments, flow) {
  if (to - from === 2 && isPlainText(ctx.src, spans[from], spans[from + 1])) {
    const list3 = [];
    addText(ctx, list3, ctx.src.slice(spans[from], spans[from + 1]), runStart(flow, spans[from]), spans[from + 1]);
    return list3;
  }
  scanInline(ctx.inline, ctx.src, spans, from, to, ctx.depth, lineComments);
  return buildFromEvents(ctx, spans, flow);
}
function leafInlines(ctx, spans, flow) {
  ctx.resolvable = false;
  return contentNodes(ctx, spans, 0, spans.length, true, flow);
}
function lineInlines(ctx, spans, at) {
  ctx.resolvable = false;
  return contentNodes(ctx, spans, at, at + 2, false, FLOW_PLAIN);
}
function noteLeaf(ctx, leaf) {
  if (ctx.resolvable) ctx.resolvableLeaves.add(leaf);
  return leaf;
}

// ../carve-js/v2/src/ast-abbreviations.ts
function isFlowParent(node) {
  return isInlineParent(node);
}
var PASSES_THROUGH = NO_CHARACTER - 1;
function leadingCharacter(node, after2) {
  if (node.type === "text") return codePointAt(node.value, 0, node.value.length);
  if (node.type === "comment") return after2;
  if (!isFlowParent(node) || node.type === "inline_footnote") return NO_CHARACTER;
  return node.children.length > 0 ? firstCharacter(node.children, 0, NO_CHARACTER) : after2;
}
function firstCharacter(nodes, from, after2) {
  for (let at = from; at < nodes.length; at++) {
    const found = leadingCharacter(nodes[at], PASSES_THROUGH);
    if (found !== PASSES_THROUGH) return found;
  }
  return after2;
}
function followingCharacters(nodes, after2) {
  const following = new Int32Array(nodes.length);
  let next = after2;
  for (let at = nodes.length - 1; at >= 0; at--) {
    following[at] = next;
    next = leadingCharacter(nodes[at], next);
  }
  return following;
}
function lastCharacter(nodes, before2) {
  for (let at = nodes.length - 1; at >= 0; at--) {
    const node = nodes[at];
    if (node.type === "text") return codePointBefore(node.value, node.value.length);
    if (node.type === "comment") continue;
    if (!isFlowParent(node) || node.type === "inline_footnote") return NO_CHARACTER;
    if (node.children.length > 0) return lastCharacter(node.children, NO_CHARACTER);
  }
  return before2;
}
function wordEnd(value, at) {
  let end = at;
  while (end < value.length && isAsciiAlphanumeric(value.charCodeAt(end))) end++;
  return end;
}
function offsetOf(split, index) {
  if (split.start < 0) return -1;
  const { value } = split;
  const src = split.ctx.src;
  let at = split.seenOffset;
  for (let seen = split.seen; seen < index; seen++, at++) {
    if (src[at] === "\\" && src[at + 1] === value[seen]) at++;
  }
  split.seen = index;
  split.seenOffset = at;
  return at;
}
function addTerm(split, at, end, expansion) {
  const { ctx, value, parts } = split;
  if (at > split.done) addText(ctx, parts, value.slice(split.done, at), offsetOf(split, split.done), offsetOf(split, at));
  const term = { type: "abbreviation", key: value.slice(at, end), namespace: "abbr", expansion };
  const pos = split.node.pos;
  if (split.start >= 0 && pos !== void 0) term.pos = { ...pos, startOffset: offsetOf(split, at), endOffset: offsetOf(split, end) };
  parts.push(term);
  split.done = end;
}
function standsAlone(value, at, end, before2, after2) {
  const left = at === 0 ? before2 : codePointBefore(value, at);
  const right = end === value.length ? after2 : codePointAt(value, end, value.length);
  return !isWordCharacter(left) && !isWordCharacter(right);
}
function splitText(ctx, node, before2, after2) {
  const value = node.value;
  const start = node.pos?.startOffset ?? -1;
  const split = { ctx, node, value, start, parts: [], done: 0, seen: 0, seenOffset: start };
  for (let at = 0; at < value.length; ) {
    const end = wordEnd(value, at);
    const expansion = end === at ? void 0 : ctx.abbreviations.get(value.slice(at, end));
    if (expansion !== void 0 && standsAlone(value, at, end, before2, after2)) addTerm(split, at, end, expansion);
    at = Math.max(end, at + 1);
  }
  if (split.parts.length === 0) return null;
  if (split.done < value.length) addText(ctx, split.parts, value.slice(split.done), offsetOf(split, split.done), node.pos?.endOffset ?? -1);
  return split.parts;
}
function applyTo(ctx, nodes, before2, after2) {
  let out = null;
  let previous = before2;
  let following = null;
  for (let at = 0; at < nodes.length; at++) {
    const node = nodes[at];
    const next = () => (following ??= followingCharacters(nodes, after2))[at];
    let parts = null;
    if (node.type === "text") {
      parts = splitText(ctx, node, previous, next());
      previous = codePointBefore(node.value, node.value.length);
    } else if (node.type === "inline_footnote") {
      node.children = applyTo(ctx, node.children, NO_CHARACTER, NO_CHARACTER);
      previous = NO_CHARACTER;
    } else if (isFlowParent(node)) {
      node.children = applyTo(ctx, node.children, previous, next());
      previous = lastCharacter(node.children, previous);
    } else if (node.type !== "comment") {
      previous = NO_CHARACTER;
    }
    if (parts !== null) out ??= nodes.slice(0, at);
    if (out !== null) for (const part of parts ?? [node]) out.push(part);
  }
  return out ?? nodes;
}
function applyAbbreviations(ctx, nodes) {
  const result = applyTo(ctx, nodes, NO_CHARACTER, NO_CHARACTER);
  if (result === nodes) return;
  nodes.length = 0;
  for (const node of result) nodes.push(node);
}

// ../carve-js/v2/src/ast-lines.ts
function openerTitle(src, start, end) {
  return unescape(src, start, end);
}
function captionChildren(ctx, start, end) {
  return contentNodes(ctx, [start, end], 0, 2, false, FLOW_PLAIN);
}
function linkDefinitionFields(src, pos, end, key) {
  const start = skipSpaces2(src, pos, end);
  const p = definitionDestinationEnd(src, start, end);
  const out = { type: "link_reference_definition", key, namespace: "link", href: src.slice(start, p) };
  const quote3 = p + 1 < end ? src.charCodeAt(p + 1) : 0;
  if (quote3 !== QUOTE_MARK && quote3 !== APOSTROPHE) return out;
  const after2 = quotedEnd(src, p + 1, end, quote3);
  if (after2 >= 0) out.title = unescape(src, p + 2, after2 - 1);
  return out;
}
function includeNode(src, start, end) {
  const parts = readInclude(src, start, end);
  const out = { type: "include", path: parts.path };
  if (parts.section !== null) out.section = parts.section;
  if (parts.options.length > 0) out.options = parts.options;
  return out;
}

// ../carve-js/v2/src/ast-table.ts
var MAX_WIDTH = 100;
function emptyGroups() {
  return { head: [], body: [], foot: [], width: 0, ranges: /* @__PURE__ */ new Map(), trailing: [] };
}
function extend(groups, rows, start, end) {
  const range = groups.ranges.get(rows);
  if (range === void 0) groups.ranges.set(rows, [start, end]);
  else range[1] = end;
}
function alignmentOf(mark2) {
  if (mark2 === LESS) return "left";
  return mark2 === GREATER ? "right" : "center";
}
function coveredCell(span2) {
  return { type: "table_cell", header: false, span: span2, children: [] };
}
function cellAttributes(ctx, node) {
  if ((node.flags & FLAG_CELL_ATTRIBUTES) === 0) return null;
  const attributes2 = emptyAttributes();
  const start = node.start + (ctx.src.charCodeAt(node.start + 1) === EQUALS ? 2 : 1);
  readGluedBlocks(ctx.src, start, node.end, attributes2);
  return attributes2;
}
function cellNode(ctx, node, rowEnd) {
  const joined2 = node.spans.length > 2 || node.spans.length === 2 && node.spans[0] >= node.end || node.start >= rowEnd;
  const flow = joined2 ? FLOW_CELL | FLOW_UNPLACED : FLOW_PLAIN;
  const paragraph2 = noteLeaf(ctx, { type: "cell_paragraph", children: leafInlines(ctx, node.spans, flow) });
  const cell = { type: "table_cell", header: (node.flags & FLAG_HEADER) !== 0, children: [paragraph2] };
  if (node.facts > 1) cell.colspan = node.facts;
  if (node.rowFacts > 1) cell.rowspan = node.rowFacts;
  if (node.aux !== 0) cell.align = alignmentOf(node.aux);
  setAttributes(cell, cellAttributes(ctx, node));
  if (ctx.trace !== null) ctx.trace.blocks.set(cell, node);
  if (joined2) return cell;
  const spans = node.spans;
  if (spans.length === 2) place(ctx, paragraph2, spans[0], spans[1]);
  return place(ctx, cell, node.start + 1, node.end);
}
function rowCells(ctx, row, covered, rowEnd) {
  const cells = [];
  const takeCovered = () => {
    while (cells.length < covered.length && covered[cells.length] > 0) {
      covered[cells.length]--;
      cells.push(coveredCell("rowspan"));
    }
  };
  for (const node of row.children) {
    takeCovered();
    const cell = cellNode(ctx, node, rowEnd);
    const column = cells.length;
    cells.push(cell);
    for (let more = 1; more < (cell.colspan ?? 1); more++) cells.push(coveredCell("colspan"));
    covered[column] = (cell.rowspan ?? 1) - 1;
  }
  takeCovered();
  return cells;
}
function rowNode(ctx, row, covered) {
  const firstEnd = rowRangeEnd(ctx.src, row);
  const joined2 = firstEnd < row.end;
  const out = { type: "table_row", children: rowCells(ctx, row, covered, joined2 ? firstEnd : row.end + 1) };
  if (ctx.trace !== null) ctx.trace.blocks.set(out, row);
  if (row.aux !== 0) {
    const attributes2 = emptyAttributes();
    readGluedBlocks(ctx.src, row.aux, row.end, attributes2);
    setAttributes(out, attributes2);
  }
  return joined2 ? out : place(ctx, out, row.start, row.end);
}
function rowRangeEnd(src, row) {
  const lineEnd = src.indexOf("\n", row.start);
  return lineEnd >= 0 && lineEnd < row.end ? lineEnd : row.end;
}
function flushTrailing(groups, cursor, rowStart) {
  if (groups.trailing.length === 0) return;
  for (const pending of groups.trailing) cursor.group.push(pending);
  extend(groups, cursor.group, rowStart, cursor.trailingEnd);
  groups.trailing = [];
}
function addRow(ctx, groups, cursor, child) {
  flushTrailing(groups, cursor, child.start);
  if (cursor.index === cursor.headRows) cursor.covered = [];
  if (cursor.index < cursor.headRows) cursor.group = groups.head;
  else cursor.group = cursor.index < cursor.footStart ? groups.body : groups.foot;
  const row = rowNode(ctx, child, cursor.covered);
  groups.width = Math.max(groups.width, row.children.length);
  cursor.group.push(row);
  extend(groups, cursor.group, child.start, rowRangeEnd(ctx.src, child));
  cursor.index++;
}
function sortRows(ctx, node, comment2) {
  const headRows2 = node.facts;
  const rowCount = node.children.reduce((count, child) => count + (child.kind === COMMENT ? 0 : 1), 0);
  const groups = emptyGroups();
  const cursor = {
    headRows: headRows2,
    footStart: rowCount - node.rowFacts,
    index: 0,
    group: headRows2 > 0 ? groups.head : groups.body,
    covered: [],
    trailingEnd: 0
  };
  for (const child of node.children) {
    if (child.kind !== COMMENT) {
      addRow(ctx, groups, cursor, child);
      continue;
    }
    const out = comment2(ctx, child);
    if (ctx.trace !== null) ctx.trace.blocks.set(out, child);
    groups.trailing.push(out);
    cursor.trailingEnd = child.end;
  }
  return groups;
}
function columnWidth(entry) {
  let dots = 0;
  for (let at = 0; at < entry.length; at++) {
    const code = entry.charCodeAt(at);
    if (code === DOT) dots++;
    else if (code < DIGIT_0 || code > DIGIT_9) return void 0;
  }
  if (entry === "" || dots > 1 || entry.startsWith(".") || entry.endsWith(".")) return void 0;
  const percent = Number(entry);
  return percent > 0 && percent <= MAX_WIDTH ? percent / MAX_WIDTH : void 0;
}
function columnNodes(width, aligns, widths) {
  const alignList = aligns === null ? [] : aligns.split(",");
  const widthList = widths === null ? [] : widths.split(",");
  const columns = [];
  for (let at = 0; at < width; at++) {
    const column = { type: "table_column" };
    const align = trimSpaces(alignList[at] ?? "");
    const fraction = columnWidth(trimSpaces(widthList[at] ?? ""));
    if (isFieldValue("table_column.align", align)) column.align = align;
    if (fraction !== void 0) column.width = fraction;
    if (column.align !== void 0 || fraction !== void 0) column.authored = true;
    columns.push(column);
  }
  return columns;
}
function groupNode(ctx, groups, type, rows) {
  const range = groups.ranges.get(rows);
  const group = { type, children: rows };
  return range === void 0 ? group : place(ctx, group, range[0], range[1]);
}
function tableOf(ctx, groups, attributes2) {
  takeKey(attributes2, "footer-rows");
  takeKey(attributes2, "header-rows");
  const columns = columnNodes(groups.width, takeKey(attributes2, "aligns"), takeKey(attributes2, "widths"));
  const table3 = { type: "table", columns, children: [] };
  if (groups.head.length > 0) table3.children.push(groupNode(ctx, groups, "table_head", groups.head));
  if (groups.body.length > 0) table3.children.push(groupNode(ctx, groups, "table_body", groups.body));
  if (groups.foot.length > 0) table3.children.push(groupNode(ctx, groups, "table_foot", groups.foot));
  for (const pending of groups.trailing) table3.children.push(pending);
  setAttributes(table3, attributes2);
  return table3;
}
function tableNode(ctx, node, comment2) {
  return tableOf(ctx, sortRows(ctx, node, comment2), readAttributeLines(ctx.src, node.attributes));
}
function delimitedRow(cells, header) {
  return {
    type: "table_row",
    children: cells.map((value) => ({
      type: "table_cell",
      header,
      children: [{ type: "cell_paragraph", children: value === "" ? [] : [{ type: "text", value }] }]
    }))
  };
}
function delimitedTableNode(ctx, node) {
  const source = readDelimitedTable(ctx.src, node);
  const rows = source.rows;
  if (!ctx.inline.bidi) ctx.inline.bidi = holdsBidiControl(ctx.src, node.start, node.end);
  const attributes2 = readAttributeLines(ctx.src, node.attributes);
  takeKey(attributes2, "table");
  const allHeaders = source.headRows > rows.length;
  const head = allHeaders ? 0 : source.headRows;
  const footer = Math.min(Math.max(0, countValue(takeKey(attributes2, "footer-rows"))), Math.max(0, rows.length - head));
  const groups = emptyGroups();
  rows.forEach((cells, index) => {
    groups.width = Math.max(groups.width, cells.length);
    const group = index < head ? groups.head : index < rows.length - footer ? groups.body : groups.foot;
    group.push(delimitedRow(cells, allHeaders || index < head));
  });
  const table3 = tableOf(ctx, groups, attributes2);
  if (source.declared) {
    for (const group of table3.children) if (group.type === "table_body") group.headRows = source.headRows;
  }
  if (source.malformed) ctx.notes.push({ what: DELIMITED_MALFORMED, node: table3, block: node, from: 0 });
  return table3;
}

// ../carve-js/v2/src/positions.ts
var ASCII_END = 128;
var TWO_BYTES_END = 2048;
var HIGH_SURROGATE2 = 55296;
var LOW_SURROGATE_END = 57343;
var HIGH_SURROGATE_END = 56319;
var LOW_SURROGATE2 = 56320;
function isPairAt(text, at) {
  const code = text.charCodeAt(at);
  if (!(code >= HIGH_SURROGATE2 && code <= HIGH_SURROGATE_END)) return false;
  const next = text.charCodeAt(at + 1);
  return next >= LOW_SURROGATE2 && next <= LOW_SURROGATE_END;
}
function isSecondHalf(text, at) {
  const code = text.charCodeAt(at);
  return code >= LOW_SURROGATE2 && code <= LOW_SURROGATE_END && isPairAt(text, at - 1);
}
function unitBytes(text, at) {
  const code = text.charCodeAt(at);
  if (code < ASCII_END) return 1;
  if (code < TWO_BYTES_END) return 2;
  if (code < HIGH_SURROGATE2 || code > LOW_SURROGATE_END) return 3;
  return isPairAt(text, at) || isSecondHalf(text, at) ? 2 : 3;
}
function utf8Length(src) {
  let bytes = 0;
  for (let at = 0; at < src.length; at++) bytes += unitBytes(src, at);
  return bytes;
}
function stringOffsetOfByte(src, byte) {
  let bytes = 0;
  for (let at = 0; at < src.length; ) {
    const units = isPairAt(src, at) ? 2 : 1;
    const next = bytes + (units === 2 ? 4 : unitBytes(src, at));
    if (next > byte) return at;
    bytes = next;
    at += units;
  }
  return src.length;
}
function lineTable(src) {
  const table3 = { starts: [0], bytes: [0], ascii: [] };
  let bytes = 0;
  let ascii = true;
  for (let at = 0; at < src.length; at++) {
    const code = src.charCodeAt(at);
    bytes += unitBytes(src, at);
    if (code >= ASCII_END) ascii = false;
    if (code !== LF) continue;
    table3.ascii.push(ascii);
    table3.starts.push(at + 1);
    table3.bytes.push(bytes);
    ascii = true;
  }
  table3.ascii.push(ascii);
  return table3;
}
function lineOf2(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = low + high + 1 >> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
}
function seek(cursor, target2) {
  const table3 = cursor.table;
  const nextStart = cursor.line + 1 < table3.starts.length ? table3.starts[cursor.line + 1] : Infinity;
  if (target2 < cursor.offset || target2 >= nextStart) {
    cursor.line = lineOf2(table3.starts, target2);
    cursor.offset = table3.starts[cursor.line];
    cursor.bytes = table3.bytes[cursor.line];
    cursor.column = 1;
  }
  if (table3.ascii[cursor.line]) {
    cursor.bytes += target2 - cursor.offset;
    cursor.column += target2 - cursor.offset;
    cursor.offset = target2;
    return;
  }
  const src = cursor.src;
  if (cursor.offset === 0 && target2 > 0 && src.charCodeAt(0) === BYTE_ORDER_MARK) {
    cursor.bytes += unitBytes(src, 0);
    cursor.offset = 1;
  }
  while (cursor.offset < target2) {
    cursor.bytes += unitBytes(src, cursor.offset);
    if (!isPairAt(src, cursor.offset)) cursor.column++;
    cursor.offset++;
  }
}
function placeStart(cursor, pos) {
  seek(cursor, pos.startOffset);
  pos.startLine = cursor.line + 1;
  pos.startColumn = cursor.column;
  pos.startOffset = cursor.bytes;
}
function placeEnd(cursor, pos, end) {
  seek(cursor, end);
  pos.endLine = cursor.line + 1;
  pos.endColumn = cursor.column;
  pos.endOffset = cursor.bytes;
}
function placeNode(cursor, node) {
  const slots = node;
  const pos = node.pos;
  const end = pos === void 0 ? 0 : pos.endOffset;
  if (pos !== void 0) placeStart(cursor, pos);
  const title = titleOf(slots);
  if (title !== void 0) for (const child of title) placeNode(cursor, child);
  if (slots.children !== void 0) for (const child of slots.children) placeNode(cursor, child);
  if (slots.caption !== void 0) placeNode(cursor, slots.caption);
  if (pos !== void 0) placeEnd(cursor, pos, end);
}
function finishPositions(root, src) {
  placeNode({ src, table: lineTable(src), line: 0, offset: 0, bytes: 0, column: 1 }, root);
}

// ../carve-js/v2/src/tree-tables.ts
var DIV_KINDS = /* @__PURE__ */ new Map([
  ["bibliography", "directive"],
  ["danger", "admonition"],
  ["example", "admonition"],
  ["figure", "figure_group"],
  ["footnotes", "directive"],
  ["glossary", "directive"],
  ["index", "directive"],
  ["info", "admonition"],
  ["note", "admonition"],
  ["quote", "admonition"],
  ["references", "directive"],
  ["success", "admonition"],
  ["tip", "admonition"],
  ["toc", "directive"],
  ["warning", "admonition"]
]);
var HARD_BREAKS_CLASS = "hardbreaks";
var LINE_BLOCK_CLASS = "line-block";
var TASK_STATUS = /* @__PURE__ */ new Map([
  [" ", "todo"],
  ["!", "blocked"],
  ["-", "canceled"],
  ["/", "in-progress"],
  [">", "partial"],
  ["?", "other"],
  ["_", "todo"],
  ["x", "done"]
]);
var TASK_CHECKED = ["x"];
var TASK_NO_STATE = [" "];

// ../carve-js/v2/src/ast-blocks.ts
function isContiguous(src, spans) {
  for (let at = 2; at < spans.length; at += 2) {
    if (spans[at] !== spans[at - 1] + 1 || src.charCodeAt(spans[at - 1]) !== LF) return false;
  }
  return spans.length > 0;
}
function bodyValue(src, spans) {
  if (isContiguous(src, spans)) return `${src.slice(spans[0], spans[spans.length - 1])}
`;
  let value = "";
  for (let at = 0; at < spans.length; at += 2) value += `${src.slice(spans[at], spans[at + 1])}
`;
  return value;
}
function leafChildren(ctx, node, flow) {
  const children2 = leafInlines(ctx, node.spans, flow);
  if (ctx.abbreviations.size > 0) applyAbbreviations(ctx, children2);
  return children2;
}
function holdsOnly(children2, test) {
  let found = 0;
  for (const child of children2) {
    if (test(child)) found++;
    else if (child.type !== "comment" && child.type !== "soft_break" && child.type !== "hard_break") return false;
  }
  return found === 1;
}
function paragraphNode(ctx, node, flow) {
  const children2 = leafChildren(ctx, node, flow);
  const out = noteLeaf(ctx, { type: "paragraph", children: children2 });
  if ((node.exitFlags & FLAG_IMAGE) !== 0 && holdsOnly(children2, (child) => child.type === "image")) out.blockImage = true;
  if ((node.exitFlags & FLAG_BLOCK_MATH) !== 0 && holdsOnly(children2, (child) => child.type === "math" && child.display)) {
    out.blockMath = true;
  }
  return out;
}
function commentNode(ctx, node) {
  const out = { type: "comment", form: "line", value: commentValue(ctx.src.slice(node.spans[0] + 2, node.spans[1]), false) };
  return place(ctx, out, node.start, node.end);
}
function commentBlockNode(ctx, node) {
  const lines = [];
  const spans = node.spans;
  for (let at = 0; at < spans.length; at += 2) lines.push(ctx.src.slice(spans[at], spans[at + 1]));
  return { type: "comment", form: "block", value: lines.join("\n") };
}
function frontmatterNode(ctx, node) {
  const src = ctx.src;
  const word = src.charCodeAt(node.start + 3) === SPACE ? node.start + 4 : node.start + 3;
  let wordEnd2 = word;
  while (wordEnd2 < src.length && src.charCodeAt(wordEnd2) > SPACE) wordEnd2++;
  const format2 = wordEnd2 > word ? src.slice(word, wordEnd2) : "yaml";
  return { type: "frontmatter", format: format2, value: bodyValue(src, node.spans) };
}
function codeNode(ctx, node) {
  const src = ctx.src;
  if ((node.flags & FLAG_DELIMITED) !== 0) return delimitedTableNode(ctx, node);
  const info = readOpenerInfo(src, node.start + node.aux);
  const word = info.wordStart < 0 ? "" : src.slice(info.wordStart, info.wordEnd);
  const value = bodyValue(src, node.spans);
  if ((node.flags & FLAG_RAW) !== 0) {
    const raw = { type: "raw_block", format: word.slice(1), value };
    if (info.extra || info.titleStart >= 0 || info.labelStart >= 0) ctx.notes.push({ what: TITLE_SYNTAX, node: raw, block: node, from: -1 });
    return raw;
  }
  const out = { type: "code_block", value };
  if (info.extra) ctx.notes.push({ what: TITLE_SYNTAX, node: out, block: node, from: info.extraStart });
  if (word !== "") out.syntax = word;
  if (info.titleStart >= 0) out.title = [{ type: "text", value: openerTitle(src, info.titleStart, info.titleEnd) }];
  if (info.labelStart >= 0) out.groupLabel = src.slice(info.labelStart, info.labelEnd);
  return out;
}
function lineBlockNode(ctx, node) {
  const spans = node.spans;
  const lines = [];
  for (let at = 0; at < spans.length; at += 2) {
    const children2 = lineInlines(ctx, spans, at);
    if (ctx.abbreviations.size > 0) applyAbbreviations(ctx, children2);
    const line2 = noteLeaf(ctx, { type: "line", children: children2 });
    lines.push(place(ctx, line2, spans[at], spans[at + 1]));
  }
  return { type: "line_block", children: lines };
}
function abbreviationNode(ctx, node) {
  const [key, expansion] = abbreviationParts(ctx.src, node);
  return { type: "abbreviation_def", expansion, key, namespace: "abbr" };
}
function abbreviationParts(src, node) {
  const [start, end] = definitionLabel(src, node.start);
  return [src.slice(start, end), trimSpaces(src.slice(end + 2, node.spans[1]))];
}
function linkDefinitionNode(ctx, node) {
  const [start, end] = definitionLabel(ctx.src, node.start);
  return linkDefinitionFields(ctx.src, end + 2, node.spans[1], foldLabel(ctx.src.slice(start, end)));
}
var MAX_START_DIGITS = 9;
function startValue(value, style) {
  if (value === "" || value.length > MAX_START_DIGITS) return -1;
  for (let at = 0; at < value.length; at++) if (value.charCodeAt(at) < DIGIT_0 || value.charCodeAt(at) > DIGIT_9) return -1;
  const start = Number(value);
  return start === 0 && style !== "1" ? -1 : start;
}
function orderedMarker(node, attributes2) {
  const flags = node.flags;
  let style = (flags & FLAG_ROMAN) !== 0 ? "i" : (flags & FLAG_ALPHA) !== 0 ? "a" : "1";
  if ((flags & FLAG_UPPER) !== 0) style = style.toUpperCase();
  const marker = { kind: "ordered", style, delimiter: (flags & FLAG_PAREN) !== 0 ? ")" : "." };
  let start = (flags & FLAG_AUTO) === 0 ? node.aux : 1;
  const authored = attributes2?.keyValues.find((pair) => pair[0] === "start");
  const fromKey = authored === void 0 ? -1 : startValue(authored[1], style.toLowerCase());
  if (fromKey >= 0) {
    start = fromKey;
    takeKey(attributes2, "start");
  }
  if (start !== 1) marker.start = start;
  return marker;
}
function listNode(ctx, node, flow, attributes2) {
  const bullet = { kind: "bullet", char: (node.flags & FLAG_STAR) !== 0 ? "*" : "-" };
  return {
    type: "list",
    marker: node.kind === BULLET_LIST ? bullet : orderedMarker(node, attributes2),
    spacing: (node.exitFlags & FLAG_TIGHT) !== 0 ? "tight" : "loose",
    children: itemChildren(ctx, node.children, flow)
  };
}
function markerAttributes(ctx, node) {
  if ((node.flags & FLAG_MARKER_ATTRIBUTES) === 0) return null;
  const src = ctx.src;
  const end = lineFeedAt(src, node.start);
  const code = src.charCodeAt(node.start);
  const after2 = code === STAR || src[node.start] === "-" ? node.start + 1 : orderedDelimiter(src, node.start, end) + 1;
  const attributes2 = emptyAttributes();
  readGluedBlocks(src, after2, end, attributes2);
  return attributes2;
}
function itemNode(ctx, node, flow) {
  const out = { type: "list_item", children: blockChildren(ctx, node.children, flow) };
  if (node.aux !== 0) {
    const mark2 = String.fromCharCode(node.aux);
    out.task = { mark: mark2, status: TASK_STATUS.get(mark2) };
  }
  setAttributes(out, markerAttributes(ctx, node));
  return out;
}
function footnoteNode(ctx, node, flow) {
  const [start, end] = definitionLabel(ctx.src, node.start);
  const key = foldLabel(ctx.src.slice(start, end));
  const out = { type: "footnote", key, namespace: "footnote", children: blockChildren(ctx, node.children, flow) };
  ctx.footnoteBlocks.set(out, node);
  return out;
}
function divHead(ctx, info) {
  const head = {};
  if (info.titleStart >= 0) head.title = captionChildren(ctx, info.titleStart, info.titleEnd);
  if (info.labelStart >= 0) head.groupLabel = ctx.src.slice(info.labelStart, info.labelEnd);
  return head;
}
function namedDiv(ctx, node, flow, attributes2) {
  const src = ctx.src;
  const info = readOpenerInfo(src, node.start + node.aux);
  const name = info.wordStart < 0 ? "" : src.slice(info.wordStart, info.wordEnd);
  const kind = name === "figure" ? void 0 : DIV_KINDS.get(name);
  if (kind === void 0 && name !== "") attributes2.classes.unshift(name);
  const head = divHead(ctx, info);
  let out;
  if (kind === "admonition" && isFieldValue("admonition.kind", name)) {
    out = { type: "admonition", kind: name, ...head, children: blockChildren(ctx, node.children, flow) };
  } else if (kind === "directive" && isFieldValue("directive.kind", name)) {
    out = { type: "directive", kind: name, ...head, children: blockChildren(ctx, node.children, flow) };
  } else {
    const inner = attributes2.classes.includes(HARD_BREAKS_CLASS) ? FLOW_HARD_BREAKS : flow;
    out = { type: "div", ...head, children: blockChildren(ctx, node.children, inner) };
  }
  if (info.extra) ctx.notes.push({ what: TITLE_SYNTAX, node: out, block: node, from: info.extraStart });
  return out;
}
function divNode(ctx, node, flow, taken) {
  const attributes2 = taken ?? emptyAttributes();
  let out;
  if ((node.flags & FLAG_QUOTE_FENCE) !== 0) {
    out = { type: "block_quote", children: blockChildren(ctx, node.children, flow) };
  } else if ((node.flags & FLAG_FIGURE) !== 0) {
    out = { type: "figure_group", children: blockChildren(ctx, node.children, flow) };
  } else if ((node.flags & FLAG_HARD_BREAKS) !== 0) {
    attributes2.classes.push(HARD_BREAKS_CLASS);
    out = { type: "div", children: blockChildren(ctx, node.children, FLOW_HARD_BREAKS) };
  } else {
    out = namedDiv(ctx, node, flow, attributes2);
  }
  setAttributes(out, attributes2);
  return out;
}
function headingNode(ctx, node, flow) {
  const out = noteLeaf(ctx, { type: "heading", level: node.aux, children: leafChildren(ctx, node, flow) });
  ctx.headingSpans.set(out, node.spans);
  return out;
}
var BUILDERS = /* @__PURE__ */ new Map([
  [QUOTE, (ctx, node, flow) => ({ type: "block_quote", children: blockChildren(ctx, node.children, flow) })],
  [BULLET_LIST, listNode],
  [ORDERED_LIST, listNode],
  [DESCRIPTION_LIST, (ctx, node, flow) => ({ type: "definition_list", children: descriptionChildren(ctx, node.children, flow) })],
  [DIV, divNode],
  [TABLE, (ctx, node) => tableNode(ctx, node, commentNode)],
  [PARAGRAPH, paragraphNode],
  [CODE, codeNode],
  [COMMENT_BLOCK, commentBlockNode],
  [LINE_BLOCK, lineBlockNode],
  [HEADING, headingNode],
  [THEMATIC_BREAK, () => ({ type: "thematic_break" })],
  [COMMENT, commentNode],
  [INCLUDE, (ctx, node) => includeNode(ctx.src, node.spans[0], node.spans[1])]
]);
var DOCUMENT_BUILDERS = new Map([
  ...BUILDERS,
  [FOOTNOTE, footnoteNode],
  [FRONTMATTER, frontmatterNode],
  [LINK_DEFINITION, linkDefinitionNode],
  [ABBREVIATION, abbreviationNode]
]);
var DESCRIPTION_BUILDERS = /* @__PURE__ */ new Map([
  [TERM, (ctx, node, flow) => noteLeaf(ctx, { type: "definition_term", children: leafChildren(ctx, node, flow) })],
  [DESCRIPTION, (ctx, node, flow) => ({ type: "definition_description", children: blockChildren(ctx, node.children, flow) })],
  [COMMENT, commentNode]
]);
function readsOwnAttributes(node) {
  return node.kind === TABLE || node.kind === DIV || node.kind === CODE && (node.flags & FLAG_DELIMITED) !== 0;
}
function buildBlock(ctx, node, flow, attributes2, build) {
  const container2 = node.kind > DOCUMENT && node.kind <= DIV;
  if (container2) ctx.depth++;
  const out = build(ctx, node, flow, attributes2);
  if (container2) ctx.depth--;
  return out;
}
function placeBlock(ctx, out, node) {
  if (out.pos !== void 0) return out;
  const end = node.kind === INCLUDE ? trimEnd(ctx.src, node.start, node.end) : node.end;
  const first = node.attributes?.[0];
  if (first === void 0 || !ctx.positions) return place(ctx, out, node.start, end);
  ctx.markup.set(out, node.start);
  return place(ctx, out, first, end);
}
function blockNode(ctx, node, flow, build) {
  const own = readsOwnAttributes(node);
  const attributes2 = own && node.kind !== DIV ? null : readAttributeLines(ctx.src, node.attributes);
  const out = buildBlock(ctx, node, flow, attributes2, build);
  if (!own) setAttributes(out, attributes2);
  if ((node.exitFlags & FLAG_UNCLOSED) !== 0 && (node.kind === DIV || isOpaqueLeaf(node.kind))) {
    ctx.notes.push({ what: UNCLOSED, node: out, block: node, from: 0 });
  }
  if (ctx.trace !== null) ctx.trace.blocks.set(out, node);
  return placeBlock(ctx, out, node);
}
function captionNode(ctx, node, flow) {
  const placed = ctx.positions ? ctx : { ...ctx, positions: true };
  const paragraph2 = noteLeaf(placed, { type: "paragraph", children: leafChildren(placed, node, flow) });
  markCaptionNumber(ctx, paragraph2.children);
  if (!ctx.positions) dropPositions(paragraph2.children);
  place(ctx, paragraph2, node.spans[0], node.end);
  const out = { type: "caption", children: [paragraph2] };
  if (ctx.trace !== null) ctx.trace.blocks.set(out, node);
  return place(ctx, out, node.start, node.end);
}
function dropPositions(nodes) {
  for (const node of nodes) {
    delete node.pos;
    if ("children" in node) dropPositions(node.children);
  }
}
function numberMarkIndex(src, start, value) {
  let at = start;
  for (let index = 0; index < value.length; index++, at++) {
    const escaped2 = src[at] === "\\" && src[at + 1] === value[index];
    if (escaped2) at++;
    if (escaped2 || value[index] !== "#") continue;
    if (index + 1 === value.length || !isAsciiNameCharacter(value.charCodeAt(index + 1))) return index;
  }
  return -1;
}
function markCaptionNumber(ctx, children2) {
  for (let at = 0; at < children2.length; at++) {
    const child = children2[at];
    if (child.type !== "text") continue;
    const value = child.value;
    const start = child.pos?.startOffset ?? -1;
    const index = start < 0 ? -1 : numberMarkIndex(ctx.src, start, value);
    if (index < 0) continue;
    const parts = [];
    if (index > 0) addText(ctx, parts, value.slice(0, index), -1, -1);
    parts.push({ type: "caption_number" });
    if (index + 1 < value.length) addText(ctx, parts, value.slice(index + 1), -1, -1);
    children2.splice(at, 1, ...parts);
    return;
  }
}
function captionHost(target2, comments, caption2) {
  for (const comment2 of comments) target2.children.push(comment2);
  target2.caption = caption2;
  if (target2.pos !== void 0 && caption2.pos !== void 0) target2.pos.endOffset = caption2.pos.endOffset;
}
var DOCUMENT_ONLY = ["footnote", "link_reference_definition", "abbreviation_def", "citation_definition", "frontmatter"];
function isBlock(node) {
  return !DOCUMENT_ONLY.includes(node.type);
}
function attachCaption(ctx, list3, caption2) {
  let at = list3.length - 1;
  while (at >= 0 && list3[at].type === "comment") at--;
  const target2 = list3[at];
  if (target2 === void 0 || !isBlock(target2)) return;
  const comments = [];
  for (const node of list3.splice(at + 1)) if (node.type === "comment") comments.push(node);
  if (target2.type === "table" || target2.type === "figure_group") return captionHost(target2, comments, caption2);
  list3[at] = figureOf(ctx, target2, comments, caption2);
}
function figureOf(ctx, target2, comments, caption2) {
  const figure2 = { type: "figure", children: [target2, ...comments], caption: caption2 };
  if (target2.attrs !== void 0) figure2.attrs = target2.attrs;
  if (target2.lang !== void 0) figure2.lang = target2.lang;
  delete target2.attrs;
  delete target2.lang;
  if (target2.pos !== void 0 && caption2.pos !== void 0) {
    figure2.pos = { ...target2.pos, endOffset: caption2.pos.endOffset };
    target2.pos.startOffset = ctx.markup.get(target2) ?? target2.pos.startOffset;
  }
  return figure2;
}
function buildChildren(ctx, nodes, flow, builders) {
  const list3 = [];
  for (const node of nodes) {
    if (node.kind === CAPTION) attachCaption(ctx, list3, captionNode(ctx, node, flow));
    else list3.push(blockNode(ctx, node, flow, builders.get(node.kind)));
  }
  return list3;
}
function blockChildren(ctx, nodes, flow) {
  return buildChildren(ctx, nodes, flow, BUILDERS);
}
function itemChildren(ctx, nodes, flow) {
  return nodes.map((node) => blockNode(ctx, node, flow, itemNode));
}
function descriptionChildren(ctx, nodes, flow) {
  return nodes.map((node) => blockNode(ctx, node, flow, DESCRIPTION_BUILDERS.get(node.kind)));
}
function collectAbbreviations(src, root) {
  const terms = /* @__PURE__ */ new Map();
  for (const child of root.children) {
    if (child.kind !== ABBREVIATION) continue;
    const [key, expansion] = abbreviationParts(src, child);
    if (!terms.has(key)) terms.set(key, expansion);
  }
  return terms;
}
function lineCount(src, start, end) {
  let count = 1;
  for (let p = src.indexOf("\n", start); p >= 0 && p < end; p = src.indexOf("\n", p + 1)) count++;
  return count;
}
function headingSource(src, spans) {
  if (spans === void 0) return void 0;
  const lines = [];
  for (let at = 0; at < spans.length; at += 2) lines.push(src.slice(spans[at], spans[at + 1]));
  return foldLabel(lines.join("\n"));
}
function buildDocument(ctx, root, source) {
  const src = ctx.src;
  const children2 = buildChildren(ctx, root.children, FLOW_PLAIN, DOCUMENT_BUILDERS);
  const document = { type: "document", astVersion: AST_VERSION, children: children2 };
  if (ctx.positions) {
    document.srcByteLength = utf8Length(source);
    finishPositions(document, source);
  }
  const facts = {
    headingSource: (heading2) => headingSource(src, ctx.headingSpans.get(heading2)),
    resolvableLeaves: ctx.resolvableLeaves,
    bidi: ctx.inline.bidi,
    addFindings: (findings) => addParseFindings(src, ctx.notes, findings),
    footnoteLines: (node) => {
      const block = ctx.footnoteBlocks.get(node);
      return block === void 0 ? 0 : lineCount(src, block.start, block.end);
    }
  };
  return { document, facts };
}
function buildSource(src, positions, abbreviations = null, trace = null) {
  const text = src.includes("\0") ? src.replaceAll("\0", "\uFFFD") : src;
  const blocks = acquireState();
  const inline = acquireInlineState();
  inline.bidi = false;
  try {
    scanBlocks(blocks, text);
    const root = buildTree(blocks.events, blocks.eventLength);
    const ctx = {
      src: text,
      positions,
      inline,
      depth: 0,
      abbreviations: abbreviations ?? collectAbbreviations(text, root),
      markup: /* @__PURE__ */ new Map(),
      headingSpans: /* @__PURE__ */ new Map(),
      resolvable: false,
      resolvableLeaves: /* @__PURE__ */ new Set(),
      trace,
      notes: [],
      footnoteBlocks: /* @__PURE__ */ new Map()
    };
    return buildDocument(ctx, root, src);
  } finally {
    releaseInlineState(inline);
    releaseState(blocks);
  }
}

// ../carve-js/v2/src/ast-validate.ts
var CarveTreeError = class extends Error {
  path;
  reason;
  constructor(path, reason) {
    super(`${path === "" ? "/" : path}: ${reason}`);
    this.name = "CarveTreeError";
    this.path = path;
    this.reason = reason;
  }
};
var MAX_TREE_DEPTH = 2 * MAX_DEPTH + 16;
var BLOCKS = [
  "admonition",
  "block_extension",
  "block_quote",
  "code_block",
  "comment",
  "definition_list",
  "directive",
  "div",
  "figure",
  "figure_group",
  "heading",
  "include",
  "line_block",
  "list",
  "paragraph",
  "raw_block",
  "section",
  "table",
  "thematic_break"
];
var INLINES = [
  "abbreviation",
  "autolink",
  "caption_number",
  "citation_group",
  "code",
  "comment",
  "critic_comment",
  "delete",
  "emphasis",
  "footnote_ref",
  "hard_break",
  "highlight",
  "image",
  "inline_extension",
  "inline_footnote",
  "insert",
  "link",
  "literal_inline",
  "math",
  "mention",
  "non_breaking_space",
  "raw_inline",
  "ruby",
  "small_caps",
  "smart_punctuation",
  "soft_break",
  "span",
  "strike",
  "strong",
  "subscript",
  "superscript",
  "symbol",
  "tag",
  "text",
  "underline",
  "xref"
];
var TABLE_GROUPS = ["table_head", "table_body", "table_foot"];
var COMMON = ["type", "attrs", "data", "pos", "segments", "metadata", "dir", "lang"];
var REFERENCE = ["key", "namespace"];
var EXTENSION = ["version", "props", "slots", "payload", "resourceIds"];
var RULES = /* @__PURE__ */ new Map([
  ["abbreviation", ["none", REFERENCE, ["expansion"]]],
  ["abbreviation_def", ["none", ["expansion", ...REFERENCE], []]],
  ["admonition", ["blocks", ["kind"], ["title", "groupLabel"]]],
  ["autolink", ["none", ["href"], ["text"]]],
  ["block_extension", ["blocks", ["name", "fallback"], EXTENSION]],
  ["block_quote", ["blocks", [], []]],
  ["caption", ["blocks", [], ["short"]]],
  ["caption_number", ["none", [], ["n"]]],
  ["cell_paragraph", ["inlines", [], ["blockImage"]]],
  ["citation", [
    "none",
    ["key", "suppressAuthor", "namespace"],
    ["prefix", "locator", "locatorLabel", "locatorValue", "suffix", "mode", "number", "useIndex"]
  ]],
  ["citation_definition", ["inlines", REFERENCE, []]],
  ["citation_group", [["citation"], ["raw"], ["mode"]]],
  ["code", ["none", ["value"], []]],
  ["code_block", ["none", ["value"], ["syntax", "title", "groupLabel"]]],
  ["comment", ["none", ["form", "value"], []]],
  ["critic_comment", ["none", ["value"], []]],
  ["definition_description", ["blocks", [], []]],
  ["definition_list", [["definition_term", "definition_description", "comment"], [], []]],
  ["definition_term", ["inlines", [], []]],
  ["delete", ["inlines", [], []]],
  ["directive", ["blocks", ["kind"], ["title", "groupLabel", "tocTarget"]]],
  ["div", ["blocks", [], ["title", "groupLabel"]]],
  ["document", [
    [...BLOCKS, "footnote", "link_reference_definition", "abbreviation_def", "citation_definition", "frontmatter"],
    ["astVersion"],
    ["srcByteLength", "extensions", "stages", "resources"]
  ]],
  ["emphasis", ["inlines", [], []]],
  ["figure", ["blocks", [], ["caption", "kind"]]],
  ["figure_group", ["blocks", [], ["caption"]]],
  ["footnote", ["blocks", REFERENCE, []]],
  ["footnote_ref", ["none", REFERENCE, ["number"]]],
  ["frontmatter", ["none", ["format", "value"], []]],
  ["hard_break", ["none", [], []]],
  ["heading", ["inlines", ["level"], ["generatedId"]]],
  ["highlight", ["inlines", [], []]],
  ["image", ["none", [], ["src", "alt", "decorative", "tooltip", "targetKind", "key", "namespace", "resourceId", "form"]]],
  ["include", ["none", ["path"], ["section", "options"]]],
  ["inline_extension", ["inlines", ["name"], [...EXTENSION, "fallback"]]],
  ["inline_footnote", ["inlines", [], ["number"]]],
  ["insert", ["inlines", [], []]],
  ["line", ["inlines", [], []]],
  ["line_block", [["line"], [], []]],
  ["link", ["inlines", [], ["href", "tooltip", "targetKind", "key", "namespace", "form"]]],
  ["link_reference_definition", ["none", ["href", ...REFERENCE], ["title"]]],
  ["list", [["list_item"], ["marker", "spacing"], []]],
  ["list_item", ["blocks", [], ["task"]]],
  ["literal_inline", ["none", ["value"], []]],
  ["math", ["none", ["display", "value"], ["number", "numberPrefix"]]],
  ["mention", ["none", ["target", "kind"], ["label"]]],
  ["non_breaking_space", ["none", [], []]],
  ["paragraph", ["inlines", [], ["blockImage", "blockMath"]]],
  ["raw_block", ["none", ["format", "value"], []]],
  ["raw_inline", ["none", ["format", "value"], []]],
  ["ruby", ["none", ["pairs"], []]],
  ["section", ["blocks", [], ["level"]]],
  ["small_caps", ["inlines", [], []]],
  ["smart_punctuation", ["none", ["kind", "source"], ["glyph"]]],
  ["soft_break", ["none", [], []]],
  ["span", ["inlines", [], []]],
  ["strike", ["inlines", [], []]],
  ["strong", ["inlines", [], []]],
  ["subscript", ["inlines", [], []]],
  ["superscript", ["inlines", [], []]],
  ["symbol", ["none", ["name"], []]],
  ["table", [[...TABLE_GROUPS, "comment"], ["columns"], ["caption"]]],
  ["table_body", [["table_row", "comment"], [], ["headRows", "rowHeadColumns"]]],
  ["table_cell", [[...BLOCKS, "cell_paragraph"], ["header"], ["span", "colspan", "rowspan", "align", "valign"]]],
  ["table_column", ["none", [], ["align", "valign", "width", "resolvedAlign", "authored"]]],
  ["table_foot", [["table_row", "comment"], [], []]],
  ["table_head", [["table_row", "comment"], [], []]],
  ["table_row", [["table_cell"], [], []]],
  ["tag", ["none", ["name"], []]],
  ["text", ["none", ["value"], []]],
  ["thematic_break", ["none", [], []]],
  ["underline", ["inlines", [], []]],
  ["xref", ["none", REFERENCE, ["href", "form"]]]
]);
var STRINGS = [
  "key",
  "namespace",
  "expansion",
  "kind",
  "groupLabel",
  "href",
  "text",
  "name",
  "version",
  "raw",
  "syntax",
  "form",
  "tocTarget",
  "generatedId",
  "src",
  "alt",
  "tooltip",
  "targetKind",
  "resourceId",
  "path",
  "section",
  "spacing",
  "numberPrefix",
  "target",
  "label",
  "format",
  "glyph",
  "source",
  "span",
  "align",
  "valign",
  "resolvedAlign",
  "mode",
  "locatorLabel",
  "locatorValue",
  "value",
  "astVersion",
  "lang"
];
var INTEGERS = ["n", "number", "level", "headRows", "rowHeadColumns", "colspan", "rowspan", "srcByteLength"];
var BOOLEANS = ["display", "header", "decorative", "suppressAuthor", "useIndex"];
var TRUE_ONLY = ["blockImage", "blockMath", "authored"];
var INLINE_SLOTS = ["short", "prefix", "locator", "suffix"];
var POSITION_FIELDS = ["startLine", "endLine", "startColumn", "endColumn", "startOffset", "endOffset"];
var ENUMS = /* @__PURE__ */ new Map([
  ["*.dir", ["ltr", "rtl", "auto"]],
  ["comment.form", ["block", "line", "braced"]],
  ["link.form", ["full", "collapsed"]],
  ["image.form", ["full", "collapsed"]],
  ["xref.form", ["number", "page", "title", "full"]],
  ["list.spacing", ["tight", "loose"]],
  ["table_cell.span", ["rowspan", "colspan"]],
  ["table_cell.align", ["left", "right", "center"]],
  ["table_column.align", ["left", "right", "center"]],
  ["table_column.resolvedAlign", ["left", "right", "center"]],
  ["link.targetKind", ["url", "wiki", "doc", "xref"]],
  ["image.targetKind", ["url", "wiki", "doc", "xref"]],
  ["directive.tocTarget", ["headings", "figures", "tables", "listings"]],
  ["directive.kind", ["bibliography", "footnotes", "glossary", "index", "references", "toc"]],
  ["figure.kind", ["image", "table", "listing", "equation", "other"]],
  ["admonition.kind", ["note", "tip", "warning", "danger", "info", "success", "example", "quote"]],
  ["*.namespace", ["link", "footnote", "citation", "abbr", "heading"]],
  // C2-A-077 to C2-A-079, C2-A-103, C2-A-117, C2-A-121: the namespace of each reference and definition.
  ["link.namespace", ["link"]],
  ["image.namespace", ["link"]],
  ["link_reference_definition.namespace", ["link"]],
  ["footnote_ref.namespace", ["footnote"]],
  ["footnote.namespace", ["footnote"]],
  ["abbreviation.namespace", ["abbr"]],
  ["abbreviation_def.namespace", ["abbr"]],
  ["citation.namespace", ["citation"]],
  ["citation_definition.namespace", ["citation"]]
]);
var STAGES = ["referenceResolution", "tableAlignment"];
var ORDERED_STYLES = ["1", "a", "A", "i", "I"];
function fail(path, reason) {
  throw new CarveTreeError(path, reason);
}
function requireString(value, path) {
  return typeof value === "string" ? value : fail(path, "not a string");
}
function requireArray(value, path) {
  return Array.isArray(value) ? value : fail(path, "not a list");
}
function isPair(value) {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "string";
}
function checkPairs(value, path) {
  requireArray(value, path).forEach((pair, index) => {
    if (!isPair(pair)) fail(`${path}/${index}`, "not a pair of two strings");
  });
}
function checkAttrs(value, path) {
  if (!isRecord(value)) fail(path, "attrs is not an object");
  for (const name of Object.keys(value)) {
    if (name !== "id" && name !== "classes" && name !== "keyValues") fail(`${path}/${name}`, "unknown field of attrs");
  }
  if (value["id"] !== void 0) requireString(value["id"], `${path}/id`);
  if (value["classes"] !== void 0) {
    requireArray(value["classes"], `${path}/classes`).forEach((name, index) => requireString(name, `${path}/classes/${index}`));
  }
  if (value["keyValues"] === void 0) return;
  checkPairs(value["keyValues"], `${path}/keyValues`);
  for (const [key] of value["keyValues"]) {
    const name = key.toLowerCase();
    if (name === "id" || name === "class") fail(`${path}/keyValues`, `the key ${key} folds into the id or the classes`);
  }
}
function checkPosition(value, path) {
  if (!isRecord(value)) fail(path, "pos is not an object");
  for (const name of POSITION_FIELDS) {
    if (!Number.isInteger(value[name])) fail(`${path}/${name}`, "not an integer");
  }
  for (const name of Object.keys(value)) {
    if (!POSITION_FIELDS.includes(name) && name !== "file") fail(`${path}/${name}`, "unknown field of pos");
  }
  if (value["startOffset"] > value["endOffset"]) fail(path, "the start lies behind the end");
}
function checkMarker(value, path) {
  if (!isRecord(value)) fail(path, "marker is not an object");
  const ordered = value["kind"] === "ordered";
  if (!ordered && value["kind"] !== "bullet") fail(`${path}/kind`, "neither bullet nor ordered");
  const allowed = ordered ? ["kind", "style", "delimiter", "start"] : ["kind", "char"];
  for (const name of Object.keys(value)) {
    if (!allowed.includes(name)) fail(`${path}/${name}`, "a field of the other kind of marker");
  }
  if (ordered) checkOrderedMarker(value, path);
  else if (value["char"] !== "-" && value["char"] !== "*") fail(`${path}/char`, "not a bullet character");
}
function checkOrderedMarker(value, path) {
  if (value["style"] !== void 0 && !ORDERED_STYLES.includes(value["style"])) fail(`${path}/style`, "unknown style");
  const delimiter = value["delimiter"];
  if (delimiter !== void 0 && delimiter !== "." && delimiter !== ")") fail(`${path}/delimiter`, "unknown delimiter");
  if (value["start"] !== void 0 && !Number.isInteger(value["start"])) fail(`${path}/start`, "not an integer");
}
function checkTask(value, path) {
  if (!isRecord(value)) fail(path, "task is not an object");
  const status = TASK_STATUS.get(value["mark"]);
  if (status === void 0) fail(`${path}/mark`, "unknown task mark");
  if (value["status"] !== status) fail(`${path}/status`, "the status does not follow from the mark");
}
function checkEnum(type, name, value, path) {
  const values = ENUMS.get(`${type}.${name}`) ?? ENUMS.get(`*.${name}`);
  if (values !== void 0 && !values.includes(value)) fail(path, `unknown value ${JSON.stringify(value)}`);
}
function isWidth(value) {
  return typeof value === "number" && value > 0 && value <= 1;
}
function checkScalar(type, name, value, path) {
  if (name === "width") return isWidth(value) || fail(path, "not a fraction above 0 and at most 1");
  if (TRUE_ONLY.includes(name)) return value === true || fail(path, "not true");
  if (BOOLEANS.includes(name)) return typeof value === "boolean" || fail(path, "not a boolean");
  if (INTEGERS.includes(name)) return Number.isInteger(value) && value >= 0 || fail(path, "not a count");
  if (!STRINGS.includes(name) && name !== "dir") return false;
  requireString(value, path);
  checkEnum(type, name, value, path);
  return true;
}
function nodeList(content) {
  return (value, path, walk) => checkList(value, path, content, walk);
}
function checkTitle(value, path, walk, node) {
  if (node["type"] === "link_reference_definition") requireString(value, path);
  else checkList(value, path, "inlines", walk);
}
function checkStages(value, path) {
  requireArray(value, path).forEach((stage, index) => {
    if (!STAGES.includes(stage)) fail(`${path}/${index}`, "unknown stage");
  });
}
var RUBY_PAIR_FIELDS = ["type", "base", "annotation"];
function checkPairsOfRuby(value, path, walk) {
  requireArray(value, path).forEach((pair, index) => {
    if (!isRecord(pair) || pair["type"] !== "rubyPair") fail(`${path}/${index}`, "not a rubyPair");
    for (const name of Object.keys(pair)) if (!RUBY_PAIR_FIELDS.includes(name)) fail(`${path}/${index}/${name}`, "not a field of rubyPair");
    checkList(pair["base"], `${path}/${index}/base`, "inlines", walk);
    checkList(pair["annotation"], `${path}/${index}/annotation`, "inlines", walk);
  });
}
function checkSlots(value, path, walk, node) {
  if (!isRecord(value)) fail(path, "slots is not an object");
  const content = node["type"] === "block_extension" ? "blocks" : "inlines";
  for (const [name, slot] of Object.entries(value)) checkList(slot, `${path}/${pointerKey(name)}`, content, walk);
}
function checkPayload(value, path) {
  requireArray(value, path).forEach((entry, index) => {
    const at = `${path}/${index}`;
    if (!isRecord(entry)) fail(at, "not a payload alternative");
    for (const name of Object.keys(entry)) {
      if (name !== "format" && name !== "value") fail(`${at}/${name}`, "not a field of a payload alternative");
    }
    if (requireString(entry["format"], `${at}/format`) === "") fail(`${at}/format`, "an empty media type");
    if (entry["value"] === null) fail(`${at}/value`, "a field without a value");
  });
}
function addReference(id, path, walk) {
  walk.tree.references.push([requireString(id, path), path]);
}
function checkResources(value, path) {
  const seen = /* @__PURE__ */ new Set();
  requireArray(value, path).forEach((entry, index) => {
    if (!isRecord(entry)) fail(`${path}/${index}`, "not a resource");
    const id = requireString(entry["id"], `${path}/${index}/id`);
    requireString(entry["mediaType"], `${path}/${index}/mediaType`);
    const digest = requireString(entry["digest"], `${path}/${index}/digest`);
    if (!/^sha256:[0-9a-f]{64}$/.test(digest)) fail(`${path}/${index}/digest`, "not a sha256 digest");
    if (seen.has(id)) fail(`${path}/${index}/id`, "a duplicate resource id");
    seen.add(id);
  });
}
function checkExtensions(value, path) {
  requireArray(value, path).forEach((entry, index) => {
    if (!isRecord(entry)) fail(`${path}/${index}`, "not an extension declaration");
    requireString(entry["name"], `${path}/${index}/name`);
    if (typeof entry["required"] !== "boolean") fail(`${path}/${index}/required`, "not a boolean");
    if (entry["required"] === true) fail(`${path}/${index}`, "an unknown required extension");
  });
}
function checkObject(value, path) {
  if (!isRecord(value)) fail(path, "not an object");
}
var FIELD_CHECKS = /* @__PURE__ */ new Map([
  ["attrs", checkAttrs],
  ["pos", checkPosition],
  ["segments", (value, path) => requireArray(value, path).forEach((range, index) => checkPosition(range, `${path}/${index}`))],
  ["data", checkObject],
  ["metadata", checkObject],
  ["props", checkObject],
  ["marker", checkMarker],
  ["task", checkTask],
  ["options", checkPairs],
  ["title", checkTitle],
  ["caption", (value, path, walk) => checkNode(value, path, ["caption"], walk)],
  ["fallback", (value, path, walk, node) => {
    const inner = { ...walk, fallbacks: walk.fallbacks + 1 };
    checkList(value, path, node["type"] === "block_extension" ? "blocks" : "inlines", inner);
  }],
  ["columns", nodeList(["table_column"])],
  ["pairs", checkPairsOfRuby],
  ["slots", checkSlots],
  ["stages", checkStages],
  ["resources", checkResources],
  ["extensions", checkExtensions],
  ["payload", checkPayload],
  ["resourceIds", (value, path, walk) => requireArray(value, path).forEach((id, index) => addReference(id, `${path}/${index}`, walk))]
]);
for (const name of INLINE_SLOTS) FIELD_CHECKS.set(name, nodeList("inlines"));
function allowedTypes(content) {
  if (content === "blocks") return BLOCKS;
  return content === "inlines" ? INLINES : content === "none" ? [] : content;
}
function checkList(value, path, content, walk) {
  const allowed = allowedTypes(content);
  const inner = { ...walk, depth: walk.depth + 1 };
  requireArray(value, path).forEach((child, index) => checkNode(child, `${path}/${index}`, allowed, inner));
}
function checkDependencies(node, type, path) {
  if (type === "link" || type === "image") {
    const present = ["key", "namespace", "form"].filter((name) => node[name] !== void 0).length;
    if (present !== 0 && present !== 3) fail(path, "key, namespace and form stand together or not at all");
  }
  if (type === "citation_group" && node["mode"] !== void 0) {
    const items = node["children"];
    if (items.some((item) => item["mode"] === void 0)) fail(path, "a group mode needs a mode on every citation");
  }
}
function checkField(node, type, rule, name, path, walk) {
  const [, required, optional] = rule;
  const value = node[name];
  const at = `${path}/${name}`;
  if (!COMMON.includes(name) && !required.includes(name) && !optional.includes(name)) fail(at, `not a field of ${type}`);
  if (value === null || value === void 0) fail(at, "a field without a value");
  if (!checkScalar(type, name, value, at)) FIELD_CHECKS.get(name)?.(value, at, walk, node);
  if (name === "resourceId") addReference(value, at, walk);
}
function checkFields(node, type, rule, path, walk) {
  const [content, required] = rule;
  for (const name of required) if (node[name] === void 0) fail(`${path}/${name}`, "a required field is missing");
  for (const name of Object.keys(node)) if (name !== "type" && name !== "children") checkField(node, type, rule, name, path, walk);
  if (content !== "none") checkList(node["children"], `${path}/children`, content, walk);
  else if (node["children"] !== void 0) fail(`${path}/children`, `${type} holds no children`);
}
function checkNode(value, path, allowed, walk) {
  if (walk.depth > MAX_TREE_DEPTH) fail(path, "the tree is nested deeper than a parser can produce");
  if (!isRecord(value)) fail(path, "not a node");
  const type = value["type"];
  if (typeof type !== "string") fail(path, "a node without a type");
  const rule = RULES.get(type);
  if (rule === void 0) fail(path, `unknown node type ${type}`);
  if (!allowed.includes(type)) fail(path, `${type} does not stand here`);
  checkFields(value, type, rule, path, walk);
  checkDependencies(value, type, path);
  checkNodeBounds(value, path, walk);
}
function checkVersion(value, path) {
  const version = requireString(value, path);
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) fail(path, "not major.minor");
  if (version.split(".")[0] !== AST_VERSION.split(".")[0]) fail(path, `major version ${version.split(".")[0]} is not read by this engine`);
}
var MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
var MAX_METADATA_DEPTH = 64;
var MAX_RESOURCE_REFERENCES = 4096;
var MAX_FALLBACK_DEPTH = 32;
function metadataDepth(value, path, depth2) {
  if (typeof value !== "object" || value === null) return;
  if (depth2 > MAX_METADATA_DEPTH) fail(path, "metadata is nested deeper than 64 levels");
  for (const [name, inner] of Object.entries(value)) metadataDepth(inner, `${path}/${name}`, depth2 + 1);
}
function payloadBytes(node) {
  let bytes = 0;
  for (const entry of node["payload"] ?? []) {
    const value = entry.value;
    if (value !== void 0) bytes += utf8Length(typeof value === "string" ? value : JSON.stringify(value));
  }
  return bytes;
}
function checkNodeBounds(node, path, walk) {
  if (node["metadata"] !== void 0) metadataDepth(node["metadata"], `${path}/metadata`, 1);
  if (node["payload"] !== void 0 && payloadBytes(node) > MAX_PAYLOAD_BYTES) fail(`${path}/payload`, "an extension payload above 8 MiB");
  const tree = walk.tree;
  tree.resourceReferences += (node["resourceId"] === void 0 ? 0 : 1) + (node["resourceIds"]?.length ?? 0);
  if (tree.resourceReferences > MAX_RESOURCE_REFERENCES) fail(path, "more than 4096 resource references");
  if (walk.fallbacks > MAX_FALLBACK_DEPTH) fail(path, "fallbacks are nested deeper than 32 extension nodes");
}
function checkReferences(document, tree) {
  if (tree.references.length === 0) return;
  const ids = new Set((document["resources"] ?? []).map((entry) => entry["id"]));
  for (const [id, path] of tree.references) if (!ids.has(id)) fail(path, `no resource has the id ${JSON.stringify(id)}`);
}
var ENVELOPE_FIELDS = ["astVersion", "document", "vocabulary", "extensions"];
function validateEnvelope(envelope) {
  for (const name of Object.keys(envelope)) if (!ENVELOPE_FIELDS.includes(name)) fail(`/${name}`, "not a field of the envelope");
  if (envelope["astVersion"] === void 0) fail("/astVersion", "a required field is missing");
  checkVersion(envelope["astVersion"], "/astVersion");
  if (envelope["vocabulary"] !== void 0) checkObject(envelope["vocabulary"], "/vocabulary");
  if (envelope["extensions"] !== void 0) checkExtensions(envelope["extensions"], "/extensions");
}
function validateTree(document) {
  if (!isRecord(document)) fail("", "not a tree");
  if (document["type"] !== "document") fail("/type", "the root is not a document");
  if (document["children"] === void 0) fail("/children", "the root has no children");
  checkVersion(document["astVersion"], "/astVersion");
  const tree = { resourceReferences: 0, references: [] };
  checkFields(document, "document", RULES.get("document"), "", { depth: 0, fallbacks: 0, tree });
  const children2 = document["children"];
  children2.forEach((child, index) => {
    if (child["type"] === "frontmatter" && index > 0) fail(`/children/${index}`, "frontmatter is not the first child");
  });
  checkNodeBounds(document, "", { depth: 0, fallbacks: 0, tree });
  checkReferences(document, tree);
}

// ../carve-js/v2/src/ast-text.ts
var NO_BREAK_SPACE3 = "\xA0";
function rubyText(node) {
  let out = "";
  for (const pair of node.pairs) out += `${plainText(pair.base)}(${plainText(pair.annotation)})`;
  return out;
}
function valueText2(node) {
  return node.value;
}
var TEXT_OF = {
  text: valueText2,
  code: valueText2,
  math: valueText2,
  literal_inline: valueText2,
  non_breaking_space: () => NO_BREAK_SPACE3,
  soft_break: () => " ",
  hard_break: () => " ",
  smart_punctuation: (node) => node.glyph ?? node.source,
  abbreviation: (node) => node.key,
  mention: (node) => `@${node.target}`,
  tag: (node) => `#${node.name}`,
  autolink: (node) => node.text ?? node.href,
  image: (node) => node.alt ?? "",
  caption_number: (node) => node.n === void 0 ? "" : String(node.n),
  ruby: rubyText,
  // An index entry is no part of the text it stands in.
  inline_extension: (node) => node.name === "index" ? "" : plainText(node.children)
};
function ownText(node) {
  return textOfType(node.type, node);
}
function textOfType(type, node) {
  return TEXT_OF[type]?.(node, void 0);
}
var SILENT = ["footnote_ref", "inline_footnote", "xref", "symbol", "raw_inline", "critic_comment", "comment", "citation_group"];
function textOf(node) {
  const own = ownText(node);
  if (own !== void 0) return own;
  return isInlineParent(node) && !SILENT.includes(node.type) ? plainText(node.children) : "";
}
function captionLabelText(nodes, symbols) {
  let out = "";
  for (const node of nodes) {
    if (node.type === "symbol") {
      out += symbolText(node.name, symbols);
      continue;
    }
    const own = ownText(node);
    if (own !== void 0) out += own;
    else if (isInlineParent(node) && !SILENT.includes(node.type)) out += captionLabelText(node.children, symbols);
  }
  return out;
}
function symbolText(name, symbols) {
  return Object.hasOwn(symbols, name) ? symbols[name] : `:${name}:`;
}
function plainText(nodes) {
  let out = "";
  for (const node of nodes) out += textOf(node);
  return out;
}
function blockText(nodes) {
  const parts = [];
  for (const node of nodes) {
    if (node.type === "paragraph" || node.type === "heading") parts.push(plainText(node.children));
  }
  return parts.join(" ");
}

// ../carve-js/v2/src/option-tables.ts
var OPTION_KINDS = /* @__PURE__ */ new Map([
  ["alignTables", "format"],
  ["extensions", "parse"],
  ["headingIds", "resolution"],
  ["includes", "parse"],
  ["labels", "render"],
  ["mode", "render"],
  ["platforms", "lint"],
  ["profile", "render"],
  ["rawHtml", "render"],
  ["renderers", "render"],
  ["roundtrip", "render"],
  ["rules", "lint"],
  ["sections", "render"],
  ["smartTypography", "render"],
  ["social", "render"],
  ["sourceLines", "render"],
  ["strictLosses", "render"],
  ["symbols", "render"],
  ["urlPolicy", "render"]
]);
var OPTION_TYPES = /* @__PURE__ */ new Map([
  ["alignTables", "boolean"],
  ["extensions", "list"],
  ["headingIds", "enum"],
  ["includes", "structure"],
  ["labels", "map"],
  ["mode", "enum"],
  ["platforms", "list"],
  ["profile", "enum"],
  ["rawHtml", "boolean"],
  ["renderers", "map"],
  ["roundtrip", "boolean"],
  ["rules", "map"],
  ["sections", "boolean"],
  ["smartTypography", "boolean"],
  ["social", "structure"],
  ["sourceLines", "boolean"],
  ["strictLosses", "boolean"],
  ["symbols", "map"],
  ["urlPolicy", "structure"]
]);
var NULL_DEFAULTS = ["includes", "social"];
var ENUM_VALUES = /* @__PURE__ */ new Map([
  ["headingIds", ["off", "keep-case", "lower", "ascii"]],
  ["mode", ["interactive", "static"]],
  ["profile", ["full", "article", "comment", "minimal"]]
]);
var ENUM_DEFAULTS = /* @__PURE__ */ new Map([
  ["headingIds", "keep-case"],
  ["mode", "interactive"],
  ["profile", "full"]
]);
var BOOLEAN_DEFAULTS = /* @__PURE__ */ new Map([
  ["alignTables", false],
  ["rawHtml", false],
  ["roundtrip", false],
  ["sections", true],
  ["smartTypography", true],
  ["sourceLines", false],
  ["strictLosses", false]
]);
var DEFAULT_LABELS = {
  "footnoteBacklink": "Back to reference",
  "indexBackref": "Back to",
  "tabsGroup": "Tabs",
  "codeGroup": "Code examples",
  "endnotes": "Footnotes",
  "tocNav": "Table of contents",
  "admonitionNote": "Note",
  "admonitionTip": "Tip",
  "admonitionWarning": "Warning",
  "admonitionDanger": "Danger",
  "admonitionInfo": "Info",
  "admonitionSuccess": "Success",
  "admonitionExample": "Example",
  "admonitionQuote": "Quote"
};
var DEFAULT_DENIED_SCHEMES = [
  "javascript",
  "vbscript",
  "data",
  "file",
  "ms-msdt",
  "ms-office",
  "ms-word",
  "ms-excel",
  "ms-powerpoint",
  "ms-access",
  "ms-visio",
  "ms-project",
  "ms-publisher",
  "ms-infopath",
  "ms-spd",
  "ms-search",
  "search-ms",
  "ms-cxh",
  "ms-cxh-full",
  "shell",
  "vscode",
  "vscode-insiders",
  "jar"
];

// ../carve-js/v2/src/options.ts
var CarveOptionError = class extends Error {
  option;
  constructor(option, message) {
    super(`option ${option}: ${message}`);
    this.name = "CarveOptionError";
    this.option = option;
  }
};
function isEmpty(value) {
  if (value === void 0 || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return isPlainObject(value) && Object.keys(value).length === 0;
}
function enumValue(options, name) {
  const value = options[name];
  if (value === void 0) return ENUM_DEFAULTS.get(name);
  if (typeof value !== "string" || !ENUM_VALUES.get(name).includes(value)) {
    throw new CarveOptionError(name, `unknown value ${JSON.stringify(value)}`);
  }
  return value;
}
function booleanValue(options, name) {
  const value = options[name];
  if (value === void 0) return BOOLEAN_DEFAULTS.get(name);
  if (typeof value !== "boolean") throw new CarveOptionError(name, "not a boolean");
  return value;
}
function schemeSet(policy, field) {
  const list3 = policy[field];
  return list3 === void 0 ? null : new Set(list3.map((scheme) => scheme.toLowerCase()));
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
var ITEM_TYPES = /* @__PURE__ */ new Map([["labels", "string"], ["symbols", "string"], ["rules", "boolean"], ["platforms", "string"]]);
var STRUCTURE_NAMES = /* @__PURE__ */ new Map([
  ["includes", "an include root or resolver"],
  ["social", "an object"],
  ["urlPolicy", "an object with a deny list or an allow list"]
]);
function checkItems(name, items, what) {
  const type = ITEM_TYPES.get(name);
  if (type !== void 0 && !items.every((item) => typeof item === type)) throw new CarveOptionError(name, `not ${what} of ${type}s`);
}
var TYPE_CHECKS = /* @__PURE__ */ new Map([
  ["boolean", (_name, value) => typeof value === "boolean" ? null : "not a boolean"],
  ["enum", (name, value) => {
    if (typeof value === "string" && ENUM_VALUES.get(name).includes(value)) return null;
    return `unknown value ${JSON.stringify(value) ?? typeof value}`;
  }],
  ["list", (name, value) => {
    if (!Array.isArray(value)) return "not a list";
    checkItems(name, value, "a list");
    return null;
  }],
  ["map", (name, value) => {
    if (!isPlainObject(value)) return "not a map";
    checkItems(name, Object.values(value), "a map");
    return null;
  }],
  ["structure", (name, value) => {
    const resolver = name === "includes" && (typeof value === "string" || typeof value === "function");
    return isPlainObject(value) || resolver ? null : `not ${STRUCTURE_NAMES.get(name)}`;
  }]
]);
function checkType(name, value) {
  if (value === void 0 || value === null && NULL_DEFAULTS.includes(name)) return;
  const reason = TYPE_CHECKS.get(OPTION_TYPES.get(name))(name, value);
  if (reason !== null) throw new CarveOptionError(name, reason);
}
function urlPolicyValue(options) {
  const value = options["urlPolicy"];
  if (value === void 0) return {};
  if (!isPlainObject(value)) throw new CarveOptionError("urlPolicy", "not an object with a deny list or an allow list");
  for (const name of Object.keys(value)) {
    if (name !== "deny" && name !== "allow") throw new CarveOptionError("urlPolicy", `unknown field ${name}`);
    const list3 = value[name];
    if (!Array.isArray(list3) || !list3.every((scheme) => typeof scheme === "string")) {
      throw new CarveOptionError("urlPolicy", `${name} is not a list of strings`);
    }
  }
  if (value["deny"] !== void 0 && value["allow"] !== void 0) {
    throw new CarveOptionError("urlPolicy", "both a deny list and an allow list");
  }
  return value;
}
function stringMap(options, name) {
  const value = options[name];
  if (value === void 0 || value === null) return void 0;
  if (!isPlainObject(value) || !Object.values(value).every((text) => typeof text === "string")) {
    throw new CarveOptionError(name, "not a map of strings");
  }
  return value;
}
var SOCIAL_FIELDS = /* @__PURE__ */ new Map([["mentionUrl", "string"], ["tagUrl", "string"], ["resolveMention", "function"], ["resolveTag", "function"]]);
function socialValue(options) {
  const value = options["social"];
  if (value === void 0 || value === null) return null;
  if (!isPlainObject(value)) throw new CarveOptionError("social", "not an object");
  for (const [name, field] of Object.entries(value)) {
    const kind = SOCIAL_FIELDS.get(name);
    if (kind === void 0) throw new CarveOptionError("social", `unknown field ${name}`);
    if (field !== void 0 && typeof field !== kind) throw new CarveOptionError("social", `${name} is not a ${kind}`);
  }
  return value;
}
function checkValues(given, names, stage) {
  for (const name of names) {
    if (name === "positions" && stage === "parse") {
      if (given[name] !== void 0 && typeof given[name] !== "boolean") throw new CarveOptionError(name, "not a boolean");
    } else if (OPTION_KINDS.has(name)) checkType(name, given[name]);
    else throw new CarveOptionError(name, "unknown option");
  }
}
function checkNames(given, stage) {
  const names = Object.keys(given);
  checkValues(given, names, stage);
  for (const name of names) {
    const kind = OPTION_KINDS.get(name);
    if (kind === "format" || kind === "lint" || stage === "parse" && kind === "render") {
      throw new CarveOptionError(name, `not an option of ${stage}`);
    }
  }
  for (const name of ["extensions", "includes", "renderers"]) {
    if (!isEmpty(given[name])) throw new CarveOptionError(name, "not offered by this engine");
  }
}
function readOptions(options, stage) {
  const given = options ?? {};
  checkNames(given, stage);
  const policy = urlPolicyValue(given);
  const allowed = schemeSet(policy, "allow");
  return {
    headingIds: enumValue(given, "headingIds"),
    mode: enumValue(given, "mode"),
    symbols: stringMap(given, "symbols") ?? {},
    labels: { ...DEFAULT_LABELS, ...stringMap(given, "labels") },
    social: socialValue(given),
    sourceLines: booleanValue(given, "sourceLines"),
    sections: booleanValue(given, "sections"),
    smartTypography: booleanValue(given, "smartTypography"),
    roundtrip: booleanValue(given, "roundtrip"),
    rawHtml: booleanValue(given, "rawHtml"),
    denied: allowed === null ? schemeSet(policy, "deny") ?? new Set(DEFAULT_DENIED_SCHEMES) : null,
    allowed,
    profile: enumValue(given, "profile"),
    strictLosses: booleanValue(given, "strictLosses")
  };
}

// ../carve-js/v2/src/slug.ts
var FOLDS = /* @__PURE__ */ new Map([
  ["\xDF", "ss"],
  ["\u1E9E", "SS"],
  ["\xE6", "ae"],
  ["\xC6", "AE"],
  ["\xF8", "o"],
  ["\xD8", "O"],
  ["\u0153", "oe"],
  ["\u0152", "OE"],
  ["\u0111", "d"],
  ["\u0110", "D"],
  ["\u0142", "l"],
  ["\u0141", "L"],
  ["\xFE", "th"],
  ["\xDE", "Th"],
  ["\xF0", "d"],
  ["\xD0", "D"],
  ["\u0131", "i"]
]);
var ASCII_END2 = 128;
var COMBINING_START = 768;
var COMBINING_END = 879;
var FIRST_REMOVED = 173;
function slugRun(text, keepsOthers) {
  let out = "";
  let pending = false;
  for (const char of text) {
    const code = char.codePointAt(0);
    if (isAsciiAlphanumeric(code) || keepsOthers && code >= ASCII_END2) {
      if (pending && out !== "") out += "-";
      pending = false;
      out += char;
    } else {
      pending = true;
    }
  }
  return out;
}
function withoutPresentation(text) {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code < FIRST_REMOVED) out += char;
    else if (!SLUG_REMOVED.includes(code)) out += SLUG_REVERSED.get(char) ?? char;
  }
  return out;
}
function replaceEach(text, table3) {
  let out = "";
  for (const char of text) out += table3.get(char) ?? char;
  return out;
}
function transliterate(text) {
  let out = "";
  for (const char of replaceEach(text, FOLDS).normalize("NFD")) {
    const code = char.codePointAt(0);
    if (code < COMBINING_START || code > COMBINING_END) out += char;
  }
  return out;
}
function startsWithNumber(slug) {
  return /^\p{N}/u.test(slug);
}
function isAscii(text) {
  for (let at = 0; at < text.length; at++) if (text.charCodeAt(at) >= ASCII_END2) return false;
  return true;
}
function slugify(text, mode) {
  let slug = slugRun(isAscii(text) ? text : withoutPresentation(text.normalize("NFC")), true);
  if (mode === "ascii") slug = slugRun(transliterate(slug), false);
  if (mode === "lower" || mode === "ascii") {
    let lower = "";
    for (const char of slug) lower += char.toLowerCase();
    slug = lower;
  }
  if (startsWithNumber(slug)) slug = `s-${slug}`;
  return slug === "" ? "s" : slug;
}

// ../carve-js/v2/src/resolve.ts
function report(resolution, node, code, message) {
  addFinding(resolution.findings, node, { code, severity: "warning", channel: "parse", message });
}
function useNote(walk, node, definition) {
  const resolution = walk.resolution;
  let note = definition === null ? void 0 : resolution.noteOf.get(definition);
  if (note === void 0) {
    note = { number: resolution.notes.length + 1, definition, inline: node.type === "inline_footnote" ? node : null, refIds: [] };
    resolution.notes.push(note);
    if (definition !== null) resolution.noteOf.set(definition, note);
  }
  const ordinal = note.refIds.length + 1;
  const id = node.attrs?.id ?? (ordinal === 1 ? `fnref${note.number}` : `fnref${note.number}-${ordinal}`);
  note.refIds.push(id);
  resolution.noteOf.set(node, note);
  resolution.refIds.set(node, id);
  node.number = note.number;
}
function visitFootnoteRef(node, walk) {
  const definition = walk.footnotes.get(node.key);
  if (definition === void 0) delete node.number;
  else useNote(walk, node, definition);
}
function visitHost(node, walk) {
  const panel = walk.parent?.type === "figure_group";
  if (node.type === "table") alignColumns(node);
  if (node.caption !== void 0) walk.captions.push({ caption: node.caption, host: node, panel });
  visitSlots(walk, node);
}
function visitMath(node, walk) {
  delete node.number;
  if (node.display && node.numberPrefix !== void 0 && walk.numberedFigures === 0) {
    walk.captions.push({ caption: null, host: node, prefix: node.numberPrefix });
  }
}
function captionInlines(caption2) {
  const first = caption2.children[0];
  return first?.type === "paragraph" || first?.type === "heading" ? first.children : [];
}
function ownsNumber(node, caption2) {
  if (node.type !== "figure" && node.type !== "figure_group") return false;
  return captionInlines(caption2).some((child) => child.type === "caption_number");
}
var NAMING_KEYS = ["aria-label", "aria-labelledby"];
function hasAuthoredName(node) {
  return node.attrs?.keyValues?.some(([key]) => NAMING_KEYS.includes(key.toLowerCase())) === true;
}
function visitAdmonition(node, walk) {
  if (node.title !== void 0 && !hasAuthoredName(node)) walk.titled.push(node);
  visitSlots(walk, node);
}
function visitDirective(node, walk) {
  if (node.kind === "footnotes" && walk.parent?.type === "document") {
    walk.notesDirective ??= node;
    if (node.title !== void 0) walk.titled.push(node);
  }
  visitSlots(walk, node);
}
function visitReference(node, walk) {
  if (node.key !== void 0) walk.references.push(node);
}
var NOTHING = 0;
var CHILDREN = 1;
var LEAF = 2;
function on(type, below, visit3) {
  if (visit3 === null) return [type, { visit: null, below }];
  return [type, {
    visit: (node, walk) => {
      if (isNodeOfType(node, type)) visit3(node, walk);
    },
    below
  }];
}
var STEPS = new Map([
  on("footnote_ref", NOTHING, visitFootnoteRef),
  on("inline_footnote", NOTHING, (node, walk) => useNote(walk, node, null)),
  on("footnote", NOTHING, null),
  on("heading", LEAF, (node, walk) => void walk.headings.push(node)),
  on("paragraph", LEAF, null),
  on("definition_term", LEAF, null),
  on("cell_paragraph", LEAF, null),
  on("line", LEAF, null),
  on("link", CHILDREN, visitReference),
  on("image", NOTHING, visitReference),
  on("xref", NOTHING, (node, walk) => void walk.xrefs.push(node)),
  on("figure", NOTHING, visitHost),
  on("figure_group", NOTHING, visitHost),
  on("table", NOTHING, visitHost),
  on("math", NOTHING, visitMath),
  on("admonition", NOTHING, visitAdmonition),
  on("directive", NOTHING, visitDirective),
  on("div", NOTHING, (node, walk) => visitSlots(walk, node))
]);
function visitChildren(walk, node) {
  const slots = node;
  if (!SECONDARY_SLOT_TYPES.has(node.type)) {
    if (slots.children !== void 0) {
      for (const child of slots.children) if (child.type !== "text") visit(walk, child, node);
    }
    return;
  }
  forEachSlot(node, (nodes) => {
    for (const child of nodes) if (child.type !== "text") visit(walk, child, node);
  }, SOURCE_ORDER);
}
var SECONDARY_SLOT_TYPES = /* @__PURE__ */ new Set([
  "table",
  "figure",
  "figure_group",
  "caption",
  "citation",
  "ruby",
  "code_block",
  "admonition",
  "directive",
  "div",
  "inline_extension",
  "block_extension"
]);
function visitSlots(walk, node) {
  const caption2 = "caption" in node ? node.caption : void 0;
  const owns = caption2 !== void 0 && ownsNumber(node, caption2);
  forEachSlot(node, (nodes, step) => {
    if (owns && step === "children") walk.numberedFigures++;
    for (const child of nodes) if (child.type !== "text") visit(walk, child, node);
    if (owns && step === "children") walk.numberedFigures--;
  }, SOURCE_ORDER);
}
function mayResolve(walk, node) {
  return walk.resolvableLeaves === null || walk.resolvableLeaves.has(node);
}
function visit(walk, node, parent) {
  if (node.attrs?.id !== void 0) walk.identified.push(node);
  const step = STEPS.get(node.type);
  if (step === void 0) return visitChildren(walk, node);
  if (step.visit !== null) {
    walk.parent = parent;
    step.visit(node, walk);
  }
  if (step.below === CHILDREN || step.below === LEAF && mayResolve(walk, node)) visitChildren(walk, node);
}
function rowMarks(row, field, covered, marks) {
  const cells = row.children;
  const marked = cells.some((cell) => cell.span !== void 0);
  let column = 0;
  for (const cell of cells) {
    while (!marked && (covered[column] ?? 0) > 0) covered[column++]--;
    const mark2 = cell[field];
    if (mark2 !== void 0) marks[column] = mark2;
    const colspan = cell.colspan ?? 1;
    if (!marked) for (let more = 0; more < colspan; more++) covered[column + more] = (cell.rowspan ?? 1) - 1;
    column += marked ? 1 : colspan;
  }
}
function headMarks(table3, field) {
  const marks = [];
  for (const group of table3.children) {
    if (group.type !== "table_head") continue;
    const covered = [];
    for (const row of group.children) if (row.type === "table_row") rowMarks(row, field, covered, marks);
  }
  return marks;
}
function alignColumns(table3) {
  const columns = table3.columns;
  if (columns.length === 0) return;
  const fromHead = headMarks(table3, "align");
  columns.forEach((column, at) => {
    const align = fromHead[at] ?? column.align;
    if (align === void 0) delete column.resolvedAlign;
    else column.resolvedAlign = align;
  });
}
function define(walk, table3, node, code, message) {
  if (table3.has(node.key)) report(walk.resolution, node, code, message(node));
  else table3.set(node.key, node);
}
var LINK_DUPLICATE = () => "Duplicate link definition (label) is ignored; the first definition for a label wins.";
var ABBREVIATION_DUPLICATE = () => "Duplicate abbreviation definition (label) is ignored; the first definition for a label wins.";
function footnoteDuplicate(facts) {
  return (node) => {
    const lines = facts?.footnoteLines(node) ?? 0;
    const lost = lines > 1 ? ` Its ${lines} lines of content are lost with it.` : "";
    return `Duplicate footnote definition [^${node.key}] is ignored; the first definition for a label wins.${lost}`;
  };
}
function collectDefinitions(document, walk, facts) {
  const abbreviations = /* @__PURE__ */ new Map();
  const definitions = walk.resolution.definitions;
  for (const child of document.children) {
    if (child.type === "link_reference_definition") define(walk, definitions, child, "duplicate-link-reference-definition", LINK_DUPLICATE);
    else if (child.type === "footnote") define(walk, walk.footnotes, child, "duplicate-footnote-definition", footnoteDuplicate(facts));
    else if (child.type === "abbreviation_def") {
      define(walk, abbreviations, child, "duplicate-abbreviation-definition", ABBREVIATION_DUPLICATE);
    }
  }
}
function headingId(heading2) {
  return heading2.attrs?.id ?? heading2.generatedId;
}
function headingIndex(walk, mode, facts) {
  const index = /* @__PURE__ */ new Map();
  for (const heading2 of walk.headings) {
    if (mode === "off" && heading2.attrs?.id === void 0) continue;
    const source = facts?.headingSource(heading2);
    if (source !== void 0 && !index.has(source)) index.set(source, heading2);
    const text = plainText(heading2.children);
    if (!index.has(text)) index.set(text, heading2);
  }
  return index;
}
function findTargets(walk, mode, facts) {
  const targets = /* @__PURE__ */ new Map();
  let headings = null;
  for (const reference of walk.references) {
    const key = reference.key;
    if (key === void 0) continue;
    let target2 = walk.resolution.definitions.get(key);
    if (target2 === void 0 && reference.type === "link") {
      headings ??= headingIndex(walk, mode, facts);
      target2 = headings.get(key);
    }
    if (target2 !== void 0) targets.set(reference, target2);
  }
  return targets;
}
function isUnresolvedReference(node, targets, kept) {
  return (node.type === "link" || node.type === "image") && node.key !== void 0 && !targets.has(node) && !kept.has(node);
}
function duplicateIdMessage(id) {
  return `Duplicate id "${id}": the repeated HTML id is invalid, and cross-references to it resolve to the first occurrence.`;
}
function reserveIds(walk, targets, kept) {
  const taken = /* @__PURE__ */ new Set();
  for (const node of walk.identified) {
    const id = node.attrs?.id;
    if (id === void 0 || isUnresolvedReference(node, targets, kept)) continue;
    if (taken.has(id)) report(walk.resolution, node, "duplicate-id", duplicateIdMessage(id));
    else taken.add(id);
  }
  return taken;
}
function generateIds(walk, mode, taken) {
  const suffixes = /* @__PURE__ */ new Map();
  for (const heading2 of walk.headings) {
    delete heading2.generatedId;
    if (mode === "off" || heading2.attrs?.id !== void 0) continue;
    const slug = slugify(plainText(heading2.children), mode);
    let id = slug;
    let suffix = suffixes.get(slug) ?? 1;
    while (taken.has(id)) id = `${slug}-${++suffix}`;
    suffixes.set(slug, suffix);
    taken.add(id);
    heading2.generatedId = id;
  }
}
function generateLabelIds(walk, taken) {
  const resolution = walk.resolution;
  let count = 0;
  for (const node of walk.titled) {
    if (node.type === "directive" && (node !== walk.notesDirective || resolution.notes.length === 0)) continue;
    const base = `adm-${++count}`;
    let id = base;
    for (let suffix = 2; taken.has(id); suffix++) id = `${base}-${suffix}`;
    taken.add(id);
    resolution.labelIds.set(node, id);
  }
}
function setDestination(reference, destination3) {
  if (reference.type === "link") {
    if (destination3 === void 0) delete reference.href;
    else reference.href = destination3;
  } else if (destination3 === void 0) {
    delete reference.src;
  } else {
    reference.src = destination3;
  }
}
function setDestinations(walk, targets, kept) {
  for (const reference of walk.references) {
    const target2 = targets.get(reference);
    if (target2 === void 0) {
      if (!kept.has(reference)) setDestination(reference, void 0);
    } else if (target2.type === "heading") {
      setDestination(reference, `#${headingId(target2) ?? ""}`);
    } else {
      setDestination(reference, target2.href);
    }
  }
}
function captionKey(walk, children2, mark2) {
  return trimEndWhitespace(captionLabelText(children2.slice(0, mark2), walk.symbols));
}
function nextNumber(sequences, key) {
  const n = (sequences.get(key) ?? 0) + 1;
  sequences.set(key, n);
  return n;
}
function numberCaptions(walk, anchors) {
  const sequences = /* @__PURE__ */ new Map();
  for (const use of walk.captions) {
    if (use.caption === null) {
      use.host.number = nextNumber(sequences, use.prefix);
      continue;
    }
    const children2 = captionInlines(use.caption);
    const mark2 = children2.findIndex((child) => child.type === "caption_number");
    const number = children2[mark2];
    if (number?.type !== "caption_number") continue;
    if (use.panel) {
      delete number.n;
      continue;
    }
    const label = captionKey(walk, children2, mark2);
    const n = nextNumber(sequences, label);
    number.n = n;
    const id = use.host.attrs?.id;
    if (id !== void 0 && !anchors.has(id)) anchors.set(id, label === "" ? String(n) : `${label} ${n}`);
  }
}
function resolveXrefs(walk) {
  const anchors = /* @__PURE__ */ new Map();
  for (const heading2 of walk.xrefs.length === 0 ? [] : walk.headings) {
    const id = headingId(heading2);
    if (id !== void 0 && !anchors.has(id)) anchors.set(id, plainText(heading2.children));
  }
  numberCaptions(walk, anchors);
  for (const xref2 of walk.xrefs) {
    const text = anchors.get(xref2.key);
    if (text === void 0) {
      delete xref2.href;
      continue;
    }
    xref2.href = `#${xref2.key}`;
    walk.resolution.xrefText.set(xref2, text);
  }
}
function keptReferences(document, walk, facts) {
  const kept = /* @__PURE__ */ new Set();
  if (facts !== null || document.stages?.includes("referenceResolution") !== true) return kept;
  for (const reference of walk.references) {
    if ((reference.type === "link" ? reference.href : reference.src) !== void 0) kept.add(reference);
  }
  return kept;
}
function resolve(document, mode, facts, symbols = {}) {
  const findings = { entries: [], nodes: [] };
  const resolution = {
    definitions: /* @__PURE__ */ new Map(),
    notes: [],
    noteOf: /* @__PURE__ */ new Map(),
    refIds: /* @__PURE__ */ new Map(),
    xrefText: /* @__PURE__ */ new Map(),
    labelIds: /* @__PURE__ */ new Map(),
    findings,
    diagnostics: findings.entries
  };
  const walk = {
    resolution,
    footnotes: /* @__PURE__ */ new Map(),
    headings: [],
    references: [],
    xrefs: [],
    captions: [],
    identified: [],
    titled: [],
    notesDirective: null,
    numberedFigures: 0,
    symbols,
    resolvableLeaves: facts?.resolvableLeaves ?? null,
    parent: null
  };
  collectDefinitions(document, walk, facts);
  visit(walk, document, null);
  for (let at = 0; at < resolution.notes.length; at++) {
    const note = resolution.notes[at];
    const body2 = note.definition ?? note.inline;
    if (body2 !== null) for (const child of body2.children) visit(walk, child, body2);
  }
  const kept = keptReferences(document, walk, facts);
  const targets = findTargets(walk, mode, facts);
  const taken = reserveIds(walk, targets, kept);
  generateIds(walk, mode, taken);
  generateLabelIds(walk, taken);
  setDestinations(walk, targets, kept);
  resolveXrefs(walk);
  document.stages = ["referenceResolution", "tableAlignment"];
  return resolution;
}

// ../carve-js/v2/src/html-attributes.ts
var CARRIERS = /* @__PURE__ */ new Set([
  "data-marker",
  "data-carve-explicit-id",
  "data-carve-generated-id",
  "data-carve-ref",
  "data-carve-ref-collapsed",
  "data-carve-autolink",
  "data-carve-footnote-label",
  "data-carve-inline-footnote",
  "data-carve-raw",
  "data-carve-abbreviations",
  "data-carve-label",
  "data-carve-tight",
  "data-carve-xref",
  "data-carve-caption-number",
  "data-carve-div",
  "data-carve-line-block",
  "data-carve-src"
]);
var DENIED_BY_DEFAULT = new Set(DEFAULT_DENIED_SCHEMES);
var ALIGN_VALUES = ["left", "right", "center"];
var SPACE_CODE = 32;
var GREATER_CODE = 62;
var NO_BREAK_SPACE_CODE = 160;
var DELETE_CODE = 127;
var COLON_CODE = 58;
var COMMA_CODE = 44;
var BACKSLASH_CODE = 92;
var MAX_ESCAPE_DIGITS = 6;
var MAX_CODE_POINT = 1114111;
var REPLACEMENT = "\uFFFD";
var SEARCH_LENGTH = 24;
function isClean(text) {
  return text.indexOf("&") < 0 && text.indexOf("<") < 0 && text.indexOf(">") < 0 && text.indexOf("\xA0") < 0;
}
function escapeCarrierText(text) {
  if (text.length >= SEARCH_LENGTH && isClean(text)) return text;
  let out = "";
  let from = 0;
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at);
    if (code > GREATER_CODE && code !== NO_BREAK_SPACE_CODE) continue;
    const entity = textEntity(code);
    if (entity === "") continue;
    out += text.slice(from, at) + entity;
    from = at + 1;
  }
  return from === 0 ? text : out + text.slice(from);
}
function hasBidiControl(text) {
  return text.indexOf("\u202A") >= 0 || text.indexOf("\u202B") >= 0 || text.indexOf("\u202C") >= 0 || text.indexOf("\u202D") >= 0 || text.indexOf("\u202E") >= 0 || text.indexOf("\u2066") >= 0 || text.indexOf("\u2067") >= 0 || text.indexOf("\u2068") >= 0 || text.indexOf("\u2069") >= 0;
}
function escapeTextNode(r, text) {
  return r.bidi ? escapeText(text) : escapeCarrierText(text);
}
function escapeText(text) {
  if (text.length >= SEARCH_LENGTH && !hasBidiControl(text)) return escapeCarrierText(text);
  let out = "";
  let from = 0;
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at);
    if (code > GREATER_CODE && code !== NO_BREAK_SPACE_CODE && code < BIDI_FIRST) continue;
    const entity = textEntity(code);
    if (entity === "" && !isBidiControl(code)) continue;
    out += text.slice(from, at) + entity;
    from = at + 1;
  }
  return from === 0 ? text : out + text.slice(from);
}
function textEntity(code) {
  if (code === 38) return "&amp;";
  if (code === 60) return "&lt;";
  if (code === 62) return "&gt;";
  return code === 160 ? "&nbsp;" : "";
}
function attributeEntity(code) {
  if (code === 34) return "&quot;";
  if (code === 39) return "&apos;";
  return code === 160 ? "" : textEntity(code);
}
function escapeAttribute(text) {
  let out = "";
  let from = 0;
  for (let at = 0; at < text.length; at++) {
    const entity = attributeEntity(text.charCodeAt(at));
    if (entity === "") continue;
    out += text.slice(from, at) + entity;
    from = at + 1;
  }
  return from === 0 ? text : out + text.slice(from);
}
function loss(r, node, code, message, severity = "warning") {
  addFinding(r.losses, node, { code, severity, channel: "render-loss", message });
}
function isSchemeCharacter(code) {
  return isAsciiLetter(code) || code >= 48 && code <= 57 || code === 43 || code === 45 || code === 46;
}
function isProbeRemoved(code) {
  if (code > SPACE_CODE && code < DELETE_CODE) return false;
  for (const [from, to] of PROBE_REMOVED) if (code >= from && code <= to) return true;
  return false;
}
function schemeOf(url) {
  let removed = false;
  for (let at = 0, length = 0; at < url.length; at++) {
    const code = url.charCodeAt(at);
    if (isProbeRemoved(code)) removed = true;
    else if (code === COLON_CODE) return length === 0 ? "" : schemeText(url, at, removed);
    else if (length++ === 0 ? !isAsciiLetter(code) : !isSchemeCharacter(code)) return "";
  }
  return "";
}
function schemeText(url, colon, removed) {
  if (!removed) return url.slice(0, colon).toLowerCase();
  let scheme = "";
  for (let at = 0; at < colon; at++) if (!isProbeRemoved(url.charCodeAt(at))) scheme += url[at];
  return scheme.toLowerCase();
}
function schemePasses(r, url) {
  const scheme = schemeOf(url);
  if (scheme === "") return true;
  const settings = r.settings;
  return settings.allowed !== null ? settings.allowed.has(scheme) : !settings.denied.has(scheme);
}
function destination(r, url, node) {
  if (schemePasses(r, url)) return url;
  loss(r, node, "destination-denied", `the destination ${url} is denied by the URL policy`, "error");
  return "";
}
function hasDeniedPrefix(value, start, end) {
  let prefix = "";
  for (let at = start; at < end; at++) {
    const code = value.charCodeAt(at);
    if (code === COLON_CODE) return DENIED_BY_DEFAULT.has(prefix);
    if (!isProbeRemoved(code)) prefix += value[at].toLowerCase();
  }
  return false;
}
function isAsciiWhitespace(code) {
  return code === SPACE_CODE || code >= 9 && code <= 13 && code !== 11;
}
function listHasDeniedPrefix(value, commas) {
  let start = 0;
  for (let at = 0; at <= value.length; at++) {
    const code = at < value.length ? value.charCodeAt(at) : SPACE_CODE;
    if (!isAsciiWhitespace(code) && !(commas && code === COMMA_CODE)) continue;
    if (hasDeniedPrefix(value, start, at)) return true;
    start = at + 1;
  }
  return false;
}
function hexValue(code) {
  if (code >= 48 && code <= 57) return code - 48;
  const lower = code | 32;
  return lower >= 97 && lower <= 102 ? lower - 87 : -1;
}
function cssEscape(value, at) {
  let code = 0;
  let p = at;
  while (p < value.length && p - at < MAX_ESCAPE_DIGITS && hexValue(value.charCodeAt(p)) >= 0) {
    code = code * 16 + hexValue(value.charCodeAt(p));
    p++;
  }
  if (p === at) {
    const next = value[at] ?? "";
    return [next === "\n" ? "" : next, at + 1];
  }
  if (p < value.length && isAsciiWhitespace(value.charCodeAt(p))) p++;
  return [code === 0 || code > MAX_CODE_POINT ? REPLACEMENT : String.fromCodePoint(code), p];
}
function cssProbe(value) {
  let decoded = "";
  for (let at = 0; at < value.length; ) {
    if (value.charCodeAt(at) !== BACKSLASH_CODE) {
      decoded += value[at++];
      continue;
    }
    const [char, next] = cssEscape(value, at + 1);
    decoded += char;
    at = next;
  }
  let compact = "";
  for (const char of decoded) if (char.trim() !== "") compact += char.toLowerCase();
  return compact;
}
function hasDangerousCss(value) {
  const probe = cssProbe(value);
  return STYLE_PATTERNS.some((pattern) => probe.includes(pattern));
}
function keyValue(name, value) {
  if (name !== "style" && !value.includes(":")) return value;
  const commas = URL_LIST_ATTRIBUTES.get(name);
  if (hasDeniedPrefix(value, 0, value.length) || commas !== void 0 && listHasDeniedPrefix(value, commas)) return "";
  return name === "style" && hasDangerousCss(value) ? "" : value;
}
function isBlockedName(name) {
  return DROPPED_NAMES.includes(name) || DROPPED_PREFIXES.some((prefix) => name.startsWith(prefix));
}
function withDeclaration(style, declaration) {
  const authored = style.trim();
  if (authored === "") return declaration;
  return `${authored}${authored.endsWith(";") ? "" : ";"} ${declaration}`;
}
var AttributeList = class {
  text = "";
  used = /* @__PURE__ */ new Set();
  has(name) {
    return this.used.has(name.toLowerCase());
  }
  claim(name) {
    this.used.add(name.toLowerCase());
  }
  add(name, value) {
    if (this.has(name)) return;
    this.claim(name);
    this.text += value === null ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`;
  }
};
function addClasses(list3, node, parts) {
  const authored = parts.bare === true ? [] : node?.attrs?.classes ?? [];
  if (authored.length === 0 && parts.base === void 0 && parts.last === void 0) return;
  const classes = new Set(parts.base);
  for (const name of authored) if (keyValue("class", name) !== "") classes.add(name);
  for (const name of parts.last ?? []) classes.add(name);
  if (classes.size > 0) list3.add("class", [...classes].join(" "));
}
function styleDeclarations(keyValues, parts) {
  let declarations = parts.style ?? "";
  if (parts.alignStyle !== true) return declarations;
  for (const [key, value] of keyValues) {
    if (key.toLowerCase() === "align" && ALIGN_VALUES.includes(value)) declarations = `text-align: ${value};`;
  }
  return declarations;
}
function styleValue(value, declarations) {
  const written = keyValue("style", value);
  return declarations === "" ? written : withDeclaration(written, declarations);
}
function addKeyValue(r, list3, [key, value], parts, style, origin) {
  const name = key.toLowerCase();
  if (isBlockedName(name) || list3.has(name)) return;
  if (r.settings.roundtrip && CARRIERS.has(name)) {
    return loss(r, origin, "carrier-attribute-dropped", `the attribute ${key} has the name of a carrier`);
  }
  if (name === "style") return list3.add(key, styleValue(value, style.declarations));
  if (name !== "align" || parts.alignStyle !== true || !ALIGN_VALUES.includes(value)) return list3.add(key, keyValue(name, value));
  if (!style.hasStyle) list3.add("style", style.declarations);
}
function addKeyValues(r, list3, keyValues, parts, origin) {
  const hasStyle = keyValues.some(([key]) => key.toLowerCase() === "style");
  const style = { declarations: styleDeclarations(keyValues, parts), hasStyle };
  for (const pair of keyValues) addKeyValue(r, list3, pair, parts, style, origin);
  if (style.declarations !== "") list3.add("style", style.declarations);
}
function writtenId(node, parts) {
  if (parts.id !== void 0) return parts.id ?? void 0;
  return parts.bare === true ? void 0 : node?.attrs?.id;
}
function sourceLine(r, node, parts) {
  if (!r.settings.sourceLines || parts.block !== true || node?.pos === void 0) return null;
  return String(node.pos.startLine);
}
function addAuthored(r, list3, node, parts) {
  const authored = parts.bare === true ? null : node;
  addClasses(list3, node, parts);
  if (authored?.lang !== void 0) list3.add("lang", keyValue("lang", authored.lang));
  const keyValues = authored?.attrs?.keyValues;
  if (keyValues !== void 0 || parts.style !== void 0) addKeyValues(r, list3, keyValues ?? [], parts, parts.origin ?? node);
}
function isStructuralOnly(r, node, parts) {
  if (node !== null && parts.bare !== true && (node.attrs !== void 0 || node.lang !== void 0)) return false;
  if (parts.id !== void 0 && parts.id !== null) return false;
  if (parts.base !== void 0 || parts.last !== void 0 || parts.generated !== void 0 || parts.style !== void 0) return false;
  if (parts.derived !== void 0 && parts.derived.length > 0) return false;
  return !(r.settings.sourceLines && parts.block === true);
}
function structuralText(pairs) {
  let text = "";
  for (const [name, value] of pairs) text += value === null ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`;
  return text;
}
function addDerived(list3, parts) {
  for (const [name, value] of parts.derived ?? []) list3.add(name, keyValue(name.toLowerCase(), value));
}
function attributes(r, node, parts) {
  if (isStructuralOnly(r, node, parts)) return structuralText(parts.structural ?? []);
  const list3 = new AttributeList();
  const id = writtenId(node, parts);
  if (parts.idFirst === true && id !== void 0) list3.add("id", id);
  if (parts.classFirst === true) addClasses(list3, node, parts);
  for (const [name, value] of parts.structural ?? []) list3.add(name, value);
  addDerived(list3, parts);
  const line2 = sourceLine(r, node, parts);
  if (line2 !== null) list3.claim("data-source-line");
  if (id !== void 0) list3.add("id", id);
  addAuthored(r, list3, node, parts);
  for (const [name, value] of parts.generated ?? []) list3.add(name, value);
  if (line2 !== null) list3.text += ` data-source-line="${line2}"`;
  return list3.text;
}
function attributeBlockText(node) {
  const parts = [];
  const attrs = node.attrs;
  if (attrs?.id !== void 0) parts.push(`#${attrs.id}`);
  for (const name of attrs?.classes ?? []) parts.push(`.${name}`);
  if (node.lang !== void 0) parts.push(`:${node.lang}`);
  for (const [key, value] of attrs?.keyValues ?? []) parts.push(keyText(key, value));
  return parts.length === 0 ? "" : `{${parts.join(" ")}}`;
}
function keyText(key, value) {
  if (value === "") return key;
  const plain = !/[\s"'\\|}]/.test(value);
  return plain ? `${key}=${value}` : `${key}="${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

// ../carve-js/v2/src/html-inline.ts
var SEMANTIC_KEYS = [["abbr", "title"], ["time", "datetime"], ["kbd", null]];
function isBlank2(value) {
  for (let p = 0; p < value.length; p++) {
    const code = value.charCodeAt(p);
    if (code !== 32 && code !== 9) return false;
  }
  return true;
}
function isCommentOnlyLine(nodes, from, step, atEnd) {
  let comment2 = false;
  let at = from;
  for (; at >= 0 && at < nodes.length; at += step) {
    const node = nodes[at];
    if (node.type === "comment") comment2 = true;
    else if (isBreak(node)) break;
    else if (node.type !== "text" || !isBlank2(node.value)) return false;
  }
  return comment2 && (!atEnd || at === nodes.length);
}
function isSkippedBreak(nodes, at) {
  return isCommentOnlyLine(nodes, at - 1, -1, false) || isCommentOnlyLine(nodes, at + 1, 1, true);
}
function writeOwn(r, type, node) {
  return WRITERS[type]?.(node, r);
}
function inlineHtml(r, nodes) {
  let out = "";
  for (let at = 0; at < nodes.length; at++) {
    const node = nodes[at];
    if (node.type === "text") out += escapeTextNode(r, node.value);
    else if (!isBreak(node) || !isSkippedBreak(nodes, at)) out += writeOwn(r, node.type, node) ?? "";
  }
  return out;
}
function children(r, node) {
  return inlineHtml(r, node.children);
}
function element(name, parts = {}) {
  return (node, r) => `<${name}${attributes(r, node, parts)}>${children(r, node)}</${name}>`;
}
var SPAN2 = element("span");
function authoredKey(node, name) {
  return node.attrs?.keyValues?.find(([key]) => key.toLowerCase() === name)?.[1];
}
function withoutKeys(node, names) {
  const keyValues = (node.attrs?.keyValues ?? []).filter(([key]) => !names.includes(key.toLowerCase()));
  return { ...node, attrs: { ...node.attrs, keyValues } };
}
function span(node, r) {
  const found = [];
  for (const [key, target2] of SEMANTIC_KEYS) {
    const value = authoredKey(node, key);
    if (value !== void 0) found.push([key, target2, value]);
  }
  const first = found[0];
  if (first === void 0) return SPAN2(node, r);
  const abbr = first[0] === "abbr";
  if (abbr) r.abbrDepth++;
  let html = children(r, node);
  if (abbr) r.abbrDepth--;
  const rest = withoutKeys(node, found.map(([key]) => key));
  found.forEach(([key, target2, value], index) => {
    const outermost = index === found.length - 1;
    const derived = target2 === null || outermost && authoredKey(node, target2) !== void 0 ? [] : [[target2, value]];
    html = `<${key}${attributes(r, outermost ? rest : null, { derived, origin: node })}>${html}</${key}>`;
  });
  return html;
}
function mergedAttrs(own, from) {
  const ownKeyValues = own.keyValues ?? [];
  const ownNames = new Set(ownKeyValues.map(([name]) => name.toLowerCase()));
  const keyValues = (from.keyValues ?? []).filter(([key]) => !ownNames.has(key.toLowerCase()));
  const attrs = { classes: [...from.classes ?? [], ...own.classes ?? []], keyValues: [...keyValues, ...ownKeyValues] };
  const id = own.id ?? from.id;
  if (id !== void 0) attrs.id = id;
  return attrs;
}
function withDefinition(node, definition) {
  if (definition?.attrs === void 0 && definition?.lang === void 0) return node;
  const attrs = mergedAttrs(node.attrs ?? {}, definition.attrs ?? {});
  const lang = node.lang ?? definition.lang;
  return lang === void 0 ? { ...node, attrs } : { ...node, attrs, lang };
}
function unresolvedLabel(node, key) {
  return escapeText(`${node.form === "collapsed" ? "[]" : `[${key}]`}${attributeBlockText(node)}`);
}
function referenceCarriers(r, node, key) {
  if (!r.settings.roundtrip || key === void 0) return [];
  const carriers = [["data-carve-ref", key]];
  if (node.form === "collapsed") carriers.push(["data-carve-ref-collapsed", null]);
  return carriers;
}
function withRel(r, node, structural) {
  const authored = authoredKey(node, "rel");
  if (authored === void 0 && r.linkRel === "") return node;
  const words = authored === void 0 ? [] : keyValue("rel", authored).split(" ").filter((word) => word !== "");
  for (const word of r.linkRel.split(" ")) if (word !== "" && !words.includes(word)) words.push(word);
  if (words.length > 0) structural.push(["rel", words.join(" ")]);
  return authored === void 0 ? node : withoutKeys(node, ["rel"]);
}
function link(node, r) {
  if (r.linkDepth > 0) return children(r, node);
  const key = node.key;
  const href = node.href;
  if (key !== void 0 && href === void 0) return `[${children(r, node)}]${unresolvedLabel(node, key)}`;
  const definition = key === void 0 ? void 0 : r.resolution.definitions.get(key);
  const title = node.tooltip ?? definition?.title;
  const structural = [["href", destination(r, href ?? "", node)]];
  if (title !== void 0) structural.push(["title", title]);
  const merged = withRel(r, withDefinition(node, definition), structural);
  structural.push(...referenceCarriers(r, node, key));
  r.linkDepth++;
  const html = children(r, node);
  r.linkDepth--;
  return `<a${attributes(r, merged, { structural, origin: node })}>${html}</a>`;
}
function image(node, r) {
  const key = node.key;
  const src = node.src;
  const alt = node.alt ?? "";
  if (key !== void 0 && src === void 0) return `![${escapeText(alt)}]${unresolvedLabel(node, key)}`;
  const definition = key === void 0 ? void 0 : r.resolution.definitions.get(key);
  const title = node.tooltip ?? definition?.title;
  const structural = [["src", destination(r, src ?? "", node)], ["alt", alt]];
  if (title !== void 0) structural.push(["title", title]);
  structural.push(...referenceCarriers(r, node, key));
  return `<img${attributes(r, withDefinition(node, definition), { structural, origin: node })}>`;
}
function autolink(node, r) {
  const text = escapeText(node.text ?? node.href);
  if (r.linkDepth > 0) return text;
  const structural = [["href", destination(r, node.href, node)]];
  const written = withRel(r, node, structural);
  if (r.settings.roundtrip) structural.push(["data-carve-autolink", null]);
  return `<a${attributes(r, written, { structural })}>${text}</a>`;
}
function xref(node, r) {
  const href = node.href;
  if (href === void 0) return escapeText(`</#${node.key}>`);
  const text = escapeText(r.resolution.xrefText.get(node) ?? "");
  if (r.linkDepth > 0) return text;
  const structural = [["href", href]];
  if (r.settings.roundtrip) structural.push(["data-carve-xref", null]);
  return `<a${attributes(r, node, { structural })}>${text}</a>`;
}
function noteReference(node, r) {
  const key = node.type === "footnote_ref" ? node.key : void 0;
  const note = r.resolution.noteOf.get(node);
  if (note === void 0) return escapeText(`[^${key ?? ""}]`);
  const structural = [["href", `#fn${note.number}`], ["role", "doc-noteref"]];
  if (r.settings.roundtrip && key !== void 0) structural.push(["data-carve-footnote-label", key]);
  const tag2 = attributes(r, node, { structural, id: r.resolution.refIds.get(node), idFirst: true });
  return `<a${tag2}><sup>${note.number}</sup></a>`;
}
function math(node, r) {
  if (r.settings.mode === "static") return `<code${attributes(r, node, { base: ["language-math"] })}>${escapeText(node.value)}</code>`;
  const display = node.display;
  const tag2 = attributes(r, node, { base: ["math", display ? "display" : "inline"], generated: [["role", "math"]] });
  const value = escapeText(node.value);
  const number = node.number;
  const numbered = number === void 0 || !display ? "" : ` <span class="equation-number">${escapeText(`${node.numberPrefix ?? ""} ${number}`)}</span>`;
  return `<span${tag2}>${display ? `\\[${value}\\]` : `\\(${value}\\)`}</span>${numbered}`;
}
function rawInline(node, r) {
  if (node.format !== "html") {
    loss(r, node, "raw-format-dropped", `raw content in the format ${node.format} is not written to HTML`);
    return "";
  }
  if (r.settings.rawHtml) return r.settings.roundtrip ? `<span data-carve-raw="html">${node.value}</span>` : node.value;
  if (r.settings.roundtrip) return `<span data-carve-raw="html">${escapeCarrierText(node.value)}</span>`;
  return escapeText(node.value);
}
function templateUrl(template, name) {
  return template === void 0 ? null : template.replaceAll("{name}", encodeURIComponent(name));
}
function socialUrl(r, type, name) {
  const settings = r.settings.social;
  if (settings === null) return null;
  const resolver = type === "mention" ? settings.resolveMention : settings.resolveTag;
  const url = resolver?.(name) ?? templateUrl(type === "mention" ? settings.mentionUrl : settings.tagUrl, name);
  return url === void 0 || url === "" ? null : url;
}
function social(node, r) {
  const mention = node.type === "mention";
  const name = mention ? node.target : node.name;
  const label = mention ? node.label : void 0;
  const text = `<strong>${escapeText(label ?? `${mention ? "@" : "#"}${name}`)}</strong>`;
  const url = r.linkDepth > 0 ? null : socialUrl(r, node.type, name);
  const parts = { base: [node.type], classFirst: true };
  if (url === null) return `<span${attributes(r, node, parts)}>${text}</span>`;
  const structural = [["href", destination(r, url, node)]];
  const written = withRel(r, node, structural);
  return `<a${attributes(r, written, { ...parts, structural })}>${text}</a>`;
}
function symbol2(node, r) {
  const name = node.name;
  const symbols = r.settings.symbols;
  const value = (Object.hasOwn(symbols, name) ? symbols[name] : void 0) ?? escapeText(`:${name}:`);
  const tag2 = attributes(r, node, {});
  return tag2 === "" ? value : `<span${tag2}>${value}</span>`;
}
function literal(node, r) {
  const tag2 = attributes(r, node, {});
  const value = escapeText(node.value);
  return tag2 === "" ? value : `<span${tag2}>${value}</span>`;
}
function abbreviation(node, r) {
  const term = escapeText(node.key);
  const expansion = node.expansion;
  if (r.abbrDepth > 0 || expansion === void 0) return term;
  return `<abbr${attributes(r, node, { structural: [["title", expansion]] })}>${term}</abbr>`;
}
function captionNumber(node, r) {
  const n = node.n;
  if (n === void 0) return "#";
  return r.settings.roundtrip ? `<span data-carve-caption-number>${n}</span>` : String(n);
}
function ruby(node, r) {
  let html = "";
  for (const pair of node.pairs) {
    html += `${inlineHtml(r, pair.base)}<rp>(</rp><rt>${inlineHtml(r, pair.annotation)}</rt><rp>)</rp>`;
  }
  return `<ruby${attributes(r, node, {})}>${html}</ruby>`;
}
function inlineExtension(node, r) {
  const name = node.name;
  if (!name.includes(".")) return `<span${attributes(r, node, { base: [`ext-${name}`] })}>${children(r, node)}</span>`;
  loss(r, node, "extension-fallback-rendered", `the extension ${name} is rendered through its fallback`);
  return inlineHtml(r, node.fallback ?? node.children);
}
var WRITERS = {
  text: (node, r) => escapeTextNode(r, node.value),
  span,
  link,
  image,
  autolink,
  xref,
  footnote_ref: noteReference,
  inline_footnote: noteReference,
  code: (node, r) => `<code${attributes(r, node, {})}>${escapeTextNode(r, node.value)}</code>`,
  literal_inline: literal,
  math,
  raw_inline: rawInline,
  critic_comment: (node, r) => `<span${attributes(r, node, { base: ["critic-comment"] })}>${escapeText(node.value)}</span>`,
  mention: social,
  tag: social,
  symbol: symbol2,
  non_breaking_space: () => "&nbsp;",
  // C2-H-045.
  hard_break: () => "<br>\n",
  soft_break: () => "\n",
  // C2-H-078.
  smart_punctuation: (node, r) => escapeText((r.settings.smartTypography ? node.glyph : void 0) ?? node.source),
  abbreviation,
  caption_number: captionNumber,
  inline_extension: inlineExtension,
  small_caps: element("span", { base: ["smallcaps"] }),
  ruby,
  // C2-A-119: with no extension for citations the bracket text is written as text.
  citation_group: (node) => escapeText(node.raw),
  emphasis: element("em"),
  strong: element("strong"),
  underline: element("u"),
  strike: element("s"),
  highlight: element("mark"),
  superscript: element("sup"),
  subscript: element("sub"),
  insert: element("ins"),
  delete: element("del")
};

// ../carve-js/v2/src/html.ts
var MAX_HEADING_ELEMENT = 6;
var INVISIBLE = ["comment", "frontmatter", ...DEFINITION_TYPES];
var ALPHA_STYLES = ["a", "A", "i", "I"];
var NO_CLASSES = [];
var GROUP_CLASSES = ["carve-figure-group"];
var PANEL_CLASSES = ["carve-figure-panel"];
var CACHED_LEVELS = 64;
var LINE_STARTS = Array.from({ length: CACHED_LEVELS }, (_, level) => `
${"  ".repeat(level)}`);
function line(r, level, text) {
  r.out += (level < CACHED_LEVELS ? LINE_STARTS[level] : `
${"  ".repeat(level)}`) + text;
  r.count++;
}
function rawLine(r, text) {
  r.out += `
${text}`;
  r.count++;
}
var NO_PARTS = {};
function isPlain(r, node) {
  return node.attrs === void 0 && node.lang === void 0 && !r.settings.sourceLines;
}
function tag(r, node, parts = NO_PARTS) {
  if (parts === NO_PARTS && !r.settings.sourceLines && (node === null || node.attrs === void 0 && node.lang === void 0)) return "";
  return attributes(r, node, { ...parts, block: true });
}
function onlyComments(nodes) {
  for (const child of nodes) if (child.type !== "comment") return false;
  return true;
}
function visibleBlocks(nodes) {
  for (const node of nodes) if (!isVisible(node)) return nodes.filter(isVisible);
  return nodes;
}
function isVisible(node) {
  if (INVISIBLE.includes(node.type)) return false;
  return node.type !== "paragraph" || !onlyComments(node.children);
}
function isBareImage(node) {
  if (node.blockImage !== true) return false;
  for (const child of node.children) if (child.type === "image") return child.key === void 0 || child.src !== void 0;
  return false;
}
function isTextParagraph(node) {
  return node !== void 0 && node.type === "paragraph" && !isBareImage(node);
}
function writeBlock(r, type, node, level) {
  BLOCKS2[type]?.(r, node, level);
}
function writeBlocks(r, nodes, level) {
  for (const node of nodes) writeBlock(r, node.type, node, level);
}
function writeBody(r, nodes, level) {
  const before2 = r.count;
  writeBlocks(r, nodes, level);
  if (r.count === before2) rawLine(r, "");
}
function container(name) {
  return (r, node, level) => {
    line(r, level, `<${name}${tag(r, node)}>`);
    writeBody(r, node.children, level + 1);
    line(r, level, `</${name}>`);
  };
}
var BLOCKQUOTE = container("blockquote");
function paragraphHtml(r, node) {
  const tail = r.backlinkHost === node ? r.backlinks : "";
  const open = isPlain(r, node) ? "<p>" : `<p${tag(r, node, { alignStyle: true })}>`;
  return `${open}${inlineHtml(r, node.children)}${tail}</p>`;
}
function staticMathBlock(r, node) {
  let value = "";
  for (const child of node.children) {
    if (child.type === "math") {
      value = child.value;
      break;
    }
  }
  return `<pre${tag(r, node)}><code class="language-math">${escapeText(value.endsWith("\n") ? value : `${value}
`)}</code></pre>`;
}
function paragraph(r, node, level) {
  if (onlyComments(node.children)) return;
  if (node.blockMath === true && r.settings.mode === "static") {
    line(r, level, staticMathBlock(r, node));
    return;
  }
  line(r, level, isBareImage(node) ? inlineHtml(r, node.children) : paragraphHtml(r, node));
}
function headingId2(node) {
  return node.attrs?.id ?? node.generatedId;
}
function idCarriers(r, node) {
  if (!r.settings.roundtrip || headingId2(node) === void 0) return [];
  return [[node.attrs?.id === void 0 ? "data-carve-generated-id" : "data-carve-explicit-id", null]];
}
function headingHtml(r, node, inSection) {
  const level = node.level;
  const name = level <= MAX_HEADING_ELEMENT ? `h${level}` : "div";
  if (inSection && level <= MAX_HEADING_ELEMENT && isPlain(r, node)) return `<${name}>${inlineHtml(r, node.children)}</${name}>`;
  const structural = level <= MAX_HEADING_ELEMENT ? [] : [["role", "heading"], ["aria-level", String(level)]];
  if (!inSection) structural.push(...idCarriers(r, node));
  const parts = { structural, id: inSection ? null : headingId2(node) ?? null, alignStyle: true };
  return `<${name}${tag(r, node, parts)}>${inlineHtml(r, node.children)}</${name}>`;
}
function quote2(r, node, level) {
  const visible = visibleBlocks(node.children);
  const first = visible[0];
  if (visible.length === 1 && isTextParagraph(first)) {
    line(r, level, `<blockquote${tag(r, node)}>${paragraphHtml(r, first)}</blockquote>`);
    return;
  }
  BLOCKQUOTE(r, node, level);
}
function orderedAttributes(marker) {
  const structural = [];
  if (marker.style !== void 0 && ALPHA_STYLES.includes(marker.style)) structural.push(["type", marker.style]);
  if (marker.start !== void 0 && marker.start !== 1) structural.push(["start", String(marker.start)]);
  if (marker.delimiter === ")") structural.push(["data-delim", ")"]);
  return structural;
}
function listParts(r, node) {
  const marker = node.marker;
  const structural = marker.kind === "ordered" ? orderedAttributes(marker) : [];
  if (r.settings.roundtrip) {
    if (marker.kind === "bullet" && marker.char !== void 0 && marker.char !== "-") structural.push(["data-marker", marker.char]);
    if (node.spacing === "tight") structural.push(["data-carve-tight", null]);
  }
  const tasks = node.children.some((item) => item.task !== void 0);
  return tasks ? { structural, base: ["task-list"] } : { structural };
}
function list(r, node, level) {
  const name = node.marker.kind === "ordered" ? "ol" : "ul";
  line(r, level, `<${name}${tag(r, node, listParts(r, node))}>`);
  for (const item of node.children) listItem(r, item, level + 1, node.spacing === "tight");
  line(r, level, `</${name}>`);
}
function itemOpen(r, node) {
  const task = node.task;
  if (task === void 0) return `<li${tag(r, node)}>`;
  const state = TASK_NO_STATE.includes(task.mark) ? [] : [["data-task-state", task.mark]];
  const checked = TASK_CHECKED.includes(task.mark) ? " checked" : "";
  const label = escapeAttribute(blockText(node.children));
  return `<li${tag(r, node, { structural: state })}><input type="checkbox"${checked} disabled aria-label="${label}"> `;
}
function listItem(r, node, level, tight) {
  const blocks = visibleBlocks(node.children);
  const first = blocks[0];
  let open = itemOpen(r, node);
  let rest = blocks;
  if (isTextParagraph(first)) {
    const bare = tight && first.attrs === void 0 && first.lang === void 0;
    open += bare ? inlineHtml(r, first.children) : paragraphHtml(r, first);
    rest = blocks.slice(1);
  }
  if (rest.length === 0) {
    line(r, level, `${open}</li>`);
    return;
  }
  line(r, level, open);
  writeBlocks(r, rest, level + 1);
  line(r, level, "</li>");
}
function description(r, node, level) {
  const blocks = node.children.filter(isVisible);
  const first = blocks[0];
  if (blocks.length <= 1 && (first === void 0 || isTextParagraph(first))) {
    let text = "";
    const bare = first !== void 0 && first.attrs === void 0 && first.lang === void 0;
    if (first !== void 0) text = bare ? inlineHtml(r, first.children) : paragraphHtml(r, first);
    line(r, level, `<dd${tag(r, node)}>${text}</dd>`);
    return;
  }
  line(r, level, `<dd${tag(r, node)}>`);
  writeBlocks(r, blocks, level + 1);
  line(r, level, "</dd>");
}
function writeTitle(r, node, level, id) {
  const title = node.title;
  if (title !== void 0) {
    line(r, level, `<p class="admonition-title"${id === null ? "" : ` id="${escapeAttribute(id)}"`}>${inlineHtml(r, title)}</p>`);
  }
  const label = node.groupLabel;
  if (label !== void 0) line(r, level, `<p class="div-label">${escapeText(label)}</p>`);
}
function div(r, node, level) {
  const base = node.type === "directive" ? [node.kind] : NO_CLASSES;
  const attrs = tag(r, node, { base, alignStyle: true });
  line(r, level, `<div${attrs === "" && r.settings.roundtrip ? " data-carve-div" : attrs}>`);
  const before2 = r.count;
  writeTitle(r, node, level + 1, null);
  writeBlocks(r, node.children, level + 1);
  if (r.count === before2) rawLine(r, "");
  line(r, level, "</div>");
}
function capitalized(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
function admonitionName(r, node, id) {
  if (id !== null) return [["aria-labelledby", id]];
  if (hasAuthoredName(node)) return [];
  const kind = capitalized(node.kind);
  return [["aria-label", r.settings.labels[`admonition${kind}`] ?? kind]];
}
function admonition(r, node, level) {
  const id = r.resolution.labelIds.get(node) ?? null;
  line(r, level, `<aside${tag(r, node, { base: ["admonition", node.kind], generated: admonitionName(r, node, id) })}>`);
  const before2 = r.count;
  writeTitle(r, node, level + 1, id);
  writeBlocks(r, node.children, level + 1);
  if (r.count === before2) rawLine(r, "");
  line(r, level, "</aside>");
}
function captionLine(r, caption2, name, level) {
  const blocks = caption2.children.filter(isVisible);
  const first = blocks[0];
  if (blocks.length === 1 && isTextParagraph(first)) {
    line(r, level, `<${name}>${inlineHtml(r, first.children)}</${name}>`);
    return;
  }
  line(r, level, `<${name}>`);
  writeBlocks(r, blocks, level + 1);
  line(r, level, `</${name}>`);
}
function figureOf2(r, node, level, base) {
  line(r, level, `<figure${tag(r, node, { base })}>`);
  const before2 = r.count;
  const group = base === GROUP_CLASSES;
  for (const child of node.children) {
    if (group && child.type === "figure") figureOf2(r, child, level + 1, PANEL_CLASSES);
    else writeBlock(r, child.type, child, level + 1);
  }
  const caption2 = node.caption;
  if (caption2 !== void 0) captionLine(r, caption2, "figcaption", level + 1);
  if (r.count === before2) rawLine(r, "");
  line(r, level, "</figure>");
}
function preHtml(r, node, language, title, label) {
  const structural = [];
  const authored = node.attrs?.keyValues?.some(([key]) => key.toLowerCase() === "title") === true;
  if (title !== void 0 && !authored) structural.push(["title", title]);
  if (r.settings.roundtrip && label !== void 0) structural.push(["data-carve-label", label]);
  const code = language === void 0 ? "<code>" : `<code class="language-${escapeAttribute(language)}">`;
  return `<pre${tag(r, node, { structural })}>${code}${escapeText(node.value)}</code></pre>`;
}
function codeBlock(r, node, level) {
  const title = node.title === void 0 ? void 0 : plainText(node.title);
  line(r, level, preHtml(r, node, node.syntax, title, node.groupLabel));
}
function rawBlock(r, node, level) {
  if (node.format !== "html") {
    loss(r, node, "raw-format-dropped", `raw content in the format ${node.format} is not written to HTML`);
    return;
  }
  if (!r.settings.rawHtml) {
    line(r, level, preHtml(r, node, "html"));
    return;
  }
  const value = node.value;
  rawLine(r, value.endsWith("\n") ? value.slice(0, -1) : value);
}
function leadingSpaces(text) {
  let count = 0;
  while (text[count] === " ") count++;
  return count;
}
function lineHtml(r, node) {
  const children2 = node.children;
  const first = children2[0];
  if (first?.type !== "text") return inlineHtml(r, children2);
  const spaces = leadingSpaces(first.value);
  return "&nbsp;".repeat(spaces) + inlineHtml(r, [{ ...first, value: first.value.slice(spaces) }, ...children2.slice(1)]);
}
function lineBlock(r, node, level) {
  const structural = r.settings.roundtrip ? [["data-carve-line-block", null]] : [];
  line(r, level, `<div${tag(r, node, { last: [LINE_BLOCK_CLASS], structural })}>`);
  const before2 = r.count;
  let stanza = [];
  const flush = () => {
    if (stanza.length > 0) line(r, level + 1, `<p>${stanza.join("<br>\n")}</p>`);
    stanza = [];
  };
  for (const child of node.children) {
    if (child.children.length === 0) flush();
    else stanza.push(lineHtml(r, child));
  }
  flush();
  if (r.count === before2) rawLine(r, "");
  line(r, level, "</div>");
}
function include(r, node, level) {
  loss(r, node, "include-unresolved", `the include of ${node.path} was not expanded`);
  line(r, level, `<p>${escapeText(includeSource(node))}</p>`);
}
function blockExtension(r, node, level) {
  loss(r, node, "extension-fallback-rendered", `the extension ${node.name} is rendered through its fallback`);
  writeBlocks(r, node.fallback, level);
}
function isCssKeyword(value) {
  for (let at = 0; at < value.length; at++) {
    const code = value.charCodeAt(at) | 32;
    if ((code < 97 || code > 122) && value.charCodeAt(at) !== 45) return false;
  }
  return value !== "";
}
function cellStyle(cell, column, headValign) {
  const align = cell.align ?? column?.resolvedAlign ?? column?.align;
  const valign = cell.valign ?? headValign ?? column?.valign;
  let declarations = align === void 0 ? "" : `text-align: ${align};`;
  if (valign !== void 0 && isCssKeyword(valign)) declarations += `${declarations === "" ? "" : " "}vertical-align: ${valign};`;
  return declarations;
}
function isCellParagraph(block) {
  return block.type === "cell_paragraph";
}
function cellContent(r, cell) {
  const blocks = cell.children;
  if (blocks.every(isCellParagraph)) return blocks.map((block) => inlineHtml(r, block.children)).join(" ");
  const inner = { ...r, out: "", count: 0 };
  writeBlocks(inner, blocks, 0);
  return inner.out.slice(1);
}
function cellHtml(r, cell, column, headValign, inHead) {
  const name = cell.header ? "th" : "td";
  const structural = [];
  const rowspan = cell.rowspan;
  if (rowspan !== void 0 && rowspan > 1) structural.push(["rowspan", String(rowspan)]);
  const colspan = cell.colspan;
  if (colspan !== void 0 && colspan > 1) structural.push(["colspan", String(colspan)]);
  if (cell.header) structural.push(["scope", inHead ? "col" : "row"]);
  return `<${name}${attributes(r, cell, { structural, style: cellStyle(cell, column, headValign) })}>${cellContent(r, cell)}</${name}>`;
}
function skipCovered(covered, column) {
  let at = column;
  for (let left = covered[at] ?? 0; left > 0; left = covered[at] ?? 0) covered[at++] = left - 1;
  return at;
}
function rowHtml(r, row, layout, covered, inHead) {
  const cells = row.children;
  const marked = cells.some((cell) => cell.span !== void 0);
  let html = "";
  let column = 0;
  for (const cell of cells) {
    if (!marked) column = skipCovered(covered, column);
    const colspan = cell.colspan ?? 1;
    if (cell.span === void 0) {
      html += cellHtml(r, cell, layout.columns[column], layout.headValign[column], inHead);
      const below = (cell.rowspan ?? 1) - 1;
      if (!marked) for (let more = 0; more < colspan; more++) covered[column + more] = below;
    }
    column += marked ? 1 : colspan;
  }
  return `<tr${tag(r, row)}>${html}</tr>`;
}
function writeRows(r, layout, group, level, covered) {
  for (const row of group.children) {
    if (row.type === "table_row") line(r, level, rowHtml(r, row, layout, covered, group.type === "table_head"));
  }
}
function isRow(row) {
  return row.type === "table_row";
}
function spanCrossesGroup(groups) {
  for (const group of groups) {
    const rows = group.children.filter(isRow);
    const crosses = rows.some((row, index) => row.children.some((cell) => index + (cell.rowspan ?? 1) > rows.length));
    if (crosses) return true;
  }
  return false;
}
var GROUP_ELEMENTS = { table_head: "thead", table_body: "tbody", table_foot: "tfoot" };
function isGroup(node) {
  return node.type !== "comment";
}
function writeGroups(r, layout, groups, level) {
  if (spanCrossesGroup(groups)) {
    const covered = [];
    line(r, level, "<tbody>");
    for (const group of groups) writeRows(r, layout, group, level + 1, covered);
    line(r, level, "</tbody>");
    return;
  }
  for (const group of groups) {
    if (!group.children.some(isRow)) continue;
    const name = GROUP_ELEMENTS[group.type];
    line(r, level, `<${name}${tag(r, group)}>`);
    writeRows(r, layout, group, level + 1, []);
    line(r, level, `</${name}>`);
  }
}
var PERCENT_DIGITS = 10;
function percentText(width) {
  const text = (width * 100).toFixed(PERCENT_DIGITS);
  let end = text.length;
  while (text[end - 1] === "0") end--;
  return text.slice(0, text[end - 1] === "." ? end - 1 : end);
}
function writeColumnGroup(r, columns, level) {
  if (!columns.some((column) => column.width !== void 0)) return;
  line(r, level, "<colgroup>");
  for (const column of columns) {
    const width = column.width;
    line(r, level + 1, width === void 0 ? "<col>" : `<col style="width: ${percentText(width)}%;">`);
  }
  line(r, level, "</colgroup>");
}
function table(r, node, level) {
  line(r, level, `<table${tag(r, node)}>`);
  const caption2 = node.caption;
  if (caption2 !== void 0) captionLine(r, caption2, "caption", level + 1);
  const layout = { columns: node.columns, headValign: headMarks(node, "valign") };
  writeColumnGroup(r, layout.columns, level + 1);
  writeGroups(r, layout, node.children.filter(isGroup), level + 1);
  line(r, level, "</table>");
}
var BLOCKS2 = {
  paragraph,
  heading: (r, node, level) => line(r, level, headingHtml(r, node, false)),
  block_quote: quote2,
  list,
  definition_list: container("dl"),
  definition_term: (r, node, level) => line(r, level, `<dt${tag(r, node)}>${inlineHtml(r, node.children)}</dt>`),
  definition_description: description,
  div,
  directive: div,
  admonition,
  figure: (r, node, level) => figureOf2(r, node, level, NO_CLASSES),
  figure_group: (r, node, level) => figureOf2(r, node, level, GROUP_CLASSES),
  table,
  code_block: codeBlock,
  raw_block: rawBlock,
  line_block: lineBlock,
  // C2-H-046.
  thematic_break: (r, node, level) => line(r, level, `<hr${tag(r, node)}>`),
  include,
  // C2-H-142.
  section: container("section"),
  block_extension: blockExtension
};
function backlinksHtml(r, note) {
  const label = r.settings.labels["footnoteBacklink"] ?? "";
  const single = note.refIds.length === 1;
  return note.refIds.map((id, index) => {
    const ordinal = single ? "" : `<sup>${index + 1}</sup>`;
    const text = escapeAttribute(single ? label : `${label} ${index + 1}`);
    return `<a href="#${escapeAttribute(id)}" role="doc-backlink" aria-label="${text}">\u21A9${ordinal}</a>`;
  }).join(" ");
}
function noteCarriers(r, note) {
  if (!r.settings.roundtrip) return "";
  if (note.definition === null) return " data-carve-inline-footnote";
  return ` data-carve-footnote-label="${escapeAttribute(note.definition.key)}"`;
}
function noteBlocks(note) {
  if (note.definition !== null) return note.definition.children;
  return note.inline === null ? [] : [{ type: "paragraph", children: [...note.inline.children] }];
}
function writeNote(r, note, level) {
  const blocks = noteBlocks(note);
  const visible = blocks.filter(isVisible);
  const last = visible[visible.length - 1];
  r.backlinks = backlinksHtml(r, note);
  r.backlinkHost = isTextParagraph(last) ? last : null;
  line(r, level, `<li id="fn${note.number}"${noteCarriers(r, note)}>`);
  writeBlocks(r, blocks, level + 1);
  if (r.backlinkHost === null) line(r, level + 1, `<p>${r.backlinks}</p>`);
  r.backlinkHost = null;
  line(r, level, "</li>");
}
function writeNotes(r, level, directive) {
  const id = directive === null ? void 0 : r.resolution.labelIds.get(directive);
  const label = r.settings.labels["endnotes"] ?? "";
  const name = id === void 0 ? `aria-label="${escapeAttribute(label)}"` : `aria-labelledby="${escapeAttribute(id)}"`;
  line(r, level, `<section role="doc-endnotes" ${name}>`);
  if (directive !== null) writeTitle(r, directive, level + 1, id ?? null);
  line(r, level + 1, "<hr>");
  line(r, level + 1, "<ol>");
  for (const note of r.resolution.notes) writeNote(r, note, level + 2);
  line(r, level + 1, "</ol>");
  line(r, level, "</section>");
}
function isNotesDirective(node) {
  return node.type === "directive" && node.kind === "footnotes";
}
function closeSections(r, open, level) {
  for (let top = open.at(-1); top !== void 0 && top >= level; top = open.at(-1)) {
    open.pop();
    line(r, open.length, "</section>");
  }
}
function sectionAttributes(r, node, id) {
  if (r.settings.roundtrip) return attributes(r, null, { structural: idCarriers(r, node), id: id ?? null });
  return id === void 0 ? "" : ` id="${escapeAttribute(id)}"`;
}
function openSection(r, node, open) {
  closeSections(r, open, node.level);
  const id = headingId2(node);
  line(r, open.length, `<section${sectionAttributes(r, node, id)}>`);
  open.push(node.level);
  line(r, open.length, headingHtml(r, node, true));
}
function writeDocument(r, document) {
  const open = [];
  const hasNotes = r.resolution.notes.length > 0;
  let placed = false;
  for (const node of document.children) {
    if (node.type === "heading" && r.settings.sections) {
      openSection(r, node, open);
    } else if (isNotesDirective(node) && hasNotes && !placed) {
      placed = true;
      writeBlocks(r, node.children, open.length);
      writeNotes(r, open.length, node);
    } else {
      writeBlock(r, node.type, node, open.length);
    }
  }
  closeSections(r, open, 0);
  if (hasNotes && !placed) writeNotes(r, 0, null);
}
function renderDocument(document, settings, resolution, losses, bidi) {
  const r = {
    settings,
    resolution,
    out: "",
    count: 0,
    losses,
    linkRel: PROFILES.get(settings.profile)?.linkRel ?? "",
    linkDepth: 0,
    abbrDepth: 0,
    backlinkHost: null,
    backlinks: "",
    bidi
  };
  writeDocument(r, document);
  return { html: r.out.slice(1), losses: r.losses };
}

// ../carve-js/v2/src/layout-lines.ts
function lineStartOf(src, pos) {
  return pos <= 0 ? 0 : src.lastIndexOf("\n", pos - 1) + 1;
}
function lineEndOf(src, pos) {
  const feed = src.indexOf("\n", pos);
  if (feed < 0) return src.length;
  return feed > pos && src.charCodeAt(feed - 1) === CR ? feed - 1 : feed;
}
function readPrefix(src, start, end, quotes) {
  const from = start === 0 && src.charCodeAt(0) === BYTE_ORDER_MARK ? 1 : start;
  const prefix = { pos: from, column: 0, origin: 0, marks: 0 };
  while (prefix.marks < quotes) {
    let pos = prefix.pos;
    let column = prefix.column;
    while (pos < end && isSpaceOrTab(src.charCodeAt(pos))) column = advanceColumn(column, src.charCodeAt(pos++));
    if (pos >= end || src.charCodeAt(pos) !== GREATER) break;
    pos++;
    column++;
    if (pos < end && src.charCodeAt(pos) === SPACE) {
      pos++;
      column++;
    }
    prefix.pos = pos;
    prefix.column = column;
    prefix.origin = column;
    prefix.marks++;
  }
  return prefix;
}
function columnOf(src, offset, quotes) {
  const prefix = readPrefix(src, lineStartOf(src, offset), offset, quotes);
  let column = prefix.column;
  for (let pos = prefix.pos; pos < offset; pos++) {
    const code = src.charCodeAt(pos);
    if (!isSecondHalf(src, pos)) column = advanceColumn(column, code);
  }
  return column - prefix.origin;
}
function isBlankInside(src, start, end, quotes) {
  const prefix = readPrefix(src, start, end, quotes);
  return prefix.marks === quotes && skipSpaces2(src, prefix.pos, end) >= end;
}
function blankLinesBefore(src, start, floor, quotes) {
  const first = lineStartOf(src, floor);
  let line2 = lineStartOf(src, start);
  let count = 0;
  while (line2 > first) {
    const previous = lineStartOf(src, line2 - 1);
    if (!isBlankInside(src, previous, lineEndOf(src, previous), quotes)) break;
    count++;
    line2 = previous;
  }
  return count;
}
function blankLinesAfter(src, end, limit, quotes, open) {
  let count = 0;
  let feed = src.indexOf("\n", end);
  while (feed >= 0 && feed + 1 < src.length) {
    const start = feed + 1;
    if (!open && start >= limit) break;
    if (!isBlankInside(src, start, lineEndOf(src, start), quotes)) break;
    count++;
    feed = src.indexOf("\n", start);
  }
  return count;
}
function markedBlankEnd(src, end, quotes) {
  let last = end;
  let feed = src.indexOf("\n", end);
  while (feed >= 0 && feed + 1 < src.length) {
    const start = feed + 1;
    const lineEnd = lineEndOf(src, start);
    if (!isBlankInside(src, start, lineEnd, quotes)) break;
    last = lineEnd;
    feed = src.indexOf("\n", start);
  }
  return last;
}
function byteOffsets(src) {
  let ascii = true;
  for (let at = 0; at < src.length && ascii; at++) ascii = src.charCodeAt(at) < 128;
  if (ascii) return (offset) => offset;
  const table3 = new Int32Array(src.length + 1);
  let bytes = 0;
  for (let at = 0; at < src.length; at++) {
    table3[at] = bytes;
    bytes += unitBytes(src, at);
  }
  table3[src.length] = bytes;
  return (offset) => table3[offset];
}

// ../carve-js/v2/src/layout-facts.ts
var FRONTMATTER_RUN2 = 3;
function setMarker(src, start, end, quotes, facts) {
  facts.markerRaw = src.slice(start, end);
  facts.markerColumn = columnOf(src, start, quotes);
}
function hasLazyLine(src, node, first, column, quotes) {
  for (const child of node.children ?? []) {
    if (child.children !== null) {
      if (hasLazyLine(src, child, first, column, quotes)) return true;
    } else if (child.kind === PARAGRAPH) {
      const spans = child.spans;
      for (let at = 0; at < spans.length; at += 2) {
        if (spans[at] > first && columnOf(src, spans[at], quotes) < column) return true;
      }
    }
  }
  return false;
}
function continuationStyle(src, origin, column, quotes) {
  const first = src.indexOf("\n", origin.start);
  if (first < 0 || first >= origin.end) return "marker_line";
  if (hasLazyLine(src, origin, first, column, quotes)) return "lazy";
  let later = false;
  for (let feed = first; feed >= 0 && feed + 1 < origin.end; feed = src.indexOf("\n", feed + 1)) {
    const end = lineEndOf(src, feed + 1);
    const at = skipSpaces2(src, readPrefix(src, feed + 1, end, quotes).pos, end);
    if (at >= end) continue;
    later = true;
    if (columnOf(src, at, quotes) >= column) return "indent";
  }
  return later ? "none" : "marker_line";
}
function setContent2(src, origin, from, end, quotes, facts) {
  const content = from < 0 ? end : skipSpaces2(src, from, end);
  if (content >= end) return;
  facts.contentColumn = columnOf(src, content, quotes);
  facts.continuationStyle = continuationStyle(src, origin, facts.contentColumn, quotes);
}
var itemFacts = (src, _node, origin, quotes, facts) => {
  const start = origin.start;
  const end = lineEndOf(src, start);
  const first = src.charCodeAt(start);
  if (first === HYPHEN || first === STAR) {
    setMarker(src, start, start + 1, quotes, facts);
    const content = bulletMarkerEnd(src, start, end);
    setContent2(src, origin, origin.aux !== 0 && content >= 0 ? taskBoxEnd(src, content, end) : content, end, quotes, facts);
    return;
  }
  const delimiter = orderedDelimiter(src, start, end);
  setMarker(src, start, delimiter + 1, quotes, facts);
  setContent2(src, origin, orderedMarkerEnd(src, start, delimiter, end), end, quotes, facts);
};
var descriptionFacts = (src, _node, origin, quotes, facts) => {
  const end = lineEndOf(src, origin.start);
  setMarker(src, origin.start, origin.start + 1, quotes, facts);
  setContent2(src, origin, descriptionMarkEnd(src, origin.start, end), end, quotes, facts);
};
function setDefinition(src, origin, end, quotes, facts) {
  const close = definitionLabel(src, origin.start)[1];
  setMarker(src, origin.start, close + 2, quotes, facts);
  facts.metadataSeparatorRaw = src.slice(close + 1, skipSpaces2(src, close + 2, end));
}
var footnoteFacts = (src, _node, origin, quotes, facts) => {
  const end = lineEndOf(src, origin.start);
  setDefinition(src, origin, end, quotes, facts);
  setContent2(src, origin, footnoteMarkerEnd(src, origin.start, end), end, quotes, facts);
};
var definitionFacts = (src, _node, origin, quotes, facts) => {
  setDefinition(src, origin, origin.end, quotes, facts);
};
var termFacts = (src, _node, origin, quotes, facts) => {
  setMarker(src, origin.start, origin.start + 2, quotes, facts);
  facts.metadataSeparatorRaw = src.slice(origin.start + 2, origin.spans[0]);
};
var headingFacts = (src, _node, origin, quotes, facts) => {
  setMarker(src, origin.start, origin.start + origin.aux, quotes, facts);
};
var breakFacts = (src, _node, origin, quotes, facts) => {
  setMarker(src, origin.start, trimEnd(src, origin.start, origin.end), quotes, facts);
};
var commentFacts = (src, _node, origin, quotes, facts) => {
  if (quotes === 0) return;
  const prefix = readPrefix(src, lineStartOf(src, origin.start), origin.start, quotes - 1);
  const mark2 = skipSpaces2(src, prefix.pos, origin.start);
  if (mark2 < origin.start && src.charCodeAt(mark2) === GREATER) facts.markerColumn = columnOf(src, mark2, quotes - 1);
};
function runStart2(src, line2, stop) {
  const code = src.charCodeAt(stop - 1);
  let run = stop;
  while (run > line2 && src.charCodeAt(run - 1) === code) run--;
  return run;
}
function setFence(src, origin, length, facts) {
  facts.openerRaw = src.slice(origin.start, origin.start + length);
  if ((origin.exitFlags & FLAG_UNCLOSED) !== 0) {
    facts.closerRaw = "";
    return;
  }
  const line2 = lineStartOf(src, origin.end);
  const stop = trimEnd(src, line2, origin.end);
  facts.closerRaw = src.slice(runStart2(src, line2, stop), stop);
}
function closesInner(node, length) {
  let at = node;
  for (; ; ) {
    const children2 = at.children;
    if (children2 === null || children2.length === 0) return false;
    const last = children2[children2.length - 1];
    if (last.end !== node.end) return false;
    if (last.kind === DIV && last.aux <= length) return true;
    if (last.kind === LINE_BLOCK && (last.exitFlags & FLAG_UNCLOSED) === 0) return true;
    at = last;
  }
}
function divCloser(src, origin) {
  const line2 = lineStartOf(src, origin.end);
  if (line2 === lineStartOf(src, origin.start)) return "";
  const stop = trimEnd(src, line2, origin.end);
  if (stop === line2 || src.charCodeAt(stop - 1) !== COLON) return "";
  const run = runStart2(src, line2, stop);
  for (let pos = line2; pos < run; pos++) {
    const code = src.charCodeAt(pos);
    if (!isSpaceOrTab(code) && code !== GREATER) return "";
  }
  return stop - run < origin.aux || closesInner(origin, stop - run) ? "" : src.slice(run, stop);
}
var divFacts = (src, node, origin, _quotes, facts) => {
  if (node.type === "figure_group") return;
  if (node.type === "block_quote") facts.fenced = true;
  if (node.type === "div" && node.attrs?.classes?.includes(HARD_BREAKS_CLASS) === true) {
    facts.hardBreakOpener = (origin.flags & FLAG_HARD_BREAKS) !== 0;
  }
  facts.openerRaw = src.slice(origin.start, origin.start + origin.aux);
  facts.closerRaw = divCloser(src, origin);
};
var codeFacts = (src, node, origin, _quotes, facts) => {
  if (node.type !== "table") return setFence(src, origin, origin.aux, facts);
  facts.sourceFormat = isWord(src, origin.start + origin.aux, lineEndOf(src, origin.start), "tsv") ? "tsv" : "csv";
};
var MEASURES = /* @__PURE__ */ new Map([
  [QUOTE, (_src, _node, _origin, _quotes, facts) => {
    facts.fenced = false;
  }],
  // C2-L-016: the form of the first marker.
  [ORDERED_LIST, (_src, _node, origin, _quotes, facts) => {
    facts.bare = (origin.flags & FLAG_AUTO) !== 0;
  }],
  [ITEM, itemFacts],
  [DESCRIPTION, descriptionFacts],
  [FOOTNOTE, footnoteFacts],
  [DIV, divFacts],
  [TABLE, (_src, _node, _origin, _quotes, facts) => {
    facts.sourceFormat = "pipe";
  }],
  [TERM, termFacts],
  [CAPTION, (_src, _node, _origin, _quotes, facts) => {
    facts.attachment = "preceding";
  }],
  [CODE, codeFacts],
  [COMMENT_BLOCK, (src, _node, origin, _quotes, facts) => setFence(src, origin, origin.aux, facts)],
  [LINE_BLOCK, (src, _node, origin, _quotes, facts) => setFence(src, origin, origin.aux, facts)],
  [FRONTMATTER, (src, _node, origin, _quotes, facts) => setFence(src, origin, FRONTMATTER_RUN2, facts)],
  [HEADING, headingFacts],
  [THEMATIC_BREAK, breakFacts],
  [COMMENT, commentFacts],
  [LINK_DEFINITION, definitionFacts],
  [ABBREVIATION, definitionFacts]
]);
function measureBlock(src, node, origin, quotes, facts) {
  MEASURES.get(origin.kind)?.(src, node, origin, quotes, facts);
}

// ../carve-js/v2/src/layout-table.ts
function tableRows(table3) {
  const rows = table3.children.filter((child) => child.kind === ROW);
  const index = /* @__PURE__ */ new Map();
  rows.forEach((row, at) => index.set(row, at));
  return { rows, index, continuations: [] };
}
function continuationRows(src, table3, at) {
  const known = table3.continuations[at];
  if (known !== void 0) return known;
  const row = table3.rows[at];
  const found = [];
  for (let feed = src.indexOf("\n", row.start); feed >= 0 && feed < row.end; feed = src.indexOf("\n", feed + 1)) {
    let pos = feed + 1;
    while (pos < row.end && (isSpaceOrTab(src.charCodeAt(pos)) || src.charCodeAt(pos) === GREATER)) pos++;
    if (src.charCodeAt(pos) === PLUS) found.push(pos, lineEndOf(src, pos));
  }
  table3.continuations[at] = found;
  return found;
}
function cellRange(src, table3, row, cell) {
  const spans = cell.spans;
  const formed = cell.start >= lineEndOf(src, table3.rows[row].start);
  const last = spans.length === 0 ? cell.end : spans[spans.length - 1];
  return [formed ? cell.start : cell.start + 1, Math.max(cell.end, skipSpaces2(src, last, lineEndOf(src, last)))];
}
function addWrap(walk, fragment, path, offset) {
  const rows = walk.table.rows;
  let row = walk.row;
  while (row < rows.length && rows[row].end < fragment) row++;
  if (row >= rows.length || rows[row].start > fragment) return;
  if (row !== walk.row) walk.line = 0;
  walk.row = row;
  const lines = continuationRows(walk.src, walk.table, row);
  while (walk.line < lines.length && lines[walk.line + 1] < fragment) walk.line += 2;
  if (walk.line >= lines.length || lines[walk.line] > fragment) return;
  const wrap = { line: walk.line / 2 + 1, path, offset };
  if (walk.spanning) wrap.row = row - walk.home;
  walk.wraps.push(wrap);
}
function textWraps(walk, value, path, breaks) {
  let from = 0;
  let bytes = 0;
  for (let at = 0; at < breaks.length; at += 2) {
    bytes += utf8Length(value.slice(from, breaks[at]));
    from = breaks[at];
    addWrap(walk, breaks[at + 1], path, bytes);
  }
}
function valueWraps(walk, value, path, start, end) {
  const spans = walk.spans;
  while (walk.spanAt < spans.length && spans[walk.spanAt] <= start) walk.spanAt += 2;
  let feed = -1;
  let bytes = 0;
  for (; walk.spanAt < spans.length && spans[walk.spanAt] < end; walk.spanAt += 2) {
    const next = value.indexOf("\n", feed + 1);
    if (next < 0) return;
    bytes += utf8Length(value.slice(feed + 1, next + 1));
    feed = next;
    addWrap(walk, spans[walk.spanAt], path, bytes);
  }
}
function startsPiece(walk, offset) {
  const spans = walk.spans;
  while (walk.spanAt < spans.length && spans[walk.spanAt] < offset) walk.spanAt += 2;
  return walk.spanAt < spans.length && spans[walk.spanAt] === offset;
}
function walkList(walk, nodes, base) {
  for (let at = 0; at < nodes.length; at++) {
    const node = nodes[at];
    const path = `${base}/${at}`;
    const breaks = walk.trace.breaks.get(node);
    const origin = walk.trace.inlines.get(node);
    if (breaks !== void 0 && node.type === "text") {
      textWraps(walk, node.value, path, breaks);
    } else if (origin === void 0) {
      continue;
    } else if (node.type === "hard_break") {
      if (at + 1 < nodes.length && startsPiece(walk, origin.end)) addWrap(walk, origin.end, `${base}/${at + 1}`, 0);
    } else if (isInlineParent(node)) {
      walkList(walk, node.children, `${path}/children`);
    } else if ("value" in node) {
      valueWraps(walk, node.value, path, origin.start, origin.end);
    }
  }
}
function cellWraps(src, trace, table3, home, node, cell, path) {
  const walk = {
    src,
    trace,
    table: table3,
    home,
    spanning: (node.rowspan ?? 1) > 1,
    spans: cell.spans,
    spanAt: 2,
    row: home,
    line: 0,
    wraps: []
  };
  const paragraph2 = node.children[0];
  const content = paragraph2 !== void 0 && isInlineParent(paragraph2) ? paragraph2.children : [];
  const base = `${path}/children/0/children`;
  if (content.length > 0 && cell.spans.length > 0 && cell.spans[0] >= lineEndOf(src, table3.rows[home].start)) {
    addWrap(walk, cell.spans[0], `${base}/0`, 0);
  }
  walkList(walk, content, base);
  if (walk.spanning) walk.wraps.sort((a, b) => a.line - b.line);
  return walk.wraps;
}

// ../carve-js/v2/src/layout.ts
var LAYOUT_VERSION = 2;
function createLayoutTrace() {
  return { blocks: /* @__PURE__ */ new Map(), inlines: /* @__PURE__ */ new Map(), breaks: /* @__PURE__ */ new Map() };
}
function lineEndings(src) {
  let lf = false;
  let crlf = false;
  let cr = false;
  for (let at = 0; at < src.length; at++) {
    const code = src.charCodeAt(at);
    if (code === LF) lf = true;
    else if (code === CR && src.charCodeAt(at + 1) === LF) crlf = true;
    else if (code === CR) cr = true;
    if (code === CR && src.charCodeAt(at + 1) === LF) at++;
  }
  const kinds = Number(lf) + Number(crlf) + Number(cr);
  if (kinds > 1) return "mixed";
  if (kinds === 0) return "none";
  return lf ? "lf" : crlf ? "crlf" : "cr";
}
function addEntry(walk, node, path, start, end, facts) {
  const pos = node.pos;
  walk.nodes.push({
    path,
    startByte: pos === void 0 ? walk.bytes(start) : pos.startOffset,
    endByte: pos === void 0 ? walk.bytes(end) : pos.endOffset,
    ...facts
  });
}
function setBlankLines(walk, start, end, frame, facts, after2 = end) {
  facts.blankLinesBefore = blankLinesBefore(walk.src, start, frame.start, frame.quotes);
  facts.blankLinesAfter = blankLinesAfter(walk.src, after2, frame.end, frame.quotes, frame.open);
}
function firstOffset(origin) {
  return origin.attributes !== null && origin.attributes.length > 0 ? origin.attributes[0] : origin.start;
}
function visitRow(walk, node, path, origin, frame) {
  const row = frame.table?.index.get(origin) ?? -1;
  if (frame.table === null || row < 0) return frame;
  const count = continuationRows(walk.src, frame.table, row).length / 2;
  if (count > 0) addEntry(walk, node, path, origin.start, origin.end, { continuationLines: count });
  return { ...frame, row };
}
function visitCell(walk, node, path, origin, frame) {
  if (frame.table !== null && frame.row >= 0) {
    const wraps = cellWraps(walk.src, walk.trace, frame.table, frame.row, node, origin, path);
    if (wraps.length > 0) {
      const range = cellRange(walk.src, frame.table, frame.row, origin);
      addEntry(walk, node, path, range[0], range[1], { wraps });
    }
  }
  return { ...frame, spans: origin.spans };
}
function visitBlock(walk, node, path, origin, frame) {
  if (origin.kind === ROW) return visitRow(walk, node, path, origin, frame);
  if (origin.kind === CELL && node.type === "table_cell") return visitCell(walk, node, path, origin, frame);
  const start = firstOffset(origin);
  const captionNode2 = captionOf(node);
  const caption2 = captionNode2 === void 0 ? void 0 : walk.trace.blocks.get(captionNode2);
  const end = caption2 === void 0 ? origin.end : Math.max(origin.end, caption2.end);
  const facts = {};
  measureBlock(walk.src, node, origin, frame.quotes, facts);
  const quote3 = origin.kind === QUOTE;
  const after2 = quote3 && facts.fenced !== true ? markedBlankEnd(walk.src, end, frame.quotes + 1) : end;
  setBlankLines(walk, start, end, frame, facts, after2);
  addEntry(walk, node, path, start, end, facts);
  return {
    start,
    end,
    quotes: frame.quotes + (quote3 ? 1 : 0),
    open: quote3,
    spans: origin.spans,
    table: origin.kind === TABLE ? tableRows(origin) : null,
    row: -1
  };
}
function visitFigure(walk, node, path, frame) {
  const first = node.children[0];
  const target2 = first === void 0 ? void 0 : walk.trace.blocks.get(first);
  const caption2 = node.caption === void 0 ? void 0 : walk.trace.blocks.get(node.caption);
  if (target2 === void 0 || caption2 === void 0) return frame;
  const start = firstOffset(target2);
  const facts = {};
  setBlankLines(walk, start, caption2.end, frame, facts);
  addEntry(walk, node, path, start, caption2.end, facts);
  return { ...frame, start, end: caption2.end, open: false };
}
function visitInline(walk, node, path, frame) {
  if (node.type !== "link" && node.type !== "image" || node.key === void 0) return;
  const origin = walk.trace.inlines.get(node);
  if (origin === void 0 || origin.aux === 0) return;
  const start = node.type === "image" ? origin.start + 1 : origin.start;
  const rawRef = frame.spans === null ? walk.src.slice(start, origin.aux) : contentSource(walk.src, frame.spans, start, origin.aux);
  addEntry(walk, node, path, origin.start, origin.end, { rawRef });
}
function visit2(walk, node, path, frame) {
  const origin = walk.trace.blocks.get(node);
  let inner = frame;
  if (origin !== void 0) inner = visitBlock(walk, node, path, origin, frame);
  else if (node.type === "figure") inner = visitFigure(walk, node, path, frame);
  else visitInline(walk, node, path, frame);
  const title = titleOf(node);
  if (title !== void 0) visitList(walk, title, `${path}/title`, inner);
  if ("children" in node) visitList(walk, node.children, `${path}/children`, inner);
  const caption2 = captionOf(node);
  if (caption2 !== void 0) visit2(walk, caption2, `${path}/caption`, inner);
}
function visitList(walk, nodes, base, frame) {
  for (let index = 0; index < nodes.length; index++) visit2(walk, nodes[index], `${base}/${index}`, frame);
}
function buildLayout(src, document, trace) {
  const walk = { src, trace, bytes: byteOffsets(src), nodes: [] };
  visit2(walk, document, "", { start: 0, end: src.length, quotes: 0, open: false, spans: null, table: null, row: -1 });
  return {
    version: LAYOUT_VERSION,
    encoding: "utf-8",
    source: src,
    lineEndings: lineEndings(src),
    bom: src.charCodeAt(0) === BYTE_ORDER_MARK,
    nodes: walk.nodes
  };
}

// ../carve-js/v2/src/profile.ts
var UNWRITTEN = ["comment", "frontmatter", ...DEFINITION_TYPES];
var SPELLED_TEXT = {
  image: (node) => `[img: ${node.alt ?? ""}]`,
  footnote_ref: (node) => `[^${node.key}]`,
  comment: () => "",
  symbol: (node) => `:${node.name}:`,
  xref: (node) => `</#${node.key}>`,
  raw_inline: (node) => node.value,
  inline_footnote: (node) => inlinesText(node.children)
};
function spelledText(type, node) {
  return SPELLED_TEXT[type]?.(node, void 0);
}
function inlineText(node) {
  const spelled = spelledText(node.type, node);
  if (spelled !== void 0) return spelled;
  return isInlineParent(node) ? inlinesText(node.children) : plainText([node]);
}
function inlinesText(nodes) {
  let out = "";
  for (const node of nodes) out += inlineText(node);
  return out;
}
function joined(nodes, prefix) {
  const parts = [];
  for (const node of nodes) {
    const text = UNWRITTEN.includes(node.type) ? "" : blockText2(node);
    if (text !== "") parts.push(prefix + text);
  }
  return parts.join(" ");
}
function withoutLineEnd(value) {
  return value.endsWith("\n") ? value.slice(0, -1) : value;
}
function containerText(node) {
  const title = titleOf(node);
  const caption2 = captionOf(node);
  const rest = ["children" in node ? joined(node.children, "") : "", caption2 === void 0 ? "" : blockText2(caption2)];
  return [title === void 0 ? "" : inlinesText(title), ...rest].filter((part) => part !== "").join(" ");
}
function quoteText(node) {
  const text = joined(node.children, "");
  return text === "" ? "" : `> ${text}`;
}
function headingText(node) {
  return `${"#".repeat(node.level)} ${inlinesText(node.children)}`;
}
function rowText(node) {
  return node.children.filter((cell) => cell.span === void 0).map(blockText2).join(" | ");
}
var MARKED_TEXT = {
  heading: headingText,
  block_quote: quoteText,
  list: (node) => joined(node.children, "- "),
  thematic_break: () => "---",
  code_block: (node) => withoutLineEnd(node.value),
  raw_block: (node) => withoutLineEnd(node.value),
  table_row: rowText,
  include: includeSource,
  // A degraded admonition or directive keeps its title, as a div does.
  div: containerText,
  admonition: containerText,
  directive: containerText
};
function markedText(type, node) {
  return MARKED_TEXT[type]?.(node, void 0);
}
function blockText2(node) {
  const marked = markedText(node.type, node);
  if (marked !== void 0) return marked;
  return isInlineParent(node) ? inlinesText(node.children) : containerText(node);
}
function textParagraph(text) {
  return text === "" ? [] : [{ type: "paragraph", children: [{ type: "text", value: text }] }];
}
function tableParagraph(node) {
  const out = [];
  for (const group of node.children) {
    if (group.type === "comment") continue;
    for (const row of group.children) {
      if (row.type !== "table_row") continue;
      if (out.length > 0) out.push({ type: "hard_break" });
      out.push({ type: "text", value: rowText(row) });
    }
  }
  return out.length === 0 ? [] : [{ type: "paragraph", children: out }];
}
function degradedBlocks(node) {
  if (node.type === "table") return tableParagraph(node);
  if (node.type in MARKED_TEXT || isInlineParent(node) || !("children" in node)) return textParagraph(blockText2(node));
  const out = [];
  for (const child of node.children) if (!UNWRITTEN.includes(child.type)) out.push(...degradedBlocks(child));
  const caption2 = captionOf(node);
  if (caption2 !== void 0) out.push(...degradedBlocks(caption2));
  return out;
}
function degradedInline(node) {
  const text = inlineText(node);
  return text === "" ? [] : [{ type: "text", value: text }];
}
function degradedItem(node) {
  const children2 = [];
  for (const child of node.children) if (!UNWRITTEN.includes(child.type)) children2.push(...degradedBlocks(child));
  return children2.length === 0 ? [] : [{ type: "list_item", children: children2 }];
}
function isOutside(filter, node, block, depth2) {
  const rule = filter.rule;
  const denied = block ? rule.deniedBlock : rule.deniedInline;
  if (denied?.includes(node.type) === true) return true;
  const allowed = block ? rule.allowedBlock : rule.allowedInline;
  if (allowed !== null && !allowed.includes(node.type)) return true;
  return rule.maxNesting >= 0 && depth2 > rule.maxNesting;
}
function filterList(filter, list3, block, depth2, degrade) {
  const kept = [];
  let changed = false;
  for (const node of list3) {
    if (UNWRITTEN.includes(node.type)) {
      if (node.type === "footnote" && !isOutside(filter, node, block, depth2)) filterNode(filter, node, depth2 + 1);
    } else if (isOutside(filter, node, block, depth2)) {
      const out = degrade(node);
      const message = `Degraded a construct the profile "${filter.name}" does not allow: ${node.type}`;
      const entry = { code: "profile-construct-degraded", severity: "warning", channel: "render-loss", message };
      addFinding(filter.findings, out[0] ?? null, entry);
      for (const part of out) kept.push(part);
      changed = true;
      continue;
    } else {
      filterNode(filter, node, depth2 + 1);
    }
    kept.push(node);
  }
  if (!changed) return;
  list3.length = 0;
  for (const node of kept) list3.push(node);
}
function keep(node) {
  return [node];
}
function filterChildren(filter, node, depth2) {
  if (isInlineParent(node)) filterList(filter, node.children, false, depth2, degradedInline);
  else if (node.type === "list") filterList(filter, node.children, true, depth2, degradedItem);
  else if (node.type === "document") filterList(filter, node.children, true, depth2, degradedBlocks);
  else if (isBlockParent(node)) filterList(filter, node.children, true, depth2, degradedBlocks);
  else if (node.type === "table_cell") filterList(filter, node.children, true, depth2, degradedBlocks);
  else if ("children" in node) filterList(filter, node.children, true, depth2, keep);
}
function filterNode(filter, node, depth2) {
  const blocks = node.type === "block_extension";
  forEachSlot(node, (nodes, step, single) => {
    const list3 = nodes;
    if (step === "children") filterChildren(filter, node, depth2);
    else if (single) filterNode(filter, list3[0], depth2 + 1);
    else if (blocks && step !== "title") filterList(filter, list3, true, depth2, degradedBlocks);
    else filterList(filter, list3, false, depth2, degradedInline);
  });
}
function applyProfile(document, name, rule, findings) {
  filterNode({ name, rule, findings }, document, 0);
}

// ../carve-js/v2/src/api.ts
var CarveRenderError = class extends Error {
  diagnostics;
  constructor(diagnostics) {
    super(`the render lost content: ${diagnostics.map((entry) => entry.code).join(", ")}`);
    this.name = "CarveRenderError";
    this.diagnostics = diagnostics;
  }
};
var CarveInputError = class extends Error {
  constructor(profile, limit) {
    super(`the input is longer than the ${limit} bytes the profile ${profile} accepts`);
    this.name = "CarveInputError";
  }
};
var NO_PROFILE = PROFILES.get("full");
var MAX_BYTES_PER_UNIT = 3;
function profileRule(settings) {
  return PROFILES.get(settings.profile) ?? NO_PROFILE;
}
function checkLength(src, settings) {
  const limit = profileRule(settings).maxLength;
  if (limit < 0 || src.length * MAX_BYTES_PER_UNIT <= limit) return;
  if (src.length > limit || utf8Length(src) > limit) throw new CarveInputError(settings.profile, limit);
}
function inputStage(input, settings) {
  if (typeof input === "string") {
    checkLength(input, settings);
    return buildSource(input, settings.sourceLines);
  }
  validateTree(input);
  return { document: profileRule(settings) === NO_PROFILE ? input : structuredClone(input), facts: null };
}
function resolveStage(parsed, settings) {
  const rule = profileRule(settings);
  const losses = { entries: [], nodes: [] };
  if (rule !== NO_PROFILE) applyProfile(parsed.document, settings.profile, rule, losses);
  const resolution = resolve(parsed.document, settings.headingIds, parsed.facts, settings.symbols);
  const bidi = parsed.facts === null || rule !== NO_PROFILE || parsed.facts.bidi;
  return { document: parsed.document, settings, resolution, losses, bidi };
}
function renderStage(resolved) {
  const losses = { entries: [...resolved.losses.entries], nodes: [...resolved.losses.nodes] };
  return renderDocument(resolved.document, resolved.settings, resolved.resolution, losses, resolved.bidi);
}
function parseTree(src, options) {
  readOptions(options, "parse");
  return buildSource(src, options?.positions !== false);
}
function resolveTree(input, options) {
  const settings = readOptions(options, "render");
  const parsed = "type" in input ? inputStage(input, settings) : input;
  return resolveStage(parsed, settings);
}
function renderTree(resolved) {
  const rendered = renderStage(resolved);
  if (!resolved.settings.strictLosses || rendered.losses.entries.length === 0) return rendered.html;
  throw new CarveRenderError(locateFindings(resolved.document, rendered.losses));
}
function parseDiagnostics(resolved, parsed) {
  const found = resolved.resolution.findings;
  const noted = { entries: [], nodes: [] };
  parsed.facts?.addFindings(noted);
  if (noted.entries.length === 0) return locateFindings(resolved.document, found);
  return locateFindings(resolved.document, { entries: [...noted.entries, ...found.entries], nodes: [...noted.nodes, ...found.nodes] });
}
function parseWithDiagnostics(src, options) {
  const settings = readOptions(options, "parse");
  const parsed = buildSource(src, options?.positions !== false);
  const resolved = resolveStage(parsed, settings);
  return { document: resolved.document, diagnostics: parseDiagnostics(resolved, parsed) };
}
function parse(src, options) {
  const settings = readOptions(options, "parse");
  return resolveStage(buildSource(src, options?.positions !== false), settings).document;
}
function parseWithLayout(src, options) {
  const settings = readOptions(options, "parse");
  const trace = createLayoutTrace();
  const parsed = buildSource(src, true, null, trace);
  const resolved = resolveStage(parsed, settings);
  const diagnostics = parseDiagnostics(resolved, parsed);
  return { document: resolved.document, diagnostics, layout: buildLayout(src, resolved.document, trace) };
}
function renderWithDiagnostics(input, options) {
  const settings = readOptions(options, "render");
  const parsed = inputStage(input, settings);
  const resolved = resolveStage(parsed, settings);
  const rendered = renderStage(resolved);
  const diagnostics = [...parseDiagnostics(resolved, parsed), ...locateFindings(resolved.document, rendered.losses)];
  return { html: settings.strictLosses && rendered.losses.entries.length > 0 ? "" : rendered.html, diagnostics };
}
function render(input, options) {
  const settings = readOptions(options, "render");
  return renderTree(resolveStage(inputStage(input, settings), settings));
}

// ../carve-js/v2/src/ast-json.ts
function encodeTree(document) {
  return JSON.stringify(document);
}
function encodeEnvelope(document) {
  const envelope = { astVersion: document.astVersion, document };
  if (document.extensions !== void 0) envelope.extensions = document.extensions;
  return JSON.stringify(envelope);
}
function cleanString(_key, value) {
  return typeof value === "string" && value.includes("\0") ? value.replaceAll("\0", "\uFFFD") : value;
}
function envelopeOf(value) {
  return isRecord(value) && value["type"] === void 0 && value["document"] !== void 0 ? value : null;
}
function decodeTree(json) {
  let value;
  try {
    value = JSON.parse(json, cleanString);
  } catch {
    throw new CarveTreeError("", "not JSON");
  }
  const envelope = envelopeOf(value);
  if (envelope !== null) validateEnvelope(envelope);
  const document = envelope === null ? value : envelope["document"];
  try {
    validateTree(document);
  } catch (error) {
    if (envelope !== null && error instanceof CarveTreeError) throw new CarveTreeError(`/document${error.path}`, error.reason);
    throw error;
  }
  return document;
}
var SKIPPED = ["pos", "segments", "srcByteLength", "stages", "generatedId", "resolvedAlign", "n"];
var SPAN_COUNTS = ["colspan", "rowspan"];
function isReferenceUse(node) {
  return node["key"] !== void 0 && (node["type"] === "link" || node["type"] === "image" || node["type"] === "xref");
}
function isNumbered(node) {
  return node["type"] === "footnote_ref" || node["type"] === "inline_footnote";
}
function comparedFields(node, spanMarks) {
  const reference = isReferenceUse(node);
  const counts = !spanMarks || node["type"] !== "table_cell";
  return Object.keys(node).filter((name) => {
    if (SKIPPED.includes(name) || node[name] === void 0) return false;
    if (reference && (name === "href" || name === "src")) return false;
    if (name === "number" && isNumbered(node)) return false;
    return counts || !SPAN_COUNTS.includes(name);
  }).sort();
}
function coalesced(list3) {
  const out = [];
  for (const item of list3) {
    const last = out[out.length - 1];
    const text = item;
    if (text?.type === "text" && last?.type === "text") out[out.length - 1] = { ...last, value: (last.value ?? "") + (text.value ?? "") };
    else out.push(item);
  }
  return out;
}
function listOf(node, name) {
  const list3 = isRecord(node) ? node[name] : void 0;
  return Array.isArray(list3) ? list3 : [];
}
function hasSpanMarks(table3) {
  return listOf(table3, "children").some((group) => listOf(group, "children").some((row) => listOf(row, "children").some(
    (cell) => isRecord(cell) && cell["type"] === "table_cell" && cell["span"] !== void 0
  )));
}
function equalLists(a, b, spanMarks) {
  const left = coalesced(a);
  const right = coalesced(b);
  return left.length === right.length && left.every((item, index) => equalValues(item, right[index], spanMarks));
}
function equalObjects(a, b, spanMarks) {
  const inner = a["type"] === "table" ? hasSpanMarks(a) || hasSpanMarks(b) : spanMarks;
  const names = comparedFields(a, inner);
  const others = comparedFields(b, inner);
  if (names.length !== others.length || names.some((name, index) => name !== others[index])) return false;
  return names.every((name) => equalField(name, a[name], b[name], inner));
}
function equalField(name, a, b, spanMarks) {
  if (name !== "marker") return equalValues(a, b, spanMarks);
  const normal = (marker) => {
    const fields = { ...marker };
    if (fields["start"] === 1) delete fields["start"];
    return fields;
  };
  return equalValues(normal(a), normal(b), spanMarks);
}
function equalValues(a, b, spanMarks) {
  if (Array.isArray(a)) return Array.isArray(b) && equalLists(a, b, spanMarks);
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null || Array.isArray(b)) return a === b;
  return equalObjects(a, b, spanMarks);
}
function treesEqual(a, b) {
  return equalValues(a, b, false);
}

// ../carve-js/v2/src/layout-validate.ts
var CarveLayoutError = class extends Error {
  path;
  reason;
  constructor(path, reason) {
    super(`${path === "" ? "/" : path}: ${reason}`);
    this.name = "CarveLayoutError";
    this.path = path;
    this.reason = reason;
  }
};
var ROOT_FIELDS = ["version", "encoding", "source", "lineEndings", "bom", "nodes"];
var LINE_ENDINGS = ["none", "lf", "crlf", "cr", "mixed"];
var WRAP_FIELDS = ["line", "path", "offset", "row"];
function fail2(path, reason) {
  throw new CarveLayoutError(path, reason);
}
var checkBoolean = (value, path) => {
  if (typeof value !== "boolean") fail2(path, "is not a boolean");
};
var checkString = (value, path) => {
  if (typeof value !== "string") fail2(path, "is not a string");
};
function checkCount(value, path, minimum = 0) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) fail2(path, `is not an integer of at least ${minimum}`);
  return value;
}
function oneOf(values) {
  return (value, path) => {
    if (typeof value !== "string" || !values.includes(value)) fail2(path, `is not one of ${values.join(", ")}`);
  };
}
var checkPointer = (value, path) => {
  if (typeof value !== "string") fail2(path, "is not a string");
  if (value !== "" && !value.startsWith("/")) fail2(path, "is not a JSON Pointer");
  for (let at = value.indexOf("~"); at >= 0; at = value.indexOf("~", at + 1)) {
    if (value[at + 1] !== "0" && value[at + 1] !== "1") fail2(path, "is not a JSON Pointer");
  }
};
var checkWraps = (value, path) => {
  if (!Array.isArray(value)) fail2(path, "is not a list");
  let line2 = 0;
  value.forEach((wrap, index) => {
    const at = `${path}/${index}`;
    if (!isRecord(wrap)) fail2(at, "is not an object");
    for (const key of Object.keys(wrap)) if (!WRAP_FIELDS.includes(key)) fail2(`${at}/${key}`, "is not a field of a wrap");
    const own = checkCount(wrap["line"], `${at}/line`, 1);
    if (own < line2) fail2(`${at}/line`, "is not sorted by line");
    line2 = own;
    checkPointer(wrap["path"], `${at}/path`);
    checkCount(wrap["offset"], `${at}/offset`);
    if (wrap["row"] !== void 0) checkCount(wrap["row"], `${at}/row`);
  });
};
var FACTS = /* @__PURE__ */ new Map([
  ["bare", checkBoolean],
  ["fenced", checkBoolean],
  ["hardBreakOpener", checkBoolean],
  ["wraps", checkWraps],
  ["continuationLines", (value, path) => void checkCount(value, path)],
  ["rawRef", checkString],
  ["sourceFormat", oneOf(["pipe", "csv", "tsv"])],
  ["markerRaw", checkString],
  ["markerColumn", (value, path) => void checkCount(value, path)],
  ["contentColumn", (value, path) => void checkCount(value, path)],
  ["continuationStyle", oneOf(["lazy", "indent", "marker_line", "none"])],
  ["blankLinesBefore", (value, path) => void checkCount(value, path)],
  ["blankLinesAfter", (value, path) => void checkCount(value, path)],
  ["openerRaw", checkString],
  ["closerRaw", checkString],
  ["metadataSeparatorRaw", checkString],
  ["attachment", oneOf(["preceding", "none"])]
]);
function checkFence(entry, path) {
  const opener = entry["openerRaw"];
  if (opener === void 0 !== (entry["closerRaw"] === void 0)) fail2(path, "openerRaw and closerRaw come as a pair");
  if (opener === "") fail2(`${path}/openerRaw`, "is empty");
}
function checkEntry(entry, path, length) {
  if (!isRecord(entry)) fail2(path, "is not an object");
  checkPointer(entry["path"], `${path}/path`);
  const start = checkCount(entry["startByte"], `${path}/startByte`);
  const end = checkCount(entry["endByte"], `${path}/endByte`);
  if (start > end) fail2(`${path}/startByte`, "is behind endByte");
  if (end > length) fail2(`${path}/endByte`, "is past the end of the source");
  for (const key of Object.keys(entry)) {
    if (key === "path" || key === "startByte" || key === "endByte") continue;
    const check = FACTS.get(key);
    if (check === void 0) fail2(`${path}/${key}`, "is not a field of a node entry");
    check(entry[key], `${path}/${key}`);
  }
  checkFence(entry, path);
  return entry["path"];
}
function checkRoot(record) {
  for (const key of ROOT_FIELDS) if (record[key] === void 0) fail2(`/${key}`, "is missing");
  for (const key of Object.keys(record)) if (!ROOT_FIELDS.includes(key)) fail2(`/${key}`, "is not a field of the record");
  if (record["version"] !== LAYOUT_VERSION) fail2("/version", `version ${String(record["version"])} is not implemented`);
  if (record["encoding"] !== "utf-8") fail2("/encoding", "is not utf-8");
  checkString(record["source"], "/source");
  oneOf(LINE_ENDINGS)(record["lineEndings"], "/lineEndings");
  checkBoolean(record["bom"], "/bom");
  if (!Array.isArray(record["nodes"])) fail2("/nodes", "is not a list");
}
var SLOT_ORDER = ["title", "children", "caption"];
function compareSegments(a, b) {
  const numberA = Number(a);
  const numberB = Number(b);
  if (Number.isInteger(numberA) && Number.isInteger(numberB)) return numberA - numberB;
  const slot = SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b);
  if (slot !== 0) return slot;
  return a < b ? -1 : a > b ? 1 : 0;
}
function compareDocumentOrder(a, b) {
  const left = a.split("/");
  const right = b.split("/");
  for (let at = 0; at < left.length && at < right.length; at++) {
    const order = compareSegments(left[at], right[at]);
    if (order !== 0) return order;
  }
  return left.length - right.length;
}
function validateLayout(value) {
  if (!isRecord(value)) fail2("", "the record is not an object");
  checkRoot(value);
  const length = utf8Length(value["source"]);
  let previous = null;
  value["nodes"].forEach((entry, index) => {
    const path = checkEntry(entry, `/nodes/${index}`, length);
    if (previous !== null && compareDocumentOrder(path, previous) <= 0) {
      fail2(`/nodes/${index}/path`, path === previous ? "is a duplicate path" : "is not in document order");
    }
    previous = path;
  });
  return value;
}

// ../carve-js/v2/src/write-attributes.ts
function isName(text) {
  if (text.length === 0) return false;
  for (let at = 0; at < text.length; at++) if (!isAsciiNameCharacter(text.charCodeAt(at))) return false;
  return true;
}
function isKey(text) {
  const first = text.charCodeAt(0);
  return isName(text) && (isAsciiLetter(first) || first === UNDERSCORE);
}
function isUnquoted(value) {
  if (value.length === 0) return false;
  for (const char of value) if (` 	"'\\|}`.includes(char)) return false;
  return true;
}
function quoted2(value) {
  let out = '"';
  for (let at = 0; at < value.length; at++) {
    const char = value[at];
    const next = at + 1 < value.length ? value.charCodeAt(at + 1) : 34;
    if (char === '"' || char === "\\" && isAsciiPunctuation(next)) out += "\\";
    out += char;
  }
  return `${out}"`;
}
function keyPart(key, value) {
  if (value === "") return key.startsWith("_") ? `${key}=""` : key;
  return `${key}=${isUnquoted(value) ? value : quoted2(value)}`;
}
var NONE4 = [];
function classParts(classes, parts, skip2) {
  for (let at = 0; at < classes.length; at++) {
    if (skip2.includes(at)) continue;
    const name = classes[at];
    parts.push(isName(name) ? `.${name}` : `class=${quoted2(name)}`);
  }
}
function keyParts(keyValues, parts, first) {
  for (const [key, value] of first) parts.push(keyPart(key, value));
  for (const [key, value] of keyValues) if (isKey(key)) parts.push(keyPart(key, value));
}
function idPart(id, parts) {
  if (id !== void 0) parts.push(isName(id) ? `#${id}` : `id=${quoted2(id)}`);
}
function braceBlock(node, extra) {
  const parts = [];
  const attrs = node.attrs;
  if (attrs !== void 0) idPart(attrs.id, parts);
  classParts(attrs?.classes ?? NONE4, parts, extra?.skipClasses ?? []);
  const lang = node.lang;
  if (lang !== void 0) parts.push(`:${lang}`);
  keyParts(attrs?.keyValues ?? NONE4, parts, extra?.keys ?? []);
  const mark2 = extra?.mark ?? "";
  if (mark2 !== "") parts.unshift(mark2);
  return parts.length === 0 ? "" : `{${parts.join(" ")}}`;
}

// ../carve-js/v2/src/write-state.ts
function createWriter(facts, alignTables) {
  return {
    lines: [],
    lead: null,
    escapes: /* @__PURE__ */ new Map(),
    forms: /* @__PURE__ */ new Map(),
    starts: /* @__PURE__ */ new Map(),
    attempts: /* @__PURE__ */ new Map(),
    facts,
    wrapPoints: null,
    wrapStarts: null,
    alignTables,
    blankFirst: false,
    losses: { entries: [], nodes: [] },
    lost: /* @__PURE__ */ new Set(),
    colonRuns: /* @__PURE__ */ new Map(),
    kindsBelow: /* @__PURE__ */ new Map(),
    abbreviations: /* @__PURE__ */ new Map(),
    parsed: null
  };
}
var SPACE2 = 32;
var TAB2 = 9;
function trimmedLength(line2) {
  let end = line2.length;
  while (end > 0 && (line2.charCodeAt(end - 1) === SPACE2 || line2.charCodeAt(end - 1) === TAB2)) end--;
  return end;
}
var PLACE_COLUMNS = 8192;
function notePlace(w, node, prefix) {
  const head = w.lead ?? prefix;
  for (let at = 0; at < head.length; at++) if (head.charCodeAt(at) > 127) return;
  if (head.length < PLACE_COLUMNS) w.starts.set(node, w.lines.length * PLACE_COLUMNS + head.length);
}
function trimEnd2(text) {
  return text.slice(0, trimmedLength(text));
}
function emit(w, prefix, text) {
  const head = w.lead ?? prefix;
  w.lead = null;
  w.lines.push(text === "" ? trimEnd2(head) : head + text);
}
function emitLines(w, prefix, indent, text) {
  let start = 0;
  let inner = prefix;
  for (; ; ) {
    const end = text.indexOf("\n", start);
    emit(w, inner, end < 0 ? text.slice(start) : text.slice(start, end));
    if (end < 0) return;
    start = end + 1;
    inner = prefix + indent;
  }
}
function lose(w, node, field) {
  if (w.lost.has(node)) return;
  w.lost.add(node);
  const message = field === null ? `a ${node.type} node has no spelling in Carve source here` : `the field ${field} of a ${node.type} node has no spelling in Carve source here`;
  const code = field === null ? "structure-unspellable" : "field-unspellable";
  addFinding(w.losses, node, { code, severity: "warning", channel: "render-loss", message });
}

// ../carve-js/v2/src/write-inline.ts
var IN_CELL = 1;
var IN_EMPHASIS = 2;
var IN_STRONG = 4;
var BARE_BREAKS = 8;
var BACKSLASH2 = 92;
var PIPE2 = 124;
var SPACE3 = 32;
var BACKTICK2 = 96;
function doubles(value, at) {
  if (at + 1 >= value.length) return false;
  const next = value.charCodeAt(at + 1);
  return next === SPACE3 || isAsciiPunctuation(next);
}
function alwaysEscaped(value, at, cell) {
  const code = value.charCodeAt(at);
  return code === BACKSLASH2 && doubles(value, at) || cell && code === PIPE2;
}
function escaped(w, node, value, from, to, cell) {
  const escapes = w.escapes.get(node) ?? [];
  let out = "";
  let next = firstFrom(escapes, from);
  let start = from;
  for (let at = from; at < to; at++) {
    const asked = next < escapes.length && escapes[next] === at;
    if (asked) next++;
    if (!asked && !alwaysEscaped(value, at, cell)) continue;
    out += `${value.slice(start, at)}\\`;
    start = at;
  }
  return out + value.slice(start, to);
}
function firstFrom(offsets, from) {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const middle = low + high >>> 1;
    if (offsets[middle] < from) low = middle + 1;
    else high = middle;
  }
  return low;
}
function spelledEnd(w, node, from, bytes, cell) {
  const value = node.value;
  const escapes = w.escapes.get(node) ?? [];
  let next = firstFrom(escapes, from);
  let rest = bytes;
  let at = from;
  for (; rest > 0 && at < value.length; at++) {
    const asked = next < escapes.length && escapes[next] === at;
    if (asked) next++;
    rest -= unitBytes(value, at) + (asked || alwaysEscaped(value, at, cell) ? 1 : 0);
  }
  return rest === 0 ? at : -1;
}
function textNode(w, node, flags) {
  const value = node.value;
  const cell = (flags & IN_CELL) !== 0;
  const points = cell ? w.wrapPoints?.get(node) : void 0;
  if (points === void 0 && !w.escapes.has(node) && !value.includes("\\") && !(cell && value.includes("|"))) return value;
  let out = "";
  let from = 0;
  for (const point of points ?? []) {
    out += `${escaped(w, node, value, from, Math.max(from, point - 1), cell)}
`;
    from = point;
  }
  return out + escaped(w, node, value, from, value.length, cell);
}
function kindsBelow(w, node) {
  const known = w.kindsBelow.get(node);
  if (known !== void 0) return known;
  let kinds = 0;
  for (const child of childNodes(node)) {
    if (child.type === "emphasis") kinds |= 1;
    else if (child.type === "strong") kinds |= 2;
    if ("children" in child) kinds |= kindsBelow(w, child);
  }
  w.kindsBelow.set(node, kinds);
  return kinds;
}
function contentOf(w, node, flags) {
  if (node.children.length > 0) return writeInlines(w, node.children, flags);
  lose(w, node, null);
  return null;
}
function paired(mark2, bit, inside) {
  return (w, node, flags) => {
    const content = contentOf(w, node, flags | inside);
    if (content === null) return "";
    const braced2 = (flags & inside) !== 0 || (kindsBelow(w, node) & bit) !== 0 || (w.forms.get(node) ?? 0) > 0;
    return braced2 ? `{${mark2}${content}${mark2}}` : `${mark2}${content}${mark2}`;
  };
}
function braced(open, close) {
  return (w, node, flags) => {
    const content = contentOf(w, node, flags);
    return content === null ? "" : `{${open}${content}${close}}`;
  };
}
function runLengths(value, code) {
  const lengths = [];
  let run = 0;
  for (let at = 0; at <= value.length; at++) {
    if (at < value.length && value.charCodeAt(at) === code) run++;
    else {
      if (run > 0) lengths[run] = 1;
      run = 0;
    }
  }
  return lengths;
}
function losesPadding(value) {
  if (!value.startsWith(" ") || !value.endsWith(" ")) return false;
  for (let at = 0; at < value.length; at++) if (value.charCodeAt(at) !== SPACE3) return true;
  return false;
}
function bracedComment2(value) {
  return value === "" ? "{%%}" : `{% ${value} %}`;
}
function codeSpan2(value) {
  const taken = runLengths(value, BACKTICK2);
  let length = 1;
  while (taken[length] !== void 0) length++;
  const run = "`".repeat(length);
  const padded = value.startsWith("`") || value.endsWith("`") || losesPadding(value);
  return padded ? `${run} ${value} ${run}` : `${run}${value}${run}`;
}
function destination2(value) {
  const unmatched = /* @__PURE__ */ new Set();
  const open = [];
  for (let at = 0; at < value.length; at++) {
    if (value[at] === "(") open.push(at);
    else if (value[at] === ")" && open.pop() === void 0) unmatched.add(at);
  }
  for (const at of open) unmatched.add(at);
  let out = "";
  for (let at = 0; at < value.length; at++) {
    const char = value[at];
    const next = at + 1 < value.length ? value[at + 1] : ")";
    if (unmatched.has(at) || char === "\\" && "()\\".includes(next)) out += "\\";
    out += char;
  }
  return out;
}
function referenceLabel2(node, key) {
  if (node.form === "collapsed") return "[]";
  return key.startsWith("^") || key.startsWith("@") ? `[ ${labelText(key)}]` : `[${labelText(key)}]`;
}
function labelText(key) {
  return key.endsWith("\\") ? `${key} ` : key;
}
function target(node, href) {
  const key = node.key;
  if (key !== void 0) return referenceLabel2(node, key);
  const tooltip = node.tooltip;
  const title = tooltip === void 0 ? "" : ` ${quoted2(tooltip)}`;
  return `(${destination2(href ?? "")}${title})`;
}
function rawReference(w, node, flags) {
  if (node.key === void 0 || (w.forms.get(node) ?? 0) > 0) return null;
  const raw = w.facts?.get(node)?.rawRef;
  if (raw === void 0) return null;
  if (!raw.includes("\n")) return raw;
  if ((flags & IN_CELL) !== 0) return raw.replaceAll(/[ \t]*\n[ \t]*/g, " ");
  return raw.replaceAll(/[ \t]+\n/g, "\n");
}
function linkNode2(w, node, flags) {
  const raw = rawReference(w, node, flags);
  if (raw !== null) return raw;
  return `[${writeInlines(w, node.children, flags)}]${target(node, node.href)}`;
}
function imageNode2(w, node, flags) {
  return rawReference(w, node, flags) ?? `![${node.alt ?? ""}]${target(node, node.src)}`;
}
function autolinkNode(w, node) {
  const href = node.href;
  const text = node.text;
  if (text === void 0) return `<${href}>`;
  if (href !== `mailto:${text}`) lose(w, node, "text");
  return href.startsWith("mailto:") ? `<${href.slice(7)}>` : `<${href}>`;
}
function mentionNode(w, node) {
  if (node.label !== void 0) lose(w, node, "label");
  else if (node.kind !== "user") lose(w, node, "kind");
  return `@${node.target}`;
}
function commentNode2(w, node) {
  const value = node.value;
  const glued = (w.forms.get(node) ?? 0) > 0 && !value.startsWith(" ") && !value.endsWith(" ");
  if (node.form === "braced") return glued ? `{%${value}%}` : bracedComment2(value);
  return value === "" ? "%%" : `%% ${value}`;
}
function abbreviationNode2(w, node) {
  const key = node.key;
  if (!w.abbreviations.has(key)) lose(w, node, null);
  return key;
}
function rubyNode(w, node, flags) {
  lose(w, node, null);
  let out = "";
  for (const pair of node.pairs) out += `${writeInlines(w, pair.base, flags)}(${writeInlines(w, pair.annotation, flags)})`;
  return out;
}
function childrenOnly(w, node, flags) {
  lose(w, node, null);
  const fallback = "fallback" in node ? node.fallback : void 0;
  return writeInlines(w, fallback ?? childNodes(node), flags);
}
function hardBreak(_w, _node, flags) {
  return (flags & BARE_BREAKS) !== 0 ? "\n" : "\\\n";
}
function citationGroup(w, node) {
  lose(w, node, null);
  return node.raw;
}
var WRITERS2 = {
  text: textNode,
  soft_break: () => "\n",
  hard_break: hardBreak,
  emphasis: paired("/", 1, IN_EMPHASIS),
  strong: paired("*", 2, IN_STRONG),
  underline: braced("_", "_"),
  strike: braced("~", "~"),
  highlight: braced("=", "="),
  superscript: braced("^", "^"),
  subscript: braced(",", ","),
  insert: braced("+", "+"),
  delete: braced("-", "-"),
  critic_comment: (_w, node) => `{#${node.value}#}`,
  span: (w, node, flags) => `[${writeInlines(w, node.children, flags)}]`,
  link: linkNode2,
  image: imageNode2,
  inline_footnote: (w, node, flags) => `^[${writeInlines(w, node.children, flags)}]`,
  inline_extension: (w, node, flags) => `:${node.name}[${writeInlines(w, node.children, flags)}]`,
  footnote_ref: (_w, node) => `[^${labelText(node.key)}]`,
  code: (_w, node) => codeSpan2(node.value),
  literal_inline: (_w, node) => `!${codeSpan2(node.value)}`,
  math: (_w, node) => `${node.display ? "$$" : "$"}${codeSpan2(node.value)}`,
  raw_inline: (_w, node) => `${codeSpan2(node.value)}{=${node.format}}`,
  symbol: (_w, node) => `:${node.name}:`,
  mention: mentionNode,
  tag: (_w, node) => `#${node.name}`,
  autolink: autolinkNode,
  xref: (_w, node) => `</#${node.key}>`,
  non_breaking_space: () => "\\ ",
  smart_punctuation: (_w, node) => node.source,
  abbreviation: abbreviationNode2,
  // The mark of a caption number is the first bare `#` of the caption (C2-B-150).
  caption_number: () => "#",
  comment: commentNode2,
  small_caps: childrenOnly,
  citation_group: citationGroup,
  ruby: rubyNode
};
function writeOwn2(w, type, node, flags) {
  const writer = WRITERS2[type];
  return writer === void 0 ? null : writer(w, node, flags);
}
function writeInline(w, node, flags) {
  const out = writeOwn2(w, node.type, node, flags);
  if (out === null) return childrenOnly(w, node, flags);
  const block = braceBlock(node);
  return node.type === "span" && block === "" ? `${out}{}` : out + block;
}
function partEnd(w, nodes, at) {
  return joinsNextCode(nodes, at) ? codeRunEnd(w, nodes, at) : at + 1;
}
function joinsNextCode(nodes, at) {
  const node = nodes[at];
  return node.type === "code" && braceBlock(node) === "" && nodes[at + 1]?.type === "code";
}
function writePart(w, nodes, at, end, flags) {
  const node = nodes[at];
  const part = end > at + 1 ? codeRun(nodes, at, end) : writeInline(w, node, flags);
  return node.type === "text" && nodes[at + 1]?.type === "soft_break" ? trimEnd2(part) : part;
}
function gluedPart(w, nodes, at, end, flags, before2) {
  const node = nodes[at];
  const part = writePart(w, nodes, at, end, flags);
  if (node.type !== "emphasis" && node.type !== "strong" || part === "" || part.charCodeAt(0) !== before2) return part;
  w.forms.set(node, 1);
  return writePart(w, nodes, at, end, flags);
}
function writeInlines(w, nodes, flags) {
  let out = "";
  let lineStart = true;
  let last = -1;
  for (let at = 0; at < nodes.length; ) {
    const node = nodes[at];
    if (node.type === "comment" && node.form !== "braced" && !lineStart) {
      out += " ";
      last = SPACE3;
    }
    if ((flags & IN_CELL) !== 0 && w.wrapStarts?.has(node) === true) {
      out = `${out.endsWith(" ") ? out.slice(0, -1) : out}
`;
      lineStart = true;
      last = 10;
    }
    const end = partEnd(w, nodes, at);
    if (node.type === "text") doubleLastBackslash(w, node, nodes, end, flags);
    const part = gluedPart(w, nodes, at, end, flags, last);
    out += part;
    last = part === "" ? last : part.charCodeAt(part.length - 1);
    lineStart = last === 10 || lineStart && part === "";
    at = end;
  }
  return out;
}
function doubleLastBackslash(w, node, nodes, next, flags) {
  const value = node.value;
  const last = value.length - 1;
  if (last < 0 || value.charCodeAt(last) !== BACKSLASH2) return;
  const escapes = w.escapes.get(node);
  if (escapes?.[escapes.length - 1] === last) return;
  const after2 = nodes[next];
  if (after2 !== void 0 && after2.type !== "soft_break" && after2.type !== "hard_break") {
    const spelled = writePart(w, nodes, next, partEnd(w, nodes, next), flags);
    const code = spelled.charCodeAt(0);
    if (spelled !== "" && code !== SPACE3 && !isAsciiPunctuation(code)) return;
  }
  w.escapes.set(node, [...escapes ?? [], last]);
}
function writeContent(w, nodes, flags) {
  const out = writeInlines(w, nodes, flags);
  const last = nodes[nodes.length - 1];
  if (last?.type === "text") return trimEnd2(out);
  return last?.type === "hard_break" && out.endsWith("\n") ? out.slice(0, -1) : out;
}
function codeRunEnd(w, nodes, from) {
  let end = from + 1;
  while (joinsNextCode(nodes, end - 1)) lose(w, nodes[end++], null);
  return end;
}
function codeRun(nodes, from, end) {
  let value = "";
  for (let at = from; at < end; at++) {
    const node = nodes[at];
    if (node?.type === "code") value += node.value;
  }
  return codeSpan2(value) + braceBlock(nodes[end - 1]);
}

// ../carve-js/v2/src/write-lists.ts
var MAX_MARKER_LENGTH = 9;
var MAX_DECIMAL = 999999999;
var MAX_ROMAN = 3999;
var LETTERS = 26;
var ROMAN_LETTERS = [1, 5, 10, 50, 100, 500, 1e3];
var ROMAN_PLACES = [
  [1e3, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"]
];
function roman(value) {
  let out = "";
  let rest = value;
  for (const [amount, letters] of ROMAN_PLACES) {
    while (rest >= amount) {
      out += letters;
      rest -= amount;
    }
  }
  return out;
}
function letterMarker(style, value) {
  const lower = style.toLowerCase();
  let text = null;
  if (lower === "a") text = value >= 1 && value <= LETTERS ? String.fromCharCode(96 + value) : null;
  else if (value >= 1 && value <= MAX_ROMAN) text = roman(value);
  if (text === null || text.length > MAX_MARKER_LENGTH) return null;
  return style === lower ? text : text.toUpperCase();
}
function readsAsOtherStyle(style, value) {
  const lower = style.toLowerCase();
  if (lower === "a") return value === 9;
  return value !== 1 && ROMAN_LETTERS.includes(value);
}
function letterMarkers(style, delimiter, start, count) {
  const first = letterMarker(style, start);
  const moved = first === null || readsAsOtherStyle(style, start);
  const from = moved ? 1 : start;
  const markers = [];
  for (let at = 0; at < count; at++) markers.push(`${letterMarker(style, from + at) ?? letterMarker(style, 1)}${delimiter}`);
  return { markers, start: moved ? String(start) : null };
}
function numberedMarkers(delimiter, start, count) {
  const markers = [];
  for (let at = 0; at < count; at++) markers.push(`${start + at > MAX_DECIMAL ? 1 : start + at}${delimiter}`);
  return { markers, start: null };
}
function decimalMarkers(w, node, delimiter, authored, count) {
  const start = authored > MAX_DECIMAL ? 1 : authored;
  const bare = delimiter === "." && (w.facts?.get(node)?.bare ?? true);
  if (!bare) return numberedMarkers(delimiter, start, count);
  return { markers: new Array(count).fill("."), start: start === 1 ? null : String(start) };
}
function listMarkers(w, node) {
  const count = node.children.length;
  const marker = node.marker;
  if (marker.kind !== "ordered") return { markers: new Array(count).fill(marker.char ?? "-"), start: null };
  const style = marker.style ?? "1";
  const delimiter = marker.delimiter ?? ".";
  const start = marker.start ?? 1;
  return style === "1" ? decimalMarkers(w, node, delimiter, start, count) : letterMarkers(style, delimiter, start, count);
}
function isUpper2(style) {
  return style !== style.toLowerCase();
}
function markerStyle(list3) {
  return list3.marker.style ?? "1";
}
function markerDelimiter(list3) {
  return list3.marker.delimiter ?? ".";
}
function sameOrderedKind(a, b) {
  const first = markerStyle(a);
  const second = markerStyle(b);
  if (markerDelimiter(a) !== markerDelimiter(b)) return false;
  return first === second || first !== "1" && second !== "1" && isUpper2(first) === isUpper2(second);
}
function sameListKind(a, b) {
  if (a.type === "definition_list") return b.type === "definition_list";
  if (a.type !== "list" || b.type !== "list" || a.marker.kind !== b.marker.kind) return false;
  return sameTaskKind(a, b) && (a.marker.kind === "ordered" ? sameOrderedKind(a, b) : a.marker.char === b.marker.char);
}
function sameTaskKind(a, b) {
  const last = a.children[a.children.length - 1];
  return last?.task === void 0 === (b.children[0]?.task === void 0);
}

// ../carve-js/v2/src/width-data.ts
var GCB = [
  0,
  9,
  3,
  10,
  10,
  2,
  11,
  12,
  3,
  13,
  13,
  1,
  14,
  31,
  3,
  127,
  159,
  3,
  173,
  173,
  3,
  768,
  879,
  4,
  1155,
  1159,
  4,
  1160,
  1161,
  4,
  1425,
  1469,
  4,
  1471,
  1471,
  4,
  1473,
  1474,
  4,
  1476,
  1477,
  4,
  1479,
  1481,
  4,
  1536,
  1541,
  7,
  1552,
  1562,
  4,
  1564,
  1564,
  3,
  1611,
  1631,
  4,
  1648,
  1648,
  4,
  1750,
  1756,
  4,
  1757,
  1757,
  7,
  1759,
  1764,
  4,
  1767,
  1768,
  4,
  1770,
  1773,
  4,
  1807,
  1807,
  7,
  1809,
  1809,
  4,
  1840,
  1866,
  4,
  1958,
  1968,
  4,
  2027,
  2035,
  4,
  2045,
  2045,
  4,
  2070,
  2073,
  4,
  2075,
  2083,
  4,
  2085,
  2087,
  4,
  2089,
  2093,
  4,
  2137,
  2139,
  4,
  2192,
  2193,
  7,
  2199,
  2207,
  4,
  2250,
  2273,
  4,
  2274,
  2274,
  7,
  2275,
  2306,
  4,
  2307,
  2307,
  8,
  2362,
  2362,
  4,
  2363,
  2363,
  8,
  2364,
  2364,
  4,
  2366,
  2368,
  8,
  2369,
  2376,
  4,
  2377,
  2380,
  8,
  2381,
  2381,
  4,
  2382,
  2383,
  8,
  2385,
  2391,
  4,
  2402,
  2403,
  4,
  2433,
  2433,
  4,
  2434,
  2435,
  8,
  2492,
  2492,
  4,
  2494,
  2494,
  4,
  2495,
  2496,
  8,
  2497,
  2500,
  4,
  2503,
  2504,
  8,
  2507,
  2508,
  8,
  2509,
  2509,
  4,
  2519,
  2519,
  4,
  2530,
  2531,
  4,
  2558,
  2558,
  4,
  2561,
  2562,
  4,
  2563,
  2563,
  8,
  2620,
  2620,
  4,
  2622,
  2624,
  8,
  2625,
  2626,
  4,
  2631,
  2632,
  4,
  2635,
  2637,
  4,
  2641,
  2641,
  4,
  2672,
  2673,
  4,
  2677,
  2677,
  4,
  2689,
  2690,
  4,
  2691,
  2691,
  8,
  2748,
  2748,
  4,
  2750,
  2752,
  8,
  2753,
  2757,
  4,
  2759,
  2760,
  4,
  2761,
  2761,
  8,
  2763,
  2764,
  8,
  2765,
  2765,
  4,
  2786,
  2787,
  4,
  2810,
  2815,
  4,
  2817,
  2817,
  4,
  2818,
  2819,
  8,
  2876,
  2876,
  4,
  2878,
  2878,
  4,
  2879,
  2879,
  4,
  2880,
  2880,
  8,
  2881,
  2884,
  4,
  2887,
  2888,
  8,
  2891,
  2892,
  8,
  2893,
  2893,
  4,
  2899,
  2902,
  4,
  2903,
  2903,
  4,
  2914,
  2915,
  4,
  2946,
  2946,
  4,
  3006,
  3006,
  4,
  3007,
  3007,
  8,
  3008,
  3008,
  4,
  3009,
  3010,
  8,
  3014,
  3016,
  8,
  3018,
  3020,
  8,
  3021,
  3021,
  4,
  3031,
  3031,
  4,
  3072,
  3072,
  4,
  3073,
  3075,
  8,
  3076,
  3076,
  4,
  3132,
  3132,
  4,
  3134,
  3136,
  4,
  3137,
  3140,
  8,
  3142,
  3144,
  4,
  3146,
  3149,
  4,
  3157,
  3158,
  4,
  3170,
  3171,
  4,
  3201,
  3201,
  4,
  3202,
  3203,
  8,
  3260,
  3260,
  4,
  3262,
  3262,
  8,
  3263,
  3263,
  4,
  3264,
  3264,
  4,
  3265,
  3265,
  8,
  3266,
  3266,
  4,
  3267,
  3268,
  8,
  3270,
  3270,
  4,
  3271,
  3272,
  4,
  3274,
  3275,
  4,
  3276,
  3277,
  4,
  3285,
  3286,
  4,
  3298,
  3299,
  4,
  3315,
  3315,
  8,
  3328,
  3329,
  4,
  3330,
  3331,
  8,
  3387,
  3388,
  4,
  3390,
  3390,
  4,
  3391,
  3392,
  8,
  3393,
  3396,
  4,
  3398,
  3400,
  8,
  3402,
  3404,
  8,
  3405,
  3405,
  4,
  3406,
  3406,
  7,
  3415,
  3415,
  4,
  3426,
  3427,
  4,
  3457,
  3457,
  4,
  3458,
  3459,
  8,
  3530,
  3530,
  4,
  3535,
  3535,
  4,
  3536,
  3537,
  8,
  3538,
  3540,
  4,
  3542,
  3542,
  4,
  3544,
  3550,
  8,
  3551,
  3551,
  4,
  3570,
  3571,
  8,
  3633,
  3633,
  4,
  3635,
  3635,
  8,
  3636,
  3642,
  4,
  3655,
  3662,
  4,
  3761,
  3761,
  4,
  3763,
  3763,
  8,
  3764,
  3772,
  4,
  3784,
  3790,
  4,
  3864,
  3865,
  4,
  3893,
  3893,
  4,
  3895,
  3895,
  4,
  3897,
  3897,
  4,
  3902,
  3903,
  8,
  3953,
  3966,
  4,
  3967,
  3967,
  8,
  3968,
  3972,
  4,
  3974,
  3975,
  4,
  3981,
  3991,
  4,
  3993,
  4028,
  4,
  4038,
  4038,
  4,
  4141,
  4144,
  4,
  4145,
  4145,
  8,
  4146,
  4151,
  4,
  4153,
  4154,
  4,
  4155,
  4156,
  8,
  4157,
  4158,
  4,
  4182,
  4183,
  8,
  4184,
  4185,
  4,
  4190,
  4192,
  4,
  4209,
  4212,
  4,
  4226,
  4226,
  4,
  4228,
  4228,
  8,
  4229,
  4230,
  4,
  4237,
  4237,
  4,
  4253,
  4253,
  4,
  4352,
  4447,
  9,
  4448,
  4519,
  10,
  4520,
  4607,
  11,
  4957,
  4959,
  4,
  5906,
  5908,
  4,
  5909,
  5909,
  4,
  5938,
  5939,
  4,
  5940,
  5940,
  4,
  5970,
  5971,
  4,
  6002,
  6003,
  4,
  6068,
  6069,
  4,
  6070,
  6070,
  8,
  6071,
  6077,
  4,
  6078,
  6085,
  8,
  6086,
  6086,
  4,
  6087,
  6088,
  8,
  6089,
  6099,
  4,
  6109,
  6109,
  4,
  6155,
  6157,
  4,
  6158,
  6158,
  3,
  6159,
  6159,
  4,
  6277,
  6278,
  4,
  6313,
  6313,
  4,
  6432,
  6434,
  4,
  6435,
  6438,
  8,
  6439,
  6440,
  4,
  6441,
  6443,
  8,
  6448,
  6449,
  8,
  6450,
  6450,
  4,
  6451,
  6456,
  8,
  6457,
  6459,
  4,
  6679,
  6680,
  4,
  6681,
  6682,
  8,
  6683,
  6683,
  4,
  6741,
  6741,
  8,
  6742,
  6742,
  4,
  6743,
  6743,
  8,
  6744,
  6750,
  4,
  6752,
  6752,
  4,
  6754,
  6754,
  4,
  6757,
  6764,
  4,
  6765,
  6770,
  8,
  6771,
  6780,
  4,
  6783,
  6783,
  4,
  6832,
  6845,
  4,
  6846,
  6846,
  4,
  6847,
  6896,
  4,
  6912,
  6915,
  4,
  6916,
  6916,
  8,
  6964,
  6964,
  4,
  6965,
  6965,
  4,
  6966,
  6970,
  4,
  6971,
  6971,
  4,
  6972,
  6972,
  4,
  6973,
  6973,
  4,
  6974,
  6977,
  8,
  6978,
  6978,
  4,
  6979,
  6980,
  4,
  7019,
  7027,
  4,
  7040,
  7041,
  4,
  7042,
  7042,
  8,
  7073,
  7073,
  8,
  7074,
  7077,
  4,
  7078,
  7079,
  8,
  7080,
  7081,
  4,
  7082,
  7082,
  4,
  7083,
  7085,
  4,
  7142,
  7142,
  4,
  7143,
  7143,
  8,
  7144,
  7145,
  4,
  7146,
  7148,
  8,
  7149,
  7149,
  4,
  7150,
  7150,
  8,
  7151,
  7153,
  4,
  7154,
  7155,
  4,
  7204,
  7211,
  8,
  7212,
  7219,
  4,
  7220,
  7221,
  8,
  7222,
  7223,
  4,
  7376,
  7378,
  4,
  7380,
  7392,
  4,
  7393,
  7393,
  8,
  7394,
  7400,
  4,
  7405,
  7405,
  4,
  7412,
  7412,
  4,
  7415,
  7415,
  8,
  7416,
  7417,
  4,
  7616,
  7679,
  4,
  8203,
  8203,
  3,
  8204,
  8204,
  4,
  8205,
  8205,
  5,
  8206,
  8207,
  3,
  8232,
  8232,
  3,
  8233,
  8233,
  3,
  8234,
  8238,
  3,
  8288,
  8292,
  3,
  8293,
  8293,
  3,
  8294,
  8303,
  3,
  8400,
  8412,
  4,
  8413,
  8416,
  4,
  8417,
  8417,
  4,
  8418,
  8420,
  4,
  8421,
  8432,
  4,
  11503,
  11505,
  4,
  11647,
  11647,
  4,
  11744,
  11775,
  4,
  12330,
  12333,
  4,
  12334,
  12335,
  4,
  12441,
  12442,
  4,
  42607,
  42607,
  4,
  42608,
  42610,
  4,
  42612,
  42621,
  4,
  42654,
  42655,
  4,
  42736,
  42737,
  4,
  43010,
  43010,
  4,
  43014,
  43014,
  4,
  43019,
  43019,
  4,
  43043,
  43044,
  8,
  43045,
  43046,
  4,
  43047,
  43047,
  8,
  43052,
  43052,
  4,
  43136,
  43137,
  8,
  43188,
  43203,
  8,
  43204,
  43205,
  4,
  43232,
  43249,
  4,
  43263,
  43263,
  4,
  43302,
  43309,
  4,
  43335,
  43345,
  4,
  43346,
  43346,
  8,
  43347,
  43347,
  4,
  43360,
  43388,
  9,
  43392,
  43394,
  4,
  43395,
  43395,
  8,
  43443,
  43443,
  4,
  43444,
  43445,
  8,
  43446,
  43449,
  4,
  43450,
  43451,
  8,
  43452,
  43453,
  4,
  43454,
  43455,
  8,
  43456,
  43456,
  4,
  43493,
  43493,
  4,
  43561,
  43566,
  4,
  43567,
  43568,
  8,
  43569,
  43570,
  4,
  43571,
  43572,
  8,
  43573,
  43574,
  4,
  43587,
  43587,
  4,
  43596,
  43596,
  4,
  43597,
  43597,
  8,
  43644,
  43644,
  4,
  43696,
  43696,
  4,
  43698,
  43700,
  4,
  43703,
  43704,
  4,
  43710,
  43711,
  4,
  43713,
  43713,
  4,
  43755,
  43755,
  8,
  43756,
  43757,
  4,
  43758,
  43759,
  8,
  43765,
  43765,
  8,
  43766,
  43766,
  4,
  44003,
  44004,
  8,
  44005,
  44005,
  4,
  44006,
  44007,
  8,
  44008,
  44008,
  4,
  44009,
  44010,
  8,
  44012,
  44012,
  8,
  44013,
  44013,
  4,
  44032,
  44032,
  12,
  44033,
  44059,
  13,
  44060,
  44060,
  12,
  44061,
  44087,
  13,
  44088,
  44088,
  12,
  44089,
  44115,
  13,
  44116,
  44116,
  12,
  44117,
  44143,
  13,
  44144,
  44144,
  12,
  44145,
  44171,
  13,
  44172,
  44172,
  12,
  44173,
  44199,
  13,
  44200,
  44200,
  12,
  44201,
  44227,
  13,
  44228,
  44228,
  12,
  44229,
  44255,
  13,
  44256,
  44256,
  12,
  44257,
  44283,
  13,
  44284,
  44284,
  12,
  44285,
  44311,
  13,
  44312,
  44312,
  12,
  44313,
  44339,
  13,
  44340,
  44340,
  12,
  44341,
  44367,
  13,
  44368,
  44368,
  12,
  44369,
  44395,
  13,
  44396,
  44396,
  12,
  44397,
  44423,
  13,
  44424,
  44424,
  12,
  44425,
  44451,
  13,
  44452,
  44452,
  12,
  44453,
  44479,
  13,
  44480,
  44480,
  12,
  44481,
  44507,
  13,
  44508,
  44508,
  12,
  44509,
  44535,
  13,
  44536,
  44536,
  12,
  44537,
  44563,
  13,
  44564,
  44564,
  12,
  44565,
  44591,
  13,
  44592,
  44592,
  12,
  44593,
  44619,
  13,
  44620,
  44620,
  12,
  44621,
  44647,
  13,
  44648,
  44648,
  12,
  44649,
  44675,
  13,
  44676,
  44676,
  12,
  44677,
  44703,
  13,
  44704,
  44704,
  12,
  44705,
  44731,
  13,
  44732,
  44732,
  12,
  44733,
  44759,
  13,
  44760,
  44760,
  12,
  44761,
  44787,
  13,
  44788,
  44788,
  12,
  44789,
  44815,
  13,
  44816,
  44816,
  12,
  44817,
  44843,
  13,
  44844,
  44844,
  12,
  44845,
  44871,
  13,
  44872,
  44872,
  12,
  44873,
  44899,
  13,
  44900,
  44900,
  12,
  44901,
  44927,
  13,
  44928,
  44928,
  12,
  44929,
  44955,
  13,
  44956,
  44956,
  12,
  44957,
  44983,
  13,
  44984,
  44984,
  12,
  44985,
  45011,
  13,
  45012,
  45012,
  12,
  45013,
  45039,
  13,
  45040,
  45040,
  12,
  45041,
  45067,
  13,
  45068,
  45068,
  12,
  45069,
  45095,
  13,
  45096,
  45096,
  12,
  45097,
  45123,
  13,
  45124,
  45124,
  12,
  45125,
  45151,
  13,
  45152,
  45152,
  12,
  45153,
  45179,
  13,
  45180,
  45180,
  12,
  45181,
  45207,
  13,
  45208,
  45208,
  12,
  45209,
  45235,
  13,
  45236,
  45236,
  12,
  45237,
  45263,
  13,
  45264,
  45264,
  12,
  45265,
  45291,
  13,
  45292,
  45292,
  12,
  45293,
  45319,
  13,
  45320,
  45320,
  12,
  45321,
  45347,
  13,
  45348,
  45348,
  12,
  45349,
  45375,
  13,
  45376,
  45376,
  12,
  45377,
  45403,
  13,
  45404,
  45404,
  12,
  45405,
  45431,
  13,
  45432,
  45432,
  12,
  45433,
  45459,
  13,
  45460,
  45460,
  12,
  45461,
  45487,
  13,
  45488,
  45488,
  12,
  45489,
  45515,
  13,
  45516,
  45516,
  12,
  45517,
  45543,
  13,
  45544,
  45544,
  12,
  45545,
  45571,
  13,
  45572,
  45572,
  12,
  45573,
  45599,
  13,
  45600,
  45600,
  12,
  45601,
  45627,
  13,
  45628,
  45628,
  12,
  45629,
  45655,
  13,
  45656,
  45656,
  12,
  45657,
  45683,
  13,
  45684,
  45684,
  12,
  45685,
  45711,
  13,
  45712,
  45712,
  12,
  45713,
  45739,
  13,
  45740,
  45740,
  12,
  45741,
  45767,
  13,
  45768,
  45768,
  12,
  45769,
  45795,
  13,
  45796,
  45796,
  12,
  45797,
  45823,
  13,
  45824,
  45824,
  12,
  45825,
  45851,
  13,
  45852,
  45852,
  12,
  45853,
  45879,
  13,
  45880,
  45880,
  12,
  45881,
  45907,
  13,
  45908,
  45908,
  12,
  45909,
  45935,
  13,
  45936,
  45936,
  12,
  45937,
  45963,
  13,
  45964,
  45964,
  12,
  45965,
  45991,
  13,
  45992,
  45992,
  12,
  45993,
  46019,
  13,
  46020,
  46020,
  12,
  46021,
  46047,
  13,
  46048,
  46048,
  12,
  46049,
  46075,
  13,
  46076,
  46076,
  12,
  46077,
  46103,
  13,
  46104,
  46104,
  12,
  46105,
  46131,
  13,
  46132,
  46132,
  12,
  46133,
  46159,
  13,
  46160,
  46160,
  12,
  46161,
  46187,
  13,
  46188,
  46188,
  12,
  46189,
  46215,
  13,
  46216,
  46216,
  12,
  46217,
  46243,
  13,
  46244,
  46244,
  12,
  46245,
  46271,
  13,
  46272,
  46272,
  12,
  46273,
  46299,
  13,
  46300,
  46300,
  12,
  46301,
  46327,
  13,
  46328,
  46328,
  12,
  46329,
  46355,
  13,
  46356,
  46356,
  12,
  46357,
  46383,
  13,
  46384,
  46384,
  12,
  46385,
  46411,
  13,
  46412,
  46412,
  12,
  46413,
  46439,
  13,
  46440,
  46440,
  12,
  46441,
  46467,
  13,
  46468,
  46468,
  12,
  46469,
  46495,
  13,
  46496,
  46496,
  12,
  46497,
  46523,
  13,
  46524,
  46524,
  12,
  46525,
  46551,
  13,
  46552,
  46552,
  12,
  46553,
  46579,
  13,
  46580,
  46580,
  12,
  46581,
  46607,
  13,
  46608,
  46608,
  12,
  46609,
  46635,
  13,
  46636,
  46636,
  12,
  46637,
  46663,
  13,
  46664,
  46664,
  12,
  46665,
  46691,
  13,
  46692,
  46692,
  12,
  46693,
  46719,
  13,
  46720,
  46720,
  12,
  46721,
  46747,
  13,
  46748,
  46748,
  12,
  46749,
  46775,
  13,
  46776,
  46776,
  12,
  46777,
  46803,
  13,
  46804,
  46804,
  12,
  46805,
  46831,
  13,
  46832,
  46832,
  12,
  46833,
  46859,
  13,
  46860,
  46860,
  12,
  46861,
  46887,
  13,
  46888,
  46888,
  12,
  46889,
  46915,
  13,
  46916,
  46916,
  12,
  46917,
  46943,
  13,
  46944,
  46944,
  12,
  46945,
  46971,
  13,
  46972,
  46972,
  12,
  46973,
  46999,
  13,
  47e3,
  47e3,
  12,
  47001,
  47027,
  13,
  47028,
  47028,
  12,
  47029,
  47055,
  13,
  47056,
  47056,
  12,
  47057,
  47083,
  13,
  47084,
  47084,
  12,
  47085,
  47111,
  13,
  47112,
  47112,
  12,
  47113,
  47139,
  13,
  47140,
  47140,
  12,
  47141,
  47167,
  13,
  47168,
  47168,
  12,
  47169,
  47195,
  13,
  47196,
  47196,
  12,
  47197,
  47223,
  13,
  47224,
  47224,
  12,
  47225,
  47251,
  13,
  47252,
  47252,
  12,
  47253,
  47279,
  13,
  47280,
  47280,
  12,
  47281,
  47307,
  13,
  47308,
  47308,
  12,
  47309,
  47335,
  13,
  47336,
  47336,
  12,
  47337,
  47363,
  13,
  47364,
  47364,
  12,
  47365,
  47391,
  13,
  47392,
  47392,
  12,
  47393,
  47419,
  13,
  47420,
  47420,
  12,
  47421,
  47447,
  13,
  47448,
  47448,
  12,
  47449,
  47475,
  13,
  47476,
  47476,
  12,
  47477,
  47503,
  13,
  47504,
  47504,
  12,
  47505,
  47531,
  13,
  47532,
  47532,
  12,
  47533,
  47559,
  13,
  47560,
  47560,
  12,
  47561,
  47587,
  13,
  47588,
  47588,
  12,
  47589,
  47615,
  13,
  47616,
  47616,
  12,
  47617,
  47643,
  13,
  47644,
  47644,
  12,
  47645,
  47671,
  13,
  47672,
  47672,
  12,
  47673,
  47699,
  13,
  47700,
  47700,
  12,
  47701,
  47727,
  13,
  47728,
  47728,
  12,
  47729,
  47755,
  13,
  47756,
  47756,
  12,
  47757,
  47783,
  13,
  47784,
  47784,
  12,
  47785,
  47811,
  13,
  47812,
  47812,
  12,
  47813,
  47839,
  13,
  47840,
  47840,
  12,
  47841,
  47867,
  13,
  47868,
  47868,
  12,
  47869,
  47895,
  13,
  47896,
  47896,
  12,
  47897,
  47923,
  13,
  47924,
  47924,
  12,
  47925,
  47951,
  13,
  47952,
  47952,
  12,
  47953,
  47979,
  13,
  47980,
  47980,
  12,
  47981,
  48007,
  13,
  48008,
  48008,
  12,
  48009,
  48035,
  13,
  48036,
  48036,
  12,
  48037,
  48063,
  13,
  48064,
  48064,
  12,
  48065,
  48091,
  13,
  48092,
  48092,
  12,
  48093,
  48119,
  13,
  48120,
  48120,
  12,
  48121,
  48147,
  13,
  48148,
  48148,
  12,
  48149,
  48175,
  13,
  48176,
  48176,
  12,
  48177,
  48203,
  13,
  48204,
  48204,
  12,
  48205,
  48231,
  13,
  48232,
  48232,
  12,
  48233,
  48259,
  13,
  48260,
  48260,
  12,
  48261,
  48287,
  13,
  48288,
  48288,
  12,
  48289,
  48315,
  13,
  48316,
  48316,
  12,
  48317,
  48343,
  13,
  48344,
  48344,
  12,
  48345,
  48371,
  13,
  48372,
  48372,
  12,
  48373,
  48399,
  13,
  48400,
  48400,
  12,
  48401,
  48427,
  13,
  48428,
  48428,
  12,
  48429,
  48455,
  13,
  48456,
  48456,
  12,
  48457,
  48483,
  13,
  48484,
  48484,
  12,
  48485,
  48511,
  13,
  48512,
  48512,
  12,
  48513,
  48539,
  13,
  48540,
  48540,
  12,
  48541,
  48567,
  13,
  48568,
  48568,
  12,
  48569,
  48595,
  13,
  48596,
  48596,
  12,
  48597,
  48623,
  13,
  48624,
  48624,
  12,
  48625,
  48651,
  13,
  48652,
  48652,
  12,
  48653,
  48679,
  13,
  48680,
  48680,
  12,
  48681,
  48707,
  13,
  48708,
  48708,
  12,
  48709,
  48735,
  13,
  48736,
  48736,
  12,
  48737,
  48763,
  13,
  48764,
  48764,
  12,
  48765,
  48791,
  13,
  48792,
  48792,
  12,
  48793,
  48819,
  13,
  48820,
  48820,
  12,
  48821,
  48847,
  13,
  48848,
  48848,
  12,
  48849,
  48875,
  13,
  48876,
  48876,
  12,
  48877,
  48903,
  13,
  48904,
  48904,
  12,
  48905,
  48931,
  13,
  48932,
  48932,
  12,
  48933,
  48959,
  13,
  48960,
  48960,
  12,
  48961,
  48987,
  13,
  48988,
  48988,
  12,
  48989,
  49015,
  13,
  49016,
  49016,
  12,
  49017,
  49043,
  13,
  49044,
  49044,
  12,
  49045,
  49071,
  13,
  49072,
  49072,
  12,
  49073,
  49099,
  13,
  49100,
  49100,
  12,
  49101,
  49127,
  13,
  49128,
  49128,
  12,
  49129,
  49155,
  13,
  49156,
  49156,
  12,
  49157,
  49183,
  13,
  49184,
  49184,
  12,
  49185,
  49211,
  13,
  49212,
  49212,
  12,
  49213,
  49239,
  13,
  49240,
  49240,
  12,
  49241,
  49267,
  13,
  49268,
  49268,
  12,
  49269,
  49295,
  13,
  49296,
  49296,
  12,
  49297,
  49323,
  13,
  49324,
  49324,
  12,
  49325,
  49351,
  13,
  49352,
  49352,
  12,
  49353,
  49379,
  13,
  49380,
  49380,
  12,
  49381,
  49407,
  13,
  49408,
  49408,
  12,
  49409,
  49435,
  13,
  49436,
  49436,
  12,
  49437,
  49463,
  13,
  49464,
  49464,
  12,
  49465,
  49491,
  13,
  49492,
  49492,
  12,
  49493,
  49519,
  13,
  49520,
  49520,
  12,
  49521,
  49547,
  13,
  49548,
  49548,
  12,
  49549,
  49575,
  13,
  49576,
  49576,
  12,
  49577,
  49603,
  13,
  49604,
  49604,
  12,
  49605,
  49631,
  13,
  49632,
  49632,
  12,
  49633,
  49659,
  13,
  49660,
  49660,
  12,
  49661,
  49687,
  13,
  49688,
  49688,
  12,
  49689,
  49715,
  13,
  49716,
  49716,
  12,
  49717,
  49743,
  13,
  49744,
  49744,
  12,
  49745,
  49771,
  13,
  49772,
  49772,
  12,
  49773,
  49799,
  13,
  49800,
  49800,
  12,
  49801,
  49827,
  13,
  49828,
  49828,
  12,
  49829,
  49855,
  13,
  49856,
  49856,
  12,
  49857,
  49883,
  13,
  49884,
  49884,
  12,
  49885,
  49911,
  13,
  49912,
  49912,
  12,
  49913,
  49939,
  13,
  49940,
  49940,
  12,
  49941,
  49967,
  13,
  49968,
  49968,
  12,
  49969,
  49995,
  13,
  49996,
  49996,
  12,
  49997,
  50023,
  13,
  50024,
  50024,
  12,
  50025,
  50051,
  13,
  50052,
  50052,
  12,
  50053,
  50079,
  13,
  50080,
  50080,
  12,
  50081,
  50107,
  13,
  50108,
  50108,
  12,
  50109,
  50135,
  13,
  50136,
  50136,
  12,
  50137,
  50163,
  13,
  50164,
  50164,
  12,
  50165,
  50191,
  13,
  50192,
  50192,
  12,
  50193,
  50219,
  13,
  50220,
  50220,
  12,
  50221,
  50247,
  13,
  50248,
  50248,
  12,
  50249,
  50275,
  13,
  50276,
  50276,
  12,
  50277,
  50303,
  13,
  50304,
  50304,
  12,
  50305,
  50331,
  13,
  50332,
  50332,
  12,
  50333,
  50359,
  13,
  50360,
  50360,
  12,
  50361,
  50387,
  13,
  50388,
  50388,
  12,
  50389,
  50415,
  13,
  50416,
  50416,
  12,
  50417,
  50443,
  13,
  50444,
  50444,
  12,
  50445,
  50471,
  13,
  50472,
  50472,
  12,
  50473,
  50499,
  13,
  50500,
  50500,
  12,
  50501,
  50527,
  13,
  50528,
  50528,
  12,
  50529,
  50555,
  13,
  50556,
  50556,
  12,
  50557,
  50583,
  13,
  50584,
  50584,
  12,
  50585,
  50611,
  13,
  50612,
  50612,
  12,
  50613,
  50639,
  13,
  50640,
  50640,
  12,
  50641,
  50667,
  13,
  50668,
  50668,
  12,
  50669,
  50695,
  13,
  50696,
  50696,
  12,
  50697,
  50723,
  13,
  50724,
  50724,
  12,
  50725,
  50751,
  13,
  50752,
  50752,
  12,
  50753,
  50779,
  13,
  50780,
  50780,
  12,
  50781,
  50807,
  13,
  50808,
  50808,
  12,
  50809,
  50835,
  13,
  50836,
  50836,
  12,
  50837,
  50863,
  13,
  50864,
  50864,
  12,
  50865,
  50891,
  13,
  50892,
  50892,
  12,
  50893,
  50919,
  13,
  50920,
  50920,
  12,
  50921,
  50947,
  13,
  50948,
  50948,
  12,
  50949,
  50975,
  13,
  50976,
  50976,
  12,
  50977,
  51003,
  13,
  51004,
  51004,
  12,
  51005,
  51031,
  13,
  51032,
  51032,
  12,
  51033,
  51059,
  13,
  51060,
  51060,
  12,
  51061,
  51087,
  13,
  51088,
  51088,
  12,
  51089,
  51115,
  13,
  51116,
  51116,
  12,
  51117,
  51143,
  13,
  51144,
  51144,
  12,
  51145,
  51171,
  13,
  51172,
  51172,
  12,
  51173,
  51199,
  13,
  51200,
  51200,
  12,
  51201,
  51227,
  13,
  51228,
  51228,
  12,
  51229,
  51255,
  13,
  51256,
  51256,
  12,
  51257,
  51283,
  13,
  51284,
  51284,
  12,
  51285,
  51311,
  13,
  51312,
  51312,
  12,
  51313,
  51339,
  13,
  51340,
  51340,
  12,
  51341,
  51367,
  13,
  51368,
  51368,
  12,
  51369,
  51395,
  13,
  51396,
  51396,
  12,
  51397,
  51423,
  13,
  51424,
  51424,
  12,
  51425,
  51451,
  13,
  51452,
  51452,
  12,
  51453,
  51479,
  13,
  51480,
  51480,
  12,
  51481,
  51507,
  13,
  51508,
  51508,
  12,
  51509,
  51535,
  13,
  51536,
  51536,
  12,
  51537,
  51563,
  13,
  51564,
  51564,
  12,
  51565,
  51591,
  13,
  51592,
  51592,
  12,
  51593,
  51619,
  13,
  51620,
  51620,
  12,
  51621,
  51647,
  13,
  51648,
  51648,
  12,
  51649,
  51675,
  13,
  51676,
  51676,
  12,
  51677,
  51703,
  13,
  51704,
  51704,
  12,
  51705,
  51731,
  13,
  51732,
  51732,
  12,
  51733,
  51759,
  13,
  51760,
  51760,
  12,
  51761,
  51787,
  13,
  51788,
  51788,
  12,
  51789,
  51815,
  13,
  51816,
  51816,
  12,
  51817,
  51843,
  13,
  51844,
  51844,
  12,
  51845,
  51871,
  13,
  51872,
  51872,
  12,
  51873,
  51899,
  13,
  51900,
  51900,
  12,
  51901,
  51927,
  13,
  51928,
  51928,
  12,
  51929,
  51955,
  13,
  51956,
  51956,
  12,
  51957,
  51983,
  13,
  51984,
  51984,
  12,
  51985,
  52011,
  13,
  52012,
  52012,
  12,
  52013,
  52039,
  13,
  52040,
  52040,
  12,
  52041,
  52067,
  13,
  52068,
  52068,
  12,
  52069,
  52095,
  13,
  52096,
  52096,
  12,
  52097,
  52123,
  13,
  52124,
  52124,
  12,
  52125,
  52151,
  13,
  52152,
  52152,
  12,
  52153,
  52179,
  13,
  52180,
  52180,
  12,
  52181,
  52207,
  13,
  52208,
  52208,
  12,
  52209,
  52235,
  13,
  52236,
  52236,
  12,
  52237,
  52263,
  13,
  52264,
  52264,
  12,
  52265,
  52291,
  13,
  52292,
  52292,
  12,
  52293,
  52319,
  13,
  52320,
  52320,
  12,
  52321,
  52347,
  13,
  52348,
  52348,
  12,
  52349,
  52375,
  13,
  52376,
  52376,
  12,
  52377,
  52403,
  13,
  52404,
  52404,
  12,
  52405,
  52431,
  13,
  52432,
  52432,
  12,
  52433,
  52459,
  13,
  52460,
  52460,
  12,
  52461,
  52487,
  13,
  52488,
  52488,
  12,
  52489,
  52515,
  13,
  52516,
  52516,
  12,
  52517,
  52543,
  13,
  52544,
  52544,
  12,
  52545,
  52571,
  13,
  52572,
  52572,
  12,
  52573,
  52599,
  13,
  52600,
  52600,
  12,
  52601,
  52627,
  13,
  52628,
  52628,
  12,
  52629,
  52655,
  13,
  52656,
  52656,
  12,
  52657,
  52683,
  13,
  52684,
  52684,
  12,
  52685,
  52711,
  13,
  52712,
  52712,
  12,
  52713,
  52739,
  13,
  52740,
  52740,
  12,
  52741,
  52767,
  13,
  52768,
  52768,
  12,
  52769,
  52795,
  13,
  52796,
  52796,
  12,
  52797,
  52823,
  13,
  52824,
  52824,
  12,
  52825,
  52851,
  13,
  52852,
  52852,
  12,
  52853,
  52879,
  13,
  52880,
  52880,
  12,
  52881,
  52907,
  13,
  52908,
  52908,
  12,
  52909,
  52935,
  13,
  52936,
  52936,
  12,
  52937,
  52963,
  13,
  52964,
  52964,
  12,
  52965,
  52991,
  13,
  52992,
  52992,
  12,
  52993,
  53019,
  13,
  53020,
  53020,
  12,
  53021,
  53047,
  13,
  53048,
  53048,
  12,
  53049,
  53075,
  13,
  53076,
  53076,
  12,
  53077,
  53103,
  13,
  53104,
  53104,
  12,
  53105,
  53131,
  13,
  53132,
  53132,
  12,
  53133,
  53159,
  13,
  53160,
  53160,
  12,
  53161,
  53187,
  13,
  53188,
  53188,
  12,
  53189,
  53215,
  13,
  53216,
  53216,
  12,
  53217,
  53243,
  13,
  53244,
  53244,
  12,
  53245,
  53271,
  13,
  53272,
  53272,
  12,
  53273,
  53299,
  13,
  53300,
  53300,
  12,
  53301,
  53327,
  13,
  53328,
  53328,
  12,
  53329,
  53355,
  13,
  53356,
  53356,
  12,
  53357,
  53383,
  13,
  53384,
  53384,
  12,
  53385,
  53411,
  13,
  53412,
  53412,
  12,
  53413,
  53439,
  13,
  53440,
  53440,
  12,
  53441,
  53467,
  13,
  53468,
  53468,
  12,
  53469,
  53495,
  13,
  53496,
  53496,
  12,
  53497,
  53523,
  13,
  53524,
  53524,
  12,
  53525,
  53551,
  13,
  53552,
  53552,
  12,
  53553,
  53579,
  13,
  53580,
  53580,
  12,
  53581,
  53607,
  13,
  53608,
  53608,
  12,
  53609,
  53635,
  13,
  53636,
  53636,
  12,
  53637,
  53663,
  13,
  53664,
  53664,
  12,
  53665,
  53691,
  13,
  53692,
  53692,
  12,
  53693,
  53719,
  13,
  53720,
  53720,
  12,
  53721,
  53747,
  13,
  53748,
  53748,
  12,
  53749,
  53775,
  13,
  53776,
  53776,
  12,
  53777,
  53803,
  13,
  53804,
  53804,
  12,
  53805,
  53831,
  13,
  53832,
  53832,
  12,
  53833,
  53859,
  13,
  53860,
  53860,
  12,
  53861,
  53887,
  13,
  53888,
  53888,
  12,
  53889,
  53915,
  13,
  53916,
  53916,
  12,
  53917,
  53943,
  13,
  53944,
  53944,
  12,
  53945,
  53971,
  13,
  53972,
  53972,
  12,
  53973,
  53999,
  13,
  54e3,
  54e3,
  12,
  54001,
  54027,
  13,
  54028,
  54028,
  12,
  54029,
  54055,
  13,
  54056,
  54056,
  12,
  54057,
  54083,
  13,
  54084,
  54084,
  12,
  54085,
  54111,
  13,
  54112,
  54112,
  12,
  54113,
  54139,
  13,
  54140,
  54140,
  12,
  54141,
  54167,
  13,
  54168,
  54168,
  12,
  54169,
  54195,
  13,
  54196,
  54196,
  12,
  54197,
  54223,
  13,
  54224,
  54224,
  12,
  54225,
  54251,
  13,
  54252,
  54252,
  12,
  54253,
  54279,
  13,
  54280,
  54280,
  12,
  54281,
  54307,
  13,
  54308,
  54308,
  12,
  54309,
  54335,
  13,
  54336,
  54336,
  12,
  54337,
  54363,
  13,
  54364,
  54364,
  12,
  54365,
  54391,
  13,
  54392,
  54392,
  12,
  54393,
  54419,
  13,
  54420,
  54420,
  12,
  54421,
  54447,
  13,
  54448,
  54448,
  12,
  54449,
  54475,
  13,
  54476,
  54476,
  12,
  54477,
  54503,
  13,
  54504,
  54504,
  12,
  54505,
  54531,
  13,
  54532,
  54532,
  12,
  54533,
  54559,
  13,
  54560,
  54560,
  12,
  54561,
  54587,
  13,
  54588,
  54588,
  12,
  54589,
  54615,
  13,
  54616,
  54616,
  12,
  54617,
  54643,
  13,
  54644,
  54644,
  12,
  54645,
  54671,
  13,
  54672,
  54672,
  12,
  54673,
  54699,
  13,
  54700,
  54700,
  12,
  54701,
  54727,
  13,
  54728,
  54728,
  12,
  54729,
  54755,
  13,
  54756,
  54756,
  12,
  54757,
  54783,
  13,
  54784,
  54784,
  12,
  54785,
  54811,
  13,
  54812,
  54812,
  12,
  54813,
  54839,
  13,
  54840,
  54840,
  12,
  54841,
  54867,
  13,
  54868,
  54868,
  12,
  54869,
  54895,
  13,
  54896,
  54896,
  12,
  54897,
  54923,
  13,
  54924,
  54924,
  12,
  54925,
  54951,
  13,
  54952,
  54952,
  12,
  54953,
  54979,
  13,
  54980,
  54980,
  12,
  54981,
  55007,
  13,
  55008,
  55008,
  12,
  55009,
  55035,
  13,
  55036,
  55036,
  12,
  55037,
  55063,
  13,
  55064,
  55064,
  12,
  55065,
  55091,
  13,
  55092,
  55092,
  12,
  55093,
  55119,
  13,
  55120,
  55120,
  12,
  55121,
  55147,
  13,
  55148,
  55148,
  12,
  55149,
  55175,
  13,
  55176,
  55176,
  12,
  55177,
  55203,
  13,
  55216,
  55238,
  10,
  55243,
  55291,
  11,
  64286,
  64286,
  4,
  65024,
  65039,
  4,
  65056,
  65071,
  4,
  65279,
  65279,
  3,
  65438,
  65439,
  4,
  65520,
  65528,
  3,
  65529,
  65531,
  3,
  66045,
  66045,
  4,
  66272,
  66272,
  4,
  66422,
  66426,
  4,
  68097,
  68099,
  4,
  68101,
  68102,
  4,
  68108,
  68111,
  4,
  68152,
  68154,
  4,
  68159,
  68159,
  4,
  68325,
  68326,
  4,
  68900,
  68903,
  4,
  68969,
  68973,
  4,
  69291,
  69292,
  4,
  69323,
  69327,
  4,
  69360,
  69375,
  4,
  69446,
  69456,
  4,
  69506,
  69509,
  4,
  69632,
  69632,
  8,
  69633,
  69633,
  4,
  69634,
  69634,
  8,
  69688,
  69702,
  4,
  69744,
  69744,
  4,
  69747,
  69748,
  4,
  69759,
  69761,
  4,
  69762,
  69762,
  8,
  69808,
  69810,
  8,
  69811,
  69814,
  4,
  69815,
  69816,
  8,
  69817,
  69818,
  4,
  69821,
  69821,
  7,
  69826,
  69826,
  4,
  69837,
  69837,
  7,
  69888,
  69890,
  4,
  69927,
  69931,
  4,
  69932,
  69932,
  8,
  69933,
  69940,
  4,
  69957,
  69958,
  8,
  70003,
  70003,
  4,
  70016,
  70017,
  4,
  70018,
  70018,
  8,
  70067,
  70069,
  8,
  70070,
  70078,
  4,
  70079,
  70079,
  8,
  70080,
  70080,
  4,
  70082,
  70083,
  7,
  70089,
  70092,
  4,
  70094,
  70094,
  8,
  70095,
  70095,
  4,
  70188,
  70190,
  8,
  70191,
  70193,
  4,
  70194,
  70195,
  8,
  70196,
  70196,
  4,
  70197,
  70197,
  4,
  70198,
  70199,
  4,
  70206,
  70206,
  4,
  70209,
  70209,
  4,
  70367,
  70367,
  4,
  70368,
  70370,
  8,
  70371,
  70378,
  4,
  70400,
  70401,
  4,
  70402,
  70403,
  8,
  70459,
  70460,
  4,
  70462,
  70462,
  4,
  70463,
  70463,
  8,
  70464,
  70464,
  4,
  70465,
  70468,
  8,
  70471,
  70472,
  8,
  70475,
  70476,
  8,
  70477,
  70477,
  4,
  70487,
  70487,
  4,
  70498,
  70499,
  8,
  70502,
  70508,
  4,
  70512,
  70516,
  4,
  70584,
  70584,
  4,
  70585,
  70586,
  8,
  70587,
  70592,
  4,
  70594,
  70594,
  4,
  70597,
  70597,
  4,
  70599,
  70601,
  4,
  70602,
  70602,
  8,
  70604,
  70605,
  8,
  70606,
  70606,
  4,
  70607,
  70607,
  4,
  70608,
  70608,
  4,
  70609,
  70609,
  7,
  70610,
  70610,
  4,
  70625,
  70626,
  4,
  70709,
  70711,
  8,
  70712,
  70719,
  4,
  70720,
  70721,
  8,
  70722,
  70724,
  4,
  70725,
  70725,
  8,
  70726,
  70726,
  4,
  70750,
  70750,
  4,
  70832,
  70832,
  4,
  70833,
  70834,
  8,
  70835,
  70840,
  4,
  70841,
  70841,
  8,
  70842,
  70842,
  4,
  70843,
  70844,
  8,
  70845,
  70845,
  4,
  70846,
  70846,
  8,
  70847,
  70848,
  4,
  70849,
  70849,
  8,
  70850,
  70851,
  4,
  71087,
  71087,
  4,
  71088,
  71089,
  8,
  71090,
  71093,
  4,
  71096,
  71099,
  8,
  71100,
  71101,
  4,
  71102,
  71102,
  8,
  71103,
  71104,
  4,
  71132,
  71133,
  4,
  71216,
  71218,
  8,
  71219,
  71226,
  4,
  71227,
  71228,
  8,
  71229,
  71229,
  4,
  71230,
  71230,
  8,
  71231,
  71232,
  4,
  71339,
  71339,
  4,
  71340,
  71340,
  8,
  71341,
  71341,
  4,
  71342,
  71343,
  8,
  71344,
  71349,
  4,
  71350,
  71350,
  4,
  71351,
  71351,
  4,
  71453,
  71453,
  4,
  71454,
  71454,
  8,
  71455,
  71455,
  4,
  71458,
  71461,
  4,
  71462,
  71462,
  8,
  71463,
  71467,
  4,
  71724,
  71726,
  8,
  71727,
  71735,
  4,
  71736,
  71736,
  8,
  71737,
  71738,
  4,
  71984,
  71984,
  4,
  71985,
  71989,
  8,
  71991,
  71992,
  8,
  71995,
  71996,
  4,
  71997,
  71997,
  4,
  71998,
  71998,
  4,
  71999,
  71999,
  7,
  72e3,
  72e3,
  8,
  72001,
  72001,
  7,
  72002,
  72002,
  8,
  72003,
  72003,
  4,
  72145,
  72147,
  8,
  72148,
  72151,
  4,
  72154,
  72155,
  4,
  72156,
  72159,
  8,
  72160,
  72160,
  4,
  72164,
  72164,
  8,
  72193,
  72202,
  4,
  72243,
  72248,
  4,
  72249,
  72249,
  8,
  72251,
  72254,
  4,
  72263,
  72263,
  4,
  72273,
  72278,
  4,
  72279,
  72280,
  8,
  72281,
  72283,
  4,
  72324,
  72329,
  7,
  72330,
  72342,
  4,
  72343,
  72343,
  8,
  72344,
  72345,
  4,
  72544,
  72544,
  4,
  72545,
  72545,
  8,
  72546,
  72548,
  4,
  72549,
  72549,
  8,
  72550,
  72550,
  4,
  72551,
  72551,
  8,
  72751,
  72751,
  8,
  72752,
  72758,
  4,
  72760,
  72765,
  4,
  72766,
  72766,
  8,
  72767,
  72767,
  4,
  72850,
  72871,
  4,
  72873,
  72873,
  8,
  72874,
  72880,
  4,
  72881,
  72881,
  8,
  72882,
  72883,
  4,
  72884,
  72884,
  8,
  72885,
  72886,
  4,
  73009,
  73014,
  4,
  73018,
  73018,
  4,
  73020,
  73021,
  4,
  73023,
  73029,
  4,
  73030,
  73030,
  7,
  73031,
  73031,
  4,
  73098,
  73102,
  8,
  73104,
  73105,
  4,
  73107,
  73108,
  8,
  73109,
  73109,
  4,
  73110,
  73110,
  8,
  73111,
  73111,
  4,
  73200,
  73200,
  4,
  73459,
  73460,
  4,
  73461,
  73462,
  8,
  73472,
  73473,
  4,
  73474,
  73474,
  7,
  73475,
  73475,
  8,
  73524,
  73525,
  8,
  73526,
  73530,
  4,
  73534,
  73535,
  8,
  73536,
  73536,
  4,
  73537,
  73537,
  4,
  73538,
  73538,
  4,
  73562,
  73562,
  4,
  78896,
  78911,
  3,
  78912,
  78912,
  4,
  78919,
  78933,
  4,
  90398,
  90409,
  4,
  90410,
  90412,
  8,
  90413,
  90415,
  4,
  92912,
  92916,
  4,
  92976,
  92982,
  4,
  93539,
  93539,
  10,
  93543,
  93546,
  10,
  94031,
  94031,
  4,
  94033,
  94087,
  8,
  94095,
  94098,
  4,
  94180,
  94180,
  4,
  94192,
  94193,
  4,
  113821,
  113822,
  4,
  113824,
  113827,
  3,
  118528,
  118573,
  4,
  118576,
  118598,
  4,
  119079,
  119080,
  4,
  119141,
  119142,
  4,
  119143,
  119145,
  4,
  119149,
  119154,
  4,
  119155,
  119162,
  3,
  119163,
  119170,
  4,
  119173,
  119179,
  4,
  119210,
  119213,
  4,
  119362,
  119364,
  4,
  119376,
  119378,
  4,
  119387,
  119388,
  4,
  119391,
  119391,
  4,
  119424,
  119425,
  4,
  121344,
  121398,
  4,
  121403,
  121452,
  4,
  121461,
  121461,
  4,
  121476,
  121476,
  4,
  121499,
  121503,
  4,
  121505,
  121519,
  4,
  122880,
  122886,
  4,
  122888,
  122904,
  4,
  122907,
  122913,
  4,
  122915,
  122916,
  4,
  122918,
  122922,
  4,
  123023,
  123023,
  4,
  123184,
  123190,
  4,
  123566,
  123566,
  4,
  123628,
  123631,
  4,
  124140,
  124143,
  4,
  124398,
  124399,
  4,
  124643,
  124643,
  4,
  124646,
  124646,
  4,
  124654,
  124655,
  4,
  124661,
  124661,
  4,
  125136,
  125142,
  4,
  125252,
  125258,
  4,
  127462,
  127487,
  6,
  127995,
  127999,
  4,
  917504,
  917504,
  3,
  917505,
  917505,
  3,
  917506,
  917535,
  3,
  917536,
  917631,
  4,
  917632,
  917759,
  3,
  917760,
  917999,
  4,
  918e3,
  921599,
  3
];
var WIDE = [
  4352,
  4447,
  8986,
  8987,
  9001,
  9001,
  9002,
  9002,
  9193,
  9196,
  9200,
  9200,
  9203,
  9203,
  9725,
  9726,
  9748,
  9749,
  9776,
  9783,
  9800,
  9811,
  9855,
  9855,
  9866,
  9871,
  9875,
  9875,
  9889,
  9889,
  9898,
  9899,
  9917,
  9918,
  9924,
  9925,
  9934,
  9934,
  9940,
  9940,
  9962,
  9962,
  9970,
  9971,
  9973,
  9973,
  9978,
  9978,
  9981,
  9981,
  9989,
  9989,
  9994,
  9995,
  10024,
  10024,
  10060,
  10060,
  10062,
  10062,
  10067,
  10069,
  10071,
  10071,
  10133,
  10135,
  10160,
  10160,
  10175,
  10175,
  11035,
  11036,
  11088,
  11088,
  11093,
  11093,
  11904,
  11929,
  11931,
  12019,
  12032,
  12245,
  12272,
  12287,
  12288,
  12288,
  12289,
  12291,
  12292,
  12292,
  12293,
  12293,
  12294,
  12294,
  12295,
  12295,
  12296,
  12296,
  12297,
  12297,
  12298,
  12298,
  12299,
  12299,
  12300,
  12300,
  12301,
  12301,
  12302,
  12302,
  12303,
  12303,
  12304,
  12304,
  12305,
  12305,
  12306,
  12307,
  12308,
  12308,
  12309,
  12309,
  12310,
  12310,
  12311,
  12311,
  12312,
  12312,
  12313,
  12313,
  12314,
  12314,
  12315,
  12315,
  12316,
  12316,
  12317,
  12317,
  12318,
  12319,
  12320,
  12320,
  12321,
  12329,
  12330,
  12333,
  12334,
  12335,
  12336,
  12336,
  12337,
  12341,
  12342,
  12343,
  12344,
  12346,
  12347,
  12347,
  12348,
  12348,
  12349,
  12349,
  12350,
  12350,
  12353,
  12438,
  12441,
  12442,
  12443,
  12444,
  12445,
  12446,
  12447,
  12447,
  12448,
  12448,
  12449,
  12538,
  12539,
  12539,
  12540,
  12542,
  12543,
  12543,
  12549,
  12591,
  12593,
  12686,
  12688,
  12689,
  12690,
  12693,
  12694,
  12703,
  12704,
  12735,
  12736,
  12773,
  12783,
  12783,
  12784,
  12799,
  12800,
  12830,
  12832,
  12841,
  12842,
  12871,
  12880,
  12880,
  12881,
  12895,
  12896,
  12927,
  12928,
  12937,
  12938,
  12976,
  12977,
  12991,
  12992,
  13055,
  13056,
  13311,
  13312,
  19903,
  19904,
  19967,
  19968,
  40959,
  40960,
  40980,
  40981,
  40981,
  40982,
  42124,
  42128,
  42182,
  43360,
  43388,
  44032,
  55203,
  63744,
  64109,
  64110,
  64111,
  64112,
  64217,
  64218,
  64255,
  65040,
  65046,
  65047,
  65047,
  65048,
  65048,
  65049,
  65049,
  65072,
  65072,
  65073,
  65074,
  65075,
  65076,
  65077,
  65077,
  65078,
  65078,
  65079,
  65079,
  65080,
  65080,
  65081,
  65081,
  65082,
  65082,
  65083,
  65083,
  65084,
  65084,
  65085,
  65085,
  65086,
  65086,
  65087,
  65087,
  65088,
  65088,
  65089,
  65089,
  65090,
  65090,
  65091,
  65091,
  65092,
  65092,
  65093,
  65094,
  65095,
  65095,
  65096,
  65096,
  65097,
  65100,
  65101,
  65103,
  65104,
  65106,
  65108,
  65111,
  65112,
  65112,
  65113,
  65113,
  65114,
  65114,
  65115,
  65115,
  65116,
  65116,
  65117,
  65117,
  65118,
  65118,
  65119,
  65121,
  65122,
  65122,
  65123,
  65123,
  65124,
  65126,
  65128,
  65128,
  65129,
  65129,
  65130,
  65131,
  65281,
  65283,
  65284,
  65284,
  65285,
  65287,
  65288,
  65288,
  65289,
  65289,
  65290,
  65290,
  65291,
  65291,
  65292,
  65292,
  65293,
  65293,
  65294,
  65295,
  65296,
  65305,
  65306,
  65307,
  65308,
  65310,
  65311,
  65312,
  65313,
  65338,
  65339,
  65339,
  65340,
  65340,
  65341,
  65341,
  65342,
  65342,
  65343,
  65343,
  65344,
  65344,
  65345,
  65370,
  65371,
  65371,
  65372,
  65372,
  65373,
  65373,
  65374,
  65374,
  65375,
  65375,
  65376,
  65376,
  65504,
  65505,
  65506,
  65506,
  65507,
  65507,
  65508,
  65508,
  65509,
  65510,
  94176,
  94177,
  94178,
  94178,
  94179,
  94179,
  94180,
  94180,
  94192,
  94193,
  94194,
  94195,
  94196,
  94198,
  94208,
  100351,
  100352,
  101119,
  101120,
  101594,
  101631,
  101631,
  101632,
  101664,
  101760,
  101874,
  101888,
  102801,
  102816,
  102866,
  110576,
  110579,
  110581,
  110587,
  110589,
  110590,
  110592,
  110847,
  110848,
  110888,
  110898,
  110898,
  110928,
  110930,
  110933,
  110933,
  110948,
  110952,
  110960,
  111355,
  119552,
  119638,
  119648,
  119670,
  126980,
  126980,
  127183,
  127183,
  127374,
  127374,
  127377,
  127386,
  127406,
  127406,
  127488,
  127490,
  127504,
  127547,
  127552,
  127560,
  127568,
  127569,
  127584,
  127589,
  127744,
  127776,
  127789,
  127797,
  127799,
  127868,
  127870,
  127891,
  127904,
  127946,
  127951,
  127955,
  127968,
  127984,
  127988,
  127988,
  127992,
  127994,
  127995,
  127999,
  128e3,
  128062,
  128064,
  128064,
  128066,
  128252,
  128255,
  128317,
  128331,
  128334,
  128336,
  128359,
  128378,
  128378,
  128405,
  128406,
  128420,
  128420,
  128507,
  128511,
  128512,
  128591,
  128640,
  128709,
  128716,
  128716,
  128720,
  128722,
  128725,
  128729,
  128732,
  128735,
  128747,
  128748,
  128756,
  128764,
  128986,
  128986,
  128992,
  129003,
  129008,
  129008,
  129292,
  129338,
  129340,
  129349,
  129351,
  129535,
  129648,
  129660,
  129664,
  129734,
  129736,
  129736,
  129740,
  129757,
  129759,
  129771,
  129775,
  129786,
  131072,
  173791,
  173792,
  173823,
  173824,
  178206,
  178207,
  178207,
  178208,
  183981,
  183982,
  183983,
  183984,
  191456,
  191457,
  191471,
  191472,
  192093,
  192094,
  194559,
  194560,
  195101,
  195102,
  195103,
  195104,
  196605,
  196608,
  201546,
  201547,
  201551,
  201552,
  210041,
  210042,
  249855,
  249856,
  261183,
  261184,
  262141
];
var PICT = [
  169,
  169,
  174,
  174,
  8252,
  8252,
  8265,
  8265,
  8482,
  8482,
  8505,
  8505,
  8596,
  8601,
  8617,
  8618,
  8986,
  8987,
  9e3,
  9e3,
  9167,
  9167,
  9193,
  9196,
  9197,
  9198,
  9199,
  9199,
  9200,
  9200,
  9201,
  9202,
  9203,
  9203,
  9208,
  9210,
  9410,
  9410,
  9642,
  9643,
  9654,
  9654,
  9664,
  9664,
  9723,
  9726,
  9728,
  9729,
  9730,
  9731,
  9732,
  9732,
  9742,
  9742,
  9745,
  9745,
  9748,
  9749,
  9752,
  9752,
  9757,
  9757,
  9760,
  9760,
  9762,
  9763,
  9766,
  9766,
  9770,
  9770,
  9774,
  9774,
  9775,
  9775,
  9784,
  9785,
  9786,
  9786,
  9792,
  9792,
  9794,
  9794,
  9800,
  9811,
  9823,
  9823,
  9824,
  9824,
  9827,
  9827,
  9829,
  9830,
  9832,
  9832,
  9851,
  9851,
  9854,
  9854,
  9855,
  9855,
  9874,
  9874,
  9875,
  9875,
  9876,
  9876,
  9877,
  9877,
  9878,
  9879,
  9881,
  9881,
  9883,
  9884,
  9888,
  9889,
  9895,
  9895,
  9898,
  9899,
  9904,
  9905,
  9917,
  9918,
  9924,
  9925,
  9928,
  9928,
  9934,
  9934,
  9935,
  9935,
  9937,
  9937,
  9939,
  9939,
  9940,
  9940,
  9961,
  9961,
  9962,
  9962,
  9968,
  9969,
  9970,
  9971,
  9972,
  9972,
  9973,
  9973,
  9975,
  9977,
  9978,
  9978,
  9981,
  9981,
  9986,
  9986,
  9989,
  9989,
  9992,
  9996,
  9997,
  9997,
  9999,
  9999,
  10002,
  10002,
  10004,
  10004,
  10006,
  10006,
  10013,
  10013,
  10017,
  10017,
  10024,
  10024,
  10035,
  10036,
  10052,
  10052,
  10055,
  10055,
  10060,
  10060,
  10062,
  10062,
  10067,
  10069,
  10071,
  10071,
  10083,
  10083,
  10084,
  10084,
  10133,
  10135,
  10145,
  10145,
  10160,
  10160,
  10175,
  10175,
  10548,
  10549,
  11013,
  11015,
  11035,
  11036,
  11088,
  11088,
  11093,
  11093,
  12336,
  12336,
  12349,
  12349,
  12951,
  12951,
  12953,
  12953,
  126980,
  126980,
  127020,
  127023,
  127124,
  127135,
  127151,
  127152,
  127168,
  127168,
  127183,
  127183,
  127184,
  127184,
  127222,
  127231,
  127344,
  127345,
  127358,
  127359,
  127374,
  127374,
  127377,
  127386,
  127407,
  127461,
  127489,
  127490,
  127491,
  127503,
  127514,
  127514,
  127535,
  127535,
  127538,
  127546,
  127548,
  127551,
  127561,
  127567,
  127568,
  127569,
  127570,
  127583,
  127590,
  127743,
  127744,
  127756,
  127757,
  127758,
  127759,
  127759,
  127760,
  127760,
  127761,
  127761,
  127762,
  127762,
  127763,
  127765,
  127766,
  127768,
  127769,
  127769,
  127770,
  127770,
  127771,
  127771,
  127772,
  127772,
  127773,
  127774,
  127775,
  127776,
  127777,
  127777,
  127780,
  127788,
  127789,
  127791,
  127792,
  127793,
  127794,
  127795,
  127796,
  127797,
  127798,
  127798,
  127799,
  127818,
  127819,
  127819,
  127820,
  127823,
  127824,
  127824,
  127825,
  127867,
  127868,
  127868,
  127869,
  127869,
  127870,
  127871,
  127872,
  127891,
  127894,
  127895,
  127897,
  127899,
  127902,
  127903,
  127904,
  127940,
  127941,
  127941,
  127942,
  127942,
  127943,
  127943,
  127944,
  127944,
  127945,
  127945,
  127946,
  127946,
  127947,
  127950,
  127951,
  127955,
  127956,
  127967,
  127968,
  127971,
  127972,
  127972,
  127973,
  127984,
  127987,
  127987,
  127988,
  127988,
  127989,
  127989,
  127991,
  127991,
  127992,
  127994,
  128e3,
  128007,
  128008,
  128008,
  128009,
  128011,
  128012,
  128014,
  128015,
  128016,
  128017,
  128018,
  128019,
  128019,
  128020,
  128020,
  128021,
  128021,
  128022,
  128022,
  128023,
  128041,
  128042,
  128042,
  128043,
  128062,
  128063,
  128063,
  128064,
  128064,
  128065,
  128065,
  128066,
  128100,
  128101,
  128101,
  128102,
  128107,
  128108,
  128109,
  128110,
  128172,
  128173,
  128173,
  128174,
  128181,
  128182,
  128183,
  128184,
  128235,
  128236,
  128237,
  128238,
  128238,
  128239,
  128239,
  128240,
  128244,
  128245,
  128245,
  128246,
  128247,
  128248,
  128248,
  128249,
  128252,
  128253,
  128253,
  128255,
  128258,
  128259,
  128259,
  128260,
  128263,
  128264,
  128264,
  128265,
  128265,
  128266,
  128276,
  128277,
  128277,
  128278,
  128299,
  128300,
  128301,
  128302,
  128317,
  128329,
  128330,
  128331,
  128334,
  128336,
  128347,
  128348,
  128359,
  128367,
  128368,
  128371,
  128377,
  128378,
  128378,
  128391,
  128391,
  128394,
  128397,
  128400,
  128400,
  128405,
  128406,
  128420,
  128420,
  128421,
  128421,
  128424,
  128424,
  128433,
  128434,
  128444,
  128444,
  128450,
  128452,
  128465,
  128467,
  128476,
  128478,
  128481,
  128481,
  128483,
  128483,
  128488,
  128488,
  128495,
  128495,
  128499,
  128499,
  128506,
  128506,
  128507,
  128511,
  128512,
  128512,
  128513,
  128518,
  128519,
  128520,
  128521,
  128525,
  128526,
  128526,
  128527,
  128527,
  128528,
  128528,
  128529,
  128529,
  128530,
  128532,
  128533,
  128533,
  128534,
  128534,
  128535,
  128535,
  128536,
  128536,
  128537,
  128537,
  128538,
  128538,
  128539,
  128539,
  128540,
  128542,
  128543,
  128543,
  128544,
  128549,
  128550,
  128551,
  128552,
  128555,
  128556,
  128556,
  128557,
  128557,
  128558,
  128559,
  128560,
  128563,
  128564,
  128564,
  128565,
  128565,
  128566,
  128566,
  128567,
  128576,
  128577,
  128580,
  128581,
  128591,
  128640,
  128640,
  128641,
  128642,
  128643,
  128645,
  128646,
  128646,
  128647,
  128647,
  128648,
  128648,
  128649,
  128649,
  128650,
  128651,
  128652,
  128652,
  128653,
  128653,
  128654,
  128654,
  128655,
  128655,
  128656,
  128656,
  128657,
  128659,
  128660,
  128660,
  128661,
  128661,
  128662,
  128662,
  128663,
  128663,
  128664,
  128664,
  128665,
  128666,
  128667,
  128673,
  128674,
  128674,
  128675,
  128675,
  128676,
  128677,
  128678,
  128678,
  128679,
  128685,
  128686,
  128689,
  128690,
  128690,
  128691,
  128693,
  128694,
  128694,
  128695,
  128696,
  128697,
  128702,
  128703,
  128703,
  128704,
  128704,
  128705,
  128709,
  128715,
  128715,
  128716,
  128716,
  128717,
  128719,
  128720,
  128720,
  128721,
  128722,
  128725,
  128725,
  128726,
  128727,
  128728,
  128728,
  128729,
  128729,
  128730,
  128731,
  128732,
  128732,
  128733,
  128735,
  128736,
  128741,
  128745,
  128745,
  128747,
  128748,
  128749,
  128751,
  128752,
  128752,
  128755,
  128755,
  128756,
  128758,
  128759,
  128760,
  128761,
  128761,
  128762,
  128762,
  128763,
  128764,
  128765,
  128767,
  128988,
  128991,
  128992,
  129003,
  129004,
  129007,
  129008,
  129008,
  129036,
  129039,
  129096,
  129103,
  129114,
  129119,
  129160,
  129167,
  129198,
  129199,
  129212,
  129215,
  129218,
  129231,
  129241,
  129279,
  129292,
  129292,
  129293,
  129295,
  129296,
  129304,
  129305,
  129310,
  129311,
  129311,
  129312,
  129319,
  129320,
  129327,
  129328,
  129328,
  129329,
  129330,
  129331,
  129338,
  129340,
  129342,
  129343,
  129343,
  129344,
  129349,
  129351,
  129355,
  129356,
  129356,
  129357,
  129359,
  129360,
  129374,
  129375,
  129387,
  129388,
  129392,
  129393,
  129393,
  129394,
  129394,
  129395,
  129398,
  129399,
  129400,
  129401,
  129401,
  129402,
  129402,
  129403,
  129403,
  129404,
  129407,
  129408,
  129412,
  129413,
  129425,
  129426,
  129431,
  129432,
  129442,
  129443,
  129444,
  129445,
  129450,
  129451,
  129453,
  129454,
  129455,
  129456,
  129465,
  129466,
  129471,
  129472,
  129472,
  129473,
  129474,
  129475,
  129482,
  129483,
  129483,
  129484,
  129484,
  129485,
  129487,
  129488,
  129510,
  129511,
  129535,
  129624,
  129631,
  129646,
  129647,
  129648,
  129651,
  129652,
  129652,
  129653,
  129655,
  129656,
  129658,
  129659,
  129660,
  129661,
  129663,
  129664,
  129666,
  129667,
  129670,
  129671,
  129672,
  129673,
  129673,
  129674,
  129674,
  129675,
  129677,
  129678,
  129678,
  129679,
  129679,
  129680,
  129685,
  129686,
  129704,
  129705,
  129708,
  129709,
  129711,
  129712,
  129718,
  129719,
  129722,
  129723,
  129725,
  129726,
  129726,
  129727,
  129727,
  129728,
  129730,
  129731,
  129733,
  129734,
  129734,
  129735,
  129735,
  129736,
  129736,
  129737,
  129739,
  129740,
  129740,
  129741,
  129741,
  129742,
  129743,
  129744,
  129750,
  129751,
  129753,
  129754,
  129755,
  129756,
  129756,
  129757,
  129757,
  129758,
  129758,
  129759,
  129759,
  129760,
  129767,
  129768,
  129768,
  129769,
  129769,
  129770,
  129770,
  129771,
  129771,
  129772,
  129774,
  129775,
  129775,
  129776,
  129782,
  129783,
  129784,
  129785,
  129786,
  129787,
  129791,
  130048,
  131069
];
var INCB_CONSONANT = [
  2325,
  2361,
  2392,
  2399,
  2424,
  2431,
  2453,
  2472,
  2474,
  2480,
  2482,
  2482,
  2486,
  2489,
  2524,
  2525,
  2527,
  2527,
  2544,
  2545,
  2709,
  2728,
  2730,
  2736,
  2738,
  2739,
  2741,
  2745,
  2809,
  2809,
  2837,
  2856,
  2858,
  2864,
  2866,
  2867,
  2869,
  2873,
  2908,
  2909,
  2911,
  2911,
  2929,
  2929,
  3093,
  3112,
  3114,
  3129,
  3160,
  3162,
  3349,
  3386,
  4096,
  4138,
  4159,
  4159,
  4176,
  4181,
  4186,
  4189,
  4193,
  4193,
  4197,
  4198,
  4206,
  4208,
  4213,
  4225,
  4238,
  4238,
  6016,
  6067,
  6688,
  6740,
  6923,
  6924,
  6931,
  6963,
  6981,
  6988,
  7043,
  7072,
  7086,
  7087,
  7099,
  7101,
  43401,
  43403,
  43407,
  43442,
  43488,
  43492,
  43495,
  43503,
  43514,
  43518,
  43616,
  43631,
  43633,
  43635,
  43642,
  43642,
  43646,
  43647,
  43744,
  43754,
  43968,
  43994,
  68096,
  68096,
  68112,
  68115,
  68117,
  68119,
  68121,
  68149,
  69891,
  69926,
  69956,
  69956,
  69959,
  69959,
  70528,
  70537,
  70539,
  70539,
  70542,
  70542,
  70544,
  70581,
  71936,
  71942,
  71945,
  71945,
  71948,
  71955,
  71957,
  71958,
  71960,
  71983,
  72192,
  72192,
  72203,
  72242,
  72272,
  72272,
  72284,
  72323,
  72458,
  72458,
  73201,
  73201,
  73476,
  73488,
  73490,
  73523
];
var INCB_LINKER = [
  2381,
  2381,
  2509,
  2509,
  2765,
  2765,
  2893,
  2893,
  3149,
  3149,
  3405,
  3405,
  4153,
  4153,
  6098,
  6098,
  6752,
  6752,
  6980,
  6980,
  7083,
  7083,
  7413,
  7414,
  43456,
  43456,
  43766,
  43766,
  68159,
  68159,
  69939,
  69939,
  70608,
  70608,
  71998,
  71998,
  72250,
  72250,
  72263,
  72263,
  72345,
  72345,
  73538,
  73538
];
var INCB_EXTEND = [
  768,
  879,
  1155,
  1159,
  1160,
  1161,
  1425,
  1469,
  1471,
  1471,
  1473,
  1474,
  1476,
  1477,
  1479,
  1481,
  1552,
  1562,
  1611,
  1631,
  1648,
  1648,
  1750,
  1756,
  1759,
  1764,
  1767,
  1768,
  1770,
  1773,
  1809,
  1809,
  1840,
  1866,
  1958,
  1968,
  2027,
  2035,
  2045,
  2045,
  2070,
  2073,
  2075,
  2083,
  2085,
  2087,
  2089,
  2093,
  2137,
  2139,
  2199,
  2207,
  2250,
  2273,
  2275,
  2306,
  2362,
  2362,
  2364,
  2364,
  2369,
  2376,
  2385,
  2391,
  2402,
  2403,
  2433,
  2433,
  2492,
  2492,
  2494,
  2494,
  2497,
  2500,
  2519,
  2519,
  2530,
  2531,
  2558,
  2558,
  2561,
  2562,
  2620,
  2620,
  2625,
  2626,
  2631,
  2632,
  2635,
  2637,
  2641,
  2641,
  2672,
  2673,
  2677,
  2677,
  2689,
  2690,
  2748,
  2748,
  2753,
  2757,
  2759,
  2760,
  2786,
  2787,
  2810,
  2815,
  2817,
  2817,
  2876,
  2876,
  2878,
  2878,
  2879,
  2879,
  2881,
  2884,
  2899,
  2902,
  2903,
  2903,
  2914,
  2915,
  2946,
  2946,
  3006,
  3006,
  3008,
  3008,
  3021,
  3021,
  3031,
  3031,
  3072,
  3072,
  3076,
  3076,
  3132,
  3132,
  3134,
  3136,
  3142,
  3144,
  3146,
  3148,
  3157,
  3158,
  3170,
  3171,
  3201,
  3201,
  3260,
  3260,
  3263,
  3263,
  3264,
  3264,
  3266,
  3266,
  3270,
  3270,
  3271,
  3272,
  3274,
  3275,
  3276,
  3277,
  3285,
  3286,
  3298,
  3299,
  3328,
  3329,
  3387,
  3388,
  3390,
  3390,
  3393,
  3396,
  3415,
  3415,
  3426,
  3427,
  3457,
  3457,
  3530,
  3530,
  3535,
  3535,
  3538,
  3540,
  3542,
  3542,
  3551,
  3551,
  3633,
  3633,
  3636,
  3642,
  3655,
  3662,
  3761,
  3761,
  3764,
  3772,
  3784,
  3790,
  3864,
  3865,
  3893,
  3893,
  3895,
  3895,
  3897,
  3897,
  3953,
  3966,
  3968,
  3972,
  3974,
  3975,
  3981,
  3991,
  3993,
  4028,
  4038,
  4038,
  4141,
  4144,
  4146,
  4151,
  4154,
  4154,
  4157,
  4158,
  4184,
  4185,
  4190,
  4192,
  4209,
  4212,
  4226,
  4226,
  4229,
  4230,
  4237,
  4237,
  4253,
  4253,
  4957,
  4959,
  5906,
  5908,
  5909,
  5909,
  5938,
  5939,
  5940,
  5940,
  5970,
  5971,
  6002,
  6003,
  6068,
  6069,
  6071,
  6077,
  6086,
  6086,
  6089,
  6097,
  6099,
  6099,
  6109,
  6109,
  6155,
  6157,
  6159,
  6159,
  6277,
  6278,
  6313,
  6313,
  6432,
  6434,
  6439,
  6440,
  6450,
  6450,
  6457,
  6459,
  6679,
  6680,
  6683,
  6683,
  6742,
  6742,
  6744,
  6750,
  6754,
  6754,
  6757,
  6764,
  6771,
  6780,
  6783,
  6783,
  6832,
  6845,
  6846,
  6846,
  6847,
  6896,
  6912,
  6915,
  6964,
  6964,
  6965,
  6965,
  6966,
  6970,
  6971,
  6971,
  6972,
  6972,
  6973,
  6973,
  6978,
  6978,
  6979,
  6979,
  7019,
  7027,
  7040,
  7041,
  7074,
  7077,
  7080,
  7081,
  7082,
  7082,
  7084,
  7085,
  7142,
  7142,
  7144,
  7145,
  7149,
  7149,
  7151,
  7153,
  7154,
  7155,
  7212,
  7219,
  7222,
  7223,
  7376,
  7378,
  7380,
  7392,
  7394,
  7400,
  7405,
  7405,
  7412,
  7412,
  7416,
  7417,
  7616,
  7679,
  8205,
  8205,
  8400,
  8412,
  8413,
  8416,
  8417,
  8417,
  8418,
  8420,
  8421,
  8432,
  11503,
  11505,
  11647,
  11647,
  11744,
  11775,
  12330,
  12333,
  12334,
  12335,
  12441,
  12442,
  42607,
  42607,
  42608,
  42610,
  42612,
  42621,
  42654,
  42655,
  42736,
  42737,
  43010,
  43010,
  43014,
  43014,
  43019,
  43019,
  43045,
  43046,
  43052,
  43052,
  43204,
  43205,
  43232,
  43249,
  43263,
  43263,
  43302,
  43309,
  43335,
  43345,
  43347,
  43347,
  43392,
  43394,
  43443,
  43443,
  43446,
  43449,
  43452,
  43453,
  43493,
  43493,
  43561,
  43566,
  43569,
  43570,
  43573,
  43574,
  43587,
  43587,
  43596,
  43596,
  43644,
  43644,
  43696,
  43696,
  43698,
  43700,
  43703,
  43704,
  43710,
  43711,
  43713,
  43713,
  43756,
  43757,
  44005,
  44005,
  44008,
  44008,
  44013,
  44013,
  64286,
  64286,
  65024,
  65039,
  65056,
  65071,
  65438,
  65439,
  66045,
  66045,
  66272,
  66272,
  66422,
  66426,
  68097,
  68099,
  68101,
  68102,
  68108,
  68111,
  68152,
  68154,
  68325,
  68326,
  68900,
  68903,
  68969,
  68973,
  69291,
  69292,
  69323,
  69327,
  69360,
  69375,
  69446,
  69456,
  69506,
  69509,
  69633,
  69633,
  69688,
  69702,
  69744,
  69744,
  69747,
  69748,
  69759,
  69761,
  69811,
  69814,
  69817,
  69818,
  69826,
  69826,
  69888,
  69890,
  69927,
  69931,
  69933,
  69938,
  69940,
  69940,
  70003,
  70003,
  70016,
  70017,
  70070,
  70078,
  70080,
  70080,
  70089,
  70092,
  70095,
  70095,
  70191,
  70193,
  70196,
  70196,
  70197,
  70197,
  70198,
  70199,
  70206,
  70206,
  70209,
  70209,
  70367,
  70367,
  70371,
  70378,
  70400,
  70401,
  70459,
  70460,
  70462,
  70462,
  70464,
  70464,
  70477,
  70477,
  70487,
  70487,
  70502,
  70508,
  70512,
  70516,
  70584,
  70584,
  70587,
  70592,
  70594,
  70594,
  70597,
  70597,
  70599,
  70601,
  70606,
  70606,
  70607,
  70607,
  70610,
  70610,
  70625,
  70626,
  70712,
  70719,
  70722,
  70724,
  70726,
  70726,
  70750,
  70750,
  70832,
  70832,
  70835,
  70840,
  70842,
  70842,
  70845,
  70845,
  70847,
  70848,
  70850,
  70851,
  71087,
  71087,
  71090,
  71093,
  71100,
  71101,
  71103,
  71104,
  71132,
  71133,
  71219,
  71226,
  71229,
  71229,
  71231,
  71232,
  71339,
  71339,
  71341,
  71341,
  71344,
  71349,
  71350,
  71350,
  71351,
  71351,
  71453,
  71453,
  71455,
  71455,
  71458,
  71461,
  71463,
  71467,
  71727,
  71735,
  71737,
  71738,
  71984,
  71984,
  71995,
  71996,
  71997,
  71997,
  72003,
  72003,
  72148,
  72151,
  72154,
  72155,
  72160,
  72160,
  72193,
  72202,
  72243,
  72248,
  72251,
  72254,
  72273,
  72278,
  72281,
  72283,
  72330,
  72342,
  72344,
  72344,
  72544,
  72544,
  72546,
  72548,
  72550,
  72550,
  72752,
  72758,
  72760,
  72765,
  72767,
  72767,
  72850,
  72871,
  72874,
  72880,
  72882,
  72883,
  72885,
  72886,
  73009,
  73014,
  73018,
  73018,
  73020,
  73021,
  73023,
  73029,
  73031,
  73031,
  73104,
  73105,
  73109,
  73109,
  73111,
  73111,
  73200,
  73200,
  73459,
  73460,
  73472,
  73473,
  73526,
  73530,
  73536,
  73536,
  73537,
  73537,
  73562,
  73562,
  78912,
  78912,
  78919,
  78933,
  90398,
  90409,
  90413,
  90415,
  92912,
  92916,
  92976,
  92982,
  94031,
  94031,
  94095,
  94098,
  94180,
  94180,
  94192,
  94193,
  113821,
  113822,
  118528,
  118573,
  118576,
  118598,
  119079,
  119080,
  119141,
  119142,
  119143,
  119145,
  119149,
  119154,
  119163,
  119170,
  119173,
  119179,
  119210,
  119213,
  119362,
  119364,
  119376,
  119378,
  119387,
  119388,
  119391,
  119391,
  119424,
  119425,
  121344,
  121398,
  121403,
  121452,
  121461,
  121461,
  121476,
  121476,
  121499,
  121503,
  121505,
  121519,
  122880,
  122886,
  122888,
  122904,
  122907,
  122913,
  122915,
  122916,
  122918,
  122922,
  123023,
  123023,
  123184,
  123190,
  123566,
  123566,
  123628,
  123631,
  124140,
  124143,
  124398,
  124399,
  124643,
  124643,
  124646,
  124646,
  124654,
  124655,
  124661,
  124661,
  125136,
  125142,
  125252,
  125258,
  127995,
  127999,
  917536,
  917631,
  917760,
  917999
];

// ../carve-js/v2/src/width.ts
var ASCII_END3 = 128;
var CR2 = 1;
var LF2 = 2;
var CONTROL = 3;
var EXTEND = 4;
var ZWJ = 5;
var REGIONAL_INDICATOR = 6;
var PREPEND = 7;
var SPACING_MARK = 8;
var L = 9;
var V = 10;
var T = 11;
var LV = 12;
var LVT = 13;
function property(ranges, codePoint, stride) {
  let low = 0;
  let high = ranges.length / stride - 1;
  while (low <= high) {
    const middle = low + high >>> 1;
    const offset = middle * stride;
    if (codePoint < ranges[offset]) high = middle - 1;
    else if (codePoint > ranges[offset + 1]) low = middle + 1;
    else return stride === 3 ? ranges[offset + 2] : 1;
  }
  return 0;
}
function joinsHangul(before2, at) {
  if (before2 === L) return at === L || at === V || at === LV || at === LVT;
  if (before2 === LV || before2 === V) return at === V || at === T;
  return (before2 === LVT || before2 === T) && at === T;
}
function isControl(gcb) {
  return gcb === CR2 || gcb === LF2 || gcb === CONTROL;
}
function joinsCluster(context, codePoint, gcb) {
  const before2 = context.before;
  if (gcb === EXTEND || gcb === ZWJ || gcb === SPACING_MARK || before2 === PREPEND) return true;
  if (context.linker && property(INCB_CONSONANT, codePoint, 2) !== 0) return true;
  if (before2 === ZWJ && context.pictographicBeforeJoiner && property(PICT, codePoint, 2) !== 0) return true;
  return before2 === REGIONAL_INDICATOR && gcb === REGIONAL_INDICATOR && context.indicators % 2 === 1;
}
function breaksBefore(context, codePoint, gcb) {
  const before2 = context.before;
  if (before2 === CR2 && gcb === LF2) return false;
  if (isControl(before2) || isControl(gcb)) return true;
  return !joinsHangul(before2, gcb) && !joinsCluster(context, codePoint, gcb);
}
function advance(context, codePoint, gcb) {
  const linker = property(INCB_LINKER, codePoint, 2) !== 0;
  if (linker || property(INCB_EXTEND, codePoint, 2) === 0) context.linker = linker;
  context.pictographicBeforeJoiner = context.pictographic;
  if (gcb !== EXTEND) context.pictographic = property(PICT, codePoint, 2) !== 0;
  context.indicators = gcb === REGIONAL_INDICATOR ? context.indicators + 1 : 0;
  context.before = gcb;
}
function wideWidth(text) {
  const context = { before: 0, indicators: 0, linker: false, pictographic: false, pictographicBeforeJoiner: false };
  let width = 0;
  let wide = false;
  let first = true;
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    const gcb = property(GCB, codePoint, 3);
    if (first || breaksBefore(context, codePoint, gcb)) {
      width += first ? 0 : wide ? 2 : 1;
      wide = false;
    }
    first = false;
    if (property(WIDE, codePoint, 2) !== 0) wide = true;
    advance(context, codePoint, gcb);
  }
  return first ? 0 : width + (wide ? 2 : 1);
}
function displayWidth(text) {
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at);
    if (code >= ASCII_END3 || code === 13) return wideWidth(text);
  }
  return text.length;
}

// ../carve-js/v2/src/write-table.ts
var ALIGN_MARKS = /* @__PURE__ */ new Map([["left", "<"], ["right", ">"], ["center", "~"]]);
var SPAN_MARKS = /* @__PURE__ */ new Map([["rowspan", "^"], ["colspan", "<"]]);
var MIN_RUN = 3;
function rowsOf(table3, type) {
  const rows = [];
  for (const group of table3.children) {
    if (group.type === "comment" || group.type !== type) continue;
    for (const row of group.children) if (row.type === "table_row") rows.push(row);
  }
  return rows;
}
var MAX_DIGITS = 17;
function percentage(width) {
  for (let digits = 1; digits < MAX_DIGITS; digits++) {
    const text = String(Number((width * 100).toPrecision(digits)));
    if (Number(text) / 100 === width) return text;
  }
  return String(width * 100);
}
function columnEntry(column, field) {
  if (field === "align") return column.align ?? "";
  const width = column.width;
  return width === void 0 ? "" : percentage(width);
}
function columnList(table3, field) {
  const columns = table3.columns;
  let last = -1;
  columns.forEach((column, at) => {
    if (column[field] !== void 0) last = at;
  });
  if (last < 0) return null;
  return columns.slice(0, last + 1).map((column) => columnEntry(column, field)).join(",");
}
function tableKeys(table3, first) {
  const keys = [...first];
  const aligns = columnList(table3, "align");
  const widths = columnList(table3, "width");
  const footRows = rowsOf(table3, "table_foot").length;
  if (aligns !== null) keys.push(["aligns", aligns]);
  if (widths !== null) keys.push(["widths", widths]);
  if (footRows > 0) keys.push(["footer-rows", String(footRows)]);
  return { keys };
}
function cellContent2(w, cell, flags) {
  const blocks = cell.children;
  if (blocks.length > 1 || blocks.length === 1 && blocks[0].type !== "cell_paragraph") lose(w, cell, null);
  const content = blocks.map((block) => writeInlines(w, childNodes(block), flags | IN_CELL)).join(" ");
  return content === "^" || content === "<" ? `\\${content}` : content;
}
function cellPrefix(cell) {
  const align = cell.align;
  const mark2 = align === void 0 ? void 0 : ALIGN_MARKS.get(align);
  return (cell.header ? "=" : "") + braceBlock(cell, mark2 === void 0 ? {} : { mark: mark2 });
}
function segment(prefix, content) {
  return content === "" ? `${prefix} ` : `${prefix} ${content} `;
}
function contradicts(wrap, below, previous) {
  return (wrap.row ?? 0) !== 0 || wrap.line < 1 || wrap.line > below || wrap.line <= previous;
}
function fragmentLines(w, row, cell, count) {
  const wraps = w.facts?.get(cell)?.wraps;
  const below = w.facts?.get(row)?.continuationLines ?? 0;
  if (wraps === void 0 || wraps.length !== count) return null;
  const lines = [];
  for (const wrap of wraps) {
    if (contradicts(wrap, below, lines[lines.length - 1] ?? 0)) return null;
    lines.push(wrap.line);
  }
  return lines;
}
function writtenCell(w, row, cell, flags) {
  const spanned = cell.span;
  const span2 = spanned === void 0 ? void 0 : SPAN_MARKS.get(spanned);
  if (span2 !== void 0) return { prefix: "", parts: [span2], places: [] };
  const parts = cellContent2(w, cell, flags).split("\n");
  const recorded = fragmentLines(w, row, cell, parts.length - 1);
  if (recorded !== null) return { prefix: cellPrefix(cell), parts, places: recorded };
  const wraps = w.facts?.get(cell)?.wraps?.length ?? 0;
  if (wraps === parts.length - 1) {
    const joined2 = (parts[0] === "" ? parts.slice(1) : parts).join(" ");
    return { prefix: cellPrefix(cell), parts: [joined2], places: [] };
  }
  return { prefix: cellPrefix(cell), parts, places: parts.slice(1).map((_part, at) => at + 1) };
}
function writtenRow(w, row, flags) {
  const cells = row.children.map((cell) => writtenCell(w, row, cell, flags));
  let below = w.facts?.get(row)?.continuationLines ?? 0;
  for (const cell of cells) below = Math.max(below, cell.places[cell.places.length - 1] ?? 0);
  const lines = [];
  for (let line2 = 0; line2 <= below; line2++) lines.push(new Array(cells.length).fill(" "));
  cells.forEach((cell, column) => {
    lines[0][column] = segment(cell.prefix, cell.parts[0]);
    cell.places.forEach((line2, at) => lines[line2][column] = segment("", cell.parts[at + 1]));
  });
  return { lines, attribute: braceBlock(row) };
}
function alignColumns2(rows) {
  const widths = [];
  for (const row of rows) {
    for (const line2 of row.lines) line2.forEach((part, column) => widths[column] = Math.max(widths[column] ?? 0, displayWidth(part)));
  }
  for (const row of rows) {
    for (const line2 of row.lines) line2.forEach((part, column) => line2[column] = part + " ".repeat(widths[column] - displayWidth(part)));
  }
}
function emitRow(w, prefix, row) {
  row.lines.forEach((line2, at) => {
    const body2 = `${at === 0 ? "|" : "+"}${line2.join("|")}|`;
    emit(w, prefix, at === 0 ? body2 + row.attribute : body2);
  });
}
function lineComment(w, node, prefix) {
  const value = node.value;
  emit(w, prefix, value === "" ? "%%" : `%% ${value}`);
}
function tableEntries(w, table3, flags) {
  const entries = [];
  for (const group of table3.children) {
    if (group.type === "comment") entries.push(group);
    else for (const row of group.children) entries.push(row.type === "table_row" ? writtenRow(w, row, flags) : row);
  }
  return entries;
}
function pipeTable(w, table3, prefix, flags) {
  const block = braceBlock(table3, tableKeys(table3, []));
  if (block !== "") emit(w, prefix, block);
  const entries = tableEntries(w, table3, flags);
  const rows = entries.filter((entry) => "lines" in entry);
  if (w.alignTables) alignColumns2(rows);
  for (const entry of entries) {
    if ("lines" in entry) emitRow(w, prefix, entry);
    else lineComment(w, entry, prefix);
  }
}
function isPlainCell(cell, header) {
  if (cell.header !== header || cell.span !== void 0 || cell.align !== void 0) return false;
  if (cell.attrs !== void 0 || cell.lang !== void 0) return false;
  const blocks = cell.children;
  const block = blocks[0];
  if (blocks.length !== 1 || block?.type !== "cell_paragraph") return false;
  const content = block.children;
  const first = content[0];
  return content.length === 0 || content.length === 1 && first?.type === "text" && first.attrs === void 0;
}
function isPlainRow(row, header) {
  return row.type === "table_row" && row.attrs === void 0 && row.children.every((cell) => isPlainCell(cell, header));
}
function isPlainGroup(group, header) {
  return group.type === "comment" || group.children.every((row) => isPlainRow(row, header));
}
function fitsDelimited(table3) {
  const groups = table3.children;
  const head = groups.filter((group) => group.type === "table_head");
  const body2 = groups.filter((group) => group.type === "table_body");
  if (head.length + body2.length !== groups.length || head.length > 1 || body2.length > 1) return false;
  return fitsPartition(groups, head[0]?.children.length ?? 0, body2[0]);
}
function fitsPartition(groups, headRows2, body2) {
  const declared = body2?.headRows;
  if (body2 === void 0 || declared === void 0) return (headRows2 === 1 || groups.length === 0) && hasPlainGroups(groups, false);
  const beyond = declared > body2.children.length + headRows2;
  return (beyond ? headRows2 === 0 : declared === headRows2) && hasPlainGroups(groups, beyond);
}
function hasPlainGroups(groups, headerBody) {
  return groups.every((group) => isPlainGroup(group, headerBody || group.type === "table_head"));
}
function firstValue(cell) {
  const block = cell.children[0];
  const first = block === void 0 ? void 0 : childNodes(block)[0];
  return first !== void 0 && "value" in first ? first.value : void 0;
}
function cellHoldsLineBreak(cell) {
  return firstValue(cell)?.includes("\n") === true;
}
function holdsLineBreak(table3) {
  return table3.children.some((group) => group.type !== "comment" && group.children.some(
    (row) => row.type === "table_row" && row.children.some(cellHoldsLineBreak)
  ));
}
function declaredHeadRows(table3) {
  for (const group of table3.children) if (group.type === "table_body" && group.headRows !== void 0) return group.headRows;
  return void 0;
}
function tableFormat(w, table3) {
  const recorded = w.facts?.get(table3)?.sourceFormat;
  const declares = declaredHeadRows(table3) !== void 0;
  const rows = rowsOf(table3, "table_head").length + rowsOf(table3, "table_body").length + rowsOf(table3, "table_foot").length;
  if (!fitsDelimited(table3)) {
    for (const group of table3.children) if (group.type === "table_body" && group.headRows !== void 0) lose(w, group, "headRows");
    return "pipe";
  }
  if (recorded === "csv" || recorded === "tsv") return recorded;
  return declares || rows === 0 || holdsLineBreak(table3) ? "csv" : "pipe";
}
function delimitedCell(cell, separator) {
  const value = firstValue(cell) ?? "";
  if (!value.includes(separator) && !value.includes('"') && !value.includes("\n")) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
function delimitedRow2(row, separator) {
  return row.children.map((cell) => delimitedCell(cell, separator)).join(separator);
}
function longestBacktickLine(lines) {
  let longest = 0;
  for (const line2 of lines) {
    const text = trimSpaces(line2);
    if (text !== "" && text === "`".repeat(text.length)) longest = Math.max(longest, text.length);
  }
  return longest;
}
function delimitedTable(w, table3, prefix, format2) {
  const separator = format2 === "tsv" ? "	" : ",";
  const first = [["table", ""]];
  const declared = declaredHeadRows(table3);
  if (declared !== void 0) first.push(["header-rows", String(declared)]);
  emit(w, prefix, braceBlock(table3, tableKeys(table3, first)));
  const body2 = [];
  for (const group of table3.children) {
    if (group.type === "comment") continue;
    for (const row of group.children) body2.push(row.type === "table_row" ? delimitedRow2(row, separator) : "");
  }
  const lines = body2.join("\n").split("\n");
  const run = "`".repeat(Math.max(MIN_RUN, longestBacktickLine(lines) + 1));
  emit(w, prefix, run + format2);
  if (body2.length > 0) for (const line2 of lines) emit(w, prefix, line2);
  emit(w, prefix, run);
}
function writeTable(w, table3, prefix, flags) {
  const format2 = tableFormat(w, table3);
  if (format2 === "pipe") pipeTable(w, table3, prefix, flags);
  else delimitedTable(w, table3, prefix, format2);
}

// ../carve-js/v2/src/write-blocks.ts
var MIN_RUN2 = 3;
var MAX_HEADING_LEVEL2 = 6;
var LIST_BOUNDARY_BLANKS2 = 3;
var SPACE4 = 32;
var TAB3 = 9;
var NONE5 = [];
function attributeLine(w, node, prefix, extra) {
  const block = braceBlock(node, extra);
  if (block !== "") emit(w, prefix, block);
}
function isFenced(w, node) {
  return w.facts?.get(node)?.fenced === true;
}
function hasColonRun(w, node) {
  const type = node.type;
  if (type === "block_quote") return isFenced(w, node);
  return type === "div" || type === "admonition" || type === "directive" || type === "figure_group" || type === "line_block";
}
function runsBelow(w, node) {
  const known = w.colonRuns.get(node);
  if (known !== void 0) return known;
  let longest = 0;
  for (const child of childNodes(node)) {
    longest = Math.max(longest, hasColonRun(w, child) ? runsBelow(w, child) + 1 : runsBelow(w, child));
  }
  if (longest > 0 && longest < MIN_RUN2) longest = MIN_RUN2;
  w.colonRuns.set(node, longest);
  return longest;
}
function colonRun(w, node) {
  return ":".repeat(Math.max(MIN_RUN2, runsBelow(w, node) + 1));
}
function longestBareRun(lines, char) {
  let longest = 0;
  for (const line2 of lines) {
    let start = 0;
    while (start < line2.length && (line2.charCodeAt(start) === SPACE4 || line2.charCodeAt(start) === TAB3)) start++;
    let end = start;
    while (end < line2.length && line2.charCodeAt(end) === char) end++;
    let rest = end;
    while (rest < line2.length && (line2.charCodeAt(rest) === SPACE4 || line2.charCodeAt(rest) === TAB3)) rest++;
    if (rest === line2.length) longest = Math.max(longest, end - start);
  }
  return longest;
}
function isLeftOpen(w, node) {
  return (w.forms.get(node) ?? 0) > 0;
}
function valueLines(w, node) {
  const value = node.value;
  if (value === "") return [];
  const lines = value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  else lose(w, node, "value");
  return lines;
}
function openerTail(w, node, title, spelled) {
  let out = "";
  if (title !== null && (title.includes('"') || title.includes("\n"))) lose(w, node, "title");
  else if (title !== null) out += ` "${spelled}"`;
  const label = node.groupLabel;
  if (label === void 0) return out;
  if (label.includes("]") || label.includes("\n")) lose(w, node, "groupLabel");
  else out += ` [${label}]`;
  return out;
}
function codeTitle(w, node) {
  const title = node.title;
  if (title === void 0) return null;
  if (title.some((part) => part.type !== "text")) lose(w, node, "title");
  return plainText(title);
}
function spellableInfo(w, node, field, value) {
  if (value === null || !value.includes("`")) return value;
  lose(w, node, field);
  return null;
}
function codeBlock2(w, node, prefix) {
  attributeLine(w, node, prefix);
  const lines = valueLines(w, node);
  const run = "`".repeat(Math.max(MIN_RUN2, longestBareRun(lines, 96) + 1));
  let info = node.type === "raw_block" ? `=${node.format}` : spellableInfo(w, node, "syntax", node.syntax ?? "") ?? "";
  if (node.type === "code_block") {
    const title = spellableInfo(w, node, "title", codeTitle(w, node));
    info += openerTail(w, node, title, title === null ? "" : quoted2(title).slice(1, -1));
  }
  emit(w, prefix, run + info);
  for (const line2 of lines) emit(w, prefix, line2);
  if (!isLeftOpen(w, node)) emit(w, prefix, run);
}
function comment(w, node, prefix) {
  const value = node.value;
  attributeLine(w, node, prefix);
  if (node.form !== "block") {
    if (value.includes("\n")) lose(w, node, "value");
    emit(w, prefix, node.form === "braced" ? bracedComment2(value) : value === "" ? "%%" : `%% ${value}`);
    return;
  }
  const lines = value === "" ? [] : value.split("\n");
  const run = "%".repeat(Math.max(MIN_RUN2, longestBareRun(lines, 37) + 1));
  emit(w, prefix, run);
  for (const line2 of lines) emit(w, prefix, line2);
  if (!isLeftOpen(w, node)) emit(w, prefix, run);
}
function frontmatter(w, node, prefix) {
  emit(w, prefix, node.format === "yaml" ? "---" : `---${node.format}`);
  for (const line2 of valueLines(w, node)) emit(w, prefix, line2);
  emit(w, prefix, "---");
}
function textLeaf(w, node, prefix, flags, mark2, indent) {
  if (node.children.length === 0) return lose(w, node, null);
  attributeLine(w, node, prefix);
  if (node.type === "paragraph") notePlace(w, node, prefix);
  w.lead = (w.lead ?? prefix) + mark2;
  emitLines(w, prefix, indent, writeContent(w, node.children, flags));
}
function heading(w, node, prefix, flags) {
  let level = node.level;
  if (level > MAX_HEADING_LEVEL2) {
    lose(w, node, "level");
    level = MAX_HEADING_LEVEL2;
  }
  textLeaf(w, node, prefix, flags, `${"=".repeat(level)} `, " ".repeat(level + 1));
}
function include2(w, node, prefix) {
  attributeLine(w, node, prefix);
  if (node.path === "" || node.path.includes("\n")) lose(w, node, "path");
  emit(w, prefix, includeSource(node));
}
function linkDefinition(w, node, prefix) {
  attributeLine(w, node, prefix);
  const href = node.href;
  if (href === "") lose(w, node, "href");
  const authored = node.title;
  const title = authored === void 0 ? "" : ` ${quoted2(authored)}`;
  emit(w, prefix, `[${node.key}]:${href === "" && title === "" ? "" : " "}${href}${title}`);
}
function body(w, node, prefix, flags, mark2, width, tight) {
  w.lead = (w.lead ?? prefix) + mark2;
  writeBlocks2(w, node.children, prefix + " ".repeat(width), flags, tight);
  if (w.lead === null) return;
  lose(w, node, null);
  emit(w, prefix, "");
}
function footnote(w, node, prefix, flags) {
  attributeLine(w, node, prefix);
  body(w, node, prefix, flags, `[^${node.key}]: `, 2, false);
}
function markerGap(marker) {
  const code = marker.charCodeAt(0);
  return marker.length === 2 && marker[1] === "." && code >= 65 && code <= 90 ? "  " : " ";
}
function listItem2(w, node, prefix, flags, marker, tight) {
  const head = marker + braceBlock(node);
  const gap = markerGap(marker);
  const task = node.task;
  const box = task === void 0 ? "" : `[${task.mark}] `;
  body(w, node, prefix, flags, head + gap + box, marker.length + gap.length, tight);
}
function listAttributes(node, start) {
  return braceBlock(node, start === null ? {} : { keys: [["start", start]] });
}
function list2(w, node, prefix, flags) {
  const items = node.children;
  if (items.length === 0) return lose(w, node, null);
  const numbering = listMarkers(w, node);
  const block = listAttributes(node, numbering.start);
  if (block !== "") emit(w, prefix, block);
  const tight = node.spacing !== "loose";
  for (let at = 0; at < items.length; at++) {
    if (at > 0 && !tight) emit(w, prefix, "");
    listItem2(w, items[at], prefix, flags, numbering.markers[at], tight);
  }
}
function definitionList(w, node, prefix, flags) {
  const entries = node.children;
  if (entries.length === 0) return lose(w, node, null);
  attributeLine(w, node, prefix);
  writeSiblings(w, entries, prefix, flags, ENTRIES);
}
function fenced(w, node, prefix, opener, blankWhenEmpty, write2) {
  const run = colonRun(w, node);
  emit(w, prefix, run + opener);
  const mark2 = w.lines.length;
  write2();
  if (w.lines.length === mark2 && blankWhenEmpty) emit(w, prefix, "");
  emit(w, prefix, run);
}
function blockQuote(w, node, prefix, flags) {
  attributeLine(w, node, prefix);
  const children2 = node.children;
  if (isFenced(w, node)) return fenced(w, node, prefix, " >", false, () => writeBlocks2(w, children2, prefix, flags, false));
  if (children2.length === 0) return emit(w, prefix, ">");
  w.lead = `${w.lead ?? prefix}> `;
  writeBlocks2(w, children2, `${prefix}> `, flags, false);
  if (w.lead !== null) emit(w, prefix, "");
}
function titleTail(w, node, flags) {
  const inlines = node.title;
  const title = inlines === void 0 ? null : writeInlines(w, inlines, flags);
  return openerTail(w, node, title, title ?? "");
}
function divName(node) {
  const first = node.attrs?.classes?.[0];
  return first !== void 0 && isName(first) && !DIV_KINDS.has(first) ? first : null;
}
function usesHardBreakOpener(w, node) {
  const classes = node.attrs?.classes ?? NONE5;
  if (classes[classes.length - 1] !== HARD_BREAKS_CLASS || node.title !== void 0 || node.groupLabel !== void 0) return false;
  return w.facts?.get(node)?.hardBreakOpener ?? true;
}
function div2(w, node, prefix, flags) {
  const classes = node.attrs?.classes ?? NONE5;
  if (usesHardBreakOpener(w, node)) {
    attributeLine(w, node, prefix, { skipClasses: [classes.length - 1] });
    return fenced(w, node, prefix, " \\", true, () => writeBlocks2(w, node.children, prefix, flags | BARE_BREAKS, false));
  }
  const write2 = () => writeBlocks2(w, node.children, prefix, flags, false);
  const name = divName(node);
  attributeLine(w, node, prefix, name === null ? {} : { skipClasses: [0] });
  fenced(w, node, prefix, (name === null ? "" : ` ${name}`) + titleTail(w, node, flags), true, write2);
}
function namedDiv2(w, node, prefix, flags) {
  attributeLine(w, node, prefix);
  if (node.type === "directive" && node.tocTarget !== void 0) lose(w, node, "tocTarget");
  const opener = ` ${node.kind}${titleTail(w, node, flags)}`;
  fenced(w, node, prefix, opener, true, () => writeBlocks2(w, node.children, prefix, flags, false));
}
function caption(w, node, prefix, flags) {
  if (node === void 0) return;
  if (node.short !== void 0) lose(w, node, "short");
  const blocks = node.children;
  if (blocks.length !== 1) lose(w, node, null);
  const parts = [];
  for (const block of blocks) parts.push(writeContent(w, childNodes(block), flags));
  w.lead = `${w.lead ?? prefix}^ `;
  emitLines(w, prefix, "  ", parts.join(" "));
}
function trailingComments(nodes) {
  let count = 0;
  while (count < nodes.length && nodes[nodes.length - 1 - count].type === "comment") count++;
  return count;
}
function figureGroup(w, node, prefix, flags) {
  attributeLine(w, node, prefix);
  const children2 = node.children;
  const captionNode2 = node.caption;
  const after2 = captionNode2 === void 0 ? 0 : trailingComments(children2);
  const inside = children2.slice(0, children2.length - after2);
  fenced(w, node, prefix, " figure", true, () => writeBlocks2(w, inside, prefix, flags, false));
  for (const late of children2.slice(children2.length - after2)) if (late.type === "comment") comment(w, late, prefix);
  caption(w, captionNode2, prefix, flags);
}
function figure(w, node, prefix, flags) {
  attributeLine(w, node, prefix);
  if (node.kind !== void 0) lose(w, node, "kind");
  for (const child of node.children) writeBlock2(w, child, prefix, flags);
  caption(w, node.caption, prefix, flags);
}
function lineBlock2(w, node, prefix, flags) {
  attributeLine(w, node, prefix);
  fenced(w, node, prefix, " |", false, () => {
    for (const line2 of node.children) emit(w, prefix, lineContent(w, line2.children, flags | BARE_BREAKS));
  });
}
function lineContent(w, nodes, flags) {
  if (nodes[nodes.length - 1]?.type !== "hard_break") return writeContent(w, nodes, flags);
  return `${writeInlines(w, nodes.slice(0, -1), flags)}\\`;
}
function childrenOnly2(w, node, prefix, flags) {
  lose(w, node, null);
  const fallback = "fallback" in node ? node.fallback : void 0;
  writeBlocks2(w, fallback ?? childNodes(node), prefix, flags, false);
}
function table2(w, node, prefix, flags) {
  writeTable(w, node, prefix, flags);
  caption(w, node.caption, prefix, flags);
}
var WRITERS3 = {
  paragraph: (w, node, prefix, flags) => textLeaf(w, node, prefix, flags, "", ""),
  heading,
  thematic_break: (w, node, prefix) => {
    attributeLine(w, node, prefix);
    emit(w, prefix, "***");
  },
  code_block: codeBlock2,
  raw_block: codeBlock2,
  comment,
  frontmatter,
  include: include2,
  link_reference_definition: linkDefinition,
  abbreviation_def: (w, node, prefix) => {
    attributeLine(w, node, prefix);
    emit(w, prefix, `*[${node.key}]: ${node.expansion}`);
  },
  footnote,
  list: list2,
  definition_term: (w, node, prefix, flags) => textLeaf(w, node, prefix, flags, ":: ", "   "),
  definition_description: (w, node, prefix, flags) => body(w, node, prefix, flags, ": ", 2, false),
  definition_list: definitionList,
  block_quote: blockQuote,
  div: div2,
  admonition: namedDiv2,
  directive: namedDiv2,
  figure_group: figureGroup,
  figure,
  line_block: lineBlock2,
  table: table2
};
function writeOwn3(w, type, node, prefix, flags) {
  const writer = WRITERS3[type];
  if (writer === void 0) return false;
  writer(w, node, prefix, flags);
  return true;
}
function writeBlock2(w, node, prefix, flags) {
  if (!writeOwn3(w, node.type, node, prefix, flags)) childrenOnly2(w, node, prefix, flags);
}
var LAZY_CONTAINERS = [
  "list",
  "list_item",
  "block_quote",
  "definition_list",
  "definition_description",
  "footnote",
  "figure"
];
var OPEN_CONTAINERS = ["list", "list_item", "definition_list", "definition_description", "footnote"];
var OPAQUE = ["code_block", "raw_block"];
function takesLineBelow(w, node) {
  const type = node.type;
  if (type === "paragraph" || type === "definition_term" || type === "table" || captionOf(node) !== void 0) return true;
  if (!LAZY_CONTAINERS.includes(type) || isFenced(w, node)) return false;
  if (type === "block_quote") return true;
  const children2 = childNodes(node);
  const last = children2[children2.length - 1];
  return last !== void 0 && takesLineBelow(w, last);
}
function isOpenContainer(w, node) {
  return OPEN_CONTAINERS.includes(node.type) && !isFenced(w, node);
}
function lastFence(w, node) {
  let at = node;
  while (isOpenContainer(w, at)) {
    const children2 = childNodes(at);
    const last = children2[children2.length - 1];
    if (last === void 0) return null;
    at = last;
  }
  return OPAQUE.includes(at.type) || at.type === "comment" && at.form === "block" ? at : null;
}
function isCommentLine(node) {
  return node !== void 0 && node.type === "comment" && node.form !== "block";
}
function blankLinesBeforeComment(w, before2, node) {
  if (isCommentLine(node) && isOpenContainer(w, before2)) {
    if (lastFence(w, before2) !== null) return 0;
    lose(w, node, null);
    return 1;
  }
  return takesLineBelow(w, before2) || (w.forms.get(node) ?? 0) > 0 ? 1 : 0;
}
var BLOCKS3 = 0;
var TIGHT_ITEM = 1;
var ENTRIES = 2;
function blankLinesBetween(w, before2, list3, node, nested) {
  if (node.type === "comment") return blankLinesBeforeComment(w, before2, node);
  if (list3 !== null && sameListKind(list3, node)) return LIST_BOUNDARY_BLANKS2;
  return nested ? 0 : 1;
}
function isNestedList(w, before2, node, at) {
  if (at !== 1 || node.type !== "list" || before2.type !== "paragraph") return false;
  if (node.marker.kind === "ordered" && (node.marker.start ?? 1) !== 1) return false;
  return listAttributes(node, listMarkers(w, node).start) === "";
}
function markFenceBeforeComment(w, node, next) {
  if (!isCommentLine(next) || !isOpenContainer(w, node)) return;
  const fence = lastFence(w, node);
  if (fence !== null) w.forms.set(fence, 1);
}
function writeSiblings(w, nodes, prefix, flags, layout) {
  let before2 = null;
  let list3 = null;
  for (let at = 0; at < nodes.length; at++) {
    const node = nodes[at];
    const start = w.lines.length;
    if (before2 !== null) {
      const nested = layout === ENTRIES || layout === TIGHT_ITEM && isNestedList(w, before2, node, at);
      for (let blank = blankLinesBetween(w, before2, list3, node, nested); blank > 0; blank--) emit(w, prefix, "");
    }
    markFenceBeforeComment(w, node, nodes[at + 1]);
    const written = w.lines.length;
    writeBlock2(w, node, prefix, flags);
    if (w.lines.length === written) {
      w.lines.length = start;
      continue;
    }
    before2 = node;
    if (node.type !== "comment") list3 = node;
  }
}
function writeBlocks2(w, nodes, prefix, flags, tight) {
  writeSiblings(w, nodes, prefix, flags, tight ? TIGHT_ITEM : BLOCKS3);
}

// ../carve-js/v2/src/write-check.ts
function parseChunk(src, abbreviations) {
  return buildSource(src, true, abbreviations).document;
}
function createCheck(w) {
  return {
    w,
    escapes: [],
    retracted: [],
    trials: [],
    marks: /* @__PURE__ */ new Map(),
    forms: [],
    respelled: /* @__PURE__ */ new Set(),
    misaligned: false,
    losses: [],
    flags: 0,
    spanMarks: false,
    owner: null,
    chains: [],
    source: null
  };
}
function changes(c) {
  return c.escapes.length + c.forms.length + c.retracted.length;
}
var SKIPPED2 = ["pos", "segments", "srcByteLength", "stages", "generatedId", "resolvedAlign", "n"];
var NODE_SLOTS = ["children", "caption"];
var NUMBERED = ["footnote_ref", "inline_footnote"];
function sameList(a, b) {
  return Array.isArray(b) && a.length === b.length && a.every((item, at) => sameValue(item, b[at]));
}
function sameFields(left, right) {
  for (const name in left) if (!SKIPPED2.includes(name) && left[name] !== void 0 && !sameValue(left[name], right[name])) return false;
  for (const name in right) if (!SKIPPED2.includes(name) && right[name] !== void 0 && left[name] === void 0) return false;
  return true;
}
function sameValue(a, b) {
  if (Array.isArray(a)) return sameList(a, b);
  return isRecord(a) && isRecord(b) ? sameFields(a, b) : a === b;
}
function isReference(node) {
  return (node.type === "link" || node.type === "image" || node.type === "xref") && node.key !== void 0;
}
function isCompared(c, node, name) {
  if (SKIPPED2.includes(name) || NODE_SLOTS.includes(name)) return false;
  if (name === "title") return titleOf(node) === void 0;
  if ((name === "href" || name === "src") && isReference(node)) return false;
  if (name === "number" && NUMBERED.includes(node.type)) return false;
  return !(c.spanMarks && node.type === "table_cell" && (name === "colspan" || name === "rowspan"));
}
function sameField(name, a, b) {
  if (name !== "marker" || a === void 0 || b === void 0) return sameValue(a, b);
  const normal = (marker) => {
    const fields = isRecord(marker) ? { ...marker } : {};
    if (fields["start"] === 1) delete fields["start"];
    return fields;
  };
  return sameValue(normal(a), normal(b));
}
function differingField(c, e, a) {
  if (!isRecord(e) || !isRecord(a)) return null;
  for (const name in e) {
    if (e[name] !== void 0 && isCompared(c, e, name) && !sameField(name, e[name], a[name])) return name;
  }
  for (const name in a) {
    if (a[name] !== void 0 && e[name] === void 0 && isCompared(c, a, name)) return name;
  }
  return null;
}
function changeForm(c, node) {
  c.forms.push(node);
  c.respelled.add(node);
}
function mark(c, node, at, escaped2) {
  const marks = c.marks.get(node) ?? /* @__PURE__ */ new Map();
  marks.set(at, escaped2);
  c.marks.set(node, marks);
}
function isEscaped(c, node, at) {
  const asked = c.marks.get(node)?.get(at);
  if (asked !== void 0) return asked;
  const written = c.w.escapes.get(node) ?? [];
  return written[firstFrom(written, at)] === at;
}
function escapeAt(c, node, at) {
  const value = node.value;
  if (at < 0 || at >= value.length || !isAsciiPunctuation(value.charCodeAt(at)) || isEscaped(c, node, at)) return false;
  c.escapes.push([node, at]);
  mark(c, node, at, true);
  return true;
}
function openerOffsets(value) {
  const offsets = [];
  if (value.startsWith("--")) offsets.push(1);
  offsets.push(0);
  let end = 0;
  while (end < value.length && isAsciiAlphanumeric(value.charCodeAt(end))) end++;
  if (end > 0 && (value[end] === "." || value[end] === ")")) offsets.push(end);
  return offsets;
}
function escapeLineStart(c, nodes, from, owner) {
  c.misaligned = true;
  const first = nodes[from];
  if (first?.type === "text") {
    for (const at of openerOffsets(first.value)) if (escapeAt(c, first, at)) return;
  }
  for (let at = from + 1; at < nodes.length && !isBreak(nodes[at]); at++) {
    const node = nodes[at];
    if (node?.type === "text" && escapeAt(c, node, 0)) return;
  }
  if (first !== void 0 && hasOtherForm(c, first)) changeForm(c, first);
  else c.losses.push([first ?? owner, null]);
}
function hasOtherForm(c, node) {
  if ((c.w.forms.get(node) ?? 0) > 0 || c.respelled.has(node)) return false;
  if (node.type === "emphasis" || node.type === "strong" || node.type === "comment") return true;
  return "key" in node && node.key !== void 0 && c.w.facts?.get(node)?.rawRef !== void 0;
}
function lastText(node) {
  let at = node;
  for (; ; ) {
    if (at === void 0) return null;
    if (at.type === "text") return at;
    const children2 = childNodes(at);
    at = children2[children2.length - 1];
  }
}
var CR3 = 13;
function endsLineWithCr(value, at) {
  let k = at;
  while (value[k] === " " || value[k] === "	") k++;
  return value.charCodeAt(k) === CR3;
}
var JOINING = "\\!^$`";
var CLOSING_MARKS = /* @__PURE__ */ new Map([
  ["emphasis", "/"],
  ["strong", "*"],
  ["underline", "_"],
  ["strike", "~"],
  ["highlight", "="],
  ["superscript", "^"],
  ["subscript", ","],
  ["insert", "+"],
  ["delete", "-"],
  ["span", "]"],
  ["link", "]"],
  ["inline_footnote", "]"],
  ["inline_extension", "]"]
]);
function escapeEnd(c, text, braces) {
  if (text === null) return false;
  const value = text.value;
  if (value !== "" && JOINING.includes(value[value.length - 1]) && escapeAt(c, text, value.length - 1)) return true;
  return braces && escapeAt(c, text, value.lastIndexOf("{"));
}
function escapeInContent(c, e) {
  const mark2 = CLOSING_MARKS.get(e.type);
  if (mark2 === void 0 || !("children" in e)) return false;
  return escapeMark(c, e.children, 0, 0, mark2) || mark2 === "]" && escapeMark(c, e.children, 0, 0, "[");
}
function joinsNext(es, i) {
  const value = i > 0 ? lastText(es[i - 1])?.value ?? "" : "";
  return value !== "" && JOINING.includes(value[value.length - 1]);
}
function escapeOwnerMark(c, e) {
  const mark2 = c.owner === null ? void 0 : CLOSING_MARKS.get(c.owner.type);
  if (mark2 === void 0 || !("children" in e)) return false;
  return escapeMark(c, e.children, 0, 0, mark2) || mark2 === "]" && escapeMark(c, e.children, 0, 0, "[");
}
function escapeBefore(c, es, i) {
  const before2 = i > 0 ? lastText(es[i - 1]) : null;
  return escapeEnd(c, before2, true) || escapeNameSigil(c, before2, es[i]);
}
function escapeNameSigil(c, text, e) {
  if (text === null || !writeInlines(c.w, [e], c.flags).startsWith("[")) return false;
  const value = text.value;
  let start = value.length;
  while (start > 0 && isExtensionNameChar(value.charCodeAt(start - 1))) start--;
  while (start < value.length && (value[start] === "-" || value.charCodeAt(start) >= 48 && value.charCodeAt(start) <= 57)) start++;
  return start < value.length && value[start - 1] === ":" && escapeAt(c, text, start - 1);
}
function isExtensionNameChar(code) {
  return isAsciiAlphanumeric(code) || code === 95 || code === 45;
}
function escapeContentStart(c, e) {
  const mark2 = CLOSING_MARKS.get(e.type);
  const first = "children" in e ? e.children[0] : void 0;
  return mark2 !== void 0 && mark2 !== "]" && first?.type === "text" && first.value.startsWith(mark2) && escapeAt(c, first, 0);
}
function escapeAfter(c, es, i) {
  const next = textAt(es, i + 1);
  return next !== null && escapeAt(c, next, 0);
}
function escapeInside(c, es, i) {
  const e = es[i];
  return escapeEnd(c, e !== void 0 && "children" in e ? lastText(e) : null, true);
}
function respell(c, es, i) {
  const e = es[i];
  if (c.w.lost.has(e)) return false;
  const attempt = c.w.attempts.get(e) ?? { step: 0, escapes: [] };
  c.w.attempts.set(e, attempt);
  const before2 = c.escapes.length;
  while (attempt.step < RESPELL_STEPS.length) {
    const step = RESPELL_STEPS[attempt.step++];
    if (!step(c, es, i, attempt)) continue;
    for (let at = before2; at < c.escapes.length; at++) {
      attempt.escapes.push(c.escapes[at]);
      if (step !== escapeLoneBracket) c.trials.push(c.escapes[at]);
    }
    return true;
  }
  c.losses.push([e, null]);
  return false;
}
var RESPELL_STEPS = [
  escapeBefore,
  (c, es, i) => escapeContentStart(c, es[i]),
  (c, es, i) => escapeContentConstruct(c, es[i]),
  escapeAcrossCloser,
  escapeInside,
  escapeAfter,
  (c, es, i) => escapeContentLine(c, es[i]),
  (c, es, i) => escapeOwnerMark(c, es[i]),
  (c, es, i, attempt) => {
    if (!hasOtherForm(c, es[i])) return false;
    for (const escape of attempt.escapes) {
      c.retracted.push(escape);
      mark(c, escape[0], escape[1], false);
    }
    attempt.escapes = [];
    changeForm(c, es[i]);
    return true;
  },
  escapeBefore,
  escapeInside,
  (c, es, i) => escapeInContent(c, es[i]),
  escapeLoneBracket
];
function escapeLoneBracket(c, es, i) {
  const e = es[i];
  if (e.type !== "inline_footnote" && e.type !== "inline_extension" || !("children" in e)) return false;
  const open = [];
  for (const text of textsBelow(e)) {
    for (let at = 0; at < text.value.length; at++) {
      const char = text.value[at];
      if (char !== "[" && char !== "]" || isEscaped(c, text, at)) continue;
      if (char === "[") open.push([text, at]);
      else open.pop();
    }
  }
  let asked = false;
  for (const [text, at] of open) asked = escapeAt(c, text, at) || asked;
  return asked || escapeMark(c, e.children, 0, 0, "[");
}
function contentFlags(c, e) {
  return c.flags | (e.type === "emphasis" ? IN_EMPHASIS : e.type === "strong" ? IN_STRONG : 0);
}
var MAX_PROBE_ROUNDS = 32;
function probeWriter(c, expected) {
  const escapes = /* @__PURE__ */ new Map();
  for (const text of expected.flatMap((node) => node.type === "text" ? [node] : textsBelow(node))) {
    const own = c.w.escapes.get(text);
    if (own !== void 0) escapes.set(text, [...own]);
  }
  return { ...c.w, escapes, attempts: /* @__PURE__ */ new Map(), losses: { entries: [], nodes: [] }, lost: new Set(c.w.lost) };
}
function probeEscapes(c, e, expected, flags, takes = () => true) {
  const w = probeWriter(c, expected);
  let found = false;
  for (let round = 0; round < MAX_PROBE_ROUNDS; round++) {
    const source = `${writeInlines(w, expected, flags)}
`;
    const parsed = parseChunk(source, c.w.abbreviations).children;
    const block = parsed[0];
    if (parsed.length !== 1 || block?.type !== "paragraph") return round === 0 ? null : found;
    const probe = createCheck(w);
    probe.flags = flags;
    probe.source = source;
    compareInlines(probe, expected, block.children, e);
    extendChains(probe);
    const taken = probe.escapes.filter(([node, at]) => takes(node, at) && escapeAt(c, node, at));
    if (taken.length === 0) return round === 0 && probe.losses.length > 0 ? null : found;
    found = true;
    for (const [node, at] of taken) w.escapes.set(node, [...w.escapes.get(node) ?? [], at].sort((x, y) => x - y));
  }
  return found;
}
function escapeContentConstruct(c, e) {
  if (!("children" in e) || e.children.length === 0) return false;
  const word = { type: "text", value: "x" };
  const flat = e.children.map((node) => node.type === "soft_break" ? { type: "text", value: " " } : node);
  const variants = isBreak(e.children[0]) ? [[word, ...e.children], [word, ...flat]] : [e.children, [word, ...e.children], [word, ...flat]];
  for (const expected of variants) {
    const found = probeEscapes(c, e, expected, contentFlags(c, e));
    if (found !== null) return found;
  }
  return false;
}
function escapeAcrossCloser(c, es, i) {
  const e = es[i];
  if (!isPairedMark(e) || !textsBelow(e).some((text) => opensAcross(text.value))) return false;
  const flags = contentFlags(c, e);
  const spelled = writeInlines(c.w, [e], c.flags);
  const content = writeInlines(c.w, e.children, flags);
  const closer = { type: "text", value: spelled.slice(spelled.length - (spelled.length - content.length) / 2) };
  const word = { type: "text", value: "x" };
  let end = i + 1;
  while (end < es.length && end - i <= MAX_ACROSS) end++;
  const inlines = [...e.children, closer, ...es.slice(i + 1, end)];
  const mark2 = CLOSING_MARKS.get(e.type);
  const own = new Set(textsBelow(e));
  const takes = (node, at) => node !== closer && node !== word && !(own.has(node) && node.value[at] === mark2);
  return probeEscapes(c, e, inlines, flags, takes) === true || probeEscapes(c, e, [word, ...inlines], flags, takes) === true;
}
var MAX_ACROSS = 16;
function opensAcross(value) {
  for (const opener of "[`<{$:") if (value.includes(opener)) return true;
  return false;
}
function textsBelow(node) {
  return childNodes(node).flatMap((child) => child.type === "text" ? [child] : textsBelow(child));
}
var PAIRED_MARKS = [
  "emphasis",
  "strong",
  "underline",
  "strike",
  "highlight",
  "superscript",
  "subscript",
  "insert",
  "delete"
];
function isPairedMark(node) {
  return PAIRED_MARKS.includes(node.type) && "children" in node;
}
function escapeContentLine(c, e) {
  if (!("children" in e)) return false;
  const nodes = e.children;
  for (let at = 0; at < nodes.length; at++) {
    const node = nodes[at];
    if ("children" in node && escapeContentLine(c, node)) return true;
    const next = nodes[at + 1];
    if (!isBreak(node) || next?.type !== "text" || !hasOpenerShape(next) || !opensBlockAlone(c, nodes, at + 1)) continue;
    for (const offset of openerOffsets(next.value)) if (escapeAt(c, next, offset)) return true;
  }
  return false;
}
function opensBlockAlone(c, nodes, from) {
  let end = from;
  while (end < nodes.length && !isBreak(nodes[end])) end++;
  const blocks = parseChunk(writeInlines(c.w, nodes.slice(from, end), c.flags), c.w.abbreviations).children;
  return blocks.length !== 1 || blocks[0].type !== "paragraph";
}
function openerShift(a) {
  if (a.type === "image" || a.type === "literal_inline" || a.type === "inline_footnote") return 1;
  if (a.type === "math") return a.display ? 2 : 1;
  if (a.type !== "smart_punctuation") return 0;
  const source = a.source;
  return source.startsWith("{-") ? 2 : source.startsWith("-") ? 1 : 0;
}
function escapeOpener(c, e, at, a) {
  const value = e.value;
  let start = at;
  while (start < value.length && (value[start] === " " || value[start] === "	")) start++;
  const shifted = start + openerShift(a);
  if (escapeAt(c, e, shifted)) {
    const opener = value[shifted];
    if (opener === "[" && isChainOpener(a) || opener === "`" && SPAN_TYPES.includes(a.type)) c.chains.push([e, shifted, a]);
  } else if (!escapeAt(c, e, start)) c.losses.push([e, "value"]);
}
function isChainOpener(a) {
  if (a.type === "footnote_ref") return true;
  if (a.type !== "link" && a.type !== "image" && a.type !== "span" && a.type !== "inline_footnote") return false;
  return !("key" in a && a.key !== void 0) || "form" in a && (a.form === "full" || a.form === "collapsed");
}
function holdsCloser(node) {
  if (node.type === "image" && node.alt?.includes("]") === true) return true;
  return childNodes(node).some((child) => child.type === "text" ? child.value.includes("]") : holdsCloser(child));
}
function escapeBrackets(c, node, at, a) {
  const value = node.value;
  const [start, end] = bracketRun(value, at);
  if (!value.includes("]", end)) return;
  if (a.type === "footnote_ref") return escapeLabels(c, node, at, end);
  const sigil = sigilOf(value, at);
  const opens = (k) => sigilOf(value, k) === sigil && (sigil === "^" || value[k + 1] !== "^");
  for (let k = at - 1; k >= start; k--) {
    if (value[k] !== "[") continue;
    if (!opens(k)) break;
    escapeAt(c, node, k);
  }
  if (holdsCloser(a)) return;
  for (let k = at + 1; k < end; k++) {
    if (value[k] !== "[") continue;
    if (!opens(k)) return;
    escapeAt(c, node, k);
  }
}
function sigilOf(value, at) {
  const before2 = value[at - 1];
  return before2 === "!" || before2 === "^" ? before2 : "";
}
function bracketRun(value, at) {
  const inRun = (k) => value[k] === "[" || (value[k] === "!" || value[k] === "^") && value[k + 1] === "[";
  let start = at;
  while (start > 0 && inRun(start - 1)) start--;
  let end = at + 1;
  while (end < value.length && inRun(end)) end++;
  return [start, end];
}
function escapeLabels(c, node, at, end) {
  const value = node.value;
  for (let k = at + 1; k < end; k++) {
    if (value[k] !== "[") continue;
    if (value[k + 1] !== "^" || k + 2 >= end) return;
    escapeAt(c, node, k);
  }
}
var SPAN_TYPES = ["code", "literal_inline", "math"];
function isEscapedBacktick(source, at) {
  let before2 = at;
  while (before2 > 0 && source[before2 - 1] === "\\") before2--;
  return (at - before2) % 2 === 1;
}
function escapeBackticks(c, node, at, a) {
  const source = c.source;
  const value = node.value;
  if (source === null || a.pos === void 0) return;
  let run = at;
  while (value[run] === "`") run++;
  let start = source.indexOf("`", stringOffsetOfByte(source, a.pos.startOffset));
  if (start < 0) return;
  const end = start + run - at;
  while (start < end && source[start] === "`") start++;
  if (start !== end || source[end] === "`") return;
  for (let k = source.indexOf("`", end); k >= 0; k = source.indexOf("`", k + 1)) if (!isEscapedBacktick(source, k)) return;
  for (let k = at + 1; k < run; k++) escapeAt(c, node, k);
}
function extendChains(c) {
  if (c.chains.length === 0) return;
  const placed = /* @__PURE__ */ new Map();
  for (const [node, at] of c.escapes) placed.set(node, (placed.get(node) ?? /* @__PURE__ */ new Set()).add(at));
  for (const [node, at, a] of c.chains) {
    if (placed.get(node)?.has(at) !== true) continue;
    if (node.value[at] === "`") escapeBackticks(c, node, at, a);
    else escapeBrackets(c, node, at, a);
  }
}
function isPaired(node) {
  return node.type === "emphasis" || node.type === "strong";
}
function escapeMark(c, nodes, start, from, mark2) {
  for (let at = start; at < nodes.length; at++) {
    const node = nodes[at];
    if (node.type !== "text") {
      if ("children" in node && escapeMark(c, node.children, 0, 0, mark2)) return true;
      continue;
    }
    const value = node.value;
    for (let k = value.indexOf(mark2, at === start ? from : 0); k >= 0; k = value.indexOf(mark2, k + 1)) if (escapeAt(c, node, k)) return true;
  }
  return false;
}
function closedEarly(c, es, i, vi, owner) {
  const mark2 = CLOSING_MARKS.get(owner.type);
  if (isPaired(owner) && hasOtherForm(c, owner)) changeForm(c, owner);
  else if (mark2 === void 0 || !escapeMark(c, es, i, vi, mark2)) c.losses.push([owner, null]);
}
function openerLine(es, from) {
  let at = from;
  while (at + 2 < es.length && isBraceLine(es[at]) && isBreak(es[at + 1])) at += 2;
  return at;
}
function isBraceLine(node) {
  return node?.type === "text" && node.value.startsWith("{") && node.value.endsWith("}");
}
function endedEarly(c, es, i, owner) {
  const line2 = isBreak(es[i]) ? es[i + 1] : void 0;
  if (line2?.type === "text" && endsLineWithCr(line2.value, 0)) {
    c.losses.push([line2, "value"]);
    return;
  }
  if (i > 0 && !isBreak(es[i]) && escapeEnd(c, lastText(es[i - 1]), false)) return;
  if (i > 0 && isBreak(es[i - 1])) escapeLineStart(c, es, openerLine(es, i), owner);
  else if (CLOSING_MARKS.has(owner.type)) closedEarly(c, es, i, 0, owner);
  else if (isBreak(es[i]) && i + 1 < es.length) escapeLineStart(c, es, openerLine(es, i + 1), owner);
  else c.losses.push([es[i] ?? owner, null]);
}
function matchCharacters(c, e, a, at) {
  const value = e.value;
  const other = a.value;
  const length = Math.min(value.length - at.vi, other.length - at.aj);
  for (let k = 0; k < length; k++) {
    if (value.charCodeAt(at.vi + k) === other.charCodeAt(at.aj + k)) continue;
    if (!escapeAt(c, e, at.vi + k)) c.losses.push([e, "value"]);
    return false;
  }
  at.vi += length;
  at.aj += length;
  if (at.aj === other.length) {
    at.j++;
    at.aj = 0;
  }
  return true;
}
function parseEndsInText(c, es, at, owner) {
  if (es[at.i]?.type === "text" && endsLineWithCr(es[at.i].value, at.vi)) {
    c.losses.push([es[at.i], "value"]);
    return false;
  }
  if (at.vi === 0 && at.i > 0 && startsWithCloser(es[at.i - 1], es[at.i]) && escapeAt(c, es[at.i], 0)) return false;
  if (at.vi === 0 && at.i > 0 && isBreak(es[at.i - 1])) escapeLineStart(c, es, openerLine(es, at.i), owner);
  else if (CLOSING_MARKS.has(owner.type)) closedEarly(c, es, at.i, at.vi, owner);
  else c.losses.push([owner, null]);
  return false;
}
function startsWithCloser(node, next) {
  const mark2 = CLOSING_MARKS.get(node.type);
  return mark2 !== void 0 && next?.type === "text" && next.value.startsWith(mark2);
}
function afterTextNode(c, es, as, at, owner) {
  at.i++;
  at.vi = 0;
  if (at.aj === 0 || es[at.i]?.type === "text") return true;
  if (es[at.i] === void 0) {
    if (!escapeInContent(c, owner) && !escapeEnd(c, lastText(owner), true)) c.losses.push([owner, null]);
  } else if (at.j + 1 >= as.length && isPaired(owner) && !joinsNext(es, at.i)) closedEarly(c, es, at.i, 0, owner);
  else return respell(c, es, at.i) && stepOver(c, es, as, at);
  return false;
}
function matchText(c, e, es, as, at, owner) {
  const value = e.value;
  const a = as[at.j];
  if (a === void 0) return parseEndsInText(c, es, at, owner);
  if (a.type !== "text") return skipConstruct(c, e, a, at);
  if (!matchCharacters(c, e, a, at)) return false;
  return at.vi < value.length || afterTextNode(c, es, as, at, owner);
}
function stepOver(c, es, as, at) {
  const a = as[at.j];
  const spelled = writeInlines(c.w, [es[at.i]], c.flags);
  if (a?.type !== "text" || spelled.includes("\\") || !a.value.startsWith(spelled, at.aj)) return false;
  at.aj += spelled.length;
  if (at.aj === a.value.length) {
    at.j++;
    at.aj = 0;
  }
  at.i++;
  return true;
}
function skipConstruct(c, e, a, at) {
  escapeOpener(c, e, at.vi, a);
  const pos = a.pos;
  if (pos === void 0) return false;
  const end = spelledEnd(c.w, e, at.vi, pos.endOffset - pos.startOffset, (c.flags & IN_CELL) !== 0);
  if (end < 0) return false;
  at.vi = end;
  at.j++;
  if (at.vi === e.value.length) {
    at.i++;
    at.vi = 0;
  }
  return true;
}
function readsNeighbor(c, e, es, i, a) {
  const next = textAt(es, i + 1);
  if (next !== null && !sameValue(e.attrs, a.attrs) && next.value.startsWith("{")) return escapeAt(c, next, 0);
  if (next !== null && readsOn(e, next) && differingField(c, e, a) !== null) return escapeAt(c, next, 0);
  if (e.type !== "smart_punctuation" || a.type !== "smart_punctuation" || e.kind === a.kind && e.source === a.source) return false;
  if (next !== null && (moveSigilEscape(c, next) || escapeAt(c, next, 0))) return true;
  const before2 = textAt(es, i - 1);
  return before2 !== null && escapeAt(c, before2, before2.value.length - 1);
}
function moveSigilEscape(c, next) {
  const value = next.value;
  if (value[0] !== ":" || !isEscaped(c, next, 0)) return false;
  let bracket = 1;
  while (bracket < value.length && isExtensionNameChar(value.charCodeAt(bracket))) bracket++;
  if (bracket === 1 || value[bracket] !== "[" || isEscaped(c, next, bracket)) return false;
  c.retracted.push([next, 0]);
  mark(c, next, 0, false);
  return escapeAt(c, next, bracket);
}
function readsOn(node, next) {
  if (node.attrs !== void 0) return false;
  if (node.type === "mention" || node.type === "tag") return true;
  return (node.type === "code" || node.type === "literal_inline" || node.type === "math") && next.value.startsWith("`");
}
function textAt(nodes, at) {
  const node = nodes[at];
  return node?.type === "text" ? node : null;
}
function isLostCode(c, node) {
  return node !== void 0 && node.type === "code" && c.w.lost.has(node);
}
function matchNode(c, e, es, as, at, owner) {
  const a = as[at.j];
  if (a === void 0) {
    endedEarly(c, es, at.i, owner);
    return false;
  }
  if (a.type !== e.type || at.aj > 0) return respell(c, es, at.i) && stepOver(c, es, as, at);
  if (isLostCode(c, es[at.i + 1])) {
    at.i++;
    while (isLostCode(c, es[at.i])) at.i++;
    at.j++;
    return true;
  }
  if (readsNeighbor(c, e, es, at.i, a)) return false;
  compareInline(c, e, a);
  at.i++;
  at.j++;
  return true;
}
function setAnchor(es, as, at) {
  if (at.vi !== 0 || at.aj !== 0) return;
  const pos = as[at.j]?.pos;
  if (isBreak(es[at.i])) at.anchor = -1;
  else if (pos !== void 0) {
    at.anchor = at.i;
    at.anchorByte = pos.startOffset;
  }
}
function firstNodeFrom(as, j, offset) {
  while (j < as.length && (as[j].pos?.startOffset ?? -1) < offset) j++;
  return j;
}
function resumeAt(at, i, j) {
  at.i = i;
  at.j = j;
  at.vi = 0;
  at.aj = 0;
  return true;
}
function resync(c, es, as, at) {
  const failed = as[at.j]?.pos;
  if (at.anchor < 0 || failed === void 0) return false;
  let offset = at.anchorByte;
  let j = at.j;
  for (let k = at.anchor; k < es.length && !isBreak(es[k]); k++) {
    j = firstNodeFrom(as, j, offset);
    if (k > at.i && offset >= failed.endOffset && as[j]?.pos?.startOffset === offset) return resumeAt(at, k, j);
    offset += utf8Length(writeInlines(c.w, [es[k]], c.flags));
  }
  return false;
}
function compareInlines(c, es, as, owner) {
  const outer = c.owner;
  c.owner = owner;
  compareList(c, es, as, owner);
  c.owner = outer;
}
function compareList(c, es, as, owner) {
  const at = { i: 0, vi: 0, j: 0, aj: 0, anchor: -1, anchorByte: 0 };
  while (at.i < es.length) {
    setAnchor(es, as, at);
    const e = es[at.i];
    const more = e.type === "text" ? matchText(c, e, es, as, at, owner) : matchNode(c, e, es, as, at, owner);
    if (!more && !resync(c, es, as, at)) return;
  }
  if (at.j < as.length) c.losses.push([owner, null]);
}
function compareRaw(c, e, a) {
  const probe = createCheck(c.w);
  probe.flags = c.flags;
  compareFields(probe, e, a);
  if ("children" in e) compareInlines(probe, e.children, childNodes(a), e);
  if (changes(probe) + probe.losses.length > 0 && changes(c) === 0) changeForm(c, e);
  else if (changes(probe) + probe.losses.length > 0) c.misaligned = true;
}
function compareFields(c, e, a) {
  const field = differingField(c, e, a);
  if (field !== null) c.losses.push([e, field]);
}
function compareInline(c, e, a) {
  if ("key" in e && e.key !== void 0 && hasOtherForm(c, e)) return compareRaw(c, e, a);
  compareFields(c, e, a);
  if (!("children" in e)) return;
  const outer = c.flags;
  if (e.type === "emphasis") c.flags |= IN_EMPHASIS;
  else if (e.type === "strong") c.flags |= IN_STRONG;
  compareInlines(c, e.children, childNodes(a), e);
  c.flags = outer;
}
function blockMismatch(c, e) {
  c.misaligned = true;
  if (e.type === "paragraph" && e.children.length > 0) escapeLineStart(c, e.children, 0, e);
  else c.losses.push([e, null]);
}
function missingBlock(c, e) {
  const first = e.type === "paragraph" ? e.children[0] : void 0;
  if (first?.type === "text" && endsLineWithCr(first.value, 0)) {
    c.losses.push([first, "value"]);
    return;
  }
  if (e.type === "paragraph" && e.children.length > 0) escapeLineStart(c, e.children, 0, e);
  else if (hasOtherForm(c, e)) changeForm(c, e);
  else c.losses.push([e, null]);
}
function hasSpanMarks2(table3) {
  for (const group of table3.children) {
    if (group.type !== "comment" && group.children.some(rowHasSpanMarks)) return true;
  }
  return false;
}
function rowHasSpanMarks(row) {
  return row.type === "table_row" && row.children.some((cell) => cell.span !== void 0);
}
function compareSlots(c, e, a) {
  const title = titleOf(e);
  const parsedTitle = titleOf(a);
  if (title !== void 0) compareInlines(c, title, parsedTitle ?? [], e);
  else if (parsedTitle !== void 0) c.losses.push([e, "title"]);
  const caption2 = captionOf(e);
  const parsedCaption = captionOf(a);
  if (caption2 !== void 0 && parsedCaption !== void 0) compareBlock(c, caption2, parsedCaption);
  else if (caption2 !== parsedCaption) c.losses.push([caption2 ?? e, caption2 === void 0 ? "caption" : null]);
}
function compareBlock(c, e, a) {
  if (c.w.lost.has(e)) return true;
  if (e.type !== a.type) {
    blockMismatch(c, e);
    return false;
  }
  const marks = c.spanMarks;
  const flags = c.flags;
  if (e.type === "table" && a.type === "table") c.spanMarks = hasSpanMarks2(e) || hasSpanMarks2(a);
  if (e.type === "table_cell") c.flags |= IN_CELL;
  compareFields(c, e, a);
  if (isInlineParent(e)) compareInlines(c, e.children, childNodes(a), e);
  else compareBlocks(c, childNodes(e), childNodes(a), e);
  compareSlots(c, e, a);
  c.spanMarks = marks;
  c.flags = flags;
  return true;
}
function readStarts(node, offset, paragraphs, lines) {
  for (const block of childNodes(node)) {
    const pos = block.pos;
    if (pos !== void 0) {
      lines.add(pos.startLine - offset);
      if (block.type === "paragraph") paragraphs.add((pos.startLine - offset) * PLACE_COLUMNS + pos.startColumn - 1);
    }
    if (!isInlineParent(block)) readStarts(block, offset, paragraphs, lines);
    const caption2 = captionOf(block);
    if (caption2 !== void 0) readStarts(caption2, offset, paragraphs, lines);
  }
}
function hasOpenerShape(node) {
  const value = node?.type === "text" ? node.value : "";
  if (value === "") return node !== void 0 && node.type !== "text";
  return !isAsciiAlphanumeric(value.charCodeAt(0)) || openerOffsets(value).length > 1;
}
function isPending(c, node) {
  return node?.type === "text" && c.marks.has(node);
}
function escapeOpenerLines(c, e, place2, paragraphs, lines) {
  const top = e.children;
  if (!paragraphs.has(place2) && hasOpenerShape(top[0]) && !isPending(c, top[0])) escapeLineStart(c, top, 0, e);
  let line2 = Math.floor(place2 / PLACE_COLUMNS);
  const visit3 = (nodes) => {
    for (let at = 0; at < nodes.length; at++) {
      const node = nodes[at];
      if ("children" in node) visit3(node.children);
      if (!isBreak(node)) continue;
      line2++;
      if (lines.has(line2) && hasOpenerShape(nodes[at + 1]) && !isPending(c, nodes[at + 1])) escapeLineStart(c, nodes, at + 1, e);
    }
  };
  visit3(top);
}
function escapeOpeners(c, parsed, offset) {
  if (!c.misaligned) return;
  const paragraphs = /* @__PURE__ */ new Set();
  const lines = /* @__PURE__ */ new Set();
  readStarts(parsed, offset, paragraphs, lines);
  for (const [node, place2] of c.w.starts) {
    if (node.attrs === void 0 && node.lang === void 0) escapeOpenerLines(c, node, place2, paragraphs, lines);
  }
}
function compareBlocks(c, es, as, owner) {
  const before2 = changes(c);
  const count = Math.min(es.length, as.length);
  for (let at = 0; at < count; at++) if (!compareBlock(c, es[at], as[at])) return;
  if (es.length === as.length || changes(c) > before2 || es.some((e) => c.w.lost.has(e))) return;
  const missing = es[as.length];
  c.misaligned = true;
  if (owner.type === "line_block" && missing !== void 0) escapeLineStart(c, childNodes(missing), 0, missing);
  else if (es.length > as.length) missingBlock(c, es[as.length]);
  else c.losses.push([owner, null]);
}

// ../carve-js/v2/src/write.ts
function isNode(value) {
  return isRecord(value) && typeof value["type"] === "string";
}
function nodeAt(document, path) {
  let at = document;
  for (const part of path.split("/").slice(1)) {
    if (typeof at !== "object" || at === null) return null;
    at = Reflect.get(at, pointerToken(part));
  }
  return isNode(at) ? at : null;
}
function seek2(cursor, value, offset) {
  if (offset < cursor.bytes) return false;
  while (cursor.bytes < offset && cursor.at < value.length) cursor.bytes += unitBytes(value, cursor.at++);
  return cursor.bytes === offset && !isSecondHalf(value, cursor.at);
}
function addWrap2(cursor, node, offset) {
  const value = node.value;
  if (!seek2(cursor, value, offset)) return false;
  const last = cursor.points[cursor.points.length - 1] ?? 0;
  const fits = cursor.at === 0 ? cursor.points.length === 0 : cursor.at > last && value[cursor.at - 1] === " ";
  if (fits) cursor.points.push(cursor.at);
  return fits;
}
function startsFragment(document, cell, path) {
  const cut = path.lastIndexOf("/children/");
  const parent = cut < 0 ? null : nodeAt(document, path.slice(0, cut));
  if (parent === null || parent !== childNodes(cell)[0]) return false;
  const at = Number(path.slice(cut + "/children/".length));
  if (at === 0) return true;
  const before2 = childNodes(parent)[at - 1];
  return before2?.type === "text" && before2.value.endsWith(" ");
}
function readWraps(w, facts, document, cell, entry) {
  const cursors = /* @__PURE__ */ new Map();
  const starts = /* @__PURE__ */ new Set();
  let path = "";
  let node = null;
  for (const wrap of entry.wraps ?? []) {
    if (wrap.path !== path || node === null) node = nodeAt(document, wrap.path);
    path = wrap.path;
    if (node === null || !placeWrap(document, cell, node, wrap, cursors, starts)) {
      facts.set(cell, { ...entry, wraps: [] });
      return;
    }
  }
  w.wrapPoints ??= /* @__PURE__ */ new Map();
  for (const [text, cursor] of cursors) w.wrapPoints.set(text, cursor.points);
  w.wrapStarts ??= /* @__PURE__ */ new Set();
  for (const start of starts) w.wrapStarts.add(start);
}
function placeWrap(document, cell, node, wrap, cursors, starts) {
  if (node.type !== "text") {
    if (wrap.offset !== 0 || starts.has(node) || !startsFragment(document, cell, wrap.path)) return false;
    starts.add(node);
    return true;
  }
  const cursor = cursors.get(node) ?? { bytes: 0, at: 0, points: [] };
  if (!addWrap2(cursor, node, wrap.offset)) return false;
  cursors.set(node, cursor);
  return true;
}
function readLayout(w, facts, document, entries) {
  for (const entry of entries) {
    const node = nodeAt(document, entry.path);
    if (node === null) continue;
    facts.set(node, entry);
    if (entry.wraps !== void 0 && entry.wraps.length > 0) readWraps(w, facts, document, node, entry);
  }
}
function readAbbreviations(w, document) {
  for (const child of document.children) {
    if (child.type === "abbreviation_def" && !w.abbreviations.has(child.key)) w.abbreviations.set(child.key, child.expansion);
  }
}
function addEscapes(w, added) {
  const byNode = /* @__PURE__ */ new Map();
  for (const [node, at] of added) {
    const list3 = byNode.get(node);
    if (list3 === void 0) byNode.set(node, [at]);
    else list3.push(at);
  }
  for (const [node, offsets] of byNode) {
    offsets.sort((a, b) => a - b);
    const list3 = w.escapes.get(node) ?? [];
    const merged = [];
    let i = 0;
    for (const at of offsets) {
      while (i < list3.length && list3[i] < at) merged.push(list3[i++]);
      merged.push(at);
    }
    while (i < list3.length) merged.push(list3[i++]);
    w.escapes.set(node, merged);
  }
}
function removeEscape(w, node, at) {
  const list3 = w.escapes.get(node) ?? [];
  const place2 = list3.indexOf(at);
  if (place2 >= 0) list3.splice(place2, 1);
  return place2 >= 0;
}
function applyChanges(w, check) {
  if (check.forms.some((node) => !w.forms.has(node))) {
    w.escapes.clear();
    w.attempts.clear();
    for (const node of check.forms) w.forms.set(node, (w.forms.get(node) ?? 0) + 1);
    return true;
  }
  for (const [node, at] of check.retracted) removeEscape(w, node, at);
  addEscapes(w, check.escapes);
  for (const node of check.forms) w.forms.set(node, (w.forms.get(node) ?? 0) + 1);
  if (check.escapes.length + check.forms.length + check.retracted.length > 0) return true;
  for (const [node] of check.losses) refuseLeafLines(w, node, 0);
  for (const [node, field] of check.losses) lose(w, node, field);
  return false;
}
var LINE_LEAVES = ["code", "literal_inline", "math", "raw_inline", "comment", "critic_comment"];
function isAsciiAlphanumeric2(code) {
  return code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122;
}
function hasOpenerLine(value) {
  for (let at = value.indexOf("\n"); at >= 0; at = value.indexOf("\n", at + 1)) {
    let start = at + 1;
    while (value[start] === " " || value[start] === "	") start++;
    if (start >= value.length || value[start] === "\n") continue;
    if (!isAsciiAlphanumeric2(value.charCodeAt(start))) return true;
    let end = start;
    while (end < value.length && isAsciiAlphanumeric2(value.charCodeAt(end))) end++;
    if (value[end] === "." || value[end] === ")") return true;
  }
  return false;
}
function refuseLeafLines(w, node, depth2) {
  if (depth2 > MAX_LEAF_DEPTH || node.type === "paragraph" || node.type === "list_item") return;
  if (LINE_LEAVES.includes(node.type)) {
    const value = "value" in node && typeof node.value === "string" ? node.value : "";
    if (hasOpenerLine(value)) lose(w, node, "value");
    return;
  }
  for (const child of childNodes(node)) refuseLeafLines(w, child, depth2 + 1);
}
function joinsGroup(w, before2, node) {
  if (node.type === "paragraph") return before2.type === "definition_list";
  return node.type === "comment" && blankLinesBetween(w, before2, null, node, false) === 0;
}
function groupEnd(w, nodes, from) {
  let end = from + 1;
  while (end < nodes.length && joinsGroup(w, nodes[end - 1], nodes[end])) end++;
  return end;
}
function textOrder(nodes, order) {
  for (const node of nodes) {
    if (node.type === "text") order.set(node, order.size);
    forEachSlot(node, (slot) => void textOrder(slot, order), SOURCE_ORDER);
  }
  return order;
}
var MAX_ORDERED_ESCAPES = 4;
var MAX_LEAF_DEPTH = 200;
function leftmost(group, escapes) {
  const order = textOrder(group, /* @__PURE__ */ new Map());
  let best = escapes[0];
  for (const escape of escapes) {
    const rank = order.get(escape[0]) ?? -1;
    const bestRank = order.get(best[0]) ?? -1;
    if (rank < bestRank || rank === bestRank && escape[1] < best[1]) best = escape;
  }
  return best;
}
function deferEscapes(w, deferred) {
  for (const attempt of w.attempts.values()) {
    const kept = attempt.escapes.filter((escape) => !deferred.includes(escape));
    if (kept.length === attempt.escapes.length) continue;
    attempt.escapes = kept;
    attempt.step--;
  }
}
function groupTree(w, group, first, escapes) {
  w.escapes = escapes;
  w.lines = [];
  w.lead = null;
  w.starts.clear();
  writeBlocks2(w, group, "", 0, false);
  return parseChunk(`${first ? "" : "\n"}${w.lines.join("\n")}
`, w.abbreviations);
}
function isAsked(w, group, first, node, at) {
  const placed = w.escapes;
  const lines = w.lines;
  const lead = w.lead;
  const starts = new Map(w.starts);
  const order = textOrder(group, /* @__PURE__ */ new Map());
  const rank = order.get(node) ?? -1;
  const left = /* @__PURE__ */ new Map();
  for (const [text, offsets] of placed) {
    const own = order.get(text) ?? -1;
    if (own < rank) left.set(text, offsets);
    else if (text === node) left.set(text, offsets.filter((offset) => offset < at));
  }
  const escaped2 = new Map(left);
  escaped2.set(node, [...left.get(node) ?? [], at]);
  const without = groupTree(w, group, first, left);
  const asked = !treesEqual(groupTree(w, group, first, escaped2), without);
  w.escapes = placed;
  w.lines = lines;
  w.lead = lead;
  w.starts.clear();
  for (const [key, value] of starts) w.starts.set(key, value);
  return asked;
}
function settle(w, document, group, first) {
  const check = compareGroup(w, document, group, first);
  let dropped = false;
  const trials = check.trials.length <= MAX_ORDERED_ESCAPES ? check.trials : [];
  for (const [node, at] of trials) {
    if (isAsked(w, group, first, node, at)) continue;
    const place2 = check.escapes.findIndex((escape) => escape[0] === node && escape[1] === at);
    if (place2 >= 0) check.escapes.splice(place2, 1);
    dropped = true;
  }
  if (dropped && check.escapes.length + check.forms.length + check.retracted.length === 0) return true;
  if (check.escapes.length > 1 && check.escapes.length <= MAX_ORDERED_ESCAPES) {
    const first2 = leftmost(group, check.escapes);
    deferEscapes(w, check.escapes.filter((escape) => escape !== first2));
    check.escapes = [first2];
  }
  extendChains(check);
  const changes2 = check.escapes.length + check.forms.length + check.retracted.length;
  if (changes2 === 0 && check.losses.length > 0 && first && !w.blankFirst) {
    w.blankFirst = compareGroup(w, document, group, false).losses.length === 0;
    if (w.blankFirst) return true;
  }
  return applyChanges(w, check);
}
function writeGroup(w, document, from, first) {
  const nodes = document.children;
  const reported = w.losses.entries.length;
  for (; ; ) {
    const end = groupEnd(w, nodes, from);
    const group = nodes.slice(from, end);
    w.lines = [];
    w.lead = null;
    w.starts.clear();
    writeBlocks2(w, group, "", 0, false);
    if (w.lines.length === 0) return end;
    if (!settle(w, document, group, first && !w.blankFirst)) {
      if (w.losses.entries.length === reported) reportUnread(w, group);
      return end;
    }
  }
}
function reportUnread(w, group) {
  const parsed = w.parsed?.children ?? [];
  for (let at = 0; at < Math.max(group.length, parsed.length); at++) {
    const block = parsed[at];
    if (block !== void 0 && at < group.length && treesEqual(group[at], block)) continue;
    lose(w, group[Math.min(at, group.length - 1)], null);
    return;
  }
}
function compareGroup(w, document, group, first) {
  const source = `${first ? "" : "\n"}${w.lines.join("\n")}
`;
  const check = createCheck(w);
  check.source = source;
  const parsed = parseChunk(source, w.abbreviations);
  w.parsed = parsed;
  compareBlocks(check, group, parsed.children, document);
  escapeOpeners(check, parsed, first ? 1 : 2);
  return check;
}
function lastBlock(nodes, from, to, list3) {
  for (let at = to - 1; at >= from; at--) if (nodes[at].type !== "comment") return nodes[at];
  return list3;
}
function addLines(out, lines, blanks) {
  for (let blank = 0; blank < blanks; blank++) out.push("");
  for (const line2 of lines) out.push(line2);
}
function writeDocument2(w, document) {
  const nodes = document.children;
  const out = [];
  let before2 = null;
  let list3 = null;
  for (let at = 0; at < nodes.length; ) {
    const from = at;
    at = writeGroup(w, document, from, out.length === 0);
    if (w.lines.length === 0) continue;
    if (out.length === 0 && w.blankFirst) out.push("");
    const blanks = before2 === null ? 0 : blankLinesBetween(w, before2, list3, nodes[from], false);
    addLines(out, w.lines, blanks);
    before2 = nodes[at - 1];
    list3 = lastBlock(nodes, from, at, list3);
  }
  return out.length === 0 ? "" : `${out.join("\n")}
`;
}
function writeTree(document, options) {
  const layout = options?.layout;
  const facts = layout === void 0 ? null : /* @__PURE__ */ new Map();
  const w = createWriter(facts, options?.alignTables === true);
  if (layout !== void 0 && facts !== null) readLayout(w, facts, document, layout.nodes);
  readAbbreviations(w, document);
  const source = writeDocument2(w, document);
  return { source, diagnostics: locateFindings(document, w.losses) };
}
function writeWithDiagnostics(document, options) {
  validateTree(document);
  return writeTree(document, options);
}
function write(document, options) {
  return writeWithDiagnostics(document, options).source;
}

// ../carve-js/v2/src/format.ts
function readFormatOptions(options) {
  const given = options ?? {};
  for (const name of Object.keys(given)) {
    if (!OPTION_KINDS.has(name)) throw new CarveOptionError(name, "unknown option");
    checkType(name, given[name]);
  }
  for (const name of Object.keys(given)) {
    if (OPTION_KINDS.get(name) !== "format") throw new CarveOptionError(name, "not an option of format");
  }
  return given["alignTables"] === true;
}
function formatWithDiagnostics(source, options) {
  const alignTables = readFormatOptions(options);
  const parsed = parseWithLayout(source);
  const written = writeTree(parsed.document, { layout: parsed.layout, alignTables });
  return { source: written.source, diagnostics: [...parsed.diagnostics, ...written.diagnostics] };
}
function format(source, options) {
  return formatWithDiagnostics(source, options).source;
}

// ../carve-js/v2/src/index.ts
function parseBlockTree(src) {
  const state = acquireState();
  try {
    scanBlocks(state, src);
    return buildTree(state.events, state.eventLength);
  } finally {
    releaseState(state);
  }
}
export {
  ABBREVIATION,
  AST_VERSION,
  ATTRIBUTES,
  ATTRIBUTE_BLOCK,
  AUTOLINK,
  BRACED_KINDS,
  BRACKET_SPAN,
  BULLET_LIST,
  CAPTION,
  CELL,
  CODE,
  CODE_SPAN,
  COMMENT,
  COMMENT_BLOCK,
  CarveInputError,
  CarveLayoutError,
  CarveOptionError,
  CarveRenderError,
  CarveTreeError,
  DELETE,
  DESCRIPTION,
  DESCRIPTION_LIST,
  DESTINATION,
  DIV,
  DOCUMENT,
  EDITORIAL,
  EMPHASIS,
  ENTER,
  ESCAPE,
  EVENT_WIDTH,
  EXIT,
  FIRST_CHARACTER_SHAPES,
  FIRST_INLINE_KIND,
  FLAG_ALPHA,
  FLAG_ATTRIBUTES,
  FLAG_AUTO,
  FLAG_BLOCK_MATH,
  FLAG_BRACED,
  FLAG_CELL_ATTRIBUTES,
  FLAG_COLLAPSED,
  FLAG_CONTINUATION,
  FLAG_DELIMITED,
  FLAG_DISPLAY,
  FLAG_EMAIL,
  FLAG_FIGURE,
  FLAG_HARD_BREAKS,
  FLAG_HEADER,
  FLAG_IMAGE,
  FLAG_MARKER_ATTRIBUTES,
  FLAG_OPEN_END,
  FLAG_PAREN,
  FLAG_QUOTE_FENCE,
  FLAG_RAW,
  FLAG_REFERENCE,
  FLAG_ROMAN,
  FLAG_SPAN_LEFT,
  FLAG_SPAN_UP,
  FLAG_STAR,
  FLAG_TASK,
  FLAG_TIGHT,
  FLAG_UNCLOSED,
  FLAG_UPPER,
  FOOTNOTE,
  FOOTNOTE_REF,
  FRONTMATTER,
  HARD_BREAK,
  HEADING,
  HIGHLIGHT,
  IMAGE,
  INCLUDE,
  INLINE_COMMENT,
  INLINE_EXTENSION,
  INLINE_FOOTNOTE,
  INLINE_KIND_NAMES,
  INSERT,
  ITEM,
  KIND_NAMES,
  LABEL,
  LAYOUT_VERSION,
  LINE_BLOCK,
  LINK,
  LINK_DEFINITION,
  LIST_STYLE_MASK,
  LITERAL,
  MATH,
  MAX_DEPTH,
  MAX_TREE_DEPTH,
  MENTION,
  NBSP,
  ORDERED_LIST,
  PARAGRAPH,
  QUOTE,
  RAW_INLINE,
  ROW,
  SHAPE_ABBREVIATION_DEFINITION,
  SHAPE_ATTRIBUTE_LINE,
  SHAPE_BLANK,
  SHAPE_BLOCK_IMAGE,
  SHAPE_BULLET,
  SHAPE_CAPTION,
  SHAPE_CODE_FENCE_CLOSER,
  SHAPE_CODE_FENCE_OPENER,
  SHAPE_COMMENT_BLOCK_CLOSER,
  SHAPE_COMMENT_BLOCK_OPENER,
  SHAPE_COMMENT_ONLY,
  SHAPE_CONTINUATION_ROW,
  SHAPE_DESCRIPTION,
  SHAPE_DISPLAY_MATH,
  SHAPE_DIV_BARE_RUN,
  SHAPE_DIV_OPENER,
  SHAPE_FOOTNOTE_DEFINITION,
  SHAPE_FRONTMATTER_CLOSER,
  SHAPE_FRONTMATTER_OPENER,
  SHAPE_HEADING,
  SHAPE_INCLUDE,
  SHAPE_LINK_DEFINITION,
  SHAPE_ORDERED,
  SHAPE_QUOTE,
  SHAPE_TABLE_ROW,
  SHAPE_TERM,
  SHAPE_TEXT,
  SHAPE_THEMATIC_BREAK,
  SMART,
  SMART_GLYPHS,
  SMART_KIND_NAMES,
  SOFT_BREAK,
  SPAN,
  STRIKE,
  STRONG,
  SUBSCRIPT,
  SUPERSCRIPT,
  SYMBOL,
  TABLE,
  TAG,
  TERM,
  THEMATIC_BREAK,
  TITLE,
  UNDERLINE,
  XREF,
  acquireInlineState,
  acquireState,
  buildTree,
  columnAt,
  decodeTree,
  definitionLabel,
  displayWidth,
  encodeEnvelope,
  encodeTree,
  eventFlags,
  eventKind,
  eventType,
  foldLabel,
  format,
  formatWithDiagnostics,
  isHost,
  isIndentContainer,
  isInlineContainer,
  isLeaf,
  isList,
  isOpaqueLeaf,
  isTextLeaf,
  lineAt,
  lineEndAt,
  parse,
  parseBlockTree,
  parseTree,
  parseWithDiagnostics,
  parseWithLayout,
  readDelimitedTable,
  readOpenerInfo,
  releaseInlineState,
  releaseState,
  render,
  renderTree,
  renderWithDiagnostics,
  resolveTree,
  scanBlocks,
  scanInline,
  stringOffsetOfByte,
  treesEqual,
  utf8Length,
  validateLayout,
  validateTree,
  write,
  writeWithDiagnostics
};
