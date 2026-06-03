export type RecentSourceType = 'notion' | 'remote_upload';

export interface RecentSource {
  id: string;
  title: string;
  type: RecentSourceType;
  updatedAt: string;
  convertUrl: string;
}

interface RecentSourcesResponse {
  sources: RecentSource[];
}

export async function getRecentSources(): Promise<RecentSource[]> {
  const response = await globalThis.fetch('/api/upload/recent-sources', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as RecentSourcesResponse;
  return Array.isArray(data.sources) ? data.sources : [];
}
