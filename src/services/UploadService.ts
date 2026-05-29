import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

import { IUploadRepository } from '../data_layer/UploadRespository';
import JobRepository from '../data_layer/JobRepository';
import ErrorHandler from '../routes/middleware/ErrorHandler';
import CardOption from '../lib/parser/Settings';
import Workspace from '../lib/parser/WorkSpace';
import StorageHandler from '../lib/storage/StorageHandler';
import { UploadedFile } from '../lib/storage/types';
import GeneratePackagesUseCase from '../usecases/uploads/GeneratePackagesUseCase';
import { toText } from './NotionService/BlockHandler/helpers/deckNameToText';
import { isPaying } from '../lib/isPaying';
import { isLimitError } from '../lib/misc/isLimitError';
import { handleUploadLimitError } from '../controllers/Upload/helpers/handleUploadLimitError';
import { getUploadValidationError } from '../lib/upload/getUploadValidationError';
import { EmptyDeckError } from '../usecases/jobs/EmptyDeckError';
import { DeckTooLargeError } from '../lib/parser/exporters/DeckTooLargeError';
import { getOwner } from '../lib/User/getOwner';
import { generateDeckInfo, DeckInfo, ClaudeParseError } from '../lib/claude/ClaudeService';
import CustomExporter from '../lib/parser/exporters/CustomExporter';
import Deck from '../lib/parser/Deck';
import { isHTMLFile, isMarkdownFile } from '../lib/storage/checks';
import { FileSizeInMegaBytes } from '../lib/misc/file';
import { track } from './events/track';
import {
  isPdfPasswordSentinel,
  parsePdfPasswordSentinel,
} from '../lib/pdf/pdfPasswordSentinel';

interface EmptyDeckResponse {
  code: 'empty_export';
  message: string;
  filename: string;
  docsLink: string;
}

interface DeckTooLargeResponse {
  message: string;
}

function walkHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkHtmlFiles(full));
    } else if (isHTMLFile(entry.name) || isMarkdownFile(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function walkMediaFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMediaFiles(full));
    } else if (!isHTMLFile(entry.name) && !isMarkdownFile(entry.name) && !entry.name.endsWith('.apkg')) {
      results.push(entry.name);
    }
  }
  return results;
}

function logNoPackageDiagnostics(uploadedFiles: UploadedFile[]) {
  console.info('[no-package] Zero packages produced. File diagnostics:');
  for (const file of uploadedFiles ?? []) {
    console.info(`  name=${file.originalname} mimetype=${file.mimetype} size=${file.size}`);
    try {
      const contents = file.path ? fs.readFileSync(file.path) : file.buffer;
      if (!contents) {
        console.info('  no file contents available for diagnostics');
        continue;
      }
      const head = contents.slice(0, 1000).toString('utf8');
      const hasDisplayContents = head.includes('display:contents');
      const hasToggleClass = head.includes('class="toggle"');
      const hasDetails = head.includes('<details');
      console.info(`  snippet=${JSON.stringify(head.slice(0, 300))}`);
      console.info(`  display:contents=${hasDisplayContents} .toggle=${hasToggleClass} <details=${hasDetails}`);
    } catch (readErr) {
      console.error(`  could not read file: ${readErr}`);
    }
  }
}

class UploadService {
  getUploadsByOwner(owner: number) {
    return this.uploadRepository.getUploadsByOwner(owner);
  }

  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly jobRepository: JobRepository
  ) {}

  async restartClaudeJob(req: express.Request, res: express.Response) {
    const owner = String(getOwner(res));
    const { jobId } = req.params;
    const job = await this.jobRepository.findJobById(jobId, owner);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const workspaceDir = path.join(process.env.WORKSPACE_BASE as string, job.object_id);
    if (!fs.existsSync(workspaceDir)) {
      res.status(409).json({ error: 'Workspace files are no longer available' });
      return;
    }

    await this.jobRepository.updateJobStatus(job.object_id, owner, 'started');

    this.runClaudeRestart(job.object_id, owner, workspaceDir, async (step) => {
      await this.jobRepository.updateJobStatus(job.object_id, owner, step);
    }).catch(async (err: Error) => {
      await this.jobRepository.updateJobStatus(job.object_id, owner, 'failed', err.message);
    });

    res.status(202).json({ jobId: job.object_id });
  }

  private async promoteClaudeJobToUpload(objectId: string, workspaceDir: string, owner: string): Promise<void> {
    const files = await fs.promises.readdir(workspaceDir);
    const apkgFilename = files.find((f) => f.endsWith('.apkg'));
    if (!apkgFilename) {
      throw new Error('No APKG file found in workspace');
    }
    await this.jobRepository.updateJobStatus(objectId, owner, 'step3_building_deck', '');
    const apkgPath = path.join(workspaceDir, apkgFilename);
    const apkgBuffer = await fs.promises.readFile(apkgPath);
    const storage = new StorageHandler();
    const key = storage.uniqify(objectId, owner, 200, 'apkg');
    await storage.uploadFile(key, apkgBuffer);
    const sizeMb = FileSizeInMegaBytes(apkgPath);
    await this.uploadRepository.update(Number(owner), apkgFilename, key, sizeMb);
    const job = await this.jobRepository.findJobById(objectId, owner);
    if (job) {
      await this.jobRepository.deleteJob(String(job.id), owner);
    }
  }

  private async runClaudeRestart(
    objectId: string,
    owner: string,
    workspaceDir: string,
    onProgress: (step: string) => Promise<void>
  ) {
    const htmlFiles = walkHtmlFiles(workspaceDir);
    const mediaFiles = walkMediaFiles(workspaceDir);

    if (htmlFiles.length === 0) {
      throw new Error('No HTML files found in workspace');
    }

    const deckInfoArrays: DeckInfo[][] = [];
    for (const htmlFile of htmlFiles) {
      const content = await fs.promises.readFile(htmlFile, 'utf8');
      const deckInfo = await generateDeckInfo(content, mediaFiles, undefined, onProgress);
      deckInfoArrays.push(deckInfo);
    }

    const deckInfo = deckInfoArrays.flat().filter((d) => d.cards.length > 0);
    if (deckInfo.length === 0) {
      throw new Error('No packages produced');
    }

    const deckName = deckInfo[0].name;
    const exporter = new CustomExporter(deckName, workspaceDir);
    exporter.configure(deckInfo as unknown as Deck[]);
    await exporter.save();

    await this.promoteClaudeJobToUpload(objectId, workspaceDir, owner);
  }

  async deleteUpload(owner: number, key: string) {
    const upload = await this.uploadRepository.findByKey(owner, key);
    const s = new StorageHandler();
    await this.uploadRepository.deleteUpload(owner, key);
    await s.delete(key);
    if (upload?.object_id) {
      await this.jobRepository.deleteJobByObjectId(
        upload.object_id,
        String(owner)
      );
    }
  }

  async handleUpload(req: express.Request, res: express.Response) {
    try {
      const validationError = getUploadValidationError(req.files as UploadedFile[]);
      if (validationError) {
        res.status(400).contentType('text/plain').send(validationError.message);
        return;
      }

      const settings = new CardOption(req.body || {});
      const ws = new Workspace(true, 'fs');
      const owner = getOwner(res);
      const paying = isPaying(res.locals);

      if (owner && settings.claudeAIFlashcards) {
        return await this.handleAsyncUpload(req, res, settings, ws, String(owner), paying);
      }

      return await this.handleSyncUpload(req, res, settings, ws, paying);
    } catch (err) {
      if (isLimitError(err as Error)) {
        handleUploadLimitError(req, res);
      } else if (err instanceof EmptyDeckError) {
        const files = req.files as UploadedFile[] | undefined;
        const filename = files?.[0]?.originalname ?? 'your file';
        const body: EmptyDeckResponse = {
          code: 'empty_export',
          message:
            'No cards were found in this file. Most files need a toggle-list (Notion) or a question/answer pair to become cards. See common problems for the formats that work.',
          filename,
          docsLink: '/documentation/help/common-problems',
        };
        return res.status(400).json(body);
      } else if (err instanceof DeckTooLargeError) {
        const body: DeckTooLargeResponse = {
          message: 'This export is too large to process in one go. Try splitting it into smaller pages, removing embedded images, or enabling Claude AI in settings to process it in chunks.',
        };
        return res.status(400).json(body);
      } else if (err instanceof Error && isPdfPasswordSentinel(err.message)) {
        const filename = parsePdfPasswordSentinel(err.message) ?? 'your file';
        return res.status(400).json({
          error: 'needs_password',
          reason: 'missing_password',
          filename,
        });
      } else if (err instanceof Error && /^pdfinfo_(failed|spawn_failed)/.test(err.message)) {
        return res.status(400).json({
          code: 'pdf_processing_failed',
          message:
            'We could not read this PDF. It may be corrupted, password-protected, or an unsupported variant. Try re-exporting the PDF or splitting it into smaller files.',
        });
      } else if (err instanceof Error && /^docx_parse_failed/.test(err.message)) {
        return res.status(400).json({
          code: 'docx_processing_failed',
          message:
            "We couldn't read this .docx. It may have been renamed from another format. Try re-exporting it from Word or Google Docs.",
        });
      } else {
        return ErrorHandler(res, req, err as Error);
      }
    }
  }

  private async handleAsyncUpload(
    req: express.Request,
    res: express.Response,
    settings: CardOption,
    ws: Workspace,
    owner: string,
    paying: boolean
  ) {
    const files = req.files as UploadedFile[];
    const title = files.length === 1 ? files[0].originalname : `${files.length} files`;
    await this.jobRepository.create(ws.id, owner, title, 'claude');

    const useCase = new GeneratePackagesUseCase();
    useCase
      .execute(paying, req.files as UploadedFile[], settings, ws, async (step) => {
        await this.jobRepository.updateJobStatus(ws.id, owner, step);
      })
      .then(async ({ packages }) => {
        if (packages.length > 0) {
          await this.promoteClaudeJobToUpload(ws.id, ws.location, owner);
        } else {
          logNoPackageDiagnostics(req.files as UploadedFile[]);
          await this.jobRepository.updateJobStatus(ws.id, owner, 'failed', 'No packages produced');
        }
      })
      .catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        const isExpectedState =
          err instanceof EmptyDeckError ||
          err instanceof ClaudeParseError ||
          (err instanceof Error && isPdfPasswordSentinel(err.message)) ||
          (err instanceof Error && /^docx_parse_failed/.test(err.message));
        if (isExpectedState) {
          console.info('[UploadService] async job user-input state', {
            jobId: ws.id,
            kind: err instanceof Error ? err.name : 'unknown',
          });
        } else {
          console.error('[UploadService] async job failed', { jobId: ws.id, message, err });
        }
        await this.jobRepository.updateJobStatus(ws.id, owner, 'failed', message);
      });

    return res.status(202).json({ jobId: ws.id });
  }

  private async handleSyncUpload(
    req: express.Request,
    res: express.Response,
    settings: CardOption,
    ws: Workspace,
    paying: boolean
  ) {
    const useCase = new GeneratePackagesUseCase();
    const { packages, warnings } = await useCase.execute(
      paying,
      req.files as UploadedFile[],
      settings,
      ws
    );

    const first = packages[0];
    if (packages.length === 1) {
      const apkg = await ws.getFirstAPKG();
      if (!apkg) {
        const name = first ? first.name : 'untitled';
        throw new Error(`Could not produce APKG for ${name}`);
      }
      const plen = Buffer.byteLength(apkg);
      const totalCards = packages.reduce(
        (sum, p) => sum + (p.cardCount ?? 0),
        0
      );
      const totalMcqCount = packages.reduce((sum, p) => sum + (p.mcqCount ?? 0), 0);
      const totalMcqSkippedCount = packages.reduce((sum, p) => sum + (p.mcqSkippedCount ?? 0), 0);
      res.set('Content-Type', 'application/apkg');
      res.set('Content-Length', plen.toString());
      res.set('X-Card-Count', totalCards.toString());
      res.set('X-MCQ-Count', totalMcqCount.toString());
      res.set('X-MCQ-Skipped-Count', totalMcqSkippedCount.toString());
      const exposedHeaders = ['File-Name', 'X-Card-Count', 'X-MCQ-Count', 'X-MCQ-Skipped-Count'];
      if (warnings?.includes('markdown-heuristic')) {
        res.set(
          'X-Warning',
          'Your Markdown file was processed using heuristic detection. For reliable results, use the nested bullet format or enable Claude AI in settings.'
        );
        exposedHeaders.push('X-Warning');
      }
      res.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      first.name = toText(first.name);
      try {
        res.set('File-Name', encodeURIComponent(first.name));
      } catch (err) {
        console.info(`failed to set name ${first.name}`);
        console.error(err);
      }
      res.attachment(`/${first.name}`);
      const uploadSource = this.resolveUploadSource(req);
      const bucket = this.toCardCountBucket(totalCards);
      const userId = getOwner(res);
      track('conversion_succeeded', {
        userId: userId != null ? Number(userId) : null,
        props: { source: uploadSource, card_count_bucket: bucket },
      });
      return res.status(200).send(apkg);
    } else if (packages.length > 1) {
      const url = `/download/${ws.id}`;
      res.status(300);
      return res.redirect(url);
    } else {
      logNoPackageDiagnostics(req.files as UploadedFile[]);
      throw new EmptyDeckError();
    }
  }

  private resolveUploadSource(req: express.Request): 'upload' | 'google_drive' {
    if (req.path?.includes('google_drive')) return 'google_drive';
    return 'upload';
  }

  private toCardCountBucket(count: number): '<50' | '50-499' | '500+' {
    if (count < 50) return '<50';
    if (count < 500) return '50-499';
    return '500+';
  }
}

export default UploadService;
