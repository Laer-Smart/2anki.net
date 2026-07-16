import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '../../lib/i18n';
import { TrustNote } from './TrustNote';

describe('TrustNote in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the full note and keeps the founder name', () => {
    render(<TrustNote />);
    expect(screen.getByText(/Unabhängig seit 2020/i)).toBeInTheDocument();
    expect(screen.getByText('Alexander Alemayhu')).toBeInTheDocument();
  });

  it('translates the compact note', () => {
    render(<TrustNote compact />);
    expect(
      screen.getByText(/Unabhängig und quelloffen seit 2020/i)
    ).toBeInTheDocument();
  });
});
