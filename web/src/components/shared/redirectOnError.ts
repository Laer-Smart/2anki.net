import { reportClientError } from '../../lib/reportClientError';

export const redirectOnError = (error: unknown) => {
  reportClientError(error);
  globalThis.location.href = '/login#login';
};
