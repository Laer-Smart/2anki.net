import express from 'express';

import { McpToolsService, UploadEntrypoint } from './McpToolsService';
import { DeckPersistence } from './McpDeckPersistence';
import { JobWithDownloadKey } from '../../data_layer/JobRepository';
import ApkgPreviewService from '../ApkgPreviewService/ApkgPreviewService';
import DownloadService from '../DownloadService';
import type StorageHandler from '../../lib/storage/StorageHandler';

function makeService(overrides: {
  jobs?: JobWithDownloadKey[];
  uploadEntry?: UploadEntrypoint;
  getFileBody?: DownloadService['getFileBody'];
  preview?: Partial<ApkgPreviewService>;
  persist?: DeckPersistence['persist'];
  getPresignedUrl?: StorageHandler['getPresignedUrl'];
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
  const persist = jest.fn(
    overrides.persist ?? (async () => 'owner-9-123-deck.apkg')
  );
  const deckPersistence = { persist } as unknown as DeckPersistence;
  const getPresignedUrl = jest.fn(
    overrides.getPresignedUrl ?? (async () => 'https://s3.example/presigned')
  );
  const storage = { getPresignedUrl } as unknown as StorageHandler;
  const service = new McpToolsService(
    jobLister,
    downloadService,
    previewService,
    uploadEntry,
    storage,
    deckPersistence
  );
  return { service, jobLister, downloadService, persist, getPresignedUrl };
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
    const { service, persist } = makeService({ uploadEntry });
    const result = await service.convertToDeck({ text: '# hi' }, 'owner', {
      owner: 'o',
    });
    expect(result).toMatchObject({ kind: 'processing', jobId: 'job-async' });
    expect(persist).not.toHaveBeenCalled();
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
    const result = await service.convertToDeck({ text: 'x' }, 'owner', {});
    expect(result).toEqual({
      kind: 'batch',
      deckCount: 1,
      decks: [{ name: 'A', downloadUrl: '/download/w/A.apkg' }],
      summary: '1 decks ready to download.',
    });
  });

  it('persists a single-deck byte response and returns a jobId + presigned download URL', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.set('X-Card-Count', '42');
      res.set('File-Name', 'deck.apkg');
      res.status(200).send(Buffer.from('APKG-BYTES'));
    };
    const { service, persist, getPresignedUrl } = makeService({ uploadEntry });
    const result = await service.convertToDeck({ text: 'x' }, 'owner-9', {});
    expect(result).toMatchObject({
      kind: 'deck',
      cardCount: 42,
      filename: 'deck.apkg',
      downloadUrl: 'https://s3.example/presigned',
      deckCount: 1,
      decks: [{ id: 1, name: 'Bio', cardCount: 3 }],
      sampleCards: [{ front: 'Q', back: 'A' }],
    });
    expect((result as { jobId?: string }).jobId).toEqual(expect.any(String));
    expect(persist).toHaveBeenCalledWith(
      'owner-9',
      expect.any(String),
      'deck.apkg',
      Buffer.from('APKG-BYTES')
    );
    expect(getPresignedUrl).toHaveBeenCalledWith('owner-9-123-deck.apkg');
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
    const result = await service.convertToDeck({ text: 'x' }, 'owner', {});
    expect(result).toMatchObject({ kind: 'deck', cardCount: 7 });
    expect((result as { decks?: unknown }).decks).toBeUndefined();
  });

  it('returns an error result when neither url nor text is given', async () => {
    const { service, persist } = makeService({});
    const result = await service.convertToDeck({}, 'owner', {});
    expect(result).toMatchObject({ kind: 'error' });
    expect(persist).not.toHaveBeenCalled();
  });

  it('surfaces the upload error message on a 400', async () => {
    const uploadEntry: UploadEntrypoint = (_req, res) => {
      res.status(400).json({ message: 'This file type is not supported.' });
    };
    const { service, persist } = makeService({ uploadEntry });
    const result = await service.convertToDeck({ text: 'x' }, 'owner', {});
    expect(result).toEqual({
      kind: 'error',
      message: 'This file type is not supported.',
    });
    expect(persist).not.toHaveBeenCalled();
  });
});

describe('McpToolsService.createDeck', () => {
  const captureUpload = (): {
    entry: UploadEntrypoint;
    markdown: () => string;
  } => {
    let captured = '';
    const entry: UploadEntrypoint = (req, res) => {
      const files = (req as unknown as { files: { buffer: Buffer }[] }).files;
      captured = files[0].buffer.toString('utf-8');
      res.set('X-Card-Count', '2');
      res.set('File-Name', 'deck.apkg');
      res.status(200).send(Buffer.from('APKG-BYTES'));
    };
    return { entry, markdown: () => captured };
  };

  it('serializes cards to heading markdown, persists, and returns a download URL', async () => {
    const { entry, markdown } = captureUpload();
    const { service, persist, getPresignedUrl } = makeService({
      uploadEntry: entry,
    });
    const result = await service.createDeck(
      [
        { front: 'What is ATP?', back: 'Energy currency.' },
        { front: 'What is DNA?', back: 'Heredity molecule.' },
      ],
      'Biochemistry',
      'owner-9',
      {}
    );
    expect(markdown()).toBe(
      '## What is ATP?\n\nEnergy currency.\n\n' +
        '## What is DNA?\n\nHeredity molecule.\n\n'
    );
    expect(result).toMatchObject({
      kind: 'deck',
      cardCount: 2,
      downloadUrl: 'https://s3.example/presigned',
    });
    expect((result as { jobId?: string }).jobId).toEqual(expect.any(String));
    expect(persist).toHaveBeenCalledWith(
      'owner-9',
      expect.any(String),
      'deck.apkg',
      Buffer.from('APKG-BYTES')
    );
    expect(getPresignedUrl).toHaveBeenCalled();
  });

  it('falls back to the card count when the pipeline reports none', async () => {
    const entry: UploadEntrypoint = (_req, res) => {
      res.set('File-Name', 'deck.apkg');
      res.status(200).send(Buffer.from('APKG-BYTES'));
    };
    const { service } = makeService({ uploadEntry: entry });
    const result = await service.createDeck(
      [
        { front: 'A', back: 'alpha' },
        { front: 'B', back: 'beta' },
        { front: 'C', back: 'gamma' },
      ],
      undefined,
      'owner-9',
      {}
    );
    expect(result).toMatchObject({ kind: 'deck', cardCount: 3 });
  });

  it('names the upload file from the deck name', async () => {
    let uploadedName = '';
    const entry: UploadEntrypoint = (req, res) => {
      const files = (req as unknown as { files: { originalname: string }[] })
        .files;
      uploadedName = files[0].originalname;
      res.status(200).send(Buffer.from('APKG-BYTES'));
    };
    const { service } = makeService({ uploadEntry: entry });
    await service.createDeck(
      [{ front: 'Q', back: 'A' }],
      'Pharmacology',
      'owner-9',
      {}
    );
    expect(uploadedName).toBe('Pharmacology.md');
  });

  it('rejects an empty cards array without touching persistence', async () => {
    const { service, persist } = makeService({});
    const result = await service.createDeck([], 'Deck', 'owner-9', {});
    expect(result).toMatchObject({ kind: 'error' });
    expect(persist).not.toHaveBeenCalled();
  });

  it('rejects a card with an empty front', async () => {
    const { service, persist } = makeService({});
    const result = await service.createDeck(
      [{ front: '   ', back: 'answer' }],
      'Deck',
      'owner-9',
      {}
    );
    expect(result).toMatchObject({ kind: 'error' });
    expect(persist).not.toHaveBeenCalled();
  });

  it('rejects more than 500 cards', async () => {
    const { service, persist } = makeService({});
    const cards = Array.from({ length: 501 }, (_v, i) => ({
      front: `Q${i}`,
      back: `A${i}`,
    }));
    const result = await service.createDeck(cards, 'Deck', 'owner-9', {});
    expect(result).toMatchObject({ kind: 'error' });
    expect(persist).not.toHaveBeenCalled();
  });
});
