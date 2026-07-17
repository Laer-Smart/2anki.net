import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '../../lib/i18n';
import AboutPage from './AboutPage';

describe('AboutPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the title in German', () => {
    render(<AboutPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Über 2anki' })
    ).toBeInTheDocument();
  });

  it('translates the how-it-works heading', () => {
    render(<AboutPage />);
    expect(
      screen.getByRole('heading', { name: "So funktioniert's" })
    ).toBeInTheDocument();
  });

  it('keeps the SuperMemo link inside the translated philosophy', () => {
    render(<AboutPage />);
    expect(screen.getByRole('link', { name: 'SuperMemo' })).toBeInTheDocument();
    expect(
      screen.getByText(/Wir bauen keinen Anki-Ersatz/i)
    ).toBeInTheDocument();
  });
});
