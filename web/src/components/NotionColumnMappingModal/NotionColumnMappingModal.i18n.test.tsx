import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { NotionColumnMappingModal } from './NotionColumnMappingModal';

describe('NotionColumnMappingModal in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the title, field labels, and submit button', () => {
    render(
      <NotionColumnMappingModal
        isOpen
        columns={['Term', 'Definition']}
        suggested={{ frontField: 'Term', backField: 'Definition' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Ordne deine Spalten zu')).toBeInTheDocument();
    expect(screen.getByText('Vorderseite')).toBeInTheDocument();
    expect(screen.getByText('Rückseite')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mit dieser Zuordnung konvertieren' })
    ).toBeInTheDocument();
  });
});
