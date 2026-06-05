import StorageHandler from './StorageHandler';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url'),
}));

describe('StorageHandler.getFileContents', () => {
  beforeEach(() => {
    mockSend.mockReset();
    process.env.SPACES_DEFAULT_BUCKET_NAME = 'test-bucket';
    process.env.SPACES_ENDPOINT = 'https://test.spaces.example.com';
  });

  it('drains the SDK v3 Body stream into a Buffer', async () => {
    const content = Buffer.from('hello from s3');
    mockSend.mockResolvedValueOnce({
      Body: {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(content)),
      },
    });

    const handler = new StorageHandler();
    const result = await handler.getFileContents('some/key.apkg');

    expect(result.Body).toBeInstanceOf(Buffer);
    expect(result.Body?.toString()).toBe('hello from s3');
  });

  it('returns undefined Body when the SDK response has no Body', async () => {
    mockSend.mockResolvedValueOnce({ Body: null });

    const handler = new StorageHandler();
    const result = await handler.getFileContents('some/key.apkg');

    expect(result.Body).toBeUndefined();
  });
});
