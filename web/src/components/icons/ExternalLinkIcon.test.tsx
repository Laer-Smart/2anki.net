import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExternalLinkIcon from './ExternalLinkIcon';

describe('ExternalLinkIcon', () => {
  it('renders an aria-hidden svg at the default size', () => {
    const { container } = render(<ExternalLinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('height')).toBe('16');
  });

  it('honors width and height props', () => {
    const { container } = render(<ExternalLinkIcon width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
  });
});
