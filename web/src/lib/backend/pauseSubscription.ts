import { post } from './api';

const UNAUTHORIZED = 401;
const OK = 200;

export type PauseMonths = 1 | 2 | 3;

const readErrorMessage = async (
  response: Response | undefined
): Promise<string> => {
  const fallback = response?.statusText || 'Unknown error';
  return response
    ? response
        .json()
        .then((body: { message?: string }) => body?.message ?? fallback)
        .catch(() => fallback)
    : fallback;
};

export const pauseSubscription = async (
  months: PauseMonths
): Promise<{ message: string; resumes_at?: number }> => {
  const response = await post('/api/users/pause-subscription', { months });

  if (response?.status === UNAUTHORIZED) {
    globalThis.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (response?.status !== OK) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
};

export const resumeSubscription = async (): Promise<{ message: string }> => {
  const response = await post('/api/users/resume-subscription', {});

  if (response?.status === UNAUTHORIZED) {
    globalThis.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (response?.status !== OK) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
};
