import mammoth from 'mammoth';

import { preprocessDocxHTML } from './preprocessDocxHTML';
import { DocxImageMediaSink } from './docxImageMediaSink';

function buildImgElementConverter(mediaSink: DocxImageMediaSink) {
  return mammoth.images.imgElement(async (image) => {
    const bytes = await image.readAsBuffer();
    const fileName = mediaSink.write(bytes, image.contentType);
    return { src: fileName };
  });
}

export async function convertDocxToHTML(
  contents: Buffer,
  mediaSink?: DocxImageMediaSink
): Promise<string> {
  let result;
  try {
    const options = mediaSink
      ? { convertImage: buildImgElementConverter(mediaSink) }
      : undefined;
    result = await mammoth.convertToHtml({ buffer: contents }, options);
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
