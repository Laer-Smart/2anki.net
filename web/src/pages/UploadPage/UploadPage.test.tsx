import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { UploadPage } from './UploadPage';

vi.mock('./components/UploadForm/UploadForm', () => ({
  default: () => <div data-testid="upload-form-stub" />,
}));

vi.mock('./components/ExploreCard/ExploreCard', () => ({
  ExploreCard: () => <div data-testid="explore-card-stub" />,
}));

const trackMock = vi.fn();
vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

type FakeUser = {
  id?: number;
  created_at?: string | null;
  onboarded_at?: string | null;
} | null;

let fakeUser: FakeUser = null;
vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => ({
    data: fakeUser == null ? undefined : { user: fakeUser },
    isLoading: false,
    error: null,
    isError: false,
    refetch: () => {},
  }),
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/upload']}>
          <Routes>
            <Route
              path="/upload"
              element={<UploadPage setErrorMessage={() => {}} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

const renderPageWithSession = (sessionKey: string, sessionValue: string | null) => {
  if (sessionValue == null) {
    globalThis.sessionStorage.removeItem(sessionKey);
  } else {
    globalThis.sessionStorage.setItem(sessionKey, sessionValue);
  }
  return renderPage();
};

describe('UploadPage header', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('renders an h1 page title that does not duplicate the navbar label', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Convert your notes/i })
    ).toBeInTheDocument();
  });

  it('renders the page subtitle naming the deck quality and formats', () => {
    renderPage();
    expect(
      screen.getByText(/Drop a file and get a deck you don't have to fix/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Notion, PDF, Markdown, HTML, Word, and CSV too\./i)
    ).toBeInTheDocument();
  });
});

describe('UploadPage reattach banner', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('shows the reattach banner when upload_pending_filename is set in sessionStorage', async () => {
    renderPageWithSession('upload_pending_filename', 'biochemistry.zip');
    const reattachText = await screen.findByText(/Re-attach/);
    const banner = reattachText.closest('[role="status"]') as HTMLElement;
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('biochemistry.zip');
    expect(banner.textContent).toContain('to convert');
    globalThis.sessionStorage.removeItem('upload_pending_filename');
  });

  it('does not show the reattach banner when upload_pending_filename is absent', async () => {
    renderPageWithSession('upload_pending_filename', null);
    await waitFor(() => {
      expect(screen.queryByText(/Re-attach/)).not.toBeInTheDocument();
    });
  });
});

describe('UploadPage explore card', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('renders the ExploreCard below the upload form', () => {
    renderPage();
    expect(screen.getByTestId('explore-card-stub')).toBeInTheDocument();
  });
});

describe('UploadPage doc/docx hint', () => {
  it('renders the Word heading rule hint inside step 1', () => {
    renderPage();
    expect(
      screen.getByText(/In Word docs, headings become card fronts and the body text under each heading becomes the back\./i)
    ).toBeInTheDocument();
  });
});

describe('UploadPage AI badge anon link', () => {
  it('links to /login?redirect=/card-options so user lands on card options after sign-in', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /sign in to turn it on/i });
    expect(link).toHaveAttribute('href', '/login?redirect=/card-options');
  });
});

describe('UploadPage AI badge placement', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('renders the AI badge after the upload form and before the explore card', () => {
    renderPage();
    const uploadForm = screen.getByTestId('upload-form-stub');
    const exploreCard = screen.getByTestId('explore-card-stub');
    const badge = screen
      .getByRole('link', { name: /sign in to turn it on/i })
      .closest('[role="status"]') as HTMLElement;
    expect(badge).toBeInTheDocument();
    expect(
      uploadForm.compareDocumentPosition(badge) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      exploreCard.compareDocumentPosition(badge) &
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });
});

const SIGNUP_FLAG_KEY = 'signup_completed_tracked';

const callsFor = (name: string) =>
  trackMock.mock.calls.filter(([eventName]) => eventName === name);

describe('UploadPage analytics', () => {
  beforeEach(() => {
    trackMock.mockClear();
    fakeUser = null;
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    fakeUser = null;
    globalThis.sessionStorage.clear();
  });

  it('tracks upload_page_viewed once on mount', () => {
    renderPage();
    expect(callsFor('upload_page_viewed')).toHaveLength(1);
  });

  it('tracks signup_completed for a brand-new account that just signed up', () => {
    fakeUser = {
      id: 42,
      created_at: new Date().toISOString(),
      onboarded_at: null,
    };
    renderPage();
    expect(callsFor('signup_completed')).toHaveLength(1);
  });

  it('does not track signup_completed for an already-onboarded user', () => {
    fakeUser = {
      id: 42,
      created_at: new Date().toISOString(),
      onboarded_at: new Date().toISOString(),
    };
    renderPage();
    expect(callsFor('signup_completed')).toHaveLength(0);
  });

  it('does not track signup_completed for an account created long ago', () => {
    fakeUser = {
      id: 42,
      created_at: '2024-01-01T00:00:00.000Z',
      onboarded_at: null,
    };
    renderPage();
    expect(callsFor('signup_completed')).toHaveLength(0);
  });

  it('does not double-fire signup_completed when the email path already tracked it', () => {
    globalThis.sessionStorage.setItem(SIGNUP_FLAG_KEY, '1');
    fakeUser = {
      id: 42,
      created_at: new Date().toISOString(),
      onboarded_at: null,
    };
    renderPage();
    expect(callsFor('signup_completed')).toHaveLength(0);
  });

  it('does not track signup_completed when there is no signed-in user', () => {
    fakeUser = null;
    renderPage();
    expect(callsFor('signup_completed')).toHaveLength(0);
  });
});

