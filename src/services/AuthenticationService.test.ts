import jwt from 'jsonwebtoken';

import AuthenticationService from './AuthenticationService';
import TokenRepository from '../data_layer/TokenRepository';
import UsersRepository from '../data_layer/UsersRepository';
import instrumentedAxios from './observability/instrumentedAxios';
import { OAuth2Client } from 'google-auth-library';

jest.mock('./observability/instrumentedAxios');
jest.mock('google-auth-library');

const SECRET = 'test-secret';

beforeAll(() => {
  process.env.SECRET = SECRET;
  process.env.NOTION_CLIENT_ID = 'test-client-id';
  process.env.NOTION_CLIENT_SECRET = 'test-client-secret';
  process.env.NOTION_REDIRECT_URI = 'http://localhost:2020/api/notion/connect';
});

const mockedAxios = instrumentedAxios as jest.Mocked<typeof instrumentedAxios>;

function createService() {
  const tokenRepo = {} as TokenRepository;
  const usersRepo = {} as UsersRepository;
  return new AuthenticationService(tokenRepo, usersRepo);
}

test('newJWTToken includes an expiration claim', async () => {
  const service = createService();
  const token = await service.newJWTToken(42);
  const decoded = jwt.decode(token) as jwt.JwtPayload;

  expect(decoded.exp).toBeDefined();
  expect(decoded.iat).toBeDefined();
  expect(decoded.exp! - decoded.iat!).toBe(86400);
});

describe('isValidToken', () => {
  it('resolves true for a freshly signed token', async () => {
    const service = createService();
    const token = jwt.sign({ userId: 1 }, SECRET, { expiresIn: '1h' });

    await expect(service.isValidToken(token)).resolves.toBe(true);
  });

  it('resolves false for an expired token (no throw)', async () => {
    const service = createService();
    const token = jwt.sign({ userId: 1 }, SECRET, { expiresIn: '0s' });

    await expect(service.isValidToken(token)).resolves.toBe(false);
  });

  it('resolves false for a token signed with a different secret', async () => {
    const service = createService();
    const token = jwt.sign({ userId: 1 }, 'a-different-secret', {
      expiresIn: '1h',
    });

    await expect(service.isValidToken(token)).resolves.toBe(false);
  });

  it('resolves false for a malformed token string', async () => {
    const service = createService();

    await expect(service.isValidToken('not-a-jwt')).resolves.toBe(false);
  });

  it('resolves false for an empty token', async () => {
    const service = createService();

    await expect(service.isValidToken('')).resolves.toBe(false);
  });
});

describe('loginWithNotion', () => {
  const notionResponse = {
    access_token: 'secret-token',
    token_type: 'bearer',
    bot_id: 'bot-123',
    workspace_name: 'My Workspace',
    workspace_icon: null,
    workspace_id: 'ws-123',
    owner: {
      user: {
        name: 'Alice',
        person: { email: 'alice@example.com' },
      },
    },
  };

  it('returns email, name, and accessData on success', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({ data: notionResponse });

    const service = createService();
    const result = await service.loginWithNotion('auth-code');

    expect(result).toEqual({
      email: 'alice@example.com',
      name: 'Alice',
      accessData: notionResponse,
    });
  });

  it('falls back to email prefix as name when name is absent', async () => {
    const responseWithoutName = {
      ...notionResponse,
      owner: { user: { person: { email: 'bob@example.com' } } },
    };
    mockedAxios.post = jest.fn().mockResolvedValue({ data: responseWithoutName });

    const service = createService();
    const result = await service.loginWithNotion('auth-code');

    expect(result?.name).toBe('bob');
    expect(result?.email).toBe('bob@example.com');
  });

  it('returns null when Notion response has no email', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: { access_token: 'tok', owner: { user: { person: {} } } },
    });

    const service = createService();
    const result = await service.loginWithNotion('auth-code');

    expect(result).toBeNull();
  });

  it('returns null when the Notion API call throws', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('network error'));

    const service = createService();
    const result = await service.loginWithNotion('auth-code');

    expect(result).toBeNull();
  });

  it('returns null when NOTION_CLIENT_ID is not set', async () => {
    const originalId = process.env.NOTION_CLIENT_ID;
    delete process.env.NOTION_CLIENT_ID;

    const service = createService();
    const result = await service.loginWithNotion('auth-code');

    process.env.NOTION_CLIENT_ID = originalId;
    expect(result).toBeNull();
  });
});

describe('loginWithGoogle', () => {
  const MockedOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:2020/api/auth/google';
  });

  it('returns email and name when the ID token is valid', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: { id_token: 'valid.id.token' },
    });

    const mockGetPayload = jest.fn().mockReturnValue({
      email: 'user@example.com',
      name: 'Test User',
    });
    MockedOAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: mockGetPayload,
    });

    const service = createService();
    const result = await service.loginWithGoogle('auth-code');

    expect(result).toEqual({ email: 'user@example.com', name: 'Test User' });
    expect(MockedOAuth2Client.prototype.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid.id.token',
      audience: 'test-google-client-id',
    });
  });

  it('returns undefined when the ID token fails verification', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: { id_token: 'tampered.token' },
    });

    MockedOAuth2Client.prototype.verifyIdToken = jest
      .fn()
      .mockRejectedValue(new Error('Token used too late'));

    const service = createService();
    const result = await service.loginWithGoogle('auth-code');

    expect(result).toBeUndefined();
  });

  it('returns undefined when the audience claim does not match', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: { id_token: 'wrong.audience.token' },
    });

    MockedOAuth2Client.prototype.verifyIdToken = jest
      .fn()
      .mockRejectedValue(new Error('Wrong recipient'));

    const service = createService();
    const result = await service.loginWithGoogle('auth-code');

    expect(result).toBeUndefined();
  });

  it('returns undefined when the token exchange call fails', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('network error'));

    const service = createService();
    const result = await service.loginWithGoogle('auth-code');

    expect(result).toBeUndefined();
  });
});

describe('isNewPasswordValid', () => {
  it('returns false (valid) for a UUID-length reset token and a strong password', () => {
    const service = createService();
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(service.isNewPasswordValid(uuid, 'password123')).toBe(false);
  });

  it('returns true (invalid) for an empty reset token', () => {
    const service = createService();
    expect(service.isNewPasswordValid('', 'password123')).toBe(true);
  });

  it('returns true (invalid) for a password shorter than 8 characters', () => {
    const service = createService();
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(service.isNewPasswordValid(uuid, 'short')).toBe(true);
  });

  it('returns true (invalid) for a non-string reset token', () => {
    const service = createService();
    expect(service.isNewPasswordValid(null, 'password123')).toBe(true);
  });
});
