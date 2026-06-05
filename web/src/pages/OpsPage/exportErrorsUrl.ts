import { ErrorSource, ErrorStatus } from './errorsTypes';

export function buildExportErrorsUrl(
  status: ErrorStatus,
  source: ErrorSource
): string {
  const params = new URLSearchParams({ status });
  if (source !== 'all') {
    params.set('source', source);
  }
  return `/api/ops/errors/export?${params.toString()}`;
}
