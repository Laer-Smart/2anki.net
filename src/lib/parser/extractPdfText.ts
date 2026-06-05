import pdfParse from 'pdf-parse';

export interface PdfPage {
  text: string;
}

export interface PdfExtractionResult {
  pages: PdfPage[];
  pageCount: number;
  avgCharsPerPage: number;
  isDrmLocked: boolean;
  needsCredential: boolean;
}

const DRM_CHARS_PER_PAGE_THRESHOLD = 10;

function splitIntoPages(fullText: string, pageCount: number): PdfPage[] {
  if (!fullText.trim()) {
    return Array.from({ length: pageCount }, () => ({ text: '' }));
  }

  const chunks = fullText.split(/\f/).map((chunk) => chunk.trim());

  if (chunks.length >= pageCount) {
    return chunks.slice(0, pageCount).map((text) => ({ text }));
  }

  const lines = fullText.split(/\n/);
  const linesPerPage = Math.ceil(lines.length / pageCount);
  return Array.from({ length: pageCount }, (_, i) => ({
    text: lines
      .slice(i * linesPerPage, (i + 1) * linesPerPage)
      .join('\n')
      .trim(),
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

  let result;
  try {
    result =
      credential != null
        ? await pdfParse(buffer, { userPassword: credential } as Parameters<
            typeof pdfParse
          >[1])
        : await pdfParse(buffer);
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
    ? Array.from({ length: pageCount }, () => ({ text: '' }))
    : splitIntoPages(result.text, pageCount);

  console.info('[extractPdfText] result', {
    pageCount,
    avgCharsPerPage: Math.round(avgCharsPerPage),
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
