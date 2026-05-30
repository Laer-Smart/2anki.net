import {
  SESSION_MAX_AGE_MS,
  sessionCookieOptions,
} from './session';

describe('sessionCookieOptions', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('persists the auth cookie for 30 days, sameSite=lax', () => {
    process.env.NODE_ENV = 'development';
    expect(sessionCookieOptions()).toEqual({
      maxAge: SESSION_MAX_AGE_MS,
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
    });
  });

  it('keeps the auth cookie readable by JS so the SPA can detect login (#2454)', () => {
    process.env.NODE_ENV = 'production';
    expect(sessionCookieOptions().httpOnly).toBeFalsy();
  });

  it('marks the cookie secure in production', () => {
    process.env.NODE_ENV = 'production';
    expect(sessionCookieOptions().secure).toBe(true);
  });

  it('leaves the cookie insecure outside production so local http dev stays signed in', () => {
    process.env.NODE_ENV = 'test';
    expect(sessionCookieOptions().secure).toBe(false);
  });
});
