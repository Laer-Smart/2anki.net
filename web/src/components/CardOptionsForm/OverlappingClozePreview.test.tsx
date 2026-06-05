import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OverlappingClozePreview } from './OverlappingClozePreview';

const LINES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'];
const HIDDEN = '[ … ]';

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('OverlappingClozePreview', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['show-all', 'windowed'] as const)(
    'renders one frame per line, each hiding a different line (%s)',
    (style) => {
      render(<OverlappingClozePreview style={style} />);
      const frames = screen.getAllByTestId('frame');
      expect(frames).toHaveLength(LINES.length);

      frames.forEach((frame, index) => {
        const hiddenSlots = within(frame).getAllByText(HIDDEN);
        expect(hiddenSlots).toHaveLength(1);
        expect(within(frame).queryByText(LINES[index])).toBeNull();
      });
    }
  );

  it('keeps every other line visible on the show-all cards', () => {
    render(<OverlappingClozePreview style="show-all" />);
    const frames = screen.getAllByTestId('frame');

    frames.forEach((frame, index) => {
      LINES.filter((_, i) => i !== index).forEach((line) => {
        expect(within(frame).getByText(line)).toBeInTheDocument();
      });
    });
  });

  it('drops the lines outside the window on the windowed cards', () => {
    render(<OverlappingClozePreview style="windowed" />);
    const frames = screen.getAllByTestId('frame');

    // Hiding Earth (index 2): only Venus and Mars stay; Mercury and Jupiter are dropped.
    expect(within(frames[2]).getByText('Venus')).toBeInTheDocument();
    expect(within(frames[2]).getByText('Mars')).toBeInTheDocument();
    expect(within(frames[2]).queryByText('Mercury')).toBeNull();
    expect(within(frames[2]).queryByText('Jupiter')).toBeNull();
  });

  it('shows fewer lines per windowed card than per show-all card', () => {
    const { rerender } = render(<OverlappingClozePreview style="show-all" />);
    const showAllMiddle = within(
      screen.getAllByTestId('frame')[2]
    ).getAllByText(/Mercury|Venus|Earth|Mars|Jupiter|\[ … \]/).length;

    rerender(<OverlappingClozePreview style="windowed" />);
    const windowedMiddle = within(
      screen.getAllByTestId('frame')[2]
    ).getAllByText(/Mercury|Venus|Earth|Mars|Jupiter|\[ … \]/).length;

    expect(windowedMiddle).toBeLessThan(showAllMiddle);
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
      screen.getByLabelText('Preview: each card hides one line of the list')
    ).toBeInTheDocument();
    expect(
      screen.getByText('5 lines become 5 cards — each hides one')
    ).toBeInTheDocument();
  });
});
