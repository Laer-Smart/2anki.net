import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import ConvertLandingPage from './ConvertLandingPage';
import { CONVERT_LANDING_PAGES } from './convertLandingConfig';
import { ankiFidelityProof } from '../LandingPage/copy/ankiFidelityProof';

function renderAtSlug(slug: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[`/convert/${slug}`]}>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <Routes>
            <Route
              path="/convert/:slug"
              element={<ConvertLandingPage setErrorMessage={vi.fn()} />}
            />
            <Route path="*" element={<div>Not found fallback</div>} />
          </Routes>
        </HelmetProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ConvertLandingPage', () => {
  it.each(Array.from(CONVERT_LANDING_PAGES.entries()))(
    'renders the H1 for slug "%s"',
    (slug, copy) => {
      renderAtSlug(slug);
      expect(
        screen.getByRole('heading', { level: 1, name: copy.h1 })
      ).toBeInTheDocument();
    }
  );

  it.each(Array.from(CONVERT_LANDING_PAGES.entries()))(
    'renders all FAQ questions for slug "%s"',
    (slug, copy) => {
      renderAtSlug(slug);
      for (const faq of copy.faqs) {
        expect(screen.getByText(faq.q)).toBeInTheDocument();
      }
    }
  );

  it('renders the upload form for a known slug', () => {
    renderAtSlug('pdf-to-anki');
    expect(screen.getByText(/Drop your files here/i)).toBeInTheDocument();
  });

  it('renders the new Convert PDF to Anki H1 on the pdf-to-anki page', () => {
    renderAtSlug('pdf-to-anki');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Convert PDF to Anki — flashcards from lecture slides and textbook chapters',
      })
    ).toBeInTheDocument();
  });

  it('cross-links pdf-to-anki to the AI generator page', () => {
    const links = CONVERT_LANDING_PAGES.get('pdf-to-anki')?.relatedLinks ?? [];
    expect(links).toContainEqual({
      label: 'AI flashcard generator',
      href: '/ai-flashcard-generator',
    });
  });

  it('renders NotFoundPage for an unknown slug', () => {
    renderAtSlug('unknown-format');
    expect(
      screen.getByRole('heading', { level: 1, name: /page not found/i })
    ).toBeInTheDocument();
  });

  it('links the sign-up CTA to /register with the correct source param', () => {
    renderAtSlug('csv-to-anki');
    const copy = CONVERT_LANDING_PAGES.get('csv-to-anki');
    const link = screen.getByRole('link', { name: /sign up free/i });
    expect(link).toHaveAttribute(
      'href',
      `/register?source=${encodeURIComponent(copy?.pathname ?? '')}`
    );
  });

  it('renders the fidelity proof section for an import-to-Anki page', () => {
    renderAtSlug('csv-to-anki');
    expect(
      screen.getByText('What you actually get in Anki')
    ).toBeInTheDocument();
    for (const item of ankiFidelityProof) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('omits the fidelity proof on the apkg-to-csv export-out page', () => {
    renderAtSlug('apkg-to-csv');
    expect(
      screen.queryByText('What you actually get in Anki')
    ).not.toBeInTheDocument();
  });

  it('renders the .apkg → CSV export form on the apkg-to-csv page', () => {
    renderAtSlug('apkg-to-csv');
    expect(
      screen.getByRole('button', { name: /Export to CSV/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose \.apkg file/i)).toBeInTheDocument();
  });

  it('does not render the .apkg → CSV form on other slugs', () => {
    renderAtSlug('csv-to-anki');
    expect(
      screen.queryByRole('button', { name: /Export to CSV/i })
    ).not.toBeInTheDocument();
  });

  it('leads the import-to-Anki titles with fidelity in Anki', () => {
    for (const slug of [
      'notion-to-anki',
      'pdf-to-anki',
      'markdown-to-anki',
      'csv-to-anki',
      'html-to-anki',
    ]) {
      expect(CONVERT_LANDING_PAGES.get(slug)?.title).toMatch(
        /(open clean|work) in Anki|clean Anki decks/
      );
    }
  });

  it('keeps the apkg-to-csv and notion-tables-to-anki titles unchanged', () => {
    expect(CONVERT_LANDING_PAGES.get('apkg-to-csv')?.title).toBe(
      'Anki deck to CSV — export cards to a spreadsheet | 2anki'
    );
    expect(CONVERT_LANDING_PAGES.get('notion-tables-to-anki')?.title).toBe(
      'Notion tables to Anki — one row, one card | 2anki'
    );
  });

  it('covers all supported input types', () => {
    expect(CONVERT_LANDING_PAGES.size).toBe(26);
  });

  const newConvertSlugs = [
    'excel-to-anki',
    'word-to-anki',
    'obsidian-to-anki',
    'photo-to-anki',
    'google-slides-to-anki',
    'screenshot-to-anki',
    'google-sheets-to-anki',
    'txt-to-anki',
    'onenote-to-anki',
    'evernote-to-anki',
    'google-docs-to-anki',
  ];

  it.each(newConvertSlugs)('resolves the new converter slug "%s"', (slug) => {
    const copy = CONVERT_LANDING_PAGES.get(slug);
    expect(copy?.pathname).toBe(`/convert/${slug}`);
  });

  it.each(newConvertSlugs)('renders the title and H1 for "%s"', (slug) => {
    const copy = CONVERT_LANDING_PAGES.get(slug);
    if (copy == null) {
      throw new Error(`missing config for ${slug}`);
    }
    expect(copy.title).toMatch(/\| 2anki$/);
    renderAtSlug(slug);
    expect(
      screen.getByRole('heading', { level: 1, name: copy.h1 })
    ).toBeInTheDocument();
  });

  it('serves dedicated EPUB and Kindle highlight converter pages', () => {
    expect(CONVERT_LANDING_PAGES.get('epub-to-anki')?.title).toBe(
      'EPUB highlights to Anki — turn ebook highlights into cards | 2anki'
    );
    expect(CONVERT_LANDING_PAGES.get('kindle-to-anki')?.title).toBe(
      'Kindle highlights to Anki — My Clippings.txt to a deck | 2anki'
    );
  });

  it('each config entry has a pathname under /convert/', () => {
    for (const copy of Array.from(CONVERT_LANDING_PAGES.values())) {
      expect(copy.pathname).toMatch(/^\/convert\//);
    }
  });
});
