import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterForm from './RegisterForm';

const registerMock = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    register: registerMock,
  }),
}));

const trackMock = vi.fn();
vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

function fillAndSubmit() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'taken@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'supersecret' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

function renderForm(redirect?: string) {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterForm setErrorMessage={vi.fn()} redirect={redirect ?? null} />
    </MemoryRouter>
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    registerMock.mockReset();
    trackMock.mockClear();
    localStorage.clear();
    globalThis.sessionStorage.clear();
  });

  it('tracks signup_completed once with method email on a successful registration', async () => {
    registerMock.mockResolvedValue({ status: 200 });

    renderForm();
    fillAndSubmit();

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('signup_completed', {
        method: 'email',
      });
    });
    expect(
      trackMock.mock.calls.filter(([name]) => name === 'signup_completed')
    ).toHaveLength(1);
  });

  it('sets the signup dedup flag so the upload page does not re-fire', async () => {
    registerMock.mockResolvedValue({ status: 200 });

    renderForm();
    fillAndSubmit();

    await waitFor(() => {
      expect(globalThis.sessionStorage.getItem('signup_completed_tracked')).toBe(
        '1'
      );
    });
  });

  it('does not track signup_completed when the account already exists', async () => {
    registerMock.mockResolvedValue({
      status: 400,
      json: () =>
        Promise.resolve({
          message:
            'An account with this email already exists. Try logging in instead.',
        }),
    });

    renderForm();
    fillAndSubmit();

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });
    expect(trackMock).not.toHaveBeenCalledWith('signup_completed', {
      method: 'email',
    });
  });

  it('shows a recovery CTA with log in and reset password links when the account already exists', async () => {
    registerMock.mockResolvedValue({
      status: 400,
      json: () =>
        Promise.resolve({
          message:
            'An account with this email already exists. Try logging in instead.',
        }),
    });

    renderForm('/pricing');
    fillAndSubmit();

    const recovery = await screen.findByRole('alert');
    const logIn = within(recovery).getByRole('link', { name: 'Log in' });
    expect(logIn).toHaveAttribute('href', '/login?redirect=%2Fpricing');

    const reset = within(recovery).getByRole('link', {
      name: 'Reset password',
    });
    expect(reset).toHaveAttribute('href', '/forgot');
  });

  it('does not show the recovery CTA on a generic failure', async () => {
    registerMock.mockResolvedValue({
      status: 400,
      json: () =>
        Promise.resolve({
          message: 'Invalid user data. Required email and password!',
        }),
    });

    renderForm();
    fillAndSubmit();

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Reset password' })
    ).not.toBeInTheDocument();
  });
});
