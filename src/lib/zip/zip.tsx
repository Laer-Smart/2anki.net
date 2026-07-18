import fs from 'fs';
import path from 'path';
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

// Binary entries (images, audio, misc media) are spilled to the workspace on
// disk during extraction and backed by a lazy read, so they no longer sit
// resident in memory — a deck of thousands of screenshots used to inflate the
// whole archive into RAM at once and OOM-crash the shared server (#3709/#3711).
// Only entries we KEEP in memory (decoded HTML/markdown text, the OCR html) are
// counted toward this heap ceiling; disk-backed media is bounded instead by the
// compressed-upload cap (`getUploadLimits().fileSize`). 4 GB of in-memory text
// leaves headroom under the 16 GB prod heap.
const MAX_IN_MEMORY_BYTES = 4 * 1024 * 1024 * 1024;

function formatGigabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Back a spilled entry with a lazy disk read so every consumer that reads
// `.contents` (embedFile, PrepareDeck converters, writeWorkspaceFile) still gets
// real bytes, but only one entry's bytes are resident at a time instead of all.
function makeDiskBackedFile(name: string, diskPath: string): File {
  const file: File = { name };
  Object.defineProperty(file, 'contents', {
    enumerable: true,
    configurable: true,
    get() {
      return fs.readFileSync(diskPath);
    },
  });
  return file;
}

class ZipHandler {
  files: File[];
  zipFileCount: number;
  maxZipFiles: number;
  combinedHTML: string;
  inMemoryBytes: number;
  maxInMemoryBytes: number;
  spillLocation?: string;

  constructor(
    maxNestedZipFiles: number,
    maxInMemoryBytes: number = MAX_IN_MEMORY_BYTES
  ) {
    this.files = [];
    this.zipFileCount = 0;
    this.maxZipFiles = maxNestedZipFiles;
    this.combinedHTML = '';
    this.inMemoryBytes = 0;
    this.maxInMemoryBytes = maxInMemoryBytes;
  }

  private trackInMemoryBytes(byteLength: number) {
    this.inMemoryBytes += byteLength;
    if (this.inMemoryBytes > this.maxInMemoryBytes) {
      throw new Error(
        `This upload is too large to process — it holds over ${formatGigabytes(
          this.maxInMemoryBytes
        )} of text in memory. Split it into smaller uploads and try again.`
      );
    }
  }

  // Write a binary entry to the workspace on disk and return a lazily-read File.
  // Returns undefined when there is no spill location (in-memory callers/tests).
  private spillToDisk(name: string, file: Uint8Array): File | undefined {
    if (this.spillLocation == null) return undefined;
    const base = path.resolve(this.spillLocation);
    const abs = path.resolve(base, name);
    if (abs !== base && !abs.startsWith(base + path.sep)) {
      console.warn('Skipped zip entry that escaped the spill directory');
      return undefined;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, file);
    return makeDiskBackedFile(name, abs);
  }

  async build(
    zipData: Uint8Array,
    paying: boolean,
    settings: CardOption,
    spillLocation?: string
  ) {
    this.spillLocation = spillLocation;
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

    if (isHTMLFile(name) || isMarkdownFile(name)) {
      this.trackInMemoryBytes(file.length);
      this.files.push({ name, contents: strFromU8(file) });
    } else if (paying && settings.imageQuizHtmlToAnki && isImageFile(name)) {
      this.trackInMemoryBytes(file.length);
      await this.convertAndAddImageToHTML(name, file);
    } else if (isPDFFile(name) && settings.processPDFs === false) {
      // Skip PDF processing when processPDFs is false
      return;
    } else {
      const spilled = this.spillToDisk(name, file);
      if (spilled) {
        this.files.push(spilled);
      } else {
        this.trackInMemoryBytes(file.length);
        this.files.push({ name, contents: file });
      }
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
