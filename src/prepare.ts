import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { PandocDoc, PandocNode } from './pandoc.js';

export interface WriterOptions {
  offline?: boolean;
  /** Absolute directory containing images used by an offline document. */
  resourceRoot?: string;
  /** Supply image bytes without allowing Pandoc to resolve the target. */
  resolveImage?: (source: string) => { bytes: Uint8Array; mimeType: string } | undefined;
}

const mime: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
};

function localImage(source: string, root: string): { bytes: Uint8Array; mimeType: string } {
  if (path.isAbsolute(source) || source.includes('\\') || source.includes('?') || source.includes('#')) throw new Error(`offline image target is not a contained path: ${source}`);
  const realRoot = realpathSync(root);
  const target = realpathSync(path.resolve(realRoot, source));
  const relative = path.relative(realRoot, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`offline image target is outside resource root: ${source}`);
  const mimeType = mime[path.extname(target).toLowerCase()];
  if (!mimeType) throw new Error(`offline image has unsupported media type: ${source}`);
  return { bytes: readFileSync(target), mimeType };
}

/** Prepare all nested Pandoc nodes for a writer and resolve images before Pandoc starts. */
export function preparePandocForWriter(doc: PandocDoc, format: string, options: WriterOptions = {}): PandocDoc {
  if (options.resourceRoot !== undefined && !path.isAbsolute(options.resourceRoot)) throw new Error('resourceRoot must be an absolute path');
  const raw = format === 'docx' ? ['openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>']
    : format === 'odt' ? ['opendocument', '<text:p text:style-name="CarvePageBreak"/>']
      : format === 'latex' || format === 'pdf' ? ['latex', '\\newpage'] : undefined;
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const node = value as PandocNode;
    if (node.t === 'Div' && Array.isArray(node.c)) {
      const [attributes, blocks] = node.c as [unknown, PandocNode[]];
      const classes = Array.isArray(attributes) ? attributes[1] : undefined;
      if (Array.isArray(classes) && classes.includes('carve-page-break') && blocks.length === 1 && blocks[0]?.t === 'HorizontalRule') {
        return raw ? { t: 'RawBlock', c: raw } : { t: 'HorizontalRule' };
      }
    }
    if (options.offline && node.t === 'Image' && Array.isArray(node.c)) {
      const parts = node.c as [unknown, unknown, [string, string]];
      const source = parts[2][0];
      const resolved = options.resolveImage?.(source) ?? (options.resourceRoot ? localImage(source, options.resourceRoot) : undefined);
      if (!resolved) throw new Error(`offline image has no resolver: ${source}`);
      if (!/^image\/[a-z0-9.+-]+$/iu.test(resolved.mimeType)) throw new Error(`invalid image media type: ${resolved.mimeType}`);
      return { t: 'Image', c: [visit(parts[0]), visit(parts[1]), [`data:${resolved.mimeType};base64,${Buffer.from(resolved.bytes).toString('base64')}`, parts[2][1]]] };
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
  };
  return visit(doc) as PandocDoc;
}
