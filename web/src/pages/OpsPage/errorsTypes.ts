export interface ErrorGroup {
  message_hash: string;
  message: string;
  stack: string | null;
  url: string | null;
  release: string | null;
  source: string;
  user_id: number | null;
  user_agent: string | null;
  first_seen: string;
  last_seen: string;
  occurrences: number;
  resolved: boolean;
  resolved_at: string | null;
}

export interface ErrorGroupsResponse {
  groups: ErrorGroup[];
  totalGroups: number;
}

export type ErrorSort = 'last_seen' | 'occurrences';
export type ErrorSource = 'all' | 'web' | 'server';
export type ErrorStatus = 'unresolved' | 'resolved' | 'all';
