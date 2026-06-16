import pdfParse from 'pdf-parse';

export interface PdfPage {
  text: string;
  imagePaintCount: number;
}

export interface PdfExtractionResult {
  pages: PdfPage[];
  pageCount: number;
  avgCharsPerPage: number;
  isDrmLocked: boolean;
  needsCredential: boolean;
}

const DRM_CHARS_PER_PAGE_THRESHOLD = 10;
const PDFJS_BUILD = 'v1.10.100';

const RASTER_IMAGE_OPS = [
  'paintImageXObject',
  'paintJpegXObject',
  'paintInlineImageXObject',
  'paintInlineImageXObjectGroup',
  'paintImageXObjectRepeat',
];

interface PdfJsOps {
  [opName: string]: number;
}

interface PdfJsModule {
  OPS?: PdfJsOps;
  disableFontFace?: boolean;
}

// pdf.js binds web fonts through a FontLoader that reaches for the browser
// `document` global. In Node that throws `ReferenceError: document is not
// defined` on every page render — harmless to extraction but it floods the
// logs. Disabling font face skips the rule-insertion path entirely.
function loadPdfJs(): PdfJsModule | null {
  try {
    const pdfjs = require(
      `pdf-parse/lib/pdf.js/${PDFJS_BUILD}/build/pdf.js`
    ) as PdfJsModule;
    pdfjs.disableFontFace = true;
    return pdfjs;
  } catch {
    return null;
  }
}

interface PdfJsPageProxy {
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: Array<{ str: string; transform: number[] }> }>;
  getOperatorList(): Promise<{ fnArray: number[] }>;
}

function resolveRasterImageOpcodes(): Set<number> {
  const opcodes = new Set<number>();
  const ops = loadPdfJs()?.OPS;
  if (ops == null) return opcodes;
  for (const name of RASTER_IMAGE_OPS) {
    const code = ops[name];
    if (typeof code === 'number') opcodes.add(code);
  }
  return opcodes;
}

const RASTER_IMAGE_OPCODES = resolveRasterImageOpcodes();

function extractPageText(textContent: {
  items: Array<{ str: string; transform: number[] }>;
}): string {
  let lastY: number | undefined;
  let text = '';
  for (const item of textContent.items) {
    if (lastY === item.transform[5] || lastY == null) {
      text += item.str;
    } else {
      text += '\n' + item.str;
    }
    lastY = item.transform[5];
  }
  return text;
}

async function countImagePaintOps(page: PdfJsPageProxy): Promise<number> {
  if (RASTER_IMAGE_OPCODES.size === 0) return 0;
  try {
    const operatorList = await page.getOperatorList();
    return operatorList.fnArray.filter((code) => RASTER_IMAGE_OPCODES.has(code))
      .length;
  } catch {
    return 0;
  }
}

function splitIntoPages(
  fullText: string,
  pageCount: number,
  imageCounts: number[]
): PdfPage[] {
  const imageAt = (index: number) => imageCounts[index] ?? 0;

  if (!fullText.trim()) {
    return Array.from({ length: pageCount }, (_, i) => ({
      text: '',
      imagePaintCount: imageAt(i),
    }));
  }

  const chunks = fullText.split(/\f/).map((chunk) => chunk.trim());

  if (chunks.length >= pageCount) {
    return chunks
      .slice(0, pageCount)
      .map((text, i) => ({ text, imagePaintCount: imageAt(i) }));
  }

  const lines = fullText.split(/\n/);
  const linesPerPage = Math.ceil(lines.length / pageCount);
  return Array.from({ length: pageCount }, (_, i) => ({
    text: lines
      .slice(i * linesPerPage, (i + 1) * linesPerPage)
      .join('\n')
      .trim(),
    imagePaintCount: imageAt(i),
  }));
}

function isPasswordException(error: unknown): boolean {
  return error instanceof Error && error.name === 'PasswordException';
}

export async function extractPdfText(
  buffer: Buffer,
  credential?: string
): Promise<PdfExtractionResult> {
  const t0 = Date.now();

  const imageCounts: number[] = [];

  const pagerender = async (pageData: PdfJsPageProxy): Promise<string> => {
    const textContent = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    imageCounts.push(await countImagePaintOps(pageData));
    return extractPageText(textContent) + '\f';
  };

  const credentialOption =
    credential == null ? {} : { userPassword: credential };
  const options = {
    pagerender,
    version: PDFJS_BUILD,
    ...credentialOption,
  } as Parameters<typeof pdfParse>[1];

  let result;
  try {
    result = await pdfParse(buffer, options);
  } catch (error) {
    if (isPasswordException(error)) {
      console.info('[extractPdfText] password-protected PDF detected', {
        credentialProvided: credential != null,
        durationMs: Date.now() - t0,
      });
      return {
        pages: [],
        pageCount: 0,
        avgCharsPerPage: 0,
        isDrmLocked: false,
        needsCredential: true,
      };
    }
    throw error;
  }

  const pageCount = result.numpages;
  const totalChars = result.text.length;
  const avgCharsPerPage = pageCount > 0 ? totalChars / pageCount : 0;
  const isDrmLocked = avgCharsPerPage < DRM_CHARS_PER_PAGE_THRESHOLD;
  const pages = isDrmLocked
    ? Array.from({ length: pageCount }, (_, i) => ({
        text: '',
        imagePaintCount: imageCounts[i] ?? 0,
      }))
    : splitIntoPages(result.text, pageCount, imageCounts);

  const pagesWithImage = pages.filter((p) => p.imagePaintCount > 0).length;

  console.info('[extractPdfText] result', {
    pageCount,
    avgCharsPerPage: Math.round(avgCharsPerPage),
    pagesWithImage,
    isDrmLocked,
    credentialProvided: credential != null,
    durationMs: Date.now() - t0,
  });

  return {
    pages,
    pageCount,
    avgCharsPerPage,
    isDrmLocked,
    needsCredential: false,
  };
}
