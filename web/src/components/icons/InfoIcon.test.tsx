import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InfoIcon from './InfoIcon';

describe('InfoIcon', () => {
  it('renders an aria-hidden svg at the default size', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('width')).toBe('20');
    expect(svg?.getAttribute('height')).toBe('20');
  });

  it('honors width and height props', () => {
    const { container } = render(<InfoIcon width={14} height={14} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('14');
    expect(svg?.getAttribute('height')).toBe('14');
  });
});
