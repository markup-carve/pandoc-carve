import { parseFragment } from 'parse5';

const significantWhitespace = new Set(['pre', 'code', 'textarea', 'script', 'style']);

export function normalizeHtml(html) {
  function visit(node, preserve = false) {
    if (node.nodeName === '#text') {
      return ['text', preserve ? node.value : node.value.replace(/[\t\n\f\r ]+/g, ' ')];
    }
    if (node.nodeName === '#comment') return ['comment', node.data];
    const attrs = (node.attrs ?? []).map(({ name, value, namespace }) => [namespace ?? '', name, value])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const style = node.attrs?.find(({ name }) => name === 'style')?.value ?? '';
    const keep = preserve || significantWhitespace.has(node.tagName)
      || /white-space\s*:\s*(?:pre(?:-wrap|-line)?|break-spaces)\b/i.test(style);
    return [node.namespaceURI ?? '', node.nodeName, attrs,
      (node.content?.childNodes ?? node.childNodes ?? []).map(child => visit(child, keep))];
  }
  return JSON.stringify(visit(parseFragment(html.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, ''))));
}
