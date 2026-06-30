import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from '@anthropic-ai/sdk';

import { isTransientChunkError } from './ClaudeService';

describe('isTransientChunkError', () => {
  it('retries a dropped connection (APIConnectionError)', () => {
    expect(
      isTransientChunkError(
        new APIConnectionError({ message: 'socket hang up' })
      )
    ).toBe(true);
  });

  it('retries a connection timeout (APIConnectionTimeoutError)', () => {
    expect(
      isTransientChunkError(
        new APIConnectionTimeoutError({ message: 'timed out' })
      )
    ).toBe(true);
  });

  it.each([500, 502, 503, 504, 529, 429, 408, 409])(
    'retries transient HTTP status %i',
    (status) => {
      const err = new APIError(
        status,
        { type: 'error', error: { type: 'overloaded_error', message: 'busy' } },
        'busy',
        new Headers()
      );
      expect(isTransientChunkError(err)).toBe(true);
    }
  );

  it.each([400, 401, 403, 404, 422])(
    'does NOT retry client error status %i',
    (status) => {
      const err = new APIError(
        status,
        {
          type: 'error',
          error: { type: 'invalid_request_error', message: 'bad' },
        },
        'bad',
        new Headers()
      );
      expect(isTransientChunkError(err)).toBe(false);
    }
  );

  it('does not retry a plain Error', () => {
    expect(isTransientChunkError(new Error('boom'))).toBe(false);
  });

  it('does not retry a non-Error value', () => {
    expect(isTransientChunkError('nope')).toBe(false);
    expect(isTransientChunkError(undefined)).toBe(false);
  });
});
