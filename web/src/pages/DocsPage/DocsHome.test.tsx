import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DocsHome } from './DocsHome';

function renderHome() {
  return render(
    <MemoryRouter>
      <DocsHome />
    </MemoryRouter>
  );
}

describe('DocsHome', () => {
  it('renders the headline and tagline', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: /2anki documentation/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/simplest way to turn what you're studying/i)
    ).toBeInTheDocument();
  });

  it('shows the primary Connect Notion CTA', () => {
    renderHome();
    const cta = screen.getByRole('link', { name: /Connect Notion in 5 min/i });
    expect(cta).toHaveAttribute(
      'href',
      '/documentation/start-here/connect-notion'
    );
  });

  it('lists the four start-here cards linking to the right slugs', () => {
    const { container } = renderHome();
    const hrefs = Array.from(
      container.querySelectorAll('a[href^="/documentation/start-here/"]')
    ).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/documentation/start-here/what-is-2anki',
        '/documentation/start-here/connect-notion',
        '/documentation/start-here/upload-a-file',
        '/documentation/start-here/open-in-anki',
      ])
    );
  });
});
