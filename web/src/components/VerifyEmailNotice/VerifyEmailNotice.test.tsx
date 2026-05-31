import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VerifyEmailNotice } from './VerifyEmailNotice';

const FLAG_KEY = 'email_verification_pending';

describe('VerifyEmailNotice', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('renders the verify copy when the pending flag is set', () => {
    globalThis.sessionStorage.setItem(FLAG_KEY, 'true');

    render(<VerifyEmailNotice />);

    expect(
      screen.getByText(/confirm your email to secure your account/i)
    ).toBeInTheDocument();
  });

  it('renders nothing when the pending flag is absent', () => {
    const { container } = render(<VerifyEmailNotice />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the email is already verified', () => {
    globalThis.sessionStorage.setItem(FLAG_KEY, 'true');

    const { container } = render(<VerifyEmailNotice emailVerified />);

    expect(container.firstChild).toBeNull();
    expect(globalThis.sessionStorage.getItem(FLAG_KEY)).toBeNull();
  });

  it('clears the flag and hides when dismissed', () => {
    globalThis.sessionStorage.setItem(FLAG_KEY, 'true');

    const { container } = render(<VerifyEmailNotice />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(globalThis.sessionStorage.getItem(FLAG_KEY)).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
