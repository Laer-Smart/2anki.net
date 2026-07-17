import { post, del, get } from './api';
import { get2ankiApi } from './get2ankiApi';

export interface ApiKeySummary {
  id: number;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface CreatedApiKey extends ApiKeySummary {
  secret: string;
}

function base(): string {
  return `${get2ankiApi().baseURL}developer`;
}

async function unwrap(response: Response | null): Promise<unknown> {
  if (response == null) {
    throw new Error('Request was redirected');
  }
  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message != null) message = body.message;
    } catch {
      // non-JSON error
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return text.length > 0 ? JSON.parse(text) : {};
}

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  const body = (await unwrap(await get(`${base()}/keys`))) as {
    keys?: ApiKeySummary[];
  };
  return body.keys ?? [];
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  return (await unwrap(
    await post(`${base()}/keys`, { name })
  )) as CreatedApiKey;
}

export async function revokeApiKey(id: number): Promise<void> {
  await unwrap(await del(`${base()}/keys/${id}`));
}

export async function requestDeveloperAccess(): Promise<void> {
  await unwrap(await post(`${base()}/request-access`, {}));
}
