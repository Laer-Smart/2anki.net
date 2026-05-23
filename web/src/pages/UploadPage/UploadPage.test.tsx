import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
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
      screen.getByText(/PDF, Notion export, Word, Markdown, HTML, Excel, CSV, or PowerPoint/i)
    ).toBeInTheDocument();
  });
});

describe('UploadPage reattach banner', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('shows the reattach banner when upload_pending_filename is set in sessionStorage', async () => {
    renderPageWithSession('upload_pending_filename', 'biochemistry.zip');
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toContain('Re-attach');
    expect(screen.getByRole('status').textContent).toContain('biochemistry.zip');
    expect(screen.getByRole('status').textContent).toContain('to convert');
    globalThis.sessionStorage.removeItem('upload_pending_filename');
  });

  it('does not show the reattach banner when upload_pending_filename is absent', async () => {
    renderPageWithSession('upload_pending_filename', null);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
  it('renders the doc and docx heading rule hint', () => {
    renderPage();
    expect(
      screen.getByText(/Doc and docx: use headings for the front of each card, body text for the back\. Plain paragraphs become separate cards\./i)
    ).toBeInTheDocument();
  });
});

describe('UploadPage card-size control', () => {
  beforeEach(() => {
    globalThis.localStorage.removeItem('card-size');
  });

  afterEach(() => {
    globalThis.localStorage.removeItem('card-size');
  });

  it('renders a card-size control with Short, Medium, and Detailed segments', () => {
    renderPage();
    expect(screen.getByRole('group', { name: /card size/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Short' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument();
  });

  it('defaults to Medium on first paint', () => {
    renderPage();
    const medium = screen.getByRole('button', { name: 'Medium' });
    expect(medium).toHaveAttribute('aria-pressed', 'true');
    const short = screen.getByRole('button', { name: 'Short' });
    expect(short).toHaveAttribute('aria-pressed', 'false');
    const detailed = screen.getByRole('button', { name: 'Detailed' });
    expect(detailed).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists Medium as default to localStorage on first paint', () => {
    renderPage();
    expect(globalThis.localStorage.getItem('card-size')).toBe('medium');
  });

  it('writes the chosen value to localStorage when a segment is clicked', async () => {
    renderPage();
    const short = screen.getByRole('button', { name: 'Short' });
    await act(async () => {
      fireEvent.click(short);
    });
    expect(globalThis.localStorage.getItem('card-size')).toBe('short');
  });

  it('restores the saved value from localStorage on mount', () => {
    globalThis.localStorage.setItem('card-size', 'detailed');
    renderPage();
    const detailed = screen.getByRole('button', { name: 'Detailed' });
    expect(detailed).toHaveAttribute('aria-pressed', 'true');
    const medium = screen.getByRole('button', { name: 'Medium' });
    expect(medium).toHaveAttribute('aria-pressed', 'false');
  });
});
