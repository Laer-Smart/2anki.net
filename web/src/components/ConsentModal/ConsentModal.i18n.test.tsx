import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../lib/i18n';
import ConsentModal from './ConsentModal';

describe('ConsentModal in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the heading and action buttons', () => {
    render(
      <MemoryRouter>
        <ConsentModal onAccept={vi.fn()} onDismiss={vi.fn()} />
      </MemoryRouter>
    );
    expect(
      screen.getByText('Der Chat sendet deine Nachrichten an Anthropic')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Chat starten' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Nicht jetzt' })
    ).toBeInTheDocument();
  });
});
