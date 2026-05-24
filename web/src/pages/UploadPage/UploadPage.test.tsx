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

  it('renders the format-list subtitle', () => {
    renderPage();
    expect(
      screen.getAllByText(/PDF, Word, Notion export, Markdown, HTML, Excel, CSV, or PowerPoint/i)[0]
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

