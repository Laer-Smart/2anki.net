import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from '../../lib/analytics/track';
import i18n from '../../lib/i18n';
import { LanguagePicker } from './LanguagePicker';

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

describe('LanguagePicker', () => {
  afterEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('renders English and Deutsch options', () => {
    render(<LanguagePicker />);
    const select = screen.getByRole('combobox', { name: 'Language' });
    const options = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent
    );
    expect(options).toEqual(['English', 'Deutsch']);
  });

  it('changes the active language to German on selection', () => {
    render(<LanguagePicker />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'de' },
    });
    expect(i18n.language).toBe('de');
  });

  it('fires the language_changed event with the chosen language', () => {
    render(<LanguagePicker />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'de' },
    });
    expect(track).toHaveBeenCalledWith('language_changed', { language: 'de' });
  });

  it('renders a labeled row with an associated label in the labeled variant', () => {
    render(<LanguagePicker variant="labeled" />);
    expect(
      screen.getByLabelText('Language', { selector: 'select' })
    ).toBeInTheDocument();
  });
});
