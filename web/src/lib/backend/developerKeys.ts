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

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${base()}${path}`, {
    credentials: 'include',
    headers:
      init.body != null
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json' },
    ...init,
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message != null) message = body.message;
    } catch {
      // non-JSON error body
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return text.length > 0 ? JSON.parse(text) : {};
}

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  const body = (await request('/keys')) as { keys?: ApiKeySummary[] };
  return body.keys ?? [];
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  return (await request('/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })) as CreatedApiKey;
}

export async function revokeApiKey(id: number): Promise<void> {
  await request(`/keys/${id}`, { method: 'DELETE' });
}
