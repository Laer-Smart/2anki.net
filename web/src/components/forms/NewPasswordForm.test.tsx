import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import NewPasswordForm from './NewPasswordForm';

const mockNewPassword = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    newPassword: mockNewPassword,
  }),
}));

const mockSetErrorMessage = vi.fn();

function renderForm() {
  return render(<NewPasswordForm setErrorMessage={mockSetErrorMessage} />);
}

describe('NewPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'location', {
      value: { pathname: '/users/r/test-uuid-token', href: '' },
      writable: true,
    });
  });

  it('shows an error message when the server returns non-200', async () => {
    mockNewPassword.mockResolvedValue({ status: 400 });
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'validpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'validpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Could not reset your password. The link may have expired — request a new one.'
        )
      ).toBeInTheDocument();
    });
  });

  it('shows a mismatch message when both fields are touched and differ', () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'validpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'different' },
    });

    const message = screen.getByText("Passwords don't match.");
    expect(message).toBeInTheDocument();
    expect(message).toHaveAttribute('id', 'confirm-password-help');
    expect(screen.getByPlaceholderText('Re-enter new password')).toHaveAttribute(
      'aria-describedby',
      'confirm-password-help'
    );
  });

  it('hides the mismatch message when the fields match', () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'validpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'validpassword' },
    });

    expect(screen.queryByText("Passwords don't match.")).toBeNull();
  });

  it('does not show the mismatch message before the confirm field is touched', () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'validpassword' },
    });

    expect(screen.queryByText("Passwords don't match.")).toBeNull();
  });

  it('redirects to /login on a 200 response', async () => {
    mockNewPassword.mockResolvedValue({ status: 200 });
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'validpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'validpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(globalThis.location.href).toBe('/login');
    });
  });
});
