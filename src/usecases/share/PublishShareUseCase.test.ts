import PublishShareUseCase from './PublishShareUseCase';
import { UsersId } from '../../data_layer/public/Users';

const asOwner = (n: number) => n as unknown as UsersId;

const baseShare = {
  id: 1,
  owner: 42,
  upload_key: 'test.apkg',
  token: 'tok-1',
  created_at: new Date(),
  revoked_at: null,
  view_count: 0,
  is_public: false,
  title: null,
  card_count: null,
};

function makeShareService(overrides: Record<string, unknown> = {}) {
  return {
    findShareForOwner: jest.fn().mockResolvedValue(baseShare),
    setPublicListing: jest.fn().mockResolvedValue({
      ...baseShare,
      is_public: true,
      title: 'My deck',
      card_count: 12,
    }),
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
    parse: jest.fn().mockResolvedValue({ parsed: true }),
    getMeta: jest.fn().mockReturnValue({ totalCards: 12 }),
    ...overrides,
  };
}

describe('PublishShareUseCase', () => {
  it('returns null when the share does not exist for this owner', async () => {
    const shareService = makeShareService({
      findShareForOwner: jest.fn().mockResolvedValue(null),
    });
    const useCase = new PublishShareUseCase(
      shareService as any,
      makeStorage() as any,
      makePreviewService() as any
    );

    const result = await useCase.execute('missing', asOwner(42), true, 'Title');
    expect(result).toBeNull();
  });

  it('rejects publishing without a title', async () => {
    const shareService = makeShareService();
    const useCase = new PublishShareUseCase(
      shareService as any,
      makeStorage() as any,
      makePreviewService() as any
    );

    await expect(
      useCase.execute('tok-1', asOwner(42), true, '   ')
    ).rejects.toThrow('Title is required to publish a deck.');
    expect(shareService.setPublicListing).not.toHaveBeenCalled();
  });

  it('parses the apkg to record a card count and publishes with a trimmed title', async () => {
    const shareService = makeShareService();
    const previewService = makePreviewService();
    const useCase = new PublishShareUseCase(
      shareService as any,
      makeStorage() as any,
      previewService as any
    );

    await useCase.execute('tok-1', asOwner(42), true, '  My deck  ');

    expect(shareService.setPublicListing).toHaveBeenCalledWith('tok-1', 42, {
      isPublic: true,
      title: 'My deck',
      cardCount: 12,
    });
  });

  it('still publishes with a null card count when the apkg cannot be parsed', async () => {
    const shareService = makeShareService();
    const storage = makeStorage({
      getFileContents: jest.fn().mockRejectedValue(new Error('s3 down')),
    });
    const useCase = new PublishShareUseCase(
      shareService as any,
      storage as any,
      makePreviewService() as any
    );

    await useCase.execute('tok-1', asOwner(42), true, 'My deck');

    expect(shareService.setPublicListing).toHaveBeenCalledWith('tok-1', 42, {
      isPublic: true,
      title: 'My deck',
      cardCount: null,
    });
  });

  it('unpublishes without requiring a title or parsing the apkg', async () => {
    const shareService = makeShareService();
    const previewService = makePreviewService();
    const useCase = new PublishShareUseCase(
      shareService as any,
      makeStorage() as any,
      previewService as any
    );

    await useCase.execute('tok-1', asOwner(42), false);

    expect(previewService.parse).not.toHaveBeenCalled();
    expect(shareService.setPublicListing).toHaveBeenCalledWith('tok-1', 42, {
      isPublic: false,
      title: null,
      cardCount: null,
    });
  });
});
