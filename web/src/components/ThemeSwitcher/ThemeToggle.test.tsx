import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

const STORAGE_KEY = '2anki-theme';
const ALL_THEMES = ['light', 'dark', 'gold', 'purple', 'hotpink'];

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, 'light');
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('cycles through every theme, including hotpink, for anonymous users', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Cycle theme' });

    const seen = new Set<string>([localStorage.getItem(STORAGE_KEY) ?? '']);
    for (let i = 0; i < ALL_THEMES.length; i++) {
      fireEvent.click(button);
      seen.add(localStorage.getItem(STORAGE_KEY) ?? '');
    }

    expect(Array.from(seen).sort()).toEqual([...ALL_THEMES].sort());
  });
});
