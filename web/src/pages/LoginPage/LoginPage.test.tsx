import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';
import Cookies from 'universal-cookie';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage';

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: vi.fn(),
}));

vi.mock('./components/LoginForm', () => ({
  default: () => <div data-testid="login-form" />,
}));

vi.mock('../../components/AuthPageBackground', () => ({
  AuthPageBackground: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { useUserLocals } from '../../lib/hooks/useUserLocals';

const mockUseUserLocals = useUserLocals as ReturnType<typeof vi.fn>;

function renderLoginPage(cookieValue?: string) {
  const cookies = new Cookies();
  if (cookieValue != null) {
    cookies.set('token', cookieValue, { path: '/' });
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CookiesProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </CookiesProvider>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    const cookies = new Cookies();
    cookies.remove('token', { path: '/' });
    vi.clearAllMocks();
  });

  it('renders the login form when there is no cookie', () => {
    mockUseUserLocals.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    const { getByTestId } = renderLoginPage();
    expect(getByTestId('login-form')).toBeInTheDocument();
  });

  it('renders the login form when the cookie is valid', () => {
    mockUseUserLocals.mockReturnValue({
      data: { user: { id: 1 }, locals: {} },
      isLoading: false,
      isError: false,
      error: null,
    });
    const { getByTestId } = renderLoginPage('valid-token');
    expect(getByTestId('login-form')).toBeInTheDocument();
  });

  it('clears the token cookie when the cookie is present and userLocals fetch errors', async () => {
    mockUseUserLocals.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Unauthorized'),
    });

    const cookies = new Cookies();
    cookies.set('token', 'stale-jwt-token', { path: '/' });

    renderLoginPage('stale-jwt-token');

    await waitFor(() => {
      const tokenCookie = cookies.get('token');
      expect(tokenCookie).toBeUndefined();
    });
  });

  it('does not clear the token cookie when no cookie is present and fetch errors', async () => {
    mockUseUserLocals.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Unauthorized'),
    });

    const cookies = new Cookies();

    renderLoginPage();

    await waitFor(() => {
      expect(cookies.get('token')).toBeUndefined();
    });
  });
});
