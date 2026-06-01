import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OverlappingClozePreview } from './OverlappingClozePreview';

const LINES = ['Mercury', 'Venus', 'Earth'];
const HIDDEN = '[ … ]';

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

describe('OverlappingClozePreview', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['show-all', 'windowed'] as const)(
    'renders three frames, each hiding a different line (%s)',
    (style) => {
      render(<OverlappingClozePreview style={style} />);
      const frames = screen.getAllByTestId('frame');
      expect(frames).toHaveLength(3);

      frames.forEach((frame, index) => {
        const hiddenSlots = within(frame).getAllByText(HIDDEN);
        expect(hiddenSlots).toHaveLength(1);
        const visibleLines = LINES.filter((_, i) => i !== index);
        visibleLines.forEach((line) => {
          expect(within(frame).getByText(line)).toBeInTheDocument();
        });
        expect(within(frame).queryByText(LINES[index])).toBeNull();
      });
    },
  );

  it('greys the edge lines outside the window on the windowed edge cards', () => {
    render(<OverlappingClozePreview style="windowed" />);
    const frames = screen.getAllByTestId('frame');

    const earthOnFirstCard = within(frames[0]).getByText('Earth');
    expect(earthOnFirstCard.dataset.outside).toBe('true');

    const mercuryOnLastCard = within(frames[2]).getByText('Mercury');
    expect(mercuryOnLastCard.dataset.outside).toBe('true');
  });

  it('keeps every line in-window on the show-all cards', () => {
    render(<OverlappingClozePreview style="show-all" />);
    const frames = screen.getAllByTestId('frame');

    within(frames[0]).getAllByText(/Mercury|Venus|Earth/).forEach((line) => {
      expect(line.dataset.outside).not.toBe('true');
    });
  });

  it('shows only the first card statically under reduced motion', () => {
    setReducedMotion(true);
    render(<OverlappingClozePreview style="show-all" />);
    const frames = screen.getAllByTestId('frame');
    expect(frames).toHaveLength(1);
    expect(within(frames[0]).getAllByText(HIDDEN)).toHaveLength(1);
    expect(within(frames[0]).queryByText('Mercury')).toBeNull();
    expect(within(frames[0]).getByText('Venus')).toBeInTheDocument();
    expect(within(frames[0]).getByText('Earth')).toBeInTheDocument();
  });

  it('labels the frame and shows the caption', () => {
    render(<OverlappingClozePreview style="show-all" />);
    expect(
      screen.getByLabelText('Preview: each card hides one line of the list'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('3 lines become 3 cards — each hides one'),
    ).toBeInTheDocument();
  });
});
