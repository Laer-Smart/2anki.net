import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';
import LoginForm from './index';

vi.mock('../../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    login: vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ token: 'test-token' }),
    }),
    requestMagicLink: vi.fn().mockResolvedValue({ ok: true }),
  }),
}));

function renderLoginForm() {
  return render(
    <CookiesProvider>
      <MemoryRouter initialEntries={['/login']}>
        <LoginForm />
      </MemoryRouter>
    </CookiesProvider>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders email step with email input and continue button', () => {
    renderLoginForm();
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with email' })
    ).toBeInTheDocument();
  });

  it('does not show password field on email step', () => {
    renderLoginForm();
    expect(screen.queryByPlaceholderText('Password')).toBeNull();
  });

  it('shows Google OAuth button on email step', () => {
    renderLoginForm();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('transitions to password step after clicking continue', () => {
    renderLoginForm();
    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );

    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows change link and forgot password on password step', () => {
    renderLoginForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );

    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  it('returns to email step when change is clicked', () => {
    renderLoginForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );

    fireEvent.click(screen.getByText('Change'));
    expect(
      screen.getByRole('button', { name: 'Continue with email' })
    ).toBeInTheDocument();
  });

  it('shows magic link option on password step', () => {
    renderLoginForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );

    expect(
      screen.getByText('Send a login link instead')
    ).toBeInTheDocument();
  });

  it('transitions to check-email step after clicking magic link', async () => {
    renderLoginForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with email' })
    );

    fireEvent.click(screen.getByText('Send a login link instead'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('shows create account button on the email step', () => {
    renderLoginForm();
    expect(screen.getByText("Sign up — it's free")).toBeInTheDocument();
    expect(screen.getByText("Sign up — it's free").closest('a')).toHaveAttribute(
      'href',
      '/register'
    );
  });

  it('shows forgot password link on the email step', () => {
    renderLoginForm();
    const link = screen.getByRole('link', { name: 'Forgot your password?' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot');
  });

  it('shows email-me-a-sign-in-link when email is filled in on email step', async () => {
    renderLoginForm();
    expect(screen.queryByText('Email me a sign-in link')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'test@example.com' },
    });
    expect(screen.getByText('Email me a sign-in link')).toBeInTheDocument();
  });

  it('shows dont have an account copy on email step', () => {
    renderLoginForm();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('persists email to localStorage on blur when value looks like an email', () => {
    renderLoginForm();
    const input = screen.getByRole('textbox', { name: 'Email' });
    fireEvent.change(input, { target: { value: 'stored@example.com' } });
    fireEvent.blur(input);
    expect(localStorage.getItem('email')).toBe('stored@example.com');
  });

  it('does not persist to localStorage on blur when value has no @', () => {
    renderLoginForm();
    const input = screen.getByRole('textbox', { name: 'Email' });
    fireEvent.change(input, { target: { value: 'notanemail' } });
    fireEvent.blur(input);
    expect(localStorage.getItem('email')).toBeNull();
  });

  it('restores email from localStorage', () => {
    localStorage.setItem('email', 'saved@example.com');
    renderLoginForm();
    const emailInput = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement;
    expect(emailInput.value).toBe('saved@example.com');
  });
});
