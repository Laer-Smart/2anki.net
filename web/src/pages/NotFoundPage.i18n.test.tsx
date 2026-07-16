import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import i18n from '../lib/i18n';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the heading, description, and CTA in German', () => {
    render(
      <HelmetProvider>
        <NotFoundPage />
      </HelmetProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Seite nicht gefunden' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Diese Seite existiert nicht oder wurde verschoben.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Zur Startseite' })
    ).toBeInTheDocument();
  });
});
