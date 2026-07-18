import express from 'express';

import { McpToolsService, UploadEntrypoint } from './McpToolsService';
import { JobWithDownloadKey } from '../../data_layer/JobRepository';
import ApkgPreviewService from '../ApkgPreviewService/ApkgPreviewService';
import DownloadService from '../DownloadService';
import type StorageHandler from '../../lib/storage/StorageHandler';

function makeService(overrides: {
  jobs?: JobWithDownloadKey[];
  uploadEntry?: UploadEntrypoint;
  getFileBody?: DownloadService['getFileBody'];
  preview?: Partial<ApkgPreviewService>;
}) {
  const jobLister = {
    getJobsByOwner: jest.fn(async () => overrides.jobs ?? []),
  };
  const downloadService = {
    getFileBody: overrides.getFileBody ?? jest.fn(async () => null),
  } as unknown as DownloadService;
  const previewService = {
    parse: jest.fn(async () => ({}) as never),
    getMeta: jest.fn(() => ({
      totalCards: 3,
      decks: [{ id: 1, fullName: 'Bio', path: ['Bio'], cardCount: 3 }],
    })),
    getCardsPage: jest.fn(() => ({
      cards: [{ front: 'Q', back: 'A' }],
      nextCursor: null,
      total: 3,
    })),
    ...overrides.preview,
  } as unknown as ApkgPreviewService;
  const uploadEntry =
    overrides.uploadEntry ??
    ((_req: express.Request, res: express.Response) => {
      res.status(200);
    });
  const service = new McpToolsService(
    jobLister,
    downloadService,
    previewService,
    uploadEntry,
    {} as unknown as StorageHandler
  );
  return { service, jobLister, downloadService };
}

describe('McpToolsService.listMyDecks', () => {
  it('maps jobs to owner-scoped summaries with download URLs', async () => {
    const { service } = makeService({
      jobs: [
        {
          object_id: 'job-1',
          title: 'Pharmacology',
          status: 'done',
          created_at: new Date('2026-07-18T00:00:00.000Z'),
          download_key: 'k1',
        } as unknown as JobWithDownloadKey,
        {
          object_id: 'job-2',
          title: null,
          status: 'processing',
          created_at: null,
          download_key: null,
        } as unknown as JobWithDownloadKey,
      ],
    });
    const decks = await service.listMyDecks('owner-9');
    expect(decks[0]).toEqual({
      jobId: 'job-1',
      title: 'Pharmacology',
      status: 'done',
      createdAt: '2026-07-18T00:00:00.000Z',
      downloadUrl: '/api/upload/jobs/job-1/download',
    });
    expect(decks[1].title).toBe('Untitled deck');
    expect(decks[1].downloadUrl).toBeNull();
  });
});

describe('McpToolsService.getDeckPreview', () => {
  const jobFixture = (
    overrides: Partial<JobWithDownloadKey>
  ): JobWithDownloadKey =>
    ({
      object_id: 'job-1',
      title: 'Bio',
      status: 'done',
      created_at: null,
      download_key: 'deck.apkg',
      ...overrides,
    }) as unknown as JobWithDownloadKey;

  it('rejects an unknown jobId as not found', async () => {
    const { service, downloadService } = makeService({
      jobs: [jobFixture({ object_id: 'job-1' })],
    });
    await expect(service.getDeckPreview('owner', 'nope')).rejects.toThrow(
      /Deck not found/
    );
    expect(downloadService.getFileBody).not.toHaveBeenCalled();
  });

  it('rejects a job with no .apkg without hitting storage', async () => {
    const { service, downloadService } = makeService({
      jobs: [jobFixture({ object_id: 'job-1', download_key: null })],
    });
    await expect(service.getDeckPreview('owner', 'job-1')).rejects.toThrow(
      /no .apkg/
    );
    expect(downloadService.getFileBody).not.toHaveBeenCalled();
  });

  it('resolves the jobId to its download_key and returns meta + sample cards', async () => {
    const getFileBody = jest.fn(async () => Buffer.from('apkg'));
    const { service } = makeService({
      jobs: [jobFixture({ object_id: 'job-1', download_key: 'deck.apkg' })],
      getFileBody,
    });
    const preview = await service.getDeckPreview('owner', 'job-1');
    expect(getFileBody).toHaveBeenCalledWith(
      'owner',
      'deck.apkg',
      expect.anything()
    );
    expect(preview.cardCount).toBe(3);
    expect(preview.decks).toEqual([{ id: 1, name: 'Bio', cardCount: 3 }]);
    expect(preview.sampleCards).toEqual([{ front: 'Q', back: 'A' }]);
  });

  it('reports when the resolved file is missing from storage', async () => {
    const { service } = makeService({
      jobs: [jobFixture({ object_id: 'job-1', download_key: 'deck.apkg' })],
      getFileBody: jest.fn(async () => null),
    });
    await expect(service.getDeckPreview('owner', 'job-1')).rejects.toThrow(
      /Upload not found/
    );
  });
});

describe('McpToolsService.convertToDeck', () => {
  it('maps a 202 async response to a processing result with the job id', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.status(202).json({ jobId: 'job-async' });
    };
    const { service } = makeService({ uploadEntry });
    const result = await service.convertToDeck(
      { text: '# hi' },
      {
        owner: 'o',
      }
    );
    expect(result).toMatchObject({ kind: 'processing', jobId: 'job-async' });
  });

  it('maps a batch response to download URLs', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.status(200).json({
        kind: 'batch',
        decks: [
          { name: 'A', filename: 'A.apkg', downloadUrl: '/download/w/A.apkg' },
        ],
      });
    };
    const { service } = makeService({ uploadEntry });
    const result = await service.convertToDeck({ text: 'x' }, {});
    expect(result).toEqual({
      kind: 'batch',
      deckCount: 1,
      decks: [{ name: 'A', downloadUrl: '/download/w/A.apkg' }],
      summary: '1 decks ready to download.',
    });
  });

  it('maps a single-deck byte response to a card-count summary with an inline preview', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.set('X-Card-Count', '42');
      res.set('File-Name', 'deck.apkg');
      res.status(200).send(Buffer.from('APKG-BYTES'));
    };
    const { service } = makeService({ uploadEntry });
    const result = await service.convertToDeck({ text: 'x' }, {});
    expect(result).toMatchObject({
      kind: 'deck',
      cardCount: 42,
      filename: 'deck.apkg',
      deckCount: 1,
      decks: [{ id: 1, name: 'Bio', cardCount: 3 }],
      sampleCards: [{ front: 'Q', back: 'A' }],
    });
  });

  it('still returns the deck when inline preview parsing fails', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.set('X-Card-Count', '7');
      res.set('File-Name', 'deck.apkg');
      res.status(200).send(Buffer.from('CORRUPT'));
    };
    const { service } = makeService({
      uploadEntry,
      preview: {
        parse: jest.fn(async () => {
          throw new Error('bad apkg');
        }),
      },
    });
    const result = await service.convertToDeck({ text: 'x' }, {});
    expect(result).toMatchObject({ kind: 'deck', cardCount: 7 });
    expect((result as { decks?: unknown }).decks).toBeUndefined();
  });

  it('returns an error result when neither url nor text is given', async () => {
    const { service } = makeService({});
    const result = await service.convertToDeck({}, {});
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('surfaces the upload error message on a 400', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.status(400).json({ message: 'This file type is not supported.' });
    };
    const { service } = makeService({ uploadEntry });
    const result = await service.convertToDeck({ text: 'x' }, {});
    expect(result).toEqual({
      kind: 'error',
      message: 'This file type is not supported.',
    });
  });
});
