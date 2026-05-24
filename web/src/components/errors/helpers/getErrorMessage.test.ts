import { classifyError, getErrorMessage, classifyUploadError } from './getErrorMessage';
import type { UploadErrorBody } from '../../../types/UploadErrorBody';

describe('classifyError', () => {
  test('TypeError: Failed to fetch is a network error', () => {
    const err = new TypeError('Failed to fetch');
    expect(classifyError(err).title).toMatch(/couldn't reach 2anki/i);
  });

  test('unauthorized message indicates session expired', () => {
    expect(classifyError(new Error('unauthorized')).title).toMatch(
      /session expired/i
    );
  });

  test('object_not_found gives a Notion-specific hint', () => {
    expect(classifyError(new Error('object_not_found')).detail).toMatch(
      /Notion/i
    );
  });

  test('upload_limit_exceeded suggests upgrading', () => {
    expect(
      classifyError(new Error('upload_limit_exceeded')).detail
    ).toMatch(/upgrade/i);
  });

  test('rate_limited tells the user to wait', () => {
    expect(classifyError(new Error('rate_limited')).title).toMatch(
      /too many/i
    );
  });

  test('falls back to a short server message when one is provided', () => {
    expect(classifyError(new Error('No active subscription.')).title).toBe(
      'No active subscription.'
    );
  });

  test('unknown/empty error yields generic fallback', () => {
    expect(classifyError(undefined).title).toMatch(/Something went wrong/i);
  });

  test('HTML-looking long blobs fall back rather than leaking markup', () => {
    const ugly = '<html><body>big raw stack trace…</body></html>'.repeat(20);
    expect(classifyError(new Error(ugly)).title).toMatch(
      /Something went wrong/i
    );
  });

  test('short HTML-wrapped error is stripped and shown to the user', () => {
    const htmlError =
      '<p>Could not create a deck using your file</p>';
    const result = classifyError(new Error(htmlError));
    expect(result.title).toBe(
      'Could not create a deck using your file'
    );
  });

  test('rich HTML error with links is stripped to plain text', () => {
    const htmlError =
      '<div class="info">Verify your <a href="/upload?view=template">settings</a>.</div>';
    const result = classifyError(new Error(htmlError));
    expect(result.title).toBe('Verify your settings.');
  });
});

describe('classifyError — notion_unauthorized', () => {
  it('new structured code returns reconnect copy', () => {
    const result = classifyError({ code: 'notion_unauthorized', message: 'API token is invalid.' });
    expect(result.title).toBe('Your Notion connection expired');
    expect(result.detail).toBe('Reconnect Notion on the upload page to keep converting.');
  });

  it('legacy text "api token is invalid" (case-insensitive) returns reconnect copy', () => {
    const result = classifyError(new Error('API token is invalid.'));
    expect(result.title).toBe('Your Notion connection expired');
    expect(result.detail).toBe('Reconnect Notion on the upload page to keep converting.');
  });

  it('action link path is /upload', () => {
    const result = classifyError({ code: 'notion_unauthorized', message: '' });
    expect(result.actionLink).toEqual({ text: 'Go to the upload page', to: '/upload' });
  });
});

describe('getErrorMessage', () => {
  test('returns plain text — no HTML', () => {
    const msg = getErrorMessage(new Error('Failed to fetch'));
    expect(msg).not.toMatch(/</);
  });
});

describe('classifyUploadError', () => {
  test('unsupported_format returns specific copy about file type', () => {
    const body: UploadErrorBody = { code: 'unsupported_format', message: 'original' };
    const result = classifyUploadError(body);
    expect(result.title).toBe("This file type isn't supported.");
    expect(result.detail).toBe('Use .zip, .html, .md, .pdf, .docx, .xlsx, .pptx, or .csv.');
  });

  test('too_large returns specific copy about splitting the file', () => {
    const body: UploadErrorBody = { code: 'too_large', message: 'original' };
    const result = classifyUploadError(body);
    expect(result.title).toBe('This file is too large.');
  });

  test('password_protected_pdf returns specific copy about removing the password', () => {
    const body: UploadErrorBody = { code: 'password_protected_pdf', message: 'original' };
    const result = classifyUploadError(body);
    expect(result.title).toMatch(/password/i);
  });

  test('invalid_markup returns specific copy about simplifying the block', () => {
    const body: UploadErrorBody = { code: 'invalid_markup', message: 'original' };
    const result = classifyUploadError(body);
    expect(result.title).toBe("Part of this file has formatting we couldn't read.");
    expect(result.detail).toBe('Open the source, remove or simplify the block that broke, and try again.');
  });

  test('unknown falls back to the server message', () => {
    const body: UploadErrorBody = { code: 'unknown', message: 'Something broke.' };
    const result = classifyUploadError(body);
    expect(result.title).toBe('Something broke.');
  });

  test('malformed_notion falls back to the server message', () => {
    const body: UploadErrorBody = { code: 'malformed_notion', message: 'Notion error.' };
    const result = classifyUploadError(body);
    expect(result.title).toBe('Notion error.');
  });

  test('empty message under an unknown code returns the parser-error spec copy', () => {
    const body: UploadErrorBody = { code: 'unknown', message: '' };
    const result = classifyUploadError(body);
    expect(result.title).toBe('Something broke while reading this file.');
    expect(result.detail).toBe(
      'Try again, or send the file to support@2anki.net so we can fix the parser.'
    );
  });
});
