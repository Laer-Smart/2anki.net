import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CardStylePicker, { CARD_STYLE_KEY, DEFAULT_CARD_STYLE } from './CardStylePicker';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

describe('CardStylePicker', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Cloze on first render', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value={DEFAULT_CARD_STYLE} onChange={onChange} />);
    const clozeBtn = screen.getByRole('radio', { name: 'Cloze' });
    expect(clozeBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('renders Cloze and Q&A options', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="cloze" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Cloze' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Q&A' })).toBeInTheDocument();
  });

  it('calls onChange with qa when Q&A is clicked', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="cloze" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Q&A' }));
    expect(onChange).toHaveBeenCalledWith('qa');
  });

  it('calls onChange with cloze when Cloze is clicked', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="qa" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Cloze' }));
    expect(onChange).toHaveBeenCalledWith('cloze');
  });

  it('marks Q&A as checked when value is qa', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="qa" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Q&A' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Cloze' })).toHaveAttribute('aria-checked', 'false');
  });

  it('renders the "Card style" label', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="cloze" onChange={onChange} />);
    expect(screen.getByText('Card style')).toBeInTheDocument();
  });

  it('shows helper text for the selected style', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="cloze" onChange={onChange} />);
    expect(screen.getByText(/fill-in-the-blank/i)).toBeInTheDocument();
  });

  it('shows Q&A helper text when qa is selected', () => {
    const onChange = vi.fn();
    render(<CardStylePicker value="qa" onChange={onChange} />);
    expect(screen.getByText(/question-and-answer/i)).toBeInTheDocument();
  });
});

describe('CardStylePicker localStorage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  it('CARD_STYLE_KEY is the storage key used for the card-style field', () => {
    expect(CARD_STYLE_KEY).toBe('card-style');
  });

  it('DEFAULT_CARD_STYLE is cloze', () => {
    expect(DEFAULT_CARD_STYLE).toBe('cloze');
  });

  it('reads the initial value from localStorage when set', () => {
    localStorageMock.setItem('card-style', 'qa');
    const onChange = vi.fn();
    render(<CardStylePicker value="qa" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Q&A' })).toHaveAttribute('aria-checked', 'true');
  });
});
