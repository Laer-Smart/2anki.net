import { Request, Response } from 'express';
import ShareController from './ShareController';

function mockResponse(locals: Record<string, unknown> = {}): Response {
  const headers: Record<string, string> = {};
  return {
    locals: { owner: null, ...locals },
    setHeader: jest.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;
}

function makeCreateUseCase(overrides: Record<string, unknown> = {}) {
  return {
    execute: jest.fn().mockResolvedValue({
      token: 'abc-token',
      url: 'https://2anki.net/s/abc-token',
    }),
    ...overrides,
  };
}

function makeResolveUseCase(overrides: Record<string, unknown> = {}) {
  return {
    execute: jest.fn().mockResolvedValue({
      id: 1,
      owner: 42,
      upload_key: 'test.apkg',
      token: 'abc-token',
      created_at: new Date(),
      revoked_at: null,
      view_count: 0,
    }),
    ...overrides,
  };
}

function makeRevokeUseCase(overrides: Record<string, unknown> = {}) {
  return { execute: jest.fn().mockResolvedValue(true), ...overrides };
}

function makeShareService(overrides: Record<string, unknown> = {}) {
  return {
    recordView: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeStorage(overrides: Record<string, unknown> = {}) {
  return {
    getFileContents: jest
      .fn()
      .mockResolvedValue({ Body: Buffer.from('fake-apkg') }),
    ...overrides,
  };
}

function makePreviewService(overrides: Record<string, unknown> = {}) {
  return {
    parse: jest.fn().mockResolvedValue({}),
    getMeta: jest.fn().mockReturnValue({ totalCards: 5, decks: [] }),
    getCardsPage: jest
      .fn()
      .mockReturnValue({ cards: [], nextCursor: null, total: 5 }),
    getMediaEntry: jest.fn().mockReturnValue(Buffer.from('media-bytes')),
    ...overrides,
  };
}

function makeDownloadService(overrides: Record<string, unknown> = {}) {
  return {
    getFilename: jest.fn().mockResolvedValue('My Deck'),
    isMissingDownloadError: jest.fn().mockReturnValue(false),
    ...overrides,
  };
}

function makePublishUseCase(overrides: Record<string, unknown> = {}) {
  return {
    execute: jest.fn().mockResolvedValue({
      token: 'abc-token',
      is_public: true,
      title: 'My deck',
      card_count: 5,
    }),
    ...overrides,
  };
}

function makeListPublicUseCase(overrides: Record<string, unknown> = {}) {
  return {
    execute: jest.fn().mockResolvedValue({ decks: [], nextCursor: null }),
    ...overrides,
  };
}

function buildController(
  overrides: {
    createUseCase?: unknown;
    resolveUseCase?: unknown;
    revokeUseCase?: unknown;
    shareService?: unknown;
    storage?: unknown;
    previewService?: unknown;
    downloadService?: unknown;
    publishUseCase?: unknown;
    listPublicUseCase?: unknown;
  } = {}
) {
  return new ShareController(
    (overrides.createUseCase ?? makeCreateUseCase()) as any,
    (overrides.resolveUseCase ?? makeResolveUseCase()) as any,
    (overrides.revokeUseCase ?? makeRevokeUseCase()) as any,
    (overrides.shareService ?? makeShareService()) as any,
    (overrides.storage ?? makeStorage()) as any,
    (overrides.previewService ?? makePreviewService()) as any,
    (overrides.downloadService ?? makeDownloadService()) as any,
    (overrides.publishUseCase ?? makePublishUseCase()) as any,
    (overrides.listPublicUseCase ?? makeListPublicUseCase()) as any
  );
}

describe('ShareController - POST /api/shares (createShare)', () => {
  it('returns 401 when owner is not set', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { body: { upload_key: 'test.apkg' } } as unknown as Request;
    const res = mockResponse({ owner: null });

    await controller.createShare(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication required',
    });
  });

  it('returns 400 when upload_key is missing', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { body: {} } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.createShare(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'upload_key is required',
    });
  });

  it('returns token and url on success', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { body: { upload_key: 'test.apkg' } } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.createShare(req, res);

    expect(res.json).toHaveBeenCalledWith({
      token: 'abc-token',
      url: 'https://2anki.net/s/abc-token',
    });
  });
});

describe('ShareController - GET /api/shares/:token/meta', () => {
  it('returns 404 when token is not found or revoked', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase({ execute: jest.fn().mockResolvedValue(null) }) as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'gone-token' } } as unknown as Request;
    const res = mockResponse();

    await controller.getMeta(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'This link was turned off by the owner.',
    });
  });

  it('returns meta on active share', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'abc-token' } } as unknown as Request;
    const res = mockResponse();

    await controller.getMeta(req, res);

    expect(res.json).toHaveBeenCalledWith({ totalCards: 5, decks: [] });
    expect(makeShareService().recordView).not.toHaveBeenCalled();
  });
});

describe('ShareController - GET /api/shares/:token/download', () => {
  it('returns 404 on missing or revoked token', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase({ execute: jest.fn().mockResolvedValue(null) }) as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'gone' } } as unknown as Request;
    const res = mockResponse();

    await controller.download(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with Content-Disposition on valid share', async () => {
    const headers: Record<string, string> = {};
    const res = {
      locals: {},
      setHeader: jest.fn((k: string, v: string) => {
        headers[k] = v;
      }),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'abc-token' } } as unknown as Request;

    await controller.download(req, res);

    expect(res.send).toHaveBeenCalledWith(Buffer.from('fake-apkg'));
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment')
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Robots-Tag', 'noindex');
  });
});

describe('ShareController - DELETE /api/shares/:token', () => {
  it('returns 401 when owner is missing', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'abc-token' } } as unknown as Request;
    const res = mockResponse({ owner: null });

    await controller.revokeShare(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 404 when revoke returns false', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase({ execute: jest.fn().mockResolvedValue(false) }) as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'abc-token' } } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.revokeShare(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 204 on successful revoke', async () => {
    const controller = new ShareController(
      makeCreateUseCase() as any,
      makeResolveUseCase() as any,
      makeRevokeUseCase() as any,
      makeShareService() as any,
      makeStorage() as any,
      makePreviewService() as any,
      makeDownloadService() as any,
      makePublishUseCase() as any,
      makeListPublicUseCase() as any
    );
    const req = { params: { token: 'abc-token' } } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.revokeShare(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('ShareController - PATCH /api/shares/:token (setVisibility)', () => {
  it('returns 401 when owner is missing', async () => {
    const controller = buildController();
    const req = {
      params: { token: 'abc-token' },
      body: { is_public: true, title: 'My deck' },
    } as unknown as Request;
    const res = mockResponse({ owner: null });

    await controller.setVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when is_public is not a boolean', async () => {
    const controller = buildController();
    const req = {
      params: { token: 'abc-token' },
      body: {},
    } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.setVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the use case reports the share was not found', async () => {
    const publishUseCase = makePublishUseCase({
      execute: jest.fn().mockResolvedValue(null),
    });
    const controller = buildController({ publishUseCase });
    const req = {
      params: { token: 'missing' },
      body: { is_public: true, title: 'My deck' },
    } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.setVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when the use case rejects a missing title', async () => {
    const publishUseCase = makePublishUseCase({
      execute: jest
        .fn()
        .mockRejectedValue(new Error('Title is required to publish a deck.')),
    });
    const controller = buildController({ publishUseCase });
    const req = {
      params: { token: 'abc-token' },
      body: { is_public: true },
    } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.setVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Title is required to publish a deck.',
    });
  });

  it('returns the updated visibility on success', async () => {
    const controller = buildController();
    const req = {
      params: { token: 'abc-token' },
      body: { is_public: true, title: 'My deck' },
    } as unknown as Request;
    const res = mockResponse({ owner: 42 });

    await controller.setVisibility(req, res);

    expect(res.json).toHaveBeenCalledWith({
      token: 'abc-token',
      is_public: true,
      title: 'My deck',
      card_count: 5,
    });
  });
});

describe('ShareController - GET /api/shares/public (getPublicListing)', () => {
  it('returns the listing page from the use case', async () => {
    const listPublicUseCase = makeListPublicUseCase({
      execute: jest.fn().mockResolvedValue({
        decks: [
          {
            token: 't1',
            title: 'Deck one',
            card_count: 10,
            created_at: new Date('2026-07-01'),
            view_count: 2,
            url: 'https://2anki.net/s/t1',
          },
        ],
        nextCursor: null,
      }),
    });
    const controller = buildController({ listPublicUseCase });
    const req = { query: {} } as unknown as Request;
    const res = mockResponse();

    await controller.getPublicListing(req, res);

    expect(listPublicUseCase.execute).toHaveBeenCalledWith(0, 24);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ nextCursor: null })
    );
  });

  it('does not set X-Robots-Tag: noindex, unlike the other share endpoints', async () => {
    const controller = buildController();
    const req = { query: {} } as unknown as Request;
    const res = mockResponse();

    await controller.getPublicListing(req, res);

    expect(res.setHeader).not.toHaveBeenCalledWith('X-Robots-Tag', 'noindex');
  });
});
