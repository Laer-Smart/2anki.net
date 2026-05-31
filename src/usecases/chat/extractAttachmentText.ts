import { strFromU8, unzipSync } from 'fflate';
import * as cheerio from 'cheerio';

import type { ChatAttachment } from './buildAttachmentBlocks';
import { convertDocxToHTML } from '../../infrastracture/adapters/fileConversion/convertDocxToHTML';
import { isHiddenFileOrDirectory, isHTMLFile, isMarkdownFile } from '../../lib/storage/checks';

export const ZIP_MIME = 'application/zip';
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MARKDOWN_MIME = 'text/markdown';
export const PLAIN_TEXT_MIME = 'text/plain';

export const TEXT_EXTRACTABLE_MIMES = new Set<string>([
  ZIP_MIME,
  DOCX_MIME,
  MARKDOWN_MIME,
  PLAIN_TEXT_MIME,
]);

export const MAX_TEXT_PER_FILE = 50_000;
export const MAX_TEXT_TOTAL = 200_000;
const TRUNCATION_MARKER = '\n[…truncated]';

export interface ExtractedAttachmentText {
  fileName: string;
  text: string;
}

export function isTextExtractableMime(mimeType: string): boolean {
  return TEXT_EXTRACTABLE_MIMES.has(mimeType);
}

function isUnsafeZipEntryName(name: string): boolean {
  if (name.startsWith('/') || name.startsWith('\\')) return true;
  if (/^[A-Za-z]:[\\/]/.test(name)) return true;
  const segments = name.split(/[\\/]/);
  return segments.includes('..');
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style').remove();
  return $.root().text().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function readZipEntryText(name: string, bytes: Uint8Array): string | null {
  if (isHTMLFile(name)) return htmlToText(strFromU8(bytes));
  if (isMarkdownFile(name)) return strFromU8(bytes);
  return null;
}

function extractZipText(data: Buffer): string {
  const loadedZip = unzipSync(new Uint8Array(data), {
    filter: (file) =>
      !isHiddenFileOrDirectory(file.name) && !isUnsafeZipEntryName(file.name),
  });

  const parts: string[] = [];
  let collected = 0;
  for (const name of Object.keys(loadedZip)) {
    if (collected >= MAX_TEXT_PER_FILE) break;
    if (isUnsafeZipEntryName(name) || name.includes('__MACOSX/')) continue;
    const text = readZipEntryText(name, loadedZip[name]);
    if (text == null) continue;
    parts.push(text);
    collected += text.length;
  }
  return parts.join('\n\n').trim();
}

async function extractOne(attachment: ChatAttachment): Promise<string> {
  switch (attachment.mimeType) {
    case ZIP_MIME:
      return extractZipText(attachment.data);
    case DOCX_MIME:
      return htmlToText(await convertDocxToHTML(attachment.data));
    case MARKDOWN_MIME:
    case PLAIN_TEXT_MIME:
      return attachment.data.toString('utf8');
    default:
      return '';
  }
}

function capText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + TRUNCATION_MARKER;
}

export async function extractAttachmentText(
  attachments: ChatAttachment[]
): Promise<ExtractedAttachmentText[]> {
  const out: ExtractedAttachmentText[] = [];
  let totalBudget = MAX_TEXT_TOTAL;

  for (const attachment of attachments) {
    if (!isTextExtractableMime(attachment.mimeType)) continue;
    if (totalBudget <= 0) break;

    const raw = (await extractOne(attachment)).trim();
    if (raw.length === 0) continue;

    const perFileCap = Math.min(MAX_TEXT_PER_FILE, totalBudget);
    const text = capText(raw, perFileCap);
    totalBudget -= text.length;

    out.push({
      fileName: attachment.fileName ?? 'attachment',
      text,
    });
  }

  return out;
}

export function buildAttachmentTextBlock(extracted: ExtractedAttachmentText[]): string {
  if (extracted.length === 0) return '';
  return extracted
    .map((file) => `<file name="${file.fileName}">\n${file.text}\n</file>`)
    .join('\n\n');
}
