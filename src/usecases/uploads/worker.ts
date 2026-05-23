import { parentPort, workerData } from 'worker_threads';
import { UploadedFile } from '../../lib/storage/types';
import CardOption from '../../lib/parser/Settings/CardOption';
import Package from '../../lib/parser/Package';
import fs from 'fs';
import { PrepareDeck } from '../../infrastracture/adapters/fileConversion/PrepareDeck';
import {
  isImageFile,
  isCompressedFile,
  isPPTFile,
  isDocxFile,
} from '../../lib/storage/checks';
import { getPackagesFromZip } from './getPackagesFromZip';
import Workspace from '../../lib/parser/WorkSpace';
import { isZipContentFileSupported } from './isZipContentFileSupported';

interface GenerationData {
  paying: boolean;
  files: UploadedFile[];
  settings: CardOption;
  workspace: Workspace;
}

export function getFileContents(file: UploadedFile): Buffer {
  if (!file.path) {
    if (file.buffer == null) {
      throw new Error('Uploaded file has neither a path nor a buffer');
    }
    return Buffer.from(file.buffer);
  }

  try {
    if (fs.existsSync(file.path)) {
      return fs.readFileSync(file.path);
    }
  } catch (error) {
    throw new Error(`Error reading file at path: ${file.path}: ${String(error)}`);
  }

  if (file.buffer == null) {
    throw new Error('Uploaded file is no longer available on disk and has no buffer fallback');
  }
  return Buffer.from(file.buffer);
}

interface FileResult {
  packages: Package[];
  warnings: string[];
}

async function processFile(
  file: UploadedFile,
  fileContents: Buffer,
  paying: boolean,
  settings: CardOption,
  workspace: Workspace,
  onProgress: (step: string) => void
): Promise<FileResult> {
  const packages: Package[] = [];
  const warnings: string[] = [];
  const filename = file.originalname;
  const key = file.key;

  const allowImageQuizHtmlToAnki =
    paying && settings.imageQuizHtmlToAnki && isImageFile(filename);
  const isValidSingleFile =
    isZipContentFileSupported(filename) ||
    isPPTFile(filename) ||
    allowImageQuizHtmlToAnki ||
    isDocxFile(filename);

  if (isValidSingleFile) {
    const d = await PrepareDeck({
      name: filename,
      files: [{ name: filename, contents: fileContents }],
      settings,
      noLimits: paying,
      workspace,
      onProgress,
    });

    if (d) {
      packages.push(new Package(d.name, d.cardCount ?? 0, d.mcqCount ?? 0, d.mcqSkippedCount ?? 0));
      if (d.warning) warnings.push(d.warning);
    }
  } else if (isCompressedFile(filename) || isCompressedFile(key)) {
    const result = await getPackagesFromZip(
      fileContents,
      paying,
      settings,
      workspace,
      onProgress
    );
    packages.push(...result.packages);
    if (result.warnings) warnings.push(...result.warnings);
  }

  return { packages, warnings };
}

async function doGenerationWork(data: GenerationData) {
  const { paying, files, settings, workspace } = data;
  let packages: Package[] = [];
  const warnings: string[] = [];

  const onProgress = (step: string) => {
    parentPort?.postMessage({ type: 'progress', step });
  };

  for (const file of files) {
    const fileContents = getFileContents(file);
    const result = await processFile(
      file,
      fileContents,
      paying,
      settings,
      workspace,
      onProgress
    );
    packages = packages.concat(result.packages);
    warnings.push(...result.warnings);
  }

  return { type: 'result', packages, warnings };
}

if (workerData != null) {
  doGenerationWork(workerData.data)
    .then((result) => parentPort?.postMessage(result))
    .catch((err) => parentPort?.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
}
