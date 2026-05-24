import express from 'express';

jest.mock('../lib/integrations/stripe', () => ({
  getStripe: jest.fn().mockReturnValue({
    customers: { retrieve: jest.fn() },
    subscriptions: { retrieve: jest.fn(), cancel: jest.fn(), update: jest.fn() },
  }),
  updateStoreSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/SubscriptionService', () => ({
  __esModule: true,
  default: {
    cancelUserSubscriptions: jest.fn(),
    findRecentStripeSubscriptions: jest.fn(),
    countActiveByProductId: jest.fn().mockResolvedValue(0),
    getUserActiveSubscriptions: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../lib/misc/hashToken', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('hashed-token'),
}));

const mockMarkTrialStarted = jest.fn().mockResolvedValue(undefined);
const mockGetById = jest.fn().mockResolvedValue({ patreon: false, trial_started_at: null });

jest.mock('../data_layer/UsersRepository', () => {
  return jest.fn().mockImplementation(() => ({
    setSignupCountryIfMissing: jest.fn().mockResolvedValue(undefined),
    getSignupCountry: jest.fn().mockResolvedValue(null),
    markTrialStarted: mockMarkTrialStarted,
    getById: mockGetById,
    getCardUsage: jest.fn().mockResolvedValue({ cards_used: 0 }),
    getPrintUsage: jest.fn().mockResolvedValue({ prints_used: 0, month_started_at: null }),
  }));
});

import UsersController from './UsersControllers';
import UsersService, { MagicLinkRateLimitError } from '../services/UsersService';
import AuthenticationService from '../services/AuthenticationService';
import OauthIdentitiesRepository from '../data_layer/OauthIdentitiesRepository';

const SAMPLE_PW = '12345678';

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const cookie = jest.fn();
  return { json, status, cookie } as unknown as express.Response & {
    json: jest.Mock;
    status: jest.Mock;
    cookie: jest.Mock;
  };
};

const buildController = (overrides?: {
  getUserFrom?: jest.Mock;
  register?: jest.Mock;
  getHashPassword?: jest.Mock;
  newJWTToken?: jest.Mock;
  persistToken?: jest.Mock;
  updateLastLoginAt?: jest.Mock;
}) => {
  const mockUser = { id: 1, email: 'test@example.com' };
  const userService = {
    getUserFrom: overrides?.getUserFrom ?? jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue(mockUser),
    register: overrides?.register ?? jest.fn().mockResolvedValue([{ id: 1 }]),
    updateLastLoginAt: overrides?.updateLastLoginAt ?? jest.fn().mockResolvedValue(undefined),
  } as unknown as UsersService;
  const authService = {
    getHashPassword:
      overrides?.getHashPassword ?? jest.fn().mockReturnValue('hashed'),
    newJWTToken: overrides?.newJWTToken ?? jest.fn().mockResolvedValue('jwt-tok'),
    persistToken: overrides?.persistToken ?? jest.fn().mockResolvedValue(undefined),
    isValidLogin: jest.fn().mockReturnValue(true),
  } as unknown as AuthenticationService;
  const controller = new UsersController(
    userService,
    authService,
    {} as ReturnType<typeof import('../data_layer').getDatabase>
  );
  return { controller, userService, authService };
};

describe('UsersController.register', () => {
  it('rejects requests missing both email and password with 400', async () => {
    const { controller } = buildController();
    const req = { body: {} } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/email and password/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests missing only the password with 400', async () => {
    const { controller } = buildController();
    const req = { body: { email: 'a@b.com' } } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('auto-logs in the user after registration and sets a JWT cookie', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    const newJWTToken = jest.fn().mockResolvedValue('jwt-reg-tok');
    const persistToken = jest.fn().mockResolvedValue(undefined);
    const updateLastLoginAt = jest.fn().mockResolvedValue(undefined);
    const { controller } = buildController({ register, newJWTToken, persistToken, updateLastLoginAt });
    const req = {
      body: { email: 'jane.doe@example.com', password: SAMPLE_PW },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(register).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith('token', 'jwt-reg-tok');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'jwt-reg-tok' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('still accepts a name when older clients send one', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    const { controller } = buildController({ register });
    const req = {
      body: {
        email: 'alex@example.com',
        password: SAMPLE_PW,
        name: 'Alex',
      },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(register).toHaveBeenCalledWith(
      'Alex',
      'hashed',
      'alex@example.com',
      null
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('persists signup_origin when source matches an allowed landing path', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    const { controller } = buildController({ register });
    const req = {
      body: {
        email: 'al@example.com',
        password: SAMPLE_PW,
        source: '/notion-to-anki',
      },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(register).toHaveBeenCalledWith(
      expect.any(String),
      'hashed',
      'al@example.com',
      '/notion-to-anki'
    );
  });

  it('drops the signup_origin to null when source fails the allowlist regex', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    const { controller } = buildController({ register });
    const req = {
      body: {
        email: 'al@example.com',
        password: SAMPLE_PW,
        source: '<script>alert(1)</script>',
      },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(register).toHaveBeenCalledWith(
      expect.any(String),
      'hashed',
      'al@example.com',
      null
    );
  });

  it('starts the trial after registration when start_trial flag is set', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    const newJWTToken = jest.fn().mockResolvedValue('jwt-trial-tok');
    const persistToken = jest.fn().mockResolvedValue(undefined);
    const updateLastLoginAt = jest.fn().mockResolvedValue(undefined);
    mockMarkTrialStarted.mockClear();
    mockGetById.mockResolvedValue({ patreon: false, trial_started_at: null });

    const { controller } = buildController({ register, newJWTToken, persistToken, updateLastLoginAt });
    const req = {
      body: { email: 'trial@example.com', password: SAMPLE_PW, start_trial: '1' },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith('token', 'jwt-trial-tok');
    expect(mockMarkTrialStarted).toHaveBeenCalledTimes(1);
  });

  it('does not fail registration when start_trial is set but trial already used', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    const newJWTToken = jest.fn().mockResolvedValue('jwt-tok2');
    mockMarkTrialStarted.mockClear();
    mockGetById.mockResolvedValue({ patreon: false, trial_started_at: new Date() });

    const { controller } = buildController({ register, newJWTToken });
    const req = {
      body: { email: 'existing@example.com', password: SAMPLE_PW, start_trial: '1' },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockMarkTrialStarted).not.toHaveBeenCalled();
  });

  it('does not start trial when start_trial flag is absent', async () => {
    const register = jest.fn().mockResolvedValue([{ id: 1 }]);
    mockMarkTrialStarted.mockClear();

    const { controller } = buildController({ register });
    const req = {
      body: { email: 'notrial@example.com', password: SAMPLE_PW },
      query: {},
    } as unknown as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockMarkTrialStarted).not.toHaveBeenCalled();
  });

  it('returns 400 when the email is already registered', async () => {
    const getUserFrom = jest
      .fn()
      .mockResolvedValue({ id: 1, email: 'taken@example.com' });
    const register = jest.fn();
    const { controller } = buildController({ getUserFrom, register });
    const req = {
      body: { email: 'taken@example.com', password: SAMPLE_PW },
    } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.register(req, res, next);

    expect(register).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message:
        'An account with this email already exists. Try logging in instead.',
    });
  });
});

describe('UsersController.verifyEmail', () => {
  const buildVerifyEmailController = (overrides?: {
    verifyMagicToken?: jest.Mock;
    markEmailVerified?: jest.Mock;
    authGetUserFrom?: jest.Mock;
  }) => {
    const userService = {
      verifyMagicToken:
        overrides?.verifyMagicToken ?? jest.fn().mockResolvedValue(null),
      markEmailVerified:
        overrides?.markEmailVerified ?? jest.fn().mockResolvedValue(1),
    } as unknown as UsersService;
    const authService = {
      getUserFrom: overrides?.authGetUserFrom ?? jest.fn().mockResolvedValue(null),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    return { controller, userService };
  };

  const buildVerifyEmailRes = () => {
    const redirect = jest.fn();
    return { redirect } as unknown as express.Response & { redirect: jest.Mock };
  };

  it('redirects to /login?verified=1 when the verify_email token is valid and user is unauthenticated', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 7, purpose: 'verify_email' });
    const markEmailVerified = jest.fn().mockResolvedValue(1);
    const { controller } = buildVerifyEmailController({ verifyMagicToken, markEmailVerified });
    const req = { params: { token: 'valid-verify-tok' }, cookies: {} } as unknown as express.Request;
    const res = buildVerifyEmailRes();
    const next = jest.fn();

    await controller.verifyEmail(req, res, next);

    expect(markEmailVerified).toHaveBeenCalledWith('7');
    expect(res.redirect).toHaveBeenCalledWith('/login?verified=1');
  });

  it('redirects to /account?verified=1 when the token is valid and user is authenticated', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 7, purpose: 'verify_email' });
    const markEmailVerified = jest.fn().mockResolvedValue(1);
    const authGetUserFrom = jest.fn().mockResolvedValue({ id: 7 });
    const { controller } = buildVerifyEmailController({
      verifyMagicToken,
      markEmailVerified,
      authGetUserFrom,
    });
    const req = {
      params: { token: 'valid-verify-tok' },
      cookies: { token: 'session' },
    } as unknown as express.Request;
    const res = buildVerifyEmailRes();
    const next = jest.fn();

    await controller.verifyEmail(req, res, next);

    expect(markEmailVerified).toHaveBeenCalledWith('7');
    expect(res.redirect).toHaveBeenCalledWith('/account?verified=1');
  });

  it('redirects to /login?verify_error=expired when token is invalid and user is unauthenticated', async () => {
    const { controller } = buildVerifyEmailController();
    const req = { params: { token: 'bad-tok' }, cookies: {} } as unknown as express.Request;
    const res = buildVerifyEmailRes();
    const next = jest.fn();

    await controller.verifyEmail(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/login?verify_error=expired');
  });

  it('redirects to /account?verify_error=expired when token is invalid and user is authenticated', async () => {
    const authGetUserFrom = jest.fn().mockResolvedValue({ id: 7 });
    const { controller } = buildVerifyEmailController({ authGetUserFrom });
    const req = { params: { token: 'bad-tok' }, cookies: { token: 'session' } } as unknown as express.Request;
    const res = buildVerifyEmailRes();
    const next = jest.fn();

    await controller.verifyEmail(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/account?verify_error=expired');
  });

  it('redirects to /login?verify_error=expired for non-verify_email purpose tokens when unauthenticated', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 7, purpose: 'login' });
    const { controller } = buildVerifyEmailController({ verifyMagicToken });
    const req = { params: { token: 'login-tok' }, cookies: {} } as unknown as express.Request;
    const res = buildVerifyEmailRes();
    const next = jest.fn();

    await controller.verifyEmail(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/login?verify_error=expired');
  });

  it('logs the error and forwards it to next() when verification throws', async () => {
    const dbError = new Error('Database connection failed');
    const verifyMagicToken = jest.fn().mockRejectedValue(dbError);
    const { controller } = buildVerifyEmailController({ verifyMagicToken });
    const req = { params: { token: 'valid-tok' }, cookies: {} } as unknown as express.Request;
    const res = buildVerifyEmailRes();
    const next = jest.fn();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    try {
      await controller.verifyEmail(req, res, next);

      expect(consoleError).toHaveBeenCalledWith('Email verification failed:', dbError);
      expect(next).toHaveBeenCalledWith(dbError);
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('UsersController.requestMagicLink', () => {
  const buildMagicController = (overrides?: {
    requestMagicLink?: jest.Mock;
  }) => {
    const userService = {
      requestMagicLink:
        overrides?.requestMagicLink ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const authService = {} as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    return { controller, userService };
  };

  it('returns 200 for a valid email and purpose', async () => {
    const { controller } = buildMagicController();
    const req = {
      body: { email: 'al@example.com', purpose: 'login' },
    } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.requestMagicLink(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('defaults purpose to login when not provided', async () => {
    const requestMagicLink = jest.fn().mockResolvedValue(undefined);
    const { controller } = buildMagicController({ requestMagicLink });
    const req = {
      body: { email: 'al@example.com' },
    } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.requestMagicLink(req, res, next);

    expect(requestMagicLink).toHaveBeenCalledWith('al@example.com', 'login');
  });

  it('returns 400 when email is missing', async () => {
    const { controller } = buildMagicController();
    const req = { body: { purpose: 'login' } } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.requestMagicLink(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for an invalid purpose', async () => {
    const { controller } = buildMagicController();
    const req = {
      body: { email: 'al@example.com', purpose: 'evil' },
    } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.requestMagicLink(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid purpose' });
  });

  it('returns 200 even when rate limited to prevent email enumeration', async () => {
    const requestMagicLink = jest
      .fn()
      .mockRejectedValue(new MagicLinkRateLimitError());
    const { controller } = buildMagicController({ requestMagicLink });
    const req = {
      body: { email: 'al@example.com', purpose: 'login' },
    } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.requestMagicLink(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forwards infrastructure errors to next() so ErrorHandler can surface them', async () => {
    const sendgridError = new Error('SendGrid down');
    const requestMagicLink = jest.fn().mockRejectedValue(sendgridError);
    const { controller } = buildMagicController({ requestMagicLink });
    const req = {
      body: { email: 'al@example.com', purpose: 'login' },
    } as express.Request;
    const res = buildRes();
    const next = jest.fn();

    await controller.requestMagicLink(req, res, next);

    expect(next).toHaveBeenCalledWith(sendgridError);
    expect(res.status).not.toHaveBeenCalledWith(200);
  });
});

describe('UsersController.verifyMagicLink', () => {
  const buildVerifyController = (overrides?: {
    verifyMagicToken?: jest.Mock;
    getUserById?: jest.Mock;
    newJWTToken?: jest.Mock;
    persistToken?: jest.Mock;
    updateLastLoginAt?: jest.Mock;
    markEmailVerified?: jest.Mock;
  }) => {
    const userService = {
      verifyMagicToken:
        overrides?.verifyMagicToken ?? jest.fn().mockResolvedValue(null),
      getUserById:
        overrides?.getUserById ??
        jest.fn().mockResolvedValue({ id: 1, email: 'al@example.com' }),
      updateLastLoginAt:
        overrides?.updateLastLoginAt ?? jest.fn().mockResolvedValue(undefined),
      markEmailVerified:
        overrides?.markEmailVerified ?? jest.fn().mockResolvedValue(1),
    } as unknown as UsersService;
    const authService = {
      newJWTToken:
        overrides?.newJWTToken ??
        jest.fn().mockResolvedValue('jwt-token-abc'),
      persistToken:
        overrides?.persistToken ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    return { controller, userService, authService };
  };

  const buildVerifyRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const cookie = jest.fn();
    return { json, status, cookie } as unknown as express.Response & {
      json: jest.Mock;
      status: jest.Mock;
      cookie: jest.Mock;
    };
  };

  it('returns 400 for an invalid token', async () => {
    const { controller } = buildVerifyController();
    const req = { params: { token: 'bad-token' } } as unknown as express.Request;
    const res = buildVerifyRes();
    const next = jest.fn();

    await controller.verifyMagicLink(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'This link is invalid or has expired.',
    });
  });

  it('sets a JWT cookie and returns the token for a login purpose', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 5, purpose: 'login' });
    const newJWTToken = jest.fn().mockResolvedValue('jwt-login-tok');
    const persistToken = jest.fn().mockResolvedValue(undefined);
    const updateLastLoginAt = jest.fn().mockResolvedValue(undefined);
    const getUserById = jest
      .fn()
      .mockResolvedValue({ id: 5, email: 'al@example.com' });
    const { controller } = buildVerifyController({
      verifyMagicToken,
      newJWTToken,
      persistToken,
      updateLastLoginAt,
      getUserById,
    });
    const req = { params: { token: 'valid-tok' } } as unknown as express.Request;
    const res = buildVerifyRes();
    const next = jest.fn();

    await controller.verifyMagicLink(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith('token', 'jwt-login-tok');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: 'jwt-login-tok' });
    expect(persistToken).toHaveBeenCalledWith('jwt-login-tok', '5');
    expect(updateLastLoginAt).toHaveBeenCalledWith('5');
  });

  it('returns purpose and reset_token for a password_reset token', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 8, purpose: 'password_reset' });
    const getUserById = jest
      .fn()
      .mockResolvedValue({ id: 8, email: 'reset@example.com' });
    const updateResetToken = jest.fn().mockResolvedValue(undefined);
    const userService = {
      verifyMagicToken,
      getUserById,
      updateResetToken,
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
      markEmailVerified: jest.fn().mockResolvedValue(1),
    } as unknown as UsersService;
    const authService = {
      newJWTToken: jest.fn().mockResolvedValue('jwt-tok'),
      persistToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    const req = { params: { token: 'reset-tok' } } as unknown as express.Request;
    const res = buildVerifyRes();
    const next = jest.fn();

    await controller.verifyMagicLink(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.purpose).toBe('password_reset');
    expect(typeof jsonCall.reset_token).toBe('string');
    expect(jsonCall.reset_token.length).toBeGreaterThan(0);
    expect(updateResetToken).toHaveBeenCalledWith('8', jsonCall.reset_token);
  });

  it('marks email verified after a successful login magic link', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 5, purpose: 'login' });
    const getUserById = jest
      .fn()
      .mockResolvedValue({ id: 5, email: 'al@example.com' });
    const markEmailVerified = jest.fn().mockResolvedValue(1);
    const { controller } = buildVerifyController({
      verifyMagicToken,
      getUserById,
      markEmailVerified,
    });
    const req = { params: { token: 'valid-tok' } } as unknown as express.Request;
    const res = buildVerifyRes();
    const next = jest.fn();

    await controller.verifyMagicLink(req, res, next);

    expect(markEmailVerified).toHaveBeenCalledWith('5');
  });

  it('marks email verified after a successful password_reset magic link', async () => {
    const verifyMagicToken = jest
      .fn()
      .mockResolvedValue({ userId: 8, purpose: 'password_reset' });
    const getUserById = jest
      .fn()
      .mockResolvedValue({ id: 8, email: 'reset@example.com' });
    const markEmailVerified = jest.fn().mockResolvedValue(1);
    const updateResetToken = jest.fn().mockResolvedValue(undefined);
    const userService = {
      verifyMagicToken,
      getUserById,
      updateResetToken,
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
      markEmailVerified,
    } as unknown as UsersService;
    const authService = {
      newJWTToken: jest.fn().mockResolvedValue('jwt-tok'),
      persistToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    const req = { params: { token: 'reset-tok' } } as unknown as express.Request;
    const res = buildVerifyRes();
    const next = jest.fn();

    await controller.verifyMagicLink(req, res, next);

    expect(markEmailVerified).toHaveBeenCalledWith('8');
  });
});

describe('UsersController.loginWithGoogle', () => {
  const buildGoogleController = (overrides?: {
    getUserFrom?: jest.Mock;
    register?: jest.Mock;
    markEmailVerified?: jest.Mock;
    newJWTToken?: jest.Mock;
    persistToken?: jest.Mock;
    updateLastLoginAt?: jest.Mock;
    loginWithGoogle?: jest.Mock;
  }) => {
    const mockUser = { id: 7, email: 'g@example.com' };
    const userService = {
      getUserFrom:
        overrides?.getUserFrom ??
        jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue(mockUser),
      register: overrides?.register ?? jest.fn().mockResolvedValue([{ id: 7 }]),
      markEmailVerified:
        overrides?.markEmailVerified ?? jest.fn().mockResolvedValue(1),
      updateLastLoginAt:
        overrides?.updateLastLoginAt ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const authService = {
      loginWithGoogle:
        overrides?.loginWithGoogle ??
        jest.fn().mockResolvedValue({ email: 'g@example.com', name: 'Google User' }),
      getHashPassword: jest.fn().mockReturnValue('hashed'),
      newJWTToken:
        overrides?.newJWTToken ?? jest.fn().mockResolvedValue('google-jwt'),
      persistToken:
        overrides?.persistToken ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    return { controller, userService, authService };
  };

  const buildGoogleRes = () => {
    const redirect = jest.fn();
    const cookie = jest.fn();
    const status = jest.fn().mockReturnThis();
    return { redirect, cookie, status } as unknown as express.Response & {
      redirect: jest.Mock;
      cookie: jest.Mock;
      status: jest.Mock;
    };
  };

  it("registers new Google users with signup_origin set to 'google'", async () => {
    const register = jest.fn().mockResolvedValue([{ id: 7 }]);
    const { controller } = buildGoogleController({ register });
    const req = {
      query: { code: 'gauth-code' },
      cookies: {},
      headers: {},
    } as unknown as express.Request;
    const res = buildGoogleRes();

    await controller.loginWithGoogle(req, res);

    expect(register).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'g@example.com',
      'google'
    );
  });

  it('does not call register for an existing Google user', async () => {
    const existingUser = { id: 9, email: 'existing@example.com' };
    const getUserFrom = jest.fn().mockResolvedValue(existingUser);
    const register = jest.fn();
    const { controller } = buildGoogleController({ getUserFrom, register });
    const req = {
      query: { code: 'gauth-code' },
      cookies: {},
      headers: {},
    } as unknown as express.Request;
    const res = buildGoogleRes();

    await controller.loginWithGoogle(req, res);

    expect(register).not.toHaveBeenCalled();
  });

});

jest.mock('../data_layer/OauthIdentitiesRepository');

describe('UsersController.loginWithMicrosoft', () => {
  const MockedOauthIdentitiesRepo =
    OauthIdentitiesRepository as jest.MockedClass<
      typeof OauthIdentitiesRepository
    >;

  beforeEach(() => {
    MockedOauthIdentitiesRepo.mockClear();
    MockedOauthIdentitiesRepo.prototype.findByProviderAndSubject = jest
      .fn()
      .mockResolvedValue(null);
    MockedOauthIdentitiesRepo.prototype.link = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  const buildMicrosoftController = (overrides?: {
    getUserFrom?: jest.Mock;
    getUserById?: jest.Mock;
    register?: jest.Mock;
    markEmailVerified?: jest.Mock;
    newJWTToken?: jest.Mock;
    persistToken?: jest.Mock;
    updateLastLoginAt?: jest.Mock;
    loginWithMicrosoft?: jest.Mock;
  }) => {
    const mockUser = { id: 11, email: 'm@example.com' };
    const userService = {
      getUserFrom:
        overrides?.getUserFrom ??
        jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue(mockUser),
      getUserById: overrides?.getUserById ?? jest.fn().mockResolvedValue(mockUser),
      register: overrides?.register ?? jest.fn().mockResolvedValue([{ id: 11 }]),
      markEmailVerified:
        overrides?.markEmailVerified ?? jest.fn().mockResolvedValue(1),
      updateLastLoginAt:
        overrides?.updateLastLoginAt ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const authService = {
      loginWithMicrosoft:
        overrides?.loginWithMicrosoft ??
        jest.fn().mockResolvedValue({
          subject: 'ms-sub-001',
          email: 'm@example.com',
          name: 'Microsoft User',
          emailVerified: true,
        }),
      getHashPassword: jest.fn().mockReturnValue('hashed'),
      newJWTToken:
        overrides?.newJWTToken ?? jest.fn().mockResolvedValue('microsoft-jwt'),
      persistToken:
        overrides?.persistToken ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    return { controller, userService, authService };
  };

  const buildMicrosoftRes = () => {
    const redirect = jest.fn();
    const cookie = jest.fn();
    const status = jest.fn().mockReturnThis();
    return { redirect, cookie, status } as unknown as express.Response & {
      redirect: jest.Mock;
      cookie: jest.Mock;
      status: jest.Mock;
    };
  };

  const buildReq = (code: string | null = 'mauth-code') =>
    ({
      query: code == null ? {} : { code },
      cookies: {},
      headers: {},
    }) as unknown as express.Request;

  it("creates a new user, links the identity, and stamps signup_origin='microsoft' when the verified email has no existing account", async () => {
    const register = jest.fn().mockResolvedValue([{ id: 11 }]);
    const { controller } = buildMicrosoftController({ register });

    await controller.loginWithMicrosoft(buildReq(), buildMicrosoftRes());

    expect(register).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'm@example.com',
      'microsoft'
    );
    expect(MockedOauthIdentitiesRepo.prototype.link).toHaveBeenCalledWith(
      'microsoft',
      'ms-sub-001',
      11
    );
  });

  it('signs in via subject lookup without calling register or re-linking when the identity already exists', async () => {
    const register = jest.fn();
    MockedOauthIdentitiesRepo.prototype.findByProviderAndSubject = jest
      .fn()
      .mockResolvedValue({ user_id: 42, provider: 'microsoft', subject: 'ms-sub-001' });
    const getUserById = jest.fn().mockResolvedValue({ id: 42, email: 'returner@outlook.com' });

    const { controller } = buildMicrosoftController({ register, getUserById });

    await controller.loginWithMicrosoft(buildReq(), buildMicrosoftRes());

    expect(getUserById).toHaveBeenCalledWith('42');
    expect(register).not.toHaveBeenCalled();
    expect(MockedOauthIdentitiesRepo.prototype.link).not.toHaveBeenCalled();
  });

  it('links the identity to the existing user when verified email matches but no identity row exists yet', async () => {
    const existingUser = { id: 13, email: 'existing@outlook.com' };
    const getUserFrom = jest.fn().mockResolvedValue(existingUser);
    const register = jest.fn();

    const { controller } = buildMicrosoftController({ getUserFrom, register });

    await controller.loginWithMicrosoft(buildReq(), buildMicrosoftRes());

    expect(register).not.toHaveBeenCalled();
    expect(MockedOauthIdentitiesRepo.prototype.link).toHaveBeenCalledWith(
      'microsoft',
      'ms-sub-001',
      13
    );
  });

  it('redirects to /login and records the error when the email is not verified', async () => {
    const register = jest.fn();
    const loginWithMicrosoft = jest.fn().mockResolvedValue({
      subject: 'ms-sub-002',
      email: 'unverified@example.com',
      name: 'Unverified',
      emailVerified: false,
    });
    const { controller } = buildMicrosoftController({ loginWithMicrosoft, register });
    const res = buildMicrosoftRes();

    await controller.loginWithMicrosoft(buildReq(), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(register).not.toHaveBeenCalled();
    expect(MockedOauthIdentitiesRepo.prototype.link).not.toHaveBeenCalled();
  });

  it('redirects to /login when the email claim is missing and no identity exists', async () => {
    const register = jest.fn();
    const loginWithMicrosoft = jest.fn().mockResolvedValue({
      subject: 'ms-sub-003',
      email: undefined,
      name: 'No Email',
      emailVerified: true,
    });
    const { controller } = buildMicrosoftController({ loginWithMicrosoft, register });
    const res = buildMicrosoftRes();

    await controller.loginWithMicrosoft(buildReq(), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(register).not.toHaveBeenCalled();
  });

  it('redirects to /login when the OAuth code is missing', async () => {
    const { controller } = buildMicrosoftController();
    const res = buildMicrosoftRes();

    await controller.loginWithMicrosoft(buildReq(null), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when the token exchange fails', async () => {
    const loginWithMicrosoft = jest.fn().mockResolvedValue(undefined);
    const { controller } = buildMicrosoftController({ loginWithMicrosoft });
    const res = buildMicrosoftRes();

    await controller.loginWithMicrosoft(buildReq('bad-code'), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});

describe('UsersController.loginWithApple', () => {
  const MockedOauthIdentitiesRepo =
    OauthIdentitiesRepository as jest.MockedClass<typeof OauthIdentitiesRepository>;

  beforeEach(() => {
    MockedOauthIdentitiesRepo.mockClear();
    MockedOauthIdentitiesRepo.prototype.findByProviderAndSubject = jest
      .fn()
      .mockResolvedValue(null);
    MockedOauthIdentitiesRepo.prototype.link = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  const buildAppleController = (overrides?: {
    getUserFrom?: jest.Mock;
    getUserById?: jest.Mock;
    register?: jest.Mock;
    markEmailVerified?: jest.Mock;
    newJWTToken?: jest.Mock;
    persistToken?: jest.Mock;
    updateLastLoginAt?: jest.Mock;
    loginWithApple?: jest.Mock;
  }) => {
    const mockUser = { id: 20, email: 'apple@example.com' };
    const userService = {
      getUserFrom:
        overrides?.getUserFrom ??
        jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue(mockUser),
      getUserById: overrides?.getUserById ?? jest.fn().mockResolvedValue(mockUser),
      register: overrides?.register ?? jest.fn().mockResolvedValue([{ id: 20 }]),
      markEmailVerified:
        overrides?.markEmailVerified ?? jest.fn().mockResolvedValue(1),
      updateLastLoginAt:
        overrides?.updateLastLoginAt ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const authService = {
      loginWithApple:
        overrides?.loginWithApple ??
        jest.fn().mockResolvedValue({
          subject: 'apple-sub-001',
          email: 'apple@example.com',
          emailVerified: true,
        }),
      getHashPassword: jest.fn().mockReturnValue('hashed'),
      newJWTToken:
        overrides?.newJWTToken ?? jest.fn().mockResolvedValue('apple-jwt'),
      persistToken:
        overrides?.persistToken ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    return { controller, userService, authService };
  };

  const buildAppleRes = () => {
    const redirect = jest.fn();
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const status = jest.fn().mockReturnThis();
    return { redirect, cookie, clearCookie, status } as unknown as express.Response & {
      redirect: jest.Mock;
      cookie: jest.Mock;
      clearCookie: jest.Mock;
      status: jest.Mock;
    };
  };

  const buildReq = (opts?: {
    code?: string | null;
    state?: string;
    stateCookie?: string;
    userField?: string;
  }) => {
    const state = opts?.state ?? 'valid-state-token';
    const stateCookie = opts?.stateCookie ?? 'valid-state-token';
    const code = opts?.code === null ? undefined : (opts?.code ?? 'apple-auth-code');
    const body: Record<string, string | undefined> = { state, code };
    if (opts?.userField) {
      body.user = opts.userField;
    }
    return {
      body,
      cookies: stateCookie ? { apple_login_state: stateCookie } : {},
      headers: {},
      query: {},
    } as unknown as express.Request;
  };

  it("creates a new user, links the identity, and stamps signup_origin='apple' when the email has no existing account", async () => {
    const register = jest.fn().mockResolvedValue([{ id: 20 }]);
    const { controller } = buildAppleController({ register });

    await controller.loginWithApple(buildReq(), buildAppleRes());

    expect(register).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'apple@example.com',
      'apple'
    );
    expect(MockedOauthIdentitiesRepo.prototype.link).toHaveBeenCalledWith(
      'apple',
      'apple-sub-001',
      20
    );
  });

  it('signs in via subject lookup without calling register when the identity already exists', async () => {
    const register = jest.fn();
    MockedOauthIdentitiesRepo.prototype.findByProviderAndSubject = jest
      .fn()
      .mockResolvedValue({ user_id: 20, provider: 'apple', subject: 'apple-sub-001' });
    const getUserById = jest.fn().mockResolvedValue({ id: 20, email: 'apple@example.com' });

    const { controller } = buildAppleController({ register, getUserById });

    await controller.loginWithApple(buildReq(), buildAppleRes());

    expect(getUserById).toHaveBeenCalledWith('20');
    expect(register).not.toHaveBeenCalled();
    expect(MockedOauthIdentitiesRepo.prototype.link).not.toHaveBeenCalled();
  });

  it('links the identity to the existing user when email matches but no identity row exists yet', async () => {
    const existingUser = { id: 21, email: 'existing@example.com' };
    const getUserFrom = jest.fn().mockResolvedValue(existingUser);
    const register = jest.fn();

    const { controller } = buildAppleController({ getUserFrom, register });

    await controller.loginWithApple(buildReq(), buildAppleRes());

    expect(register).not.toHaveBeenCalled();
    expect(MockedOauthIdentitiesRepo.prototype.link).toHaveBeenCalledWith(
      'apple',
      'apple-sub-001',
      21
    );
  });

  it('redirects to /login when the state cookie is missing', async () => {
    const { controller } = buildAppleController();
    const res = buildAppleRes();

    await controller.loginWithApple(
      buildReq({ stateCookie: '' }),
      res
    );

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when the state parameter does not match the cookie', async () => {
    const { controller } = buildAppleController();
    const res = buildAppleRes();

    await controller.loginWithApple(
      buildReq({ state: 'tampered', stateCookie: 'valid-state-token' }),
      res
    );

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when the code is absent', async () => {
    const { controller } = buildAppleController();
    const res = buildAppleRes();

    await controller.loginWithApple(buildReq({ code: null }), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when the token exchange fails', async () => {
    const loginWithApple = jest.fn().mockResolvedValue(undefined);
    const { controller } = buildAppleController({ loginWithApple });
    const res = buildAppleRes();

    await controller.loginWithApple(buildReq(), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when email is missing and no identity exists', async () => {
    const loginWithApple = jest.fn().mockResolvedValue({
      subject: 'apple-sub-noemail',
      email: undefined,
      emailVerified: true,
    });
    const { controller } = buildAppleController({ loginWithApple });
    const res = buildAppleRes();

    await controller.loginWithApple(buildReq(), res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});

describe('UsersController.loginWithNotion', () => {
  const buildNotionDb = () => {
    const chainable: Record<string, jest.Mock> = {};
    const methods = ['insert', 'where', 'first', 'whereNull', 'update', 'onConflict', 'merge'];
    for (const m of methods) {
      chainable[m] = jest.fn().mockReturnValue(Promise.resolve([1]));
    }
    for (const m of ['where', 'whereNull', 'onConflict']) {
      chainable[m] = jest.fn().mockReturnValue(chainable);
    }
    chainable['insert'] = jest.fn().mockReturnValue(chainable);
    chainable['merge'] = jest.fn().mockResolvedValue([1]);
    const mockDb = jest.fn().mockReturnValue(chainable);
    return mockDb as unknown as ReturnType<typeof import('../data_layer').getDatabase>;
  };

  const buildNotionController = (overrides?: {
    getUserFrom?: jest.Mock;
    register?: jest.Mock;
    newJWTToken?: jest.Mock;
    persistToken?: jest.Mock;
    updateLastLoginAt?: jest.Mock;
    loginWithNotion?: jest.Mock;
  }) => {
    const mockUser = { id: 11, email: 'n@example.com' };
    const userService = {
      getUserFrom:
        overrides?.getUserFrom ??
        jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue(mockUser),
      register: overrides?.register ?? jest.fn().mockResolvedValue([{ id: 11 }]),
      updateLastLoginAt:
        overrides?.updateLastLoginAt ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const authService = {
      loginWithNotion:
        overrides?.loginWithNotion ??
        jest.fn().mockResolvedValue({
          email: 'n@example.com',
          name: 'Notion User',
          accessData: {},
        }),
      getHashPassword: jest.fn().mockReturnValue('hashed'),
      newJWTToken:
        overrides?.newJWTToken ?? jest.fn().mockResolvedValue('notion-jwt'),
      persistToken:
        overrides?.persistToken ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      buildNotionDb()
    );
    return { controller, userService, authService };
  };

  const buildNotionRes = () => {
    const redirect = jest.fn();
    const cookie = jest.fn();
    const status = jest.fn().mockReturnThis();
    return { redirect, cookie, status } as unknown as express.Response & {
      redirect: jest.Mock;
      cookie: jest.Mock;
      status: jest.Mock;
    };
  };

  it("registers new Notion users with signup_origin set to 'notion_oauth'", async () => {
    const register = jest.fn().mockResolvedValue([{ id: 11 }]);
    const { controller } = buildNotionController({ register });
    const req = {
      query: { code: 'notion-code' },
      cookies: {},
      headers: {},
    } as unknown as express.Request;
    const res = buildNotionRes();

    await controller.loginWithNotion(req, res);

    expect(register).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'n@example.com',
      'notion_oauth'
    );
  });

  it('does not call register for an existing Notion user', async () => {
    const existingUser = { id: 12, email: 'existing@example.com' };
    const getUserFrom = jest.fn().mockResolvedValue(existingUser);
    const register = jest.fn();
    const { controller } = buildNotionController({ getUserFrom, register });
    const req = {
      query: { code: 'notion-code' },
      cookies: {},
      headers: {},
    } as unknown as express.Request;
    const res = buildNotionRes();

    await controller.loginWithNotion(req, res);

    expect(register).not.toHaveBeenCalled();
  });
});

describe('UsersController.getLocals', () => {
  it('includes email_verified in the user object', async () => {
    const mockUser = {
      id: 1,
      email: 'al@example.com',
      email_verified: true,
      patreon: false,
      ankify_welcome_seen: false,
      trial_started_at: null,
      hosted_anki_requested_at: null,
      owner: 1,
    };
    const userService = {
      getSubscriptionLinkedEmail: jest.fn().mockResolvedValue(null),
    } as unknown as UsersService;
    const authService = {
      getUserFrom: jest.fn().mockResolvedValue(mockUser),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    const req = { cookies: { token: 'valid' } } as unknown as express.Request;
    const res = {
      locals: {},
      json: jest.fn(),
    } as unknown as express.Response & { json: jest.Mock };

    await controller.getLocals(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.user.email_verified).toBe(true);
  });

  it('surfaces chat_consent_at on the user object so the consent modal closes after accept', async () => {
    const consentAt = new Date('2026-05-16T20:00:00.000Z');
    const mockUser = {
      id: 3,
      email: 'c@example.com',
      email_verified: true,
      patreon: false,
      ankify_welcome_seen: false,
      trial_started_at: null,
      hosted_anki_requested_at: null,
      chat_consent_at: consentAt,
      owner: 3,
    };
    const userService = {
      getSubscriptionLinkedEmail: jest.fn().mockResolvedValue(null),
    } as unknown as UsersService;
    const authService = {
      getUserFrom: jest.fn().mockResolvedValue(mockUser),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    const req = { cookies: { token: 'valid' } } as unknown as express.Request;
    const res = {
      locals: {},
      json: jest.fn(),
    } as unknown as express.Response & { json: jest.Mock };

    await controller.getLocals(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.user.chat_consent_at).toEqual(consentAt);
  });

  it('defaults chat_consent_at to null when the user has not consented', async () => {
    const mockUser = {
      id: 4,
      email: 'd@example.com',
      email_verified: true,
      patreon: false,
      ankify_welcome_seen: false,
      trial_started_at: null,
      hosted_anki_requested_at: null,
      chat_consent_at: null,
      owner: 4,
    };
    const userService = {
      getSubscriptionLinkedEmail: jest.fn().mockResolvedValue(null),
    } as unknown as UsersService;
    const authService = {
      getUserFrom: jest.fn().mockResolvedValue(mockUser),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    const req = { cookies: { token: 'valid' } } as unknown as express.Request;
    const res = {
      locals: {},
      json: jest.fn(),
    } as unknown as express.Response & { json: jest.Mock };

    await controller.getLocals(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.user.chat_consent_at).toBeNull();
  });

  it('defaults email_verified to false when user has no value', async () => {
    const mockUser = {
      id: 2,
      email: 'b@example.com',
      email_verified: undefined,
      patreon: false,
      ankify_welcome_seen: false,
      trial_started_at: null,
      hosted_anki_requested_at: null,
      owner: 2,
    };
    const userService = {
      getSubscriptionLinkedEmail: jest.fn().mockResolvedValue(null),
    } as unknown as UsersService;
    const authService = {
      getUserFrom: jest.fn().mockResolvedValue(mockUser),
    } as unknown as AuthenticationService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>
    );
    const req = { cookies: { token: 'valid' } } as unknown as express.Request;
    const res = {
      locals: {},
      json: jest.fn(),
    } as unknown as express.Response & { json: jest.Mock };

    await controller.getLocals(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.user.email_verified).toBe(false);
  });
});

describe('UsersController.loginWithGoogle — error recording', () => {
  const buildOAuthController = (
    loginWithGoogleResult: Record<string, unknown> | null,
    getUserFromResult: Record<string, unknown> | null = null
  ) => {
    const recordExecute = jest.fn().mockResolvedValue(undefined);
    const recordError = { execute: recordExecute };

    const authService = {
      loginWithGoogle: jest.fn().mockResolvedValue(loginWithGoogleResult),
      getHashPassword: jest.fn().mockReturnValue('hashed'),
      newJWTToken: jest.fn().mockResolvedValue(null),
      persistToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const userService = {
      getUserFrom: jest.fn().mockResolvedValue(getUserFromResult),
      register: jest.fn().mockResolvedValue(undefined),
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
      markEmailVerified: jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>,
      recordError as unknown as import('../usecases/observability/RecordUserVisibleErrorUseCase').RecordUserVisibleErrorUseCase
    );
    return { controller, recordExecute };
  };

  const buildRedirectRes = () => {
    const redirect = jest.fn();
    const status = jest.fn().mockReturnValue({ send: jest.fn() });
    return { redirect, status } as unknown as express.Response & {
      redirect: jest.Mock;
      status: jest.Mock;
    };
  };

  it('records oauth_cancelled when code query param is absent', async () => {
    const { controller, recordExecute } = buildOAuthController(null);
    const req = { query: {} } as unknown as express.Request;
    const res = buildRedirectRes();

    await controller.loginWithGoogle(req, res);

    expect(recordExecute).toHaveBeenCalledWith({
      userId: null,
      surface: 'oauth_google',
      code: 'oauth_cancelled',
    });
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('records oauth_token_exchange_failed when loginWithGoogle returns null', async () => {
    const { controller, recordExecute } = buildOAuthController(null);
    const req = { query: { code: 'auth-code-123' } } as unknown as express.Request;
    const res = buildRedirectRes();

    await controller.loginWithGoogle(req, res);

    expect(recordExecute).toHaveBeenCalledWith({
      userId: null,
      surface: 'oauth_google',
      code: 'oauth_token_exchange_failed',
    });
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('records oauth_user_creation_failed when user lookup returns null after register', async () => {
    const { controller, recordExecute } = buildOAuthController(
      { email: 'x@google.com', name: 'X' },
      null
    );
    const req = { query: { code: 'auth-code-123' }, headers: {} } as unknown as express.Request;
    const res = buildRedirectRes();

    await controller.loginWithGoogle(req, res);

    expect(recordExecute).toHaveBeenCalledWith({
      userId: null,
      surface: 'oauth_google',
      code: 'oauth_user_creation_failed',
    });
  });
});

describe('UsersController.loginWithNotion — error recording', () => {
  const buildNotionController = (
    loginWithNotionResult: Record<string, unknown> | null,
    getUserFromResult: Record<string, unknown> | null = null
  ) => {
    const recordExecute = jest.fn().mockResolvedValue(undefined);
    const recordError = { execute: recordExecute };

    const authService = {
      loginWithNotion: jest.fn().mockResolvedValue(loginWithNotionResult),
      getHashPassword: jest.fn().mockReturnValue('hashed'),
      newJWTToken: jest.fn().mockResolvedValue(null),
      persistToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticationService;
    const userService = {
      getUserFrom: jest.fn().mockResolvedValue(getUserFromResult),
      register: jest.fn().mockResolvedValue(undefined),
      updateLastLoginAt: jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const controller = new UsersController(
      userService,
      authService,
      {} as ReturnType<typeof import('../data_layer').getDatabase>,
      recordError as unknown as import('../usecases/observability/RecordUserVisibleErrorUseCase').RecordUserVisibleErrorUseCase
    );
    return { controller, recordExecute };
  };

  const buildRedirectRes = () => {
    const redirect = jest.fn();
    const status = jest.fn().mockReturnValue({ send: jest.fn() });
    return { redirect, status } as unknown as express.Response & {
      redirect: jest.Mock;
      status: jest.Mock;
    };
  };

  it('records oauth_cancelled when code query param is absent', async () => {
    const { controller, recordExecute } = buildNotionController(null);
    const req = { query: {} } as unknown as express.Request;
    const res = buildRedirectRes();

    await controller.loginWithNotion(req, res);

    expect(recordExecute).toHaveBeenCalledWith({
      userId: null,
      surface: 'oauth_notion',
      code: 'oauth_cancelled',
    });
    expect(res.redirect).toHaveBeenCalledWith('/login?error=notion_cancelled');
  });

  it('records oauth_token_exchange_failed when loginWithNotion returns null', async () => {
    const { controller, recordExecute } = buildNotionController(null);
    const req = { query: { code: 'notion-code' } } as unknown as express.Request;
    const res = buildRedirectRes();

    await controller.loginWithNotion(req, res);

    expect(recordExecute).toHaveBeenCalledWith({
      userId: null,
      surface: 'oauth_notion',
      code: 'oauth_token_exchange_failed',
    });
  });

  it('records oauth_user_creation_failed when user lookup returns null after register', async () => {
    const { controller, recordExecute } = buildNotionController(
      { email: 'n@notion.so', name: 'N', accessData: {} },
      null
    );
    const req = { query: { code: 'notion-code' }, headers: {} } as unknown as express.Request;
    const res = buildRedirectRes();

    await controller.loginWithNotion(req, res);

    expect(recordExecute).toHaveBeenCalledWith({
      userId: null,
      surface: 'oauth_notion',
      code: 'oauth_user_creation_failed',
    });
  });
});

