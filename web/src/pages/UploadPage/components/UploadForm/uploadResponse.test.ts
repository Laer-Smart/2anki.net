import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyConversionSuccess, type ConversionSuccessHandlers } from './uploadResponse';

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

function buildHandlers(): ConversionSuccessHandlers {
  return {
    setWarningMessage: vi.fn(),
    setDeckName: vi.fn(),
    setCardCount: vi.fn(),
    setMcqCount: vi.fn(),
    setMcqSkippedCount: vi.fn(),
    setDownloadLink: vi.fn(),
    setProgressWidth: vi.fn(),
    setBatchResult: vi.fn(),
    setZoneState: vi.fn(),
  };
}

function singleDeckResponse(): Response {
  return {
    headers: new Headers({
      'Content-Type': 'application/octet-stream',
      'X-Card-Count': '5',
    }),
    blob: () => Promise.resolve(new Blob(['fake'])),
  } as unknown as Response;
}

function batchResponse(): Response {
  return {
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () =>
      Promise.resolve({
        kind: 'batch',
        workspaceId: 'ws-1',
        deckCount: 1,
        decks: [{ name: 'A', filename: 'A.apkg', downloadUrl: '/download/ws-1/A.apkg' }],
        bulkUrl: '/download/ws-1/bulk',
      }),
  } as unknown as Response;
}

describe('applyConversionSuccess', () => {
  beforeEach(() => {
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake');
  });

  afterEach(() => {
    delete (globalThis as AnalyticsGlobals).gtag;
    delete (globalThis as AnalyticsGlobals).hj;
    vi.restoreAllMocks();
  });

  it('does not fire conversion_success on the single-deck success path', async () => {
    const gtag = (globalThis as AnalyticsGlobals).gtag!;
    const hj = (globalThis as AnalyticsGlobals).hj!;
    const handlers = buildHandlers();

    await applyConversionSuccess(singleDeckResponse(), handlers);

    expect(gtag).not.toHaveBeenCalledWith('event', 'conversion_success');
    expect(hj).not.toHaveBeenCalledWith('event', 'conversion_success');
    expect(handlers.setZoneState).toHaveBeenCalledWith('success');
  });

  it('does not fire conversion_success on the multi-deck batch path', async () => {
    const gtag = (globalThis as AnalyticsGlobals).gtag!;
    const handlers = buildHandlers();

    await applyConversionSuccess(batchResponse(), handlers);

    expect(gtag).not.toHaveBeenCalledWith('event', 'conversion_success');
    expect(handlers.setZoneState).toHaveBeenCalledWith('multiDeck');
  });
});
