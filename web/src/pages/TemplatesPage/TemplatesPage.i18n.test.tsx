import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../lib/i18n';
import TemplatesPage from './TemplatesPage';

vi.mock('../../lib/backend/templates', () => ({
  getDefaultNoteTypes: vi.fn(async () => []),
  getOfficialNoteTypes: vi.fn(async () => []),
  getUserTemplates: vi.fn(async () => ({ templates: [], hiddenIds: [] })),
  deleteUserTemplate: vi.fn(),
  downloadNoteTypeApkg: vi.fn(),
}));

describe('TemplatesPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the header and empty state', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <TemplatesPage />
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(
      screen.getByRole('heading', { name: 'Notiztypen', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Neuer Notiztyp' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Noch keine Notiztypen')).toBeInTheDocument()
    );
  });
});
