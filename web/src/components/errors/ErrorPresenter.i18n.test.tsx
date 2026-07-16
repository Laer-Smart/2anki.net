import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../lib/i18n';
import { ErrorPresenter } from './ErrorPresenter';

describe('ErrorPresenter in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the classified title and both buttons in German', () => {
    render(
      <MemoryRouter>
        <ErrorPresenter error={new Error('unauthorized')} onRetry={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Sitzung abgelaufen.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Schließen' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anmelden' })).toBeInTheDocument();
  });
});
