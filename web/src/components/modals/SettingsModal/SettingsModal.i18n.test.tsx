import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../../lib/i18n';
import SettingsModal from './SettingsModal';

vi.mock('../../CardOptionsForm/CardOptionsForm', () => ({
  CardOptionsForm: () => <div data-testid="card-options-form" />,
}));

function renderModal() {
  return render(
    <MemoryRouter>
      <SettingsModal
        pageId="page-1"
        isActive
        onClickClose={vi.fn()}
        setError={vi.fn()}
      />
    </MemoryRouter>
  );
}

describe('SettingsModal in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the open-full-page link and close control', () => {
    renderModal();
    expect(screen.getByText('Ganze Seite öffnen ↗')).toBeInTheDocument();
    expect(screen.getByLabelText('schließen')).toBeInTheDocument();
  });
});
