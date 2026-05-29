import { NotionService } from './NotionService';
import type { INotionRepository } from '../../data_layer/NotionRespository';

function makeRepo(overrides: Partial<INotionRepository> = {}): INotionRepository {
  return {
    getNotionData: jest.fn().mockResolvedValue(null),
    saveNotionToken: jest.fn().mockResolvedValue(true),
    getNotionToken: jest.fn().mockResolvedValue(null),
    deleteBlocksByOwner: jest.fn().mockResolvedValue(0),
    deleteNotionData: jest.fn().mockResolvedValue(true),
    markTokenInvalid: jest.fn().mockResolvedValue(undefined),
    clearTokenInvalid: jest.fn().mockResolvedValue(undefined),
    setReconnectEmailSent: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  process.env.NOTION_CLIENT_ID = 'client-abc';
  process.env.NOTION_CLIENT_SECRET = 'secret-xyz';
  process.env.NOTION_REDIRECT_URI = 'https://2anki.net/api/notion/connect';
});

describe('getNotionLinkInfo', () => {
  it('returns isConnected: false when no token row exists', async () => {
    const repo = makeRepo({ getNotionData: jest.fn().mockResolvedValue(null) });
    const service = new NotionService(repo);
    const result = await service.getNotionLinkInfo(1);
    expect(result.isConnected).toBe(false);
  });

  it('returns isConnected: true when a valid token row exists', async () => {
    const repo = makeRepo({
      getNotionData: jest.fn().mockResolvedValue({
        token: 'some-token',
        workspace_name: 'My Workspace',
        invalidated_at: null,
        owner: 1,
        created_at: new Date(),
        token_type: 'bearer',
        bot_id: 'bot',
        workspace_icon: null,
        workspace_id: 'ws-1',
        notion_owner: null,
      }),
    });
    const service = new NotionService(repo);
    const result = await service.getNotionLinkInfo(1);
    expect(result.isConnected).toBe(true);
    expect(result.workspace).toBe('My Workspace');
  });

  it('returns isConnected: false when token row has invalidated_at set', async () => {
    const repo = makeRepo({
      getNotionData: jest.fn().mockResolvedValue({
        token: 'stale-token',
        workspace_name: 'My Workspace',
        invalidated_at: new Date('2026-01-01T00:00:00Z'),
        owner: 1,
        created_at: new Date(),
        token_type: 'bearer',
        bot_id: 'bot',
        workspace_icon: null,
        workspace_id: 'ws-1',
        notion_owner: null,
      }),
    });
    const service = new NotionService(repo);
    const result = await service.getNotionLinkInfo(1);
    expect(result.isConnected).toBe(false);
  });
});
