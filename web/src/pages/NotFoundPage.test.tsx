import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it } from 'vitest';

import NotFoundPage from './NotFoundPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/no-such-page']}>
        <NotFoundPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('NotFoundPage', () => {
  it('renders the page-not-found heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Page not found' })
    ).toBeInTheDocument();
  });

  it('sets a noindex robots meta so search engines skip 404s', async () => {
    renderPage();
    await waitFor(() => {
      const meta = document.querySelector('meta[name="robots"]');
      expect(meta?.getAttribute('content')).toBe('noindex, nofollow');
    });
  });

  it('sets the page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(document.title).toBe('Page not found — 2anki');
    });
  });
});
