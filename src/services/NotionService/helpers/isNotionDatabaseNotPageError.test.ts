import { isNotionDatabaseNotPageError } from './isNotionDatabaseNotPageError';

describe('isNotionDatabaseNotPageError', () => {
  it('returns true for a validation_error whose message says it is a database', () => {
    expect(
      isNotionDatabaseNotPageError({
        code: 'validation_error',
        message: 'abc is a database, not a page. Use Retrieve a database.',
      })
    ).toBe(true);
  });

  it('returns false for a different validation_error message', () => {
    expect(
      isNotionDatabaseNotPageError({
        code: 'validation_error',
        message: 'body failed validation',
      })
    ).toBe(false);
  });

  it('returns false for a non-validation Notion error code', () => {
    expect(
      isNotionDatabaseNotPageError({
        code: 'object_not_found',
        message: 'is a database, not a page',
      })
    ).toBe(false);
  });

  it('returns false for null, strings, and errors without a message', () => {
    expect(isNotionDatabaseNotPageError(null)).toBe(false);
    expect(isNotionDatabaseNotPageError('is a database, not a page')).toBe(
      false
    );
    expect(isNotionDatabaseNotPageError({ code: 'validation_error' })).toBe(
      false
    );
  });
});
