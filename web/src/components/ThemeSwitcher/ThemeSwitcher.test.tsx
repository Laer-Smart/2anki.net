import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeSwitcher } from './ThemeSwitcher';

const STORAGE_KEY = '2anki-theme';

describe('ThemeSwitcher roving tabindex', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, 'light');
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('gives only the selected radio tabIndex 0 and the rest -1', () => {
    render(<ThemeSwitcher />);
    const radios = screen.getAllByRole('radio');

    expect(radios[0]).toHaveAttribute('tabindex', '0');
    for (const radio of radios.slice(1)) {
      expect(radio).toHaveAttribute('tabindex', '-1');
    }
  });

  it('ArrowRight moves selection and focus to the next radio', () => {
    render(<ThemeSwitcher />);
    const radios = screen.getAllByRole('radio');

    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });

    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('tabindex', '0');
    expect(radios[0]).toHaveAttribute('tabindex', '-1');
    expect(radios[1]).toHaveFocus();
  });

  it('ArrowLeft from the first radio wraps to the last', () => {
    render(<ThemeSwitcher />);
    const radios = screen.getAllByRole('radio');

    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });

    const last = radios[radios.length - 1];
    expect(last).toHaveAttribute('aria-checked', 'true');
    expect(last).toHaveFocus();
  });

  it('ArrowDown behaves like ArrowRight', () => {
    render(<ThemeSwitcher />);
    const radios = screen.getAllByRole('radio');

    fireEvent.keyDown(radios[0], { key: 'ArrowDown' });

    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveFocus();
  });
});
