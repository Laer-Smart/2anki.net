import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ConsentModal from './ConsentModal';

vi.mock('../../lib/backend/api', () => ({
  post: vi.fn(),
}));

import { post } from '../../lib/backend/api';
const mockPost = post as ReturnType<typeof vi.fn>;

function renderModal(onAccept = vi.fn(), onDismiss = vi.fn()) {
  return render(
    <MemoryRouter>
      <ConsentModal onAccept={onAccept} onDismiss={onDismiss} />
    </MemoryRouter>
  );
}

describe('ConsentModal', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('renders the consent heading', () => {
    renderModal();
    expect(
      screen.getByRole('heading', {
        name: 'Chat sends your messages to Anthropic',
      })
    ).toBeInTheDocument();
  });

  it('renders the body copy', () => {
    renderModal();
    expect(
      screen.getByText(/Your messages and any files you attach go to Anthropic/)
    ).toBeInTheDocument();
  });

  it('renders the primary Start chatting button', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: 'Start chatting' })
    ).toBeInTheDocument();
  });

  it('renders the secondary Not now button', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('POSTs to /api/chat/consent and calls onAccept when res.ok is true', async () => {
    mockPost.mockResolvedValueOnce({ ok: true, status: 204 });
    const onAccept = vi.fn();
    renderModal(onAccept);
    fireEvent.click(screen.getByRole('button', { name: 'Start chatting' }));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/chat/consent', {});
      expect(onAccept).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onAccept and shows sign-in prompt when res.ok is false', async () => {
    mockPost.mockResolvedValueOnce({ ok: false, status: 401 });
    const onAccept = vi.fn();
    renderModal(onAccept);
    fireEvent.click(screen.getByRole('button', { name: 'Start chatting' }));
    await waitFor(() => {
      expect(onAccept).not.toHaveBeenCalled();
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    });
  });

  it('sign-in prompt links to /login', async () => {
    mockPost.mockResolvedValueOnce({ ok: false, status: 401 });
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Start chatting' }));
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Sign in' });
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  it('calls onDismiss when Not now is clicked', () => {
    const onDismiss = vi.fn();
    renderModal(vi.fn(), onDismiss);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('disables Start chatting button while posting', async () => {
    let resolve!: (v: unknown) => void;
    mockPost.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      })
    );
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Start chatting' }));
    expect(
      screen.getByRole('button', { name: 'Start chatting' })
    ).toBeDisabled();
    resolve({ ok: true, status: 204 });
  });
});
