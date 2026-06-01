import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DocContent } from './DocContent';

function renderAt(slug: string, path = '/documentation/*') {
  return render(
    <MemoryRouter initialEntries={[`/documentation/${slug}`]}>
      <Routes>
        <Route path={path} element={<DocContent slug={slug} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DocContent markdown link rewriting', () => {
  it('keeps /documentation/... links unchanged (no double prefix)', () => {
    renderAt('help/limits');
    const links = Array.from(
      document.querySelectorAll('a[href^="/documentation/"]'),
    ).map((a) => a.getAttribute('href') ?? '');
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(href).not.toMatch(/^\/documentation\/documentation\//);
    }
  });

  it('keeps /pricing as a top-level app route', () => {
    renderAt('help/limits');
    const pricing = Array.from(document.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/pricing',
    );
    expect(pricing).toBeTruthy();
  });

  it('renders external links with target=_blank', () => {
    renderAt('reference/self-hosting');
    const ext = Array.from(document.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === 'https://github.com/2anki/server',
    );
    expect(ext).toBeTruthy();
    expect(ext?.getAttribute('target')).toBe('_blank');
  });

  it('renders the Not found state for an unknown slug', () => {
    renderAt('does/not/exist');
    expect(
      screen.getByRole('heading', { level: 1, name: /not found/i }),
    ).toBeInTheDocument();
  });
});

describe('DocContent custom element embedding', () => {
  it('renders both overlapping-cloze demos from the markdown', () => {
    renderAt('cards/overlapping-cloze');
    const previews = screen.getAllByLabelText(
      'Preview: each card hides one line of the list',
    );
    expect(previews).toHaveLength(2);
  });
});
