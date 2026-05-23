import { render, act, waitFor, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import UploadForm from './UploadForm';

vi.mock('../../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

vi.mock('../../../../lib/hooks/useUserLocals', () => ({
  useUserLocals: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('../../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: vi.fn(() => ({
    startTrial: vi.fn().mockResolvedValue({ ok: false }),
  })),
}));

import { useUserLocals } from '../../../../lib/hooks/useUserLocals';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';

const mockUseUserLocals = vi.mocked(useUserLocals);
const mockGet2ankiApi = vi.mocked(get2ankiApi);

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

function renderUploadForm(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('UploadForm', () => {
  test('no null classes', () => {
    const { container } = renderUploadForm(
      <UploadForm setErrorMessage={vi.fn()} />
    );
    expect(container.querySelector('.null')).toBeNull();
  });

  test('renders the Google Drive chip enabled when env vars are configured', () => {
    const previousClient = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const previousKey = process.env.REACT_APP_GOOGLE_API_KEY;
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-client';
    process.env.REACT_APP_GOOGLE_API_KEY = 'test-key';
    try {
      const { container } = renderUploadForm(
        <UploadForm setErrorMessage={vi.fn()} />
      );
      const chip = container.querySelector('button[aria-label="Google Drive"]');
      expect(chip).not.toBeNull();
      expect(chip?.hasAttribute('disabled')).toBe(false);
    } finally {
      process.env.REACT_APP_GOOGLE_CLIENT_ID = previousClient;
      process.env.REACT_APP_GOOGLE_API_KEY = previousKey;
    }
  });

  test('renders the Google Drive chip disabled when env vars are missing', () => {
    const previousClient = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const previousKey = process.env.REACT_APP_GOOGLE_API_KEY;
    process.env.REACT_APP_GOOGLE_CLIENT_ID = '';
    process.env.REACT_APP_GOOGLE_API_KEY = '';
    try {
      const { container } = renderUploadForm(
        <UploadForm setErrorMessage={vi.fn()} />
      );
      const chip = container.querySelector('button[aria-label="Google Drive"]');
      expect(chip).not.toBeNull();
      expect(chip?.hasAttribute('disabled')).toBe(true);
    } finally {
      process.env.REACT_APP_GOOGLE_CLIENT_ID = previousClient;
      process.env.REACT_APP_GOOGLE_API_KEY = previousKey;
    }
  });
});

describe('UploadForm analytics events', () => {
  beforeEach(() => {
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    (globalThis as AnalyticsGlobals).hj = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as AnalyticsGlobals).gtag;
    delete (globalThis as AnalyticsGlobals).hj;
    vi.restoreAllMocks();
  });

  it('fires upload_started when the form is submitted', async () => {
    const gtag = (globalThis as AnalyticsGlobals).gtag!;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="deck.apkg"',
        'X-Card-Count': '5',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);

    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(gtag).toHaveBeenCalledWith('event', 'upload_started');
  });

  it('tracks upload_started with source=file on form submit', async () => {
    const { track } = await import('../../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="deck.apkg"',
        'X-Card-Count': '5',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(trackMock).toHaveBeenCalledWith('upload_started', { source: 'file' });
  });

  it('tracks upload_started with source=dropbox when Dropbox chooser returns a file', async () => {
    const { track } = await import('../../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    (window as unknown as { Dropbox?: unknown }).Dropbox = {
      choose: ({ success }: { success: (files: unknown[]) => void }) => {
        success([
          {
            id: 'id:2',
            name: 'notes.pdf',
            bytes: 100,
            icon: 'page',
            isDir: false,
            link: 'https://dl.dropboxusercontent.com/x/notes.pdf',
            linkType: 'direct',
          },
        ]);
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="deck.apkg"',
        'X-Card-Count': '3',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const button = container.querySelector('button[aria-label="Choose from Dropbox"]') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });

    await waitFor(() =>
      expect(trackMock).toHaveBeenCalledWith('upload_started', { source: 'dropbox' })
    );

    delete (window as unknown as { Dropbox?: unknown }).Dropbox;
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('fires conversion_success on a successful conversion with cards', async () => {
    const gtag = (globalThis as AnalyticsGlobals).gtag!;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="deck.apkg"',
        'X-Card-Count': '5',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);

    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(gtag).toHaveBeenCalledWith('event', 'conversion_success');
  });

  it('posts to /api/upload/dropbox when the chooser returns a file', async () => {
    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    (window as unknown as { Dropbox?: unknown }).Dropbox = {
      choose: ({ success }: { success: (files: unknown[]) => void }) => {
        success([
          {
            id: 'id:1',
            name: 'pharm.pdf',
            bytes: 200,
            icon: 'page_white_acrobat',
            isDir: false,
            link: 'https://dl.dropboxusercontent.com/x/pharm.pdf',
            linkType: 'direct',
          },
        ]);
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="deck.apkg"',
        'X-Card-Count': '7',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const button = container.querySelector(
      'button[aria-label="Choose from Dropbox"]'
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    await act(async () => {
      button.click();
    });
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.find(
          (call) => call[0] === '/api/upload/dropbox'
        )
      ).toBeDefined()
    );
    const dropboxCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/upload/dropbox'
    )!;
    expect(dropboxCall[1]).toEqual(expect.objectContaining({ method: 'post' }));
    const body = dropboxCall[1].body as FormData;
    expect(JSON.parse(body.get('files') as string)).toEqual([
      expect.objectContaining({ name: 'pharm.pdf', linkType: 'direct' }),
    ]);

    delete (window as unknown as { Dropbox?: unknown }).Dropbox;
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('shows the local panel and hides the Dropbox panel by default', () => {
    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const localPanel = container.querySelector('#upload-panel-local')!;
    const dropboxPanel = container.querySelector('#upload-panel-dropbox')!;
    expect(localPanel.getAttribute('aria-hidden')).toBe('false');
    expect(dropboxPanel.getAttribute('aria-hidden')).toBe('true');
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('reveals the Dropbox panel and hides the local panel when the Dropbox chip is clicked', async () => {
    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const dropboxChip = container.querySelector('button[aria-label="Dropbox"]') as HTMLButtonElement;
    expect(dropboxChip).toBeTruthy();
    await act(async () => {
      dropboxChip.click();
    });
    const localPanel = container.querySelector('#upload-panel-local')!;
    const dropboxPanel = container.querySelector('#upload-panel-dropbox')!;
    expect(localPanel.getAttribute('aria-hidden')).toBe('true');
    expect(dropboxPanel.getAttribute('aria-hidden')).toBe('false');
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('keeps the same file input mounted across a chip switch round-trip', async () => {
    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const before = container.querySelector('input#pakker');
    const dropboxChip = container.querySelector('button[aria-label="Dropbox"]') as HTMLButtonElement;
    await act(async () => {
      dropboxChip.click();
    });
    await act(async () => {
      dropboxChip.click();
    });
    const after = container.querySelector('input#pakker');
    expect(after).toBe(before);
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('shows a "Change source" button inside the Dropbox panel after selecting Dropbox', async () => {
    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const dropboxChip = container.querySelector('button[aria-label="Dropbox"]') as HTMLButtonElement;
    await act(async () => {
      dropboxChip.click();
    });
    const changeBtn = container.querySelector('button[aria-label="Change upload source"]');
    expect(changeBtn).not.toBeNull();
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('clicking "Change source" in the Dropbox panel returns to the local panel', async () => {
    const previousKey = process.env.REACT_APP_DROPBOX_APP_KEY;
    process.env.REACT_APP_DROPBOX_APP_KEY = 'test-key';
    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const dropboxChip = container.querySelector('button[aria-label="Dropbox"]') as HTMLButtonElement;
    await act(async () => {
      dropboxChip.click();
    });
    const changeBtn = container.querySelector('button[aria-label="Change upload source"]') as HTMLButtonElement;
    await act(async () => {
      changeBtn.click();
    });
    const localPanel = container.querySelector('#upload-panel-local')!;
    const dropboxPanel = container.querySelector('#upload-panel-dropbox')!;
    expect(localPanel.getAttribute('aria-hidden')).toBe('false');
    expect(dropboxPanel.getAttribute('aria-hidden')).toBe('true');
    process.env.REACT_APP_DROPBOX_APP_KEY = previousKey;
  });

  it('does not fire conversion_success when the deck is empty', async () => {
    const gtag = (globalThis as AnalyticsGlobals).gtag!;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'X-Card-Count': '0',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);

    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(gtag).not.toHaveBeenCalledWith('event', 'conversion_success');
  });

  it('shows the inline chat toggle in the error state instead of a deep-link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const toggle = container.querySelector('button[aria-controls="error-state-chat-panel"]');
      expect(toggle).not.toBeNull();
      expect(toggle?.textContent).toContain('Talk it through instead');
    });
    expect(container.querySelector('a[href*="/chat?from=upload"]')).toBeNull();
  });

  it('fires upload_error_chat_shown once when the error state mounts', async () => {
    const { track } = await import('../../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('button[aria-controls="error-state-chat-panel"]')).not.toBeNull();
    });

    const chatShownCalls = trackMock.mock.calls.filter(
      ([name]) => name === 'upload_error_chat_shown'
    );
    expect(chatShownCalls).toHaveLength(1);
  });

  it('fires upload_error_chat_engaged on first expand of the inline panel', async () => {
    const { track } = await import('../../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('button[aria-controls="error-state-chat-panel"]')).not.toBeNull();
    });

    const toggle = container.querySelector('button[aria-controls="error-state-chat-panel"]') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(toggle);
    });
    await act(async () => {
      fireEvent.click(toggle);
    });

    const engagedCalls = trackMock.mock.calls.filter(
      ([name]) => name === 'upload_error_chat_engaged'
    );
    expect(engagedCalls).toHaveLength(1);
  });

  it('shows the inline chat toggle in the empty-deck state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'X-Card-Count': '0',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const toggle = container.querySelector('button[aria-expanded]');
      expect(toggle).not.toBeNull();
      expect(toggle?.textContent).toContain('Ask Claude about this file');
      expect(toggle?.getAttribute('aria-controls')).toBe('empty-deck-chat-panel');
    });
  });

  it('fires upload_empty_deck_chat_shown once when the empty-deck state mounts', async () => {
    const { track } = await import('../../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'X-Card-Count': '0',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('button[aria-expanded]')).not.toBeNull();
    });

    const shownCalls = trackMock.mock.calls.filter(
      ([name]) => name === 'upload_empty_deck_chat_shown'
    );
    expect(shownCalls).toHaveLength(1);
  });

  it('fires upload_empty_deck_chat_engaged on first expand', async () => {
    const { track } = await import('../../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'X-Card-Count': '0',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('button[aria-expanded]')).not.toBeNull();
    });

    const toggle = container.querySelector('button[aria-expanded]') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(toggle);
    });
    await act(async () => {
      fireEvent.click(toggle);
    });

    const engagedCalls = trackMock.mock.calls.filter(
      ([name]) => name === 'upload_empty_deck_chat_engaged'
    );
    expect(engagedCalls).toHaveLength(1);

    const panel = container.querySelector('#empty-deck-chat-panel');
    expect(panel === null || panel.getAttribute('aria-label')?.startsWith('Ask Claude about')).toBe(true);
  });

  it('shows per-code copy for too_large errors', async () => {
    const jsonBody = { code: 'too_large', message: 'original server message' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 400,
      clone: () => ({ json: () => Promise.resolve(jsonBody) }),
      text: () => Promise.resolve(JSON.stringify(jsonBody)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const errorBody = container.querySelector('[class*="errorBody"]');
      expect(errorBody?.textContent).toMatch(/too large/i);
    });
  });

  it('shows per-code copy for unsupported_format errors', async () => {
    const jsonBody = { code: 'unsupported_format', message: 'original server message' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 400,
      clone: () => ({ json: () => Promise.resolve(jsonBody) }),
      text: () => Promise.resolve(JSON.stringify(jsonBody)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const errorBody = container.querySelector('[class*="errorBody"]');
      expect(errorBody?.textContent).toMatch(/file type/i);
    });
  });

  it('renders empty-deck spec copy with docs link on the 200 + 0-cards path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/octet-stream',
        'X-Card-Count': '0',
      }),
      blob: () => Promise.resolve(new Blob(['fake'])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const body = container.querySelector('[class*="emptyBody"]');
      expect(body?.textContent).toContain(
        'No cards were found in this file.'
      );
      expect(body?.textContent).toContain(
        'Most files need a toggle-list (Notion) or a question/answer pair'
      );
      const link = container.querySelector('a[href="/documentation/help/common-problems"]');
      expect(link?.textContent).toBe('common problems');
    });
  });

  it('routes a 400 with code=empty_export into the emptyDeck info card', async () => {
    const jsonBody = {
      code: 'empty_export',
      message:
        'No cards were found in this file. Most files need a toggle-list (Notion) or a question/answer pair to become cards. See common problems for the formats that work.',
      filename: 'notes.zip',
      docsLink: '/documentation/help/common-problems',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: false,
      status: 400,
      clone: () => ({ json: () => Promise.resolve(jsonBody) }),
      text: () => Promise.resolve(JSON.stringify(jsonBody)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const body = container.querySelector('[class*="emptyBody"]');
      expect(body?.textContent).toContain(
        'Most files need a toggle-list (Notion) or a question/answer pair'
      );
      expect(container.querySelector('[class*="errorBody"]')).toBeNull();
      expect(container.querySelector('[class*="emptyDownloadButton"]')).toBeNull();
    });
  });

});

describe('limit state — start trial button', () => {
  beforeEach(() => {
    mockGet2ankiApi.mockReturnValue({
      startTrial: vi.fn().mockResolvedValue({ ok: false }),
    } as unknown as ReturnType<typeof get2ankiApi>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderWithLimitReached(userLocalsData: ReturnType<typeof useUserLocals>['data']) {
    mockUseUserLocals.mockReturnValue({
      data: userLocalsData,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: true,
      url: 'http://localhost/limit?kind=file_size',
      status: 200,
      headers: new Headers({}),
      blob: () => Promise.resolve(new Blob([])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    return container;
  }

  it('shows a single "Create account and start trial" CTA for anonymous users and no "Start 1-hour trial" button', async () => {
    const container = renderWithLimitReached({
      user: null,
      locals: { owner: 0, patreon: false, subscriber: false, subscriptionInfo: { active: false, email: '', linked_email: '' } },
      linked_email: '',
    } as unknown as ReturnType<typeof useUserLocals>['data']);

    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('[class*="limitContent"]')).not.toBeNull();
    });

    const trialBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Start 1-hour trial')
    );
    expect(trialBtn).toBeUndefined();

    const registerLink = container.querySelector('a[href*="register"]');
    expect(registerLink).not.toBeNull();
    expect(registerLink?.textContent).toContain('Create account and start trial');
    expect(registerLink?.getAttribute('href')).toContain('start_trial=1');

    const loginLink = container.querySelector('a[href*="login"]');
    expect(loginLink).toBeNull();
  });

  it('renders error message and preserves form when startTrial returns already_used', async () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1, trial_started_at: null },
        locals: { owner: 1, patreon: false, subscriber: false, subscriptionInfo: { active: false, email: '', linked_email: '' } },
        linked_email: '',
      } as unknown as ReturnType<typeof useUserLocals>['data'],
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    });

    const startTrialMock = vi.fn().mockResolvedValue({ ok: false, reason: 'already_used' });
    mockGet2ankiApi.mockReturnValue({
      startTrial: startTrialMock,
    } as unknown as ReturnType<typeof get2ankiApi>);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: true,
      url: 'http://localhost/limit?kind=file_size',
      status: 200,
      headers: new Headers({}),
      blob: () => Promise.resolve(new Blob([])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('[class*="limitContent"]')).not.toBeNull();
    });

    const trialBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Start 1-hour trial')
    ) as HTMLButtonElement | undefined;
    expect(trialBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(trialBtn!);
    });

    await waitFor(() => {
      const errorEl = container.querySelector('[role="alert"]');
      expect(errorEl?.textContent).toMatch(/already used your 1-hour trial/i);
    });

    expect(container.querySelector('[class*="limitContent"]')).not.toBeNull();
  });

  it('renders error message and preserves form when startTrial throws a network error', async () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1, trial_started_at: null },
        locals: { owner: 1, patreon: false, subscriber: false, subscriptionInfo: { active: false, email: '', linked_email: '' } },
        linked_email: '',
      } as unknown as ReturnType<typeof useUserLocals>['data'],
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    });

    const startTrialMock = vi.fn().mockRejectedValue(new Error('Network failure'));
    mockGet2ankiApi.mockReturnValue({
      startTrial: startTrialMock,
    } as unknown as ReturnType<typeof get2ankiApi>);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: true,
      url: 'http://localhost/limit?kind=file_size',
      status: 200,
      headers: new Headers({}),
      blob: () => Promise.resolve(new Blob([])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('[class*="limitContent"]')).not.toBeNull();
    });

    const trialBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Start 1-hour trial')
    ) as HTMLButtonElement | undefined;
    expect(trialBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(trialBtn!);
    });

    await waitFor(() => {
      const errorEl = container.querySelector('[role="alert"]');
      expect(errorEl?.textContent).toMatch(/couldn't start your trial/i);
    });

    expect(container.querySelector('[class*="limitContent"]')).not.toBeNull();
  });

  it('uses file_size copy when kind=file_size', async () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1, trial_started_at: null },
        locals: { owner: 1, patreon: false, subscriber: false, subscriptionInfo: { active: false, email: '', linked_email: '' } },
        linked_email: '',
      } as unknown as ReturnType<typeof useUserLocals>['data'],
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: true,
      url: 'http://localhost/limit?kind=file_size',
      status: 200,
      headers: new Headers({}),
      blob: () => Promise.resolve(new Blob([])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      const title = container.querySelector('[class*="limitTitle"]');
      expect(title?.textContent).toMatch(/50 MB/i);
    });
  });

  it('shows trial-used description and no trial button when trial_started_at is set (file_size)', async () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1, trial_started_at: '2025-01-01T00:00:00.000Z' },
        locals: { owner: 1, patreon: false, subscriber: false, subscriptionInfo: { active: false, email: '', linked_email: '' } },
        linked_email: '',
      } as unknown as ReturnType<typeof useUserLocals>['data'],
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      redirected: true,
      url: 'http://localhost/limit?kind=file_size',
      status: 200,
      headers: new Headers({}),
      blob: () => Promise.resolve(new Blob([])),
    }));

    const { container } = renderUploadForm(<UploadForm setErrorMessage={vi.fn()} />);
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      expect(container.querySelector('[class*="limitContent"]')).not.toBeNull();
    });

    const trialBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/Start 1-hour trial/i)
    );
    expect(trialBtn).toBeUndefined();

    const description = container.querySelector('[class*="limitDescription"]');
    expect(description?.textContent).not.toMatch(/Start a 1-hour trial/i);
    expect(description?.textContent).toMatch(/Your trial is used/i);
  });
});
