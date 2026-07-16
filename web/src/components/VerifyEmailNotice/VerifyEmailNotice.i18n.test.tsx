import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../lib/i18n';
import { VerifyEmailNotice } from './VerifyEmailNotice';

describe('VerifyEmailNotice in German', () => {
  beforeEach(async () => {
    globalThis.sessionStorage.setItem('email_verification_pending', '1');
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    globalThis.sessionStorage.removeItem('email_verification_pending');
    await i18n.changeLanguage('en');
  });

  it('renders the verify-email message in German', () => {
    render(<VerifyEmailNotice emailVerified={false} />);
    expect(
      screen.getByText(/Sieh in deinem Postfach nach/)
    ).toBeInTheDocument();
  });
});
