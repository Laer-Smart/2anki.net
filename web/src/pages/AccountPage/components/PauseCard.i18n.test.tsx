import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../lib/i18n';
import { PauseCard } from './PauseCard';

describe('PauseCard in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the pause offer and action in German', () => {
    render(
      <PauseCard
        planLabel="$7.99 / month"
        isPausing={false}
        pauseError=""
        onPause={vi.fn()}
      />
    );

    expect(screen.getByText(/Stattdessen pausieren/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abo pausieren' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '2 Monate' })
    ).toBeInTheDocument();
  });
});
