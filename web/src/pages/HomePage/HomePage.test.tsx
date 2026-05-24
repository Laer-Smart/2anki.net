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
      screen.getByRole('heading', { level: 1, name: /your notes, ready to study in anki/i })
    ).toBeInTheDocument();
  });

  it('renders the upload form drop zone', () => {
    renderHome();
    expect(screen.getByText(/drop your files here/i)).toBeInTheDocument();
  });

  it('shows the open source link in the hero footer', () => {
    renderHome();
    expect(screen.getByText(/open source/i)).toBeInTheDocument();
  });

  it('does not anchor visitors to the free-tier card limit in the hero', () => {
    renderHome();
    expect(screen.queryByText(/100 cards per month/i)).toBeNull();
  });

  it('shows the AI-off badge inviting anon visitors to create an account', () => {
    renderHome();
    expect(screen.getByText('AI is off')).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: /create an account to turn it on/i,
    });
    expect(link).toHaveAttribute('href', '/register');
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
    const expandButton = screen.getByRole('button', { name: /show all 10 videos/i });
    fireEvent.click(expandButton);
    const playButtons = screen.getAllByRole('button', { name: /play:/i });
    expect(playButtons.length).toBe(10);
  });
});
