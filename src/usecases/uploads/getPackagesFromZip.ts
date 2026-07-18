import pLimit from 'p-limit';
import CardOption from '../../lib/parser/Settings/CardOption';
import { ZipHandler } from '../../lib/zip/zip';
import {
  PrepareDeck,
  prepareDeckInfoOnly,
  DeckInfoOnlyResult,
} from '../../infrastracture/adapters/fileConversion/PrepareDeck';
import Package from '../../lib/parser/Package';
import { PackageResult } from './GeneratePackagesUseCase';
import Workspace from '../../lib/parser/WorkSpace';
import { getMaxUploadCount } from '../../lib/misc/getMaxUploadCount';

import { isZipContentFileSupported } from './isZipContentFileSupported';
import { convertAnkiAppDecksFromZip } from './convertAnkiAppDecksFromZip';
import { getRelevantFiles } from './getRelevantFiles';
import { enableMarkdownForMarkdownUploads } from './enableMarkdownForMarkdownUploads';
import CardGenerator from '../../lib/anki/CardGenerator';
import { resolvePerWorkerPythonCap } from '../../lib/pythonWorkerBudget';
import {
  isPdfPasswordSentinel,
  parsePdfPasswordSentinel,
} from '../../lib/pdf/pdfPasswordSentinel';
import { buildLockedPdfWarning } from '../../lib/pdf/lockedPdfWarning';

const LOCKED_PDF = Symbol('locked-pdf');

interface LockedPdfEntry {
  marker: typeof LOCKED_PDF;
  filename: string;
}

function isLockedPdfEntry(value: unknown): value is LockedPdfEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as LockedPdfEntry).marker === LOCKED_PDF
  );
}

async function convertSkippingLockedPdf<T>(
  fileName: string,
  convert: () => Promise<T>
): Promise<T | LockedPdfEntry> {
  try {
    return await convert();
  } catch (error) {
    if (error instanceof Error && isPdfPasswordSentinel(error.message)) {
      return {
        marker: LOCKED_PDF,
        filename: parsePdfPasswordSentinel(error.message) ?? fileName,
      };
    }
    throw error;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function buildDeckBatch(
  fileNames: string[],
  zipHandler: ZipHandler,
  settings: CardOption,
  paying: boolean,
  workspace: Workspace
): Promise<{ packages: Package[]; warnings: string[]; lockedPdfs: string[] }> {
  const packages: Package[] = [];
  const warnings: string[] = [];

  const outcomes = await Promise.all(
    fileNames.map((fileName) => {
      const relevantFiles = getRelevantFiles(fileName, zipHandler.files);
      const deckSubWorkspace = Workspace.subdir(workspace.location);
      return convertSkippingLockedPdf(fileName, () =>
        prepareDeckInfoOnly(
          {
            name: fileName,
            files: relevantFiles,
            settings,
            noLimits: paying,
            workspace: deckSubWorkspace,
          },
          deckSubWorkspace,
          workspace
        )
      );
    })
  );

  const lockedPdfs: string[] = [];
  const preparedResults: DeckInfoOnlyResult[] = [];
  for (const outcome of outcomes) {
    if (isLockedPdfEntry(outcome)) {
      lockedPdfs.push(outcome.filename);
    } else {
      preparedResults.push(outcome);
    }
  }

  const batchEntries = preparedResults
    .filter((r) => !r.needsIndividualBuild)
    .map((r) => ({ input: r.deckInfoPath, output: r.outputPath }));

  const stragglers = preparedResults.filter((r) => r.needsIndividualBuild);

  if (batchEntries.length > 0) {
    const gen = new CardGenerator(workspace.location);
    const apkgPaths = await gen.runBatch(batchEntries);

    const batchResults = preparedResults.filter((r) => !r.needsIndividualBuild);
    batchResults.forEach((result, i) => {
      if (!apkgPaths[i]) return;
      packages.push(
        new Package(
          result.name,
          result.cardCount,
          result.mcqCount,
          result.mcqSkippedCount,
          result.droppedImageCount,
          result.emptyBackCount ?? 0,
          result.parsePath
        )
      );
      if (result.warning) warnings.push(result.warning);
    });
  }

  const stragglerOutcomes = await buildStragglerDecks(
    stragglers,
    zipHandler,
    settings,
    paying,
    workspace
  );
  packages.push(...stragglerOutcomes.packages);
  warnings.push(...stragglerOutcomes.warnings);
  lockedPdfs.push(...stragglerOutcomes.lockedPdfs);

  return { packages, warnings, lockedPdfs };
}

async function buildStragglerDecks(
  stragglers: { inputFileName: string }[],
  zipHandler: ZipHandler,
  settings: CardOption,
  paying: boolean,
  workspace: Workspace
): Promise<{ packages: Package[]; warnings: string[]; lockedPdfs: string[] }> {
  const packages: Package[] = [];
  const warnings: string[] = [];
  const lockedPdfs: string[] = [];

  for (const straggler of stragglers) {
    const relevantFiles = getRelevantFiles(
      straggler.inputFileName,
      zipHandler.files
    );
    const outcome = await convertSkippingLockedPdf(
      straggler.inputFileName,
      () =>
        PrepareDeck({
          name: straggler.inputFileName,
          files: relevantFiles,
          settings,
          noLimits: paying,
          workspace,
        })
    );
    if (isLockedPdfEntry(outcome)) {
      lockedPdfs.push(outcome.filename);
    } else if (outcome) {
      packages.push(
        new Package(
          outcome.name,
          outcome.cardCount ?? 0,
          outcome.mcqCount ?? 0,
          outcome.mcqSkippedCount ?? 0,
          outcome.droppedImageCount ?? 0,
          outcome.emptyBackCount ?? 0,
          outcome.parsePath
        )
      );
      if (outcome.warning) warnings.push(outcome.warning);
    }
  }

  return { packages, warnings, lockedPdfs };
}

async function buildClaudeFlashcardDeck(
  rootName: string,
  zipHandler: ZipHandler,
  settings: CardOption,
  paying: boolean,
  workspace: Workspace,
  onProgress: ((step: string) => void) | undefined,
  userId: number | null
): Promise<PackageResult> {
  const deck = await PrepareDeck({
    name: rootName,
    files: zipHandler.files,
    settings,
    noLimits: paying,
    workspace,
    onProgress,
    userId,
  });

  const packages: Package[] = [];
  const warnings: string[] = [];
  if (deck) {
    packages.push(
      new Package(
        deck.name,
        deck.cardCount ?? 0,
        deck.mcqCount ?? 0,
        deck.mcqSkippedCount ?? 0,
        deck.droppedImageCount ?? 0,
        deck.emptyBackCount ?? 0,
        deck.parsePath
      )
    );
    if (deck.warning) warnings.push(deck.warning);
  }
  return { packages, warnings };
}

async function buildAllInOneSlot(
  supportedFileNames: string[],
  zipHandler: ZipHandler,
  settings: CardOption,
  paying: boolean,
  workspace: Workspace,
  cap: number
): Promise<PackageResult> {
  const limit = pLimit(cap);
  const outcomes = await Promise.all(
    supportedFileNames.map((fileName) =>
      limit(() => {
        const relevantFiles = getRelevantFiles(fileName, zipHandler.files);
        return convertSkippingLockedPdf(fileName, () =>
          PrepareDeck({
            name: fileName,
            files: relevantFiles,
            settings,
            noLimits: paying,
            workspace,
          })
        );
      })
    )
  );

  const packages: Package[] = [];
  const warnings: string[] = [];
  const lockedPdfs: string[] = [];
  for (const outcome of outcomes) {
    if (isLockedPdfEntry(outcome)) {
      lockedPdfs.push(outcome.filename);
    } else if (outcome) {
      packages.push(
        new Package(
          outcome.name,
          outcome.cardCount ?? 0,
          outcome.mcqCount ?? 0,
          outcome.mcqSkippedCount ?? 0,
          outcome.droppedImageCount ?? 0,
          outcome.emptyBackCount ?? 0,
          outcome.parsePath
        )
      );
      if (outcome.warning) warnings.push(outcome.warning);
    }
  }
  appendLockedPdfWarning(warnings, lockedPdfs);
  return { packages, warnings };
}

function appendLockedPdfWarning(warnings: string[], lockedPdfs: string[]) {
  const lockedWarning = buildLockedPdfWarning(lockedPdfs);
  if (lockedWarning) warnings.push(lockedWarning);
}

export const getPackagesFromZip = async (
  fileContents: Buffer | Uint8Array | string | undefined,
  paying: boolean,
  settings: CardOption,
  workspace: Workspace,
  onProgress?: (step: string) => void,
  userId: number | null = null
): Promise<PackageResult> => {
  if (!fileContents) {
    return { packages: [] };
  }

  const zipHandler = new ZipHandler(getMaxUploadCount(paying));
  await zipHandler.build(
    fileContents as Uint8Array,
    paying,
    settings,
    workspace.location
  );

  const ankiAppResult = await convertAnkiAppDecksFromZip(
    zipHandler.files,
    workspace
  );
  if (ankiAppResult) {
    return ankiAppResult;
  }

  const fileNames = zipHandler.getFileNames();
  const supportedFileNames = fileNames.filter(isZipContentFileSupported);
  const effectiveSettings = enableMarkdownForMarkdownUploads(
    fileNames,
    settings
  );

  if (effectiveSettings.claudeAIFlashcards && paying && fileNames.length > 0) {
    return buildClaudeFlashcardDeck(
      fileNames[0],
      zipHandler,
      effectiveSettings,
      paying,
      workspace,
      onProgress,
      userId
    );
  }

  const cap = resolvePerWorkerPythonCap();
  const batchSize = Math.ceil(supportedFileNames.length / cap);

  if (supportedFileNames.length <= 1 || batchSize <= 1) {
    return buildAllInOneSlot(
      supportedFileNames,
      zipHandler,
      effectiveSettings,
      paying,
      workspace,
      cap
    );
  }

  const chunks = chunkArray(supportedFileNames, batchSize);
  const limit = pLimit(cap);

  const batchResults = await Promise.all(
    chunks.map((chunk) =>
      limit(() =>
        buildDeckBatch(chunk, zipHandler, effectiveSettings, paying, workspace)
      )
    )
  );

  const packages: Package[] = [];
  const warnings: string[] = [];
  const lockedPdfs: string[] = [];
  for (const result of batchResults) {
    packages.push(...result.packages);
    if (result.warnings) warnings.push(...result.warnings);
    lockedPdfs.push(...result.lockedPdfs);
  }
  appendLockedPdfWarning(warnings, lockedPdfs);

  return { packages, warnings };
};
