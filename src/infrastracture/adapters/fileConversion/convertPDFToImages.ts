import { writeFile } from 'fs/promises';
import path from 'path';
import Workspace from '../../../lib/parser/WorkSpace';
import { getPageCount } from '../../../lib/pdf/getPageCount';
import { convertPage } from '../../../lib/pdf/convertPage';
import { combineIntoHTML } from '../../../lib/pdf/combineIntoHTML';
import { existsSync } from 'fs';
import CardOption from '../../../lib/parser/Settings/CardOption';

interface ConvertPDFToImagesInput {
  workspace: Workspace;
  noLimits: boolean;
  contents?: Buffer | Uint8Array | string;
  name?: string;
  settings?: CardOption;
}

export const PDF_EXCEEDS_MAX_PAGE_LIMIT =
  'PDF exceeds maximum page limit of 100 for free and anonymous users.';

export async function convertPDFToImages(
  input: ConvertPDFToImagesInput
): Promise<string> {
  const { contents, workspace, noLimits, name, settings } = input;

  // Skip PDF processing if the option is disabled
  if (settings?.processPDFs === false) {
    return '';
  }
  const fileName = name
    ? path.basename(name).replace(/\.pptx?$/i, '.pdf')
    : 'Default.pdf';
  const pdfPath = path.join(workspace.location, fileName);

  if (!existsSync(pdfPath)) {
    await writeFile(pdfPath, Buffer.from(contents as Buffer));
  }

  const pageCount = await getPageCount(pdfPath);
  const title = path.basename(pdfPath);
  if (!noLimits && pageCount > 100) {
    throw new Error(PDF_EXCEEDS_MAX_PAGE_LIMIT);
  }

  const imagePaths = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      convertPage(pdfPath, i + 1, pageCount)
    )
  );

  return combineIntoHTML(imagePaths, title);
}
