import { describe, expect, it } from 'vitest';

import { buildExportErrorsUrl } from './exportErrorsUrl';

describe('buildExportErrorsUrl', () => {
  it('always carries the status and omits source for all', () => {
    expect(buildExportErrorsUrl('unresolved', 'all')).toBe(
      '/api/ops/errors/export?status=unresolved'
    );
  });

  it('carries a specific source', () => {
    expect(buildExportErrorsUrl('resolved', 'server')).toBe(
      '/api/ops/errors/export?status=resolved&source=server'
    );
  });
});
