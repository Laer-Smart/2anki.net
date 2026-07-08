import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import { HomePage } from './HomePage';

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage setErrorMessage={vi.fn()} isLoggedIn={false} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('HomePage (anonymous)', () => {
  it('renders the mascot as a brand mark', () => {
    renderHome();
    const mascot = document.querySelector('img[src*="mascot"]');
    expect(mascot).toBeInTheDocument();
  });

  it('renders the primary h1', () => {
    renderHome();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /flashcards that work in anki/i,
      })
    ).toBeInTheDocument();
  });

  it('renders the upload form drop zone', () => {
    renderHome();
    expect(screen.getByText(/drop your files here/i)).toBeInTheDocument();
  });

  it('keeps the hero focused on conversion — no free-tier limit or open-source brag in the hero', () => {
    renderHome();
    expect(screen.queryByText(/100 cards per month/i)).toBeNull();
    expect(screen.queryByText(/open source/i)).toBeNull();
  });

  it('shows a quiet AI hint inviting anon visitors to create an account', () => {
    renderHome();
    expect(screen.queryByText('AI is off')).toBeNull();
    const link = screen.getByRole('link', {
      name: /create an account to turn on AI/i,
    });
    expect(link).toHaveAttribute('href', '/register?redirect=/card-options');
  });

  it('links to card options above the upload form so anon visitors can configure first', () => {
    renderHome();
    const link = screen.getByRole('link', { name: 'Card options' });
    expect(link).toHaveAttribute('href', '/card-options');
  });

  it('renders the three how-it-works steps with icons', () => {
    renderHome();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Convert')).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    const svgs = document.querySelectorAll('svg[viewBox="0 0 24 24"]');
    expect(svgs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders 3 walkthrough play buttons by default', () => {
    renderHome();
    const playButtons = screen.getAllByRole('button', { name: /play:/i });
    expect(playButtons.length).toBe(3);
  });

  it('renders all 10 walkthrough play buttons after clicking expand', () => {
    renderHome();
    const expandButton = screen.getByRole('button', {
      name: /show all 10 videos/i,
    });
    fireEvent.click(expandButton);
    const playButtons = screen.getAllByRole('button', { name: /play:/i });
    expect(playButtons.length).toBe(10);
  });
});
