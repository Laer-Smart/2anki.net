import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarLayout } from './SidebarLayout';

function renderLayout() {
  const onLogOut = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/upload']}>
      <SidebarLayout
        email="alexander@alemayhu.com"
        locals={{ patreon: true, subscriber: false }}
        features={{ kiUI: false, ops: false }}
        onLogOut={onLogOut}
      >
        <div data-testid="page-content">hello</div>
      </SidebarLayout>
    </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SidebarLayout drawer', () => {
  it('renders the page content next to the sidebar', () => {
    renderLayout();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Make flashcards' })).toBeInTheDocument();
  });

  it('exposes a burger that toggles the drawer aria-hidden state', () => {
    renderLayout();
    const burger = screen.getByRole('button', { name: /open navigation/i, hidden: true });
    expect(burger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(burger);
    expect(burger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the drawer when the backdrop is clicked', () => {
    renderLayout();
    const burger = screen.getByRole('button', { name: /open navigation/i, hidden: true });
    fireEvent.click(burger);
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByTestId('sidebar-backdrop'));
    expect(burger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the drawer when Escape is pressed', () => {
    renderLayout();
    const burger = screen.getByRole('button', { name: /open navigation/i, hidden: true });
    fireEvent.click(burger);
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(burger).toHaveAttribute('aria-expanded', 'false');
  });
});
