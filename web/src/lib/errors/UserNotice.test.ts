import { describe, expect, it } from 'vitest';

import {
  UserNotice,
  isIntentionalBackendNotice,
} from './UserNotice';

describe('UserNotice', () => {
  it('is an Error instance', () => {
    const notice = new UserNotice('still running');
    expect(notice).toBeInstanceOf(Error);
    expect(notice).toBeInstanceOf(UserNotice);
  });

  it('preserves message and exposes a name of UserNotice', () => {
    const notice = new UserNotice('Notion is not connected.');
    expect(notice.message).toBe('Notion is not connected.');
    expect(notice.name).toBe('UserNotice');
  });

  it('keeps an optional code field', () => {
    const notice = new UserNotice('expired', 'notion_unauthorized');
    expect(notice.code).toBe('notion_unauthorized');
  });
});

describe('isIntentionalBackendNotice', () => {
  it.each([
    'Notion is not connected.',
    'NOTION IS NOT CONNECTED',
    'API token is invalid.',
    'api token is invalid',
    'An account with this email already exists. Try logging in instead.',
  ])('matches "%s"', (msg) => {
    expect(isIntentionalBackendNotice(msg)).toBe(true);
  });

  it.each(['Something went wrong', 'HTTP error', '', null, undefined])(
    'does not match %s',
    (msg) => {
      expect(isIntentionalBackendNotice(msg as string | null | undefined)).toBe(
        false
      );
    }
  );
});
