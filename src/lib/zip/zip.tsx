import { strFromU8, unzipSync } from 'fflate';
import { renderToStaticMarkup } from 'react-dom/server';
import { getUploadLimits } from '../misc/getUploadLimits';
import {
  isHiddenFileOrDirectory,
  isHTMLFile,
  isImageFile,
  isMarkdownFile,
  isPDFFile,
} from '../storage/checks';
import { processAndPrepareArchiveData } from './fallback/processAndPrepareArchiveData';
import { isSafeZipEntryName } from './isSafeZipEntryName';
import CardOption from '../parser/Settings';
import { getRandomUUID } from '../../shared/helpers/getRandomUUID';
import { convertImageToHTML } from '../../infrastracture/adapters/fileConversion/convertImageToHTML';

interface File {
  name: string;
  contents?: Buffer | Uint8Array | string;
}

// A zip passes the compressed-size check (`limits.fileSize`) yet can still
// decompress to many gigabytes of image bytes that all sit resident in memory
// at once — the whole archive is inflated up front and every entry is held in
// `this.files`. A single such upload OOM-crashed the shared server (#3709),
// which kills every *other* user's in-flight conversion on the process too.
// Cap the cumulative decompressed size (across nested zips) and fail closed
// with a clear, actionable error instead. The 16 GB heap on prod amplifies to
// ~3× during processing, so 4 GB decompressed leaves headroom.
const MAX_DECOMPRESSED_BYTES = 4 * 1024 * 1024 * 1024;

function formatGigabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

class ZipHandler {
  files: File[];
  zipFileCount: number;
  maxZipFiles: number;
  combinedHTML: string;
  decompressedBytes: number;
  maxDecompressedBytes: number;

  constructor(
    maxNestedZipFiles: number,
    maxDecompressedBytes: number = MAX_DECOMPRESSED_BYTES
  ) {
    this.files = [];
    this.zipFileCount = 0;
    this.maxZipFiles = maxNestedZipFiles;
    this.combinedHTML = '';
    this.decompressedBytes = 0;
    this.maxDecompressedBytes = maxDecompressedBytes;
  }

  private trackDecompressedBytes(byteLength: number) {
    this.decompressedBytes += byteLength;
    if (this.decompressedBytes > this.maxDecompressedBytes) {
      throw new Error(
        `This upload is too large to process — it decompresses to over ${formatGigabytes(
          this.maxDecompressedBytes
        )}. Split it into smaller uploads and try again.`
      );
    }
  }

  async build(zipData: Uint8Array, paying: boolean, settings: CardOption) {
    const size = Buffer.byteLength(zipData);
    const limits = getUploadLimits(paying);

    if (size > limits.fileSize) {
      throw new Error(
        renderToStaticMarkup(
          <>
            Your upload is too big, there is a max of {size} / $
            {limits.fileSize} currently.{' '}
            <a href="https://alemayhu.com/patreon">Become a patron</a> to remove
            default limit.
          </>
        )
      );
    }

    await this.processZip(zipData, paying, settings);
  }

  private async processZip(
    zipData: Uint8Array,
    paying: boolean,
    settings: CardOption
  ) {
    if (this.zipFileCount >= this.maxZipFiles) {
      throw new Error('Too many zip files in the upload.');
    }

    try {
      const loadedZip = unzipSync(zipData, {
        filter: (file) => !isHiddenFileOrDirectory(file.name),
      });

      let noSuffixCount = 0;
      const totalFiles = Object.keys(loadedZip).length;

      for (const name in loadedZip) {
        const file = loadedZip[name];
        if (!name.includes('.')) {
          noSuffixCount++;
        }
        await this.handleFile(name, file, paying, settings);
      }

      if (noSuffixCount === totalFiles) {
        throw new Error(
          'The zip file contains only files with no suffix. Supported file types are: .zip, .html, .csv, .md, .pdf, .ppt, and .pptx.'
        );
      }

      this.addCombinedHTMLToFiles(paying, settings);
    } catch (error: unknown) {
      await this.handleZipError(error, zipData, paying);
    }
  }

  private async handleFile(
    name: string,
    file: Uint8Array,
    paying: boolean,
    settings: CardOption
  ) {
    if (name.includes('__MACOSX/')) return;

    if (!isSafeZipEntryName(name)) {
      console.warn('Skipped zip entry with unsafe path of length', name.length);
      return;
    }

    if (name.endsWith('.zip')) {
      this.zipFileCount++;
      await this.processZip(file, paying, settings);
      return;
    }

    // Every non-zip entry below is retained in memory (as a Buffer, Uint8Array,
    // or decoded string). Count it toward the resident-payload ceiling before
    // holding onto it, so an oversized deck fails closed instead of OOMing.
    this.trackDecompressedBytes(file.length);

    if (isHTMLFile(name) || isMarkdownFile(name)) {
      this.files.push({ name, contents: strFromU8(file) });
    } else if (paying && settings.imageQuizHtmlToAnki && isImageFile(name)) {
      await this.convertAndAddImageToHTML(name, file);
    } else if (isPDFFile(name) && settings.processPDFs === false) {
      // Skip PDF processing when processPDFs is false
      return;
    } else {
      this.files.push({ name, contents: file });
    }
  }

  private async convertAndAddImageToHTML(name: string, file: Uint8Array) {
    const html = await convertImageToHTML(Buffer.from(file).toString('base64'));
    this.combinedHTML += html;
    console.log('Converted image to HTML:', name, html);
  }

  private addCombinedHTMLToFiles(paying: boolean, settings: CardOption) {
    if (this.combinedHTML && paying) {
      const finalHTML = `<!DOCTYPE html>
<html>
<head><title>${settings.deckName ?? 'Image Quiz'}</title></head>
<body>
${this.combinedHTML}
</body>
</html>`;
      this.files.push({
        name: `ocr-${getRandomUUID()}.html`,
        contents: finalHTML,
      });
    }
  }

  private async handleZipError(
    error: unknown,
    zipData: Uint8Array,
    paying: boolean
  ) {
    const isArchiveProcessingError = (error as { code?: number }).code === 13;

    if (isArchiveProcessingError) {
      const foundFiles = await processAndPrepareArchiveData(zipData, paying);
      this.files.push(...foundFiles);
      console.log('Processed files using fallback method:');
    } else {
      throw error;
    }
  }

  getFileNames() {
    return this.files.map((file) => file.name);
  }
}

export { ZipHandler, File };
