import mammoth from 'mammoth';

import { preprocessDocxHTML } from './preprocessDocxHTML';

export async function convertDocxToHTML(contents: Buffer): Promise<string> {
  let result;
  try {
    result = await mammoth.convertToHtml({ buffer: contents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`docx_parse_failed: ${msg}`);
  }
  try {
    return preprocessDocxHTML(result.value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`docx_parse_failed: ${msg}`);
  }
}
