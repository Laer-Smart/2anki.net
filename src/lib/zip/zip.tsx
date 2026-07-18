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
import { MAX_OLD_GENERATION_SIZE_MB } from '../conversionMemoryLimits';

interface File {
  name: string;
  contents?: Buffer | Uint8Array | string;
}

// Conversion runs in a Piscina worker whose V8 old-generation heap is capped at
// MAX_OLD_GENERATION_SIZE_MB. Both ceilings below are derived from that cap so
// the friendly "too large" error fires BEFORE V8 kills the worker with
// ERR_WORKER_OUT_OF_MEMORY. The previous 4 GB literal sat far above the 1 GB
// worker cap, so it was dead code — the worker OOMed first (#3717).
const WORKER_OLD_GEN_BYTES = MAX_OLD_GENERATION_SIZE_MB * 1024 * 1024;

// Text we KEEP in memory (decoded HTML/markdown, the OCR html) is stored as
// UTF-16 strings — roughly 2× the counted byte length — so hold this ceiling to
// about half the worker old-gen cap to leave headroom for that overhead, the
// inflated archive map, and other allocations. Binary entries (images, audio,
// misc media) are spilled to disk and bounded instead by the compressed-upload
// cap (`getUploadLimits().fileSize`); they do not count here (#3709/#3711).
const MAX_IN_MEMORY_BYTES = Math.floor(WORKER_OLD_GEN_BYTES * 0.5);

// The whole archive is inflated into a { name: bytes } map by unzipSync before
// any entry spills to disk, so peak resident bytes during extraction equal the
// total DECOMPRESSED size. A highly-compressible zip bomb (DEFLATE of zeros,
// ~1000:1) under the compressed cap inflates to tens of GB and OOM-kills the
// worker; nested archives compound it. Bound the cumulative decompressed size
// below the worker cap, summing each entry's declared size from the central
// directory (which fflate also caps its own inflation at) BEFORE inflating, so a
// bomb aborts with the friendly error instead of crashing the worker (#3717).
const MAX_DECOMPRESSED_BYTES = Math.floor(WORKER_OLD_GEN_BYTES * 0.6);

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
  decompressedBytes: number;
  maxDecompressedBytes: number;
  spillLocation?: string;

  constructor(
    maxNestedZipFiles: number,
    maxInMemoryBytes: number = MAX_IN_MEMORY_BYTES,
    maxDecompressedBytes: number = MAX_DECOMPRESSED_BYTES
  ) {
    this.files = [];
    this.zipFileCount = 0;
    this.maxZipFiles = maxNestedZipFiles;
    this.combinedHTML = '';
    this.inMemoryBytes = 0;
    this.maxInMemoryBytes = maxInMemoryBytes;
    this.decompressedBytes = 0;
    this.maxDecompressedBytes = maxDecompressedBytes;
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

  // Sum each entry's declared decompressed size (shared across nested archives
  // via this instance counter) before fflate inflates it, so a zip bomb aborts
  // early instead of materializing the whole inflated map into the worker heap.
  private trackDecompressedBytes(originalSize: number) {
    this.decompressedBytes += originalSize;
    if (this.decompressedBytes > this.maxDecompressedBytes) {
      throw new Error(
        `This upload is too large to process — it decompresses to over ${formatGigabytes(
          this.maxDecompressedBytes
        )}. Split it into smaller uploads and try again.`
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
        filter: (file) => {
          if (isHiddenFileOrDirectory(file.name)) return false;
          this.trackDecompressedBytes(file.originalSize);
          return true;
        },
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

export { ZipHandler, File, MAX_IN_MEMORY_BYTES, MAX_DECOMPRESSED_BYTES };
