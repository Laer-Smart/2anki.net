import { APIErrorCode, APIResponseError } from '@notionhq/client';
import {
  fetchPageOrStopOnCursorInvalidation,
  isStartCursorInvalidationError,
} from './tolerateCursorInvalidation';

function makeApiError(code: string, message: string): APIResponseError {
  const err = new Error(message);
  Object.setPrototypeOf(err, APIResponseError.prototype);
  Object.assign(err, { code, name: 'APIResponseError' });
  return err as unknown as APIResponseError;
}

describe('isStartCursorInvalidationError', () => {
  test('matches a validation_error that references start_cursor', () => {
    const err = makeApiError(
      APIErrorCode.ValidationError,
      'The start_cursor provided is invalid: abc'
    );
    expect(isStartCursorInvalidationError(err)).toBe(true);
  });

  test('ignores a validation_error about another parameter', () => {
    const err = makeApiError(
      APIErrorCode.ValidationError,
      'body failed validation: body.filter.value should be defined'
    );
    expect(isStartCursorInvalidationError(err)).toBe(false);
  });

  test('ignores a non-validation error mentioning start_cursor', () => {
    const err = makeApiError(
      APIErrorCode.RateLimited,
      'start_cursor throttled'
    );
    expect(isStartCursorInvalidationError(err)).toBe(false);
  });

  test('ignores a plain Error', () => {
    expect(isStartCursorInvalidationError(new Error('start_cursor'))).toBe(
      false
    );
  });
});

describe('fetchPageOrStopOnCursorInvalidation', () => {
  test('returns the fetched page when it resolves', async () => {
    const page = { results: [1, 2] };
    const result = await fetchPageOrStopOnCursorInvalidation(
      async () => page,
      false,
      'test'
    );
    expect(result).toBe(page);
  });

  test('returns null on a mid-loop cursor invalidation', async () => {
    const err = makeApiError(
      APIErrorCode.ValidationError,
      'The start_cursor provided is invalid: abc'
    );
    const result = await fetchPageOrStopOnCursorInvalidation(
      async () => {
        throw err;
      },
      true,
      'test'
    );
    expect(result).toBeNull();
  });

  test('propagates a cursor invalidation on the first page (no cursor set)', async () => {
    const err = makeApiError(
      APIErrorCode.ValidationError,
      'The start_cursor provided is invalid: abc'
    );
    await expect(
      fetchPageOrStopOnCursorInvalidation(
        async () => {
          throw err;
        },
        false,
        'test'
      )
    ).rejects.toBe(err);
  });

  test('propagates an unrelated validation error even mid-loop', async () => {
    const err = makeApiError(
      APIErrorCode.ValidationError,
      'body.filter.value should be defined'
    );
    await expect(
      fetchPageOrStopOnCursorInvalidation(
        async () => {
          throw err;
        },
        true,
        'test'
      )
    ).rejects.toBe(err);
  });
});
