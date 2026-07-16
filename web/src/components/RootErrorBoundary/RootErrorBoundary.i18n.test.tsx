import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import { RootErrorBoundary } from './RootErrorBoundary';

function BrokenApp(): ReactElement {
  throw new Error('boom');
}

describe('RootErrorBoundary in German', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    consoleError.mockRestore();
    await i18n.changeLanguage('en');
  });

  it('shows the generic recovery screen in German', () => {
    render(
      <RootErrorBoundary>
        <BrokenApp />
      </RootErrorBoundary>
    );

    expect(
      screen.getByRole('heading', {
        name: 'Beim Laden von 2anki ist etwas schiefgelaufen',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Neu laden' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Lokale Daten zurücksetzen' })
    ).toBeInTheDocument();
  });
});
