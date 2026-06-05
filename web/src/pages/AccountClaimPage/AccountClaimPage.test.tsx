import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AccountClaimPage from './AccountClaimPage';

vi.mock('../../lib/backend/api', () => ({
  post: vi.fn(),
}));

import { post } from '../../lib/backend/api';
const mockPost = post as ReturnType<typeof vi.fn>;

vi.mock('../../components/Skeleton/Skeleton', () => ({
  SkeletonPage: () => <div data-testid="skeleton" />,
}));

function renderWithToken(token?: string) {
  const path = token ? `/account/claim?token=${token}` : '/account/claim';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/account/claim" element={<AccountClaimPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AccountClaimPage', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('shows invalid/expired state when no token in URL', async () => {
    renderWithToken();
    await waitFor(() => {
      expect(screen.getByText('Invalid or expired link.')).toBeTruthy();
    });
  });

  it('shows success state on successful confirm', async () => {
    mockPost.mockResolvedValue({ ok: true, status: 200 });
    renderWithToken('valid-token-abc');
    await waitFor(() => {
      expect(screen.getByText('Subscription claimed.')).toBeTruthy();
    });
  });

  it('shows already-claimed state when token was already used', async () => {
    mockPost.mockResolvedValue({
      ok: false,
      status: 409,
      json: vi
        .fn()
        .mockResolvedValue({ message: 'This link is already used.' }),
    });
    renderWithToken('used-token');
    await waitFor(() => {
      expect(screen.getByText('Link already used.')).toBeTruthy();
    });
  });

  it('shows active subscription state when user already subscribed', async () => {
    mockPost.mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({
        message: 'This account already has an active subscription.',
      }),
    });
    renderWithToken('some-token');
    await waitFor(() => {
      expect(
        screen.getByText('Account already has a subscription.')
      ).toBeTruthy();
    });
  });

  it('shows invalid/expired state for an expired or invalid token', async () => {
    mockPost.mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        message: 'Invalid or expired confirmation link.',
      }),
    });
    renderWithToken('expired-token');
    await waitFor(() => {
      expect(screen.getByText('Invalid or expired link.')).toBeTruthy();
    });
  });
});
