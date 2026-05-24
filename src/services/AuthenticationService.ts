import qs from 'querystring';
import crypto from 'crypto';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

import TokenRepository from '../data_layer/TokenRepository';
import UsersRepository from '../data_layer/UsersRepository';
import Users from '../data_layer/public/Users';
import { Knex } from 'knex';
import instrumentedAxios from './observability/instrumentedAxios';

const MICROSOFT_JWKS_URL =
  'https://login.microsoftonline.com/common/discovery/v2.0/keys';
const MICROSOFT_JWKS_TTL_MS = 60 * 60 * 1000;
const MICROSOFT_ISSUER_REGEX =
  /^https:\/\/login\.microsoftonline\.com\/[^/]+\/v2\.0$/;
const MICROSOFT_CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

interface MicrosoftJwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

let cachedMicrosoftJwks: { keys: MicrosoftJwk[]; fetchedAt: number } | null = null;

async function getMicrosoftJwks(): Promise<MicrosoftJwk[]> {
  const now = Date.now();
  if (
    cachedMicrosoftJwks &&
    now - cachedMicrosoftJwks.fetchedAt < MICROSOFT_JWKS_TTL_MS
  ) {
    return cachedMicrosoftJwks.keys;
  }
  const result = await instrumentedAxios.get<{ keys: MicrosoftJwk[] }>(
    'microsoft_login',
    MICROSOFT_JWKS_URL
  );
  cachedMicrosoftJwks = { keys: result.data.keys, fetchedAt: now };
  return result.data.keys;
}

export const __resetMicrosoftJwksCacheForTests = () => {
  cachedMicrosoftJwks = null;
};

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_JWKS_TTL_MS = 60 * 60 * 1000;
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';

interface AppleJwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
  x?: string;
  y?: string;
  crv?: string;
}

let cachedAppleJwks: { keys: AppleJwk[]; fetchedAt: number } | null = null;

async function getAppleJwks(): Promise<AppleJwk[]> {
  const now = Date.now();
  if (cachedAppleJwks && now - cachedAppleJwks.fetchedAt < APPLE_JWKS_TTL_MS) {
    return cachedAppleJwks.keys;
  }
  const result = await instrumentedAxios.get<{ keys: AppleJwk[] }>(
    'apple_login',
    APPLE_JWKS_URL
  );
  cachedAppleJwks = { keys: result.data.keys, fetchedAt: now };
  return result.data.keys;
}

export const __resetAppleJwksCacheForTests = () => {
  cachedAppleJwks = null;
};

export interface UserWithOwner extends Users {
  owner: number;
}

class AuthenticationService {
  constructor(
    private tokenRepository: TokenRepository,
    private usersRepository: UsersRepository
  ) {}

  isValidToken(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!token) {
        resolve(false);
        return;
      }
      try {
        jwt.verify(token, process.env.SECRET!, (error) => {
          resolve(!error);
        });
      } catch {
        resolve(false);
      }
    });
  }

  newResetToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  async isValidResetToken(token: string): Promise<boolean> {
    if (!token || token.length < 128) {
      return false;
    }
    const user = await this.usersRepository.getByResetToken(token);
    return user?.reset_token;
  }

  newJWTToken(userId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        { userId },
        process.env.SECRET!,
        { expiresIn: '1d' },
        (error: Error | null, token: string | undefined) => {
          if (error) {
            reject(error);
          } else if (token) {
            resolve(token);
          } else {
            reject(new Error('Token is undefined'));
          }
        }
      );
    });
  }

  async getUserFrom(token: string): Promise<UserWithOwner | null> {
    const isValid = await this.isValidToken(token);
    if (!isValid) {
      return null;
    }

    const accessToken =
      await this.tokenRepository.getAccessTokenFromString(token);
    if (!accessToken) {
      return null;
    }

    const user = await this.usersRepository.getById(
      accessToken.owner.toString()
    );
    if (!user?.id) {
      return null;
    }
    return { ...user, owner: user.id };
  }

  isNewPasswordValid(resetToken: unknown, password: unknown) {
    return (
      typeof resetToken !== 'string' ||
      resetToken.length === 0 ||
      typeof password !== 'string' ||
      password.length < 8
    );
  }

  logOut(token: string) {
    return this.tokenRepository.deleteAccessToken(token);
  }

  isValidLogin(email: string, password: string) {
    return email && password && password.length >= 8;
  }

  getHashPassword(password: string) {
    return bcrypt.hashSync(password, 12);
  }

  comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  persistToken(token: string, id: string) {
    return this.tokenRepository.updateAccessToken(token, id);
  }

  async getIsSubscriber(db: Knex, email: string) {
    const linkedEmail = await db('subscriptions')
      .select('active')
      .where({ linked_email: email.toLowerCase() })
      .first();

    if (linkedEmail?.active) {
      return true;
    }

    const result = await db('subscriptions')
      .select('active')
      .where({ email: email.toLowerCase() })
      .first();

    return result?.active ?? false;
  }

  async getSubscriptionInfo(db: Knex, email: string) {
    const linkedEmail = await db('subscriptions')
      .select(['active', 'email', 'linked_email'])
      .where({ linked_email: email.toLowerCase() })
      .first();

    if (linkedEmail?.active) {
      return {
        active: true,
        email: linkedEmail.email,
        linked_email: linkedEmail.linked_email,
      };
    }

    const result = await db('subscriptions')
      .select(['active', 'email', 'linked_email'])
      .where({ email: email.toLowerCase() })
      .first();

    return {
      active: result?.active ?? false,
      email: result?.email,
      linked_email: result?.linked_email,
    };
  }

  async loginWithNotion(code: string): Promise<{
    email: string;
    name: string;
    accessData: { [key: string]: string };
  } | null> {
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) return null;

    try {
      const result = await instrumentedAxios.post<{ [key: string]: unknown }>(
        'notion',
        'https://api.notion.com/v1/oauth/token',
        { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
        {
          auth: { username: clientId, password: clientSecret },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const ownerUser = (
        result.data?.owner as {
          user?: { person?: { email?: string }; name?: string };
        }
      )?.user;
      const email = ownerUser?.person?.email;
      const name = ownerUser?.name;
      if (!email) return null;
      return {
        email,
        name: name ?? email.split('@')[0],
        accessData: result.data as { [key: string]: string },
      };
    } catch (error) {
      console.info("Couldn't login with Notion");
      console.error(error);
      return null;
    }
  }

  async loginWithGoogle(code: string) {
    const url = 'https://oauth2.googleapis.com/token';
    const values = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    };
    try {
      const result = await instrumentedAxios.post<{ id_token: string }>(
        'google_drive',
        url,
        qs.stringify(values),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const idToken = result.data.id_token;
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      return {
        email: payload?.email,
        name: payload?.name,
      };
    } catch (error) {
      console.info("Couldn't login with Google");
      console.error(error);
    }
  }

  async loginWithMicrosoft(code: string) {
    const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const values = {
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'openid profile email offline_access',
    };
    try {
      const result = await instrumentedAxios.post<{ id_token: string }>(
        'microsoft_login',
        url,
        qs.stringify(values),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const idToken = result.data.id_token;
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return;
      }
      const kid = decoded.header.kid;
      const alg = decoded.header.alg;
      if (alg !== 'RS256' || typeof kid !== 'string') {
        return;
      }
      const jwks = await getMicrosoftJwks();
      const jwk = jwks.find((k) => k.kid === kid);
      if (!jwk) {
        return;
      }
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
      const payload = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: process.env.MICROSOFT_CLIENT_ID,
      });
      if (typeof payload === 'string') {
        return;
      }
      if (
        typeof payload.iss !== 'string' ||
        !MICROSOFT_ISSUER_REGEX.test(payload.iss)
      ) {
        console.info("Couldn't login with Microsoft: unexpected issuer");
        return;
      }
      const subject = typeof payload.sub === 'string' ? payload.sub : undefined;
      if (!subject) {
        console.info("Couldn't login with Microsoft: missing sub claim");
        return;
      }
      const email =
        typeof payload.email === 'string' && payload.email.length > 0
          ? payload.email
          : undefined;
      const isPersonalMsa =
        typeof payload.tid === 'string' &&
        payload.tid === MICROSOFT_CONSUMER_TENANT_ID;
      const emailVerified =
        isPersonalMsa ||
        payload.email_verified === true ||
        (payload as { xms_edov?: unknown }).xms_edov === true;
      const name = typeof payload.name === 'string' ? payload.name : undefined;
      return { subject, email, name, emailVerified };
    } catch (error) {
      console.info("Couldn't login with Microsoft");
      console.error(error);
    }
  }

  mintAppleClientSecret(): string {
    const teamId = process.env.APPLE_TEAM_ID;
    const servicesId = process.env.APPLE_SERVICES_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const privateKeyPem = process.env.APPLE_PRIVATE_KEY;
    if (!teamId || !servicesId || !keyId || !privateKeyPem) {
      throw new Error('Apple OAuth env vars are not configured');
    }
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        iss: teamId,
        iat: now,
        exp: now + 86400,
        aud: APPLE_ISSUER,
        sub: servicesId,
      },
      privateKeyPem.replace(/\\n/g, '\n'),
      { algorithm: 'ES256', header: { alg: 'ES256', kid: keyId } }
    );
  }

  async loginWithApple(code: string) {
    const servicesId = process.env.APPLE_SERVICES_ID;
    const redirectUri = process.env.APPLE_REDIRECT_URI;
    if (!servicesId || !redirectUri) {
      return undefined;
    }
    try {
      const clientSecret = this.mintAppleClientSecret();
      const values = {
        code,
        client_id: servicesId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      };
      const result = await instrumentedAxios.post<{ id_token: string }>(
        'apple_login',
        APPLE_TOKEN_URL,
        qs.stringify(values),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      const idToken = result.data.id_token;
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return undefined;
      }
      const kid = decoded.header.kid;
      const alg = decoded.header.alg;
      if (alg !== 'ES256' || typeof kid !== 'string') {
        return undefined;
      }
      const jwks = await getAppleJwks();
      const jwk = jwks.find((k) => k.kid === kid);
      if (!jwk) {
        return undefined;
      }
      const publicKey = crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKey, format: 'jwk' });
      const payload = jwt.verify(idToken, publicKey, {
        algorithms: ['ES256'],
        audience: servicesId,
        issuer: APPLE_ISSUER,
      });
      if (typeof payload === 'string') {
        return undefined;
      }
      const subject = typeof payload.sub === 'string' ? payload.sub : undefined;
      if (!subject) {
        console.info("Couldn't login with Apple: missing sub claim");
        return undefined;
      }
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
      if (!emailVerified) {
        console.info("Couldn't login with Apple: email not verified");
        return undefined;
      }
      const email =
        typeof payload.email === 'string' && payload.email.length > 0
          ? payload.email
          : undefined;
      return { subject, email, emailVerified: true as const };
    } catch (error) {
      console.info("Couldn't login with Apple");
      console.error(error);
      return undefined;
    }
  }
}

export default AuthenticationService;
