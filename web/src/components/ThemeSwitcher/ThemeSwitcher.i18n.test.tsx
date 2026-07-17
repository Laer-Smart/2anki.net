import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '../../lib/i18n';
import { ThemeSwitcher } from './ThemeSwitcher';

describe('ThemeSwitcher in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the appearance label and radiogroup', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByText('Darstellung')).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Farbschema' })
    ).toBeInTheDocument();
  });

  it('translates each theme radio aria-label', () => {
    render(<ThemeSwitcher />);
    expect(
      screen.getByRole('radio', { name: 'Helles Design' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Dunkles Design' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Pinkes Design' })
    ).toBeInTheDocument();
  });
});
