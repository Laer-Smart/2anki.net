import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import ConnectNotion from './components/ConnectNotion';
import ListSearchResults from './components/ListSearchResults';

describe('Search surfaces in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the Connect Notion card', () => {
    render(<ConnectNotion ready connectionLink="https://example.test/oauth" />);
    expect(
      screen.getByText('Verbinde deinen Notion-Workspace')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Mit Notion verbinden' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Datei hochladen' })
    ).toBeInTheDocument();
  });

  it('translates the empty search result with the workspace scope', () => {
    render(
      <ListSearchResults
        results={[]}
        setFavorites={vi.fn()}
        setError={vi.fn()}
        workSpace="Pristine’s Notion"
      />
    );
    expect(
      screen.getByText('Keine Seiten gefunden in „Pristine’s Notion“')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Notions Freigabeeinstellungen' })
    ).toBeInTheDocument();
  });
});
