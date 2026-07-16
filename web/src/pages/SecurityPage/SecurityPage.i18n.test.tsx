import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '../../lib/i18n';
import SecurityPage from './SecurityPage';

describe('SecurityPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the title in German', () => {
    render(<SecurityPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sicherheit' })
    ).toBeInTheDocument();
  });

  it('translates the report section', () => {
    render(<SecurityPage />);
    expect(
      screen.getByRole('heading', { name: 'Eine Schwachstelle melden' })
    ).toBeInTheDocument();
  });

  it('keeps the acknowledgement contributor link', () => {
    render(<SecurityPage />);
    expect(
      screen.getByRole('link', { name: 'endscene665' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Behoben im Mai 2026/i)).toBeInTheDocument();
  });
});
