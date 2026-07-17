export interface GrantDeveloperAccessResponse {
  updated: number;
  granted: boolean;
}

export async function grantDeveloperAccess(
  email: string,
  grant: boolean
): Promise<GrantDeveloperAccessResponse> {
  const response = await fetch('/api/ops/developer-access', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, grant }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
