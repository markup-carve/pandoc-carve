import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/** Add the paragraph style that makes the ODT page-break carrier a hard break. */
export function finishOdtPageBreaks(archive: Buffer): Buffer {
  const files = unzipSync(archive);
  const content = files['content.xml'];
  const styles = files['styles.xml'];
  if (!content || !styles) throw new Error('Pandoc returned an invalid ODT archive');
  if (!strFromU8(content).includes('text:style-name="CarvePageBreak"')) return archive;
  const xml = strFromU8(styles);
  const close = '</office:styles>';
  if (!xml.includes(close)) throw new Error('Pandoc ODT has no office:styles section');
  const style = '<style:style style:name="CarvePageBreak" style:family="paragraph"><style:paragraph-properties fo:break-before="page"/></style:style>';
  files['styles.xml'] = strToU8(xml.replace(close, style + close));
  const ordered: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  if (files['mimetype']) ordered['mimetype'] = [files['mimetype'], { level: 0 }];
  for (const [name, bytes] of Object.entries(files)) if (name !== 'mimetype') ordered[name] = bytes;
  return Buffer.from(zipSync(ordered));
}
