import DownloadService from './DownloadService';

function makeService() {
  return new DownloadService({} as never);
}

describe('DownloadService.isMissingDownloadError', () => {
  it('matches a NoSuchKey error from the storage SDK', () => {
    const service = makeService();
    const error = Object.assign(new Error('not found'), { name: 'NoSuchKey' });
    expect(service.isMissingDownloadError(error)).toBe(true);
  });

  it('does not match a generic error', () => {
    const service = makeService();
    expect(service.isMissingDownloadError(new Error('boom'))).toBe(false);
  });
});

describe('DownloadService.isTransientStorageError', () => {
  it('matches a 5xx response from storage', () => {
    const service = makeService();
    const error = Object.assign(new Error('service unavailable'), {
      name: 'ServiceUnavailable',
      $metadata: { httpStatusCode: 503 },
    });
    expect(service.isTransientStorageError(error)).toBe(true);
  });

  it('matches a storage request timeout', () => {
    const service = makeService();
    const error = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    });
    expect(service.isTransientStorageError(error)).toBe(true);
  });

  it('matches a socket reset surfaced via error.code', () => {
    const service = makeService();
    const error = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    expect(service.isTransientStorageError(error)).toBe(true);
  });

  it('matches a socket error nested under error.cause', () => {
    const service = makeService();
    const error = Object.assign(new Error('fetch failed'), {
      cause: { code: 'ETIMEDOUT' },
    });
    expect(service.isTransientStorageError(error)).toBe(true);
  });

  it('does not match a NoSuchKey error', () => {
    const service = makeService();
    const error = Object.assign(new Error('not found'), {
      name: 'NoSuchKey',
      $metadata: { httpStatusCode: 404 },
    });
    expect(service.isTransientStorageError(error)).toBe(false);
  });

  it('does not match a generic error', () => {
    const service = makeService();
    expect(service.isTransientStorageError(new Error('boom'))).toBe(false);
  });
});
