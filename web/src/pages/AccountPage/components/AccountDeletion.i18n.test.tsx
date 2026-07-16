import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../lib/i18n';
import { AccountDeletion } from './AccountDeletion';

describe('AccountDeletion in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the delete-account heading and warning in German', () => {
    render(
      <MemoryRouter>
        <AccountDeletion />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Konto löschen' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Alle deine Daten werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.'
      ).length
    ).toBeGreaterThan(0);
  });
});
